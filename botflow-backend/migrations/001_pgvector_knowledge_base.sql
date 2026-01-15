-- Phase 2 Week 1 Day 1: pgvector Knowledge Base Setup
-- This migration enables vector search for RAG (Retrieval-Augmented Generation)

-- ============================================
-- 1. Enable pgvector Extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is available
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension is not available. Please install it first.';
  END IF;
END $$;

-- ============================================
-- 2. Create Knowledge Base Articles Table
-- ============================================
-- This stores metadata about uploaded documents
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT, -- Full text content (for reference, not used in search)
  category TEXT DEFAULT 'uploaded_document',
  metadata JSONB NOT NULL DEFAULT '{}', -- {file_name, file_size, file_type, status, page_count, error_message}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_bot_id ON knowledge_base_articles(bot_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON knowledge_base_articles(category);

-- RLS Policies
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- Users can read articles for bots in their organization
CREATE POLICY knowledge_articles_select ON knowledge_base_articles
  FOR SELECT
  USING (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN organizations o ON b.organization_id = o.id
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Users can insert articles for bots in their organization
CREATE POLICY knowledge_articles_insert ON knowledge_base_articles
  FOR INSERT
  WITH CHECK (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN organizations o ON b.organization_id = o.id
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Users can update articles for bots in their organization
CREATE POLICY knowledge_articles_update ON knowledge_base_articles
  FOR UPDATE
  USING (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN organizations o ON b.organization_id = o.id
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Users can delete articles for bots in their organization
CREATE POLICY knowledge_articles_delete ON knowledge_base_articles
  FOR DELETE
  USING (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN organizations o ON b.organization_id = o.id
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. Create Knowledge Embeddings Table
-- ============================================
-- This stores the actual vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- The actual text chunk
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimensions
  metadata JSONB NOT NULL DEFAULT '{}', -- {page: 1, chunk_index: 0, file_name: "policy.pdf", char_start: 0, char_end: 500}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_embeddings_bot_id ON knowledge_embeddings(bot_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source_id ON knowledge_embeddings(source_id);

-- Vector similarity index using HNSW (Hierarchical Navigable Small World)
-- This provides fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
  ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Note: For production with >100K vectors, consider using HNSW index instead:
-- CREATE INDEX idx_embeddings_vector_hnsw ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);

-- RLS Policies (Service role should bypass these, but define for safety)
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (for n8n workflows)
CREATE POLICY knowledge_embeddings_service_all ON knowledge_embeddings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can read embeddings for bots in their organization (for debugging)
CREATE POLICY knowledge_embeddings_select ON knowledge_embeddings
  FOR SELECT
  USING (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN organizations o ON b.organization_id = o.id
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. Create Similarity Search Function
-- ============================================
-- This function performs vector similarity search with configurable thresholds
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding VECTOR(1536),
  match_bot_id TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_embeddings.id,
    knowledge_embeddings.content,
    knowledge_embeddings.metadata,
    1 - (knowledge_embeddings.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings
  WHERE knowledge_embeddings.bot_id = match_bot_id
    AND 1 - (knowledge_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- 5. Create Hybrid Search Function (Vector + Keyword)
-- ============================================
-- This combines vector similarity with full-text search for better accuracy
CREATE OR REPLACE FUNCTION hybrid_search_knowledge(
  query_embedding VECTOR(1536),
  query_text TEXT,
  match_bot_id TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  keyword_rank FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      knowledge_embeddings.id,
      knowledge_embeddings.content,
      knowledge_embeddings.metadata,
      1 - (knowledge_embeddings.embedding <=> query_embedding) AS similarity
    FROM knowledge_embeddings
    WHERE knowledge_embeddings.bot_id = match_bot_id
      AND 1 - (knowledge_embeddings.embedding <=> query_embedding) > match_threshold
  ),
  keyword_search AS (
    SELECT
      knowledge_embeddings.id,
      ts_rank(to_tsvector('english', knowledge_embeddings.content), plainto_tsquery('english', query_text)) AS rank
    FROM knowledge_embeddings
    WHERE knowledge_embeddings.bot_id = match_bot_id
      AND to_tsvector('english', knowledge_embeddings.content) @@ plainto_tsquery('english', query_text)
  )
  SELECT
    vs.id,
    vs.content,
    vs.metadata,
    vs.similarity,
    COALESCE(ks.rank, 0) AS keyword_rank,
    (vs.similarity * 0.7 + COALESCE(ks.rank, 0) * 0.3) AS combined_score
  FROM vector_search vs
  LEFT JOIN keyword_search ks ON vs.id = ks.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- 6. Create Helper Functions
-- ============================================

-- Function to get statistics about a bot's knowledge base
CREATE OR REPLACE FUNCTION get_knowledge_stats(bot_text_id TEXT)
RETURNS TABLE (
  total_articles INT,
  total_chunks INT,
  total_size_bytes BIGINT,
  avg_chunks_per_article FLOAT,
  indexed_articles INT,
  processing_articles INT,
  failed_articles INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ka.id)::INT AS total_articles,
    COUNT(ke.id)::INT AS total_chunks,
    SUM((ka.metadata->>'file_size')::BIGINT) AS total_size_bytes,
    CASE
      WHEN COUNT(DISTINCT ka.id) > 0 THEN COUNT(ke.id)::FLOAT / COUNT(DISTINCT ka.id)
      ELSE 0
    END AS avg_chunks_per_article,
    COUNT(DISTINCT ka.id) FILTER (WHERE ka.metadata->>'status' = 'indexed')::INT AS indexed_articles,
    COUNT(DISTINCT ka.id) FILTER (WHERE ka.metadata->>'status' = 'processing')::INT AS processing_articles,
    COUNT(DISTINCT ka.id) FILTER (WHERE ka.metadata->>'status' = 'failed')::INT AS failed_articles
  FROM knowledge_base_articles ka
  LEFT JOIN knowledge_embeddings ke ON ka.id = ke.source_id
  WHERE ka.bot_id = bot_text_id;
END;
$$;

-- ============================================
-- 7. Create Update Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON knowledge_base_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_embeddings_updated_at
  BEFORE UPDATE ON knowledge_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. Create Storage Bucket (via Supabase Dashboard or API)
-- ============================================
-- Run this separately in Supabase Dashboard or via Supabase API:
-- Bucket name: knowledge-files
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, text/plain, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Storage policies (apply in Supabase Dashboard):
-- SELECT: Users can read files for bots in their organization
-- INSERT: Users can upload files for bots in their organization
-- UPDATE: Users can update files for bots in their organization
-- DELETE: Users can delete files for bots in their organization

-- ============================================
-- 9. Test Data (Optional - for development)
-- ============================================
-- Uncomment to insert test data

/*
-- Insert a test article (replace bot_id with actual UUID)
INSERT INTO knowledge_base_articles (bot_id, title, content, metadata)
VALUES (
  'YOUR_BOT_UUID_HERE',
  'Test Shipping Policy',
  'Our store offers free shipping on orders over R500...',
  '{"file_name": "shipping_policy.pdf", "file_size": 50000, "file_type": "application/pdf", "status": "indexed"}'::jsonb
);

-- Insert test embeddings (replace with actual embeddings from OpenAI)
-- This is just a dummy example - real embeddings are 1536 dimensions
INSERT INTO knowledge_embeddings (bot_id, source_id, content, embedding, metadata)
VALUES (
  'YOUR_BOT_UUID_HERE',
  (SELECT id FROM knowledge_base_articles WHERE title = 'Test Shipping Policy'),
  'Our store offers free shipping on orders over R500. Delivery takes 3-5 business days.',
  array_fill(0.1, ARRAY[1536])::vector, -- Replace with real embedding
  '{"page": 1, "chunk_index": 0, "file_name": "shipping_policy.pdf"}'::jsonb
);

-- Test similarity search
SELECT * FROM search_knowledge(
  array_fill(0.1, ARRAY[1536])::vector, -- Replace with real query embedding
  'YOUR_BOT_UUID_HERE',
  0.7,
  5
);
*/

-- ============================================
-- 10. Verification Queries
-- ============================================

-- Check if pgvector is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('knowledge_base_articles', 'knowledge_embeddings');

-- Check indexes
SELECT indexname, tablename FROM pg_indexes
WHERE tablename IN ('knowledge_base_articles', 'knowledge_embeddings');

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('search_knowledge', 'hybrid_search_knowledge', 'get_knowledge_stats');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'pgvector knowledge base setup complete! ✅';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create Supabase Storage bucket: knowledge-files';
  RAISE NOTICE '2. Set up n8n ingestion workflow';
  RAISE NOTICE '3. Implement backend API routes';
END $$;
