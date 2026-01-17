-- ============================================
-- Run the FULL migration that was never executed
-- ============================================
-- This is the complete 001_pgvector_knowledge_base.sql migration

-- 1. Enable pgvector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing table if it has wrong schema
DROP TABLE IF EXISTS knowledge_embeddings CASCADE;
DROP TABLE IF EXISTS knowledge_base_articles CASCADE;

-- 3. Create Knowledge Base Articles Table (CORRECT SCHEMA)
CREATE TABLE knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'uploaded_document',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_articles_bot_id ON knowledge_base_articles(bot_id);
CREATE INDEX idx_knowledge_articles_category ON knowledge_base_articles(category);

-- RLS Policies
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

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

-- 4. Create Knowledge Embeddings Table
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  source_id UUID REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_embeddings_bot_id ON knowledge_embeddings(bot_id);
CREATE INDEX idx_knowledge_embeddings_source_id ON knowledge_embeddings(source_id);
CREATE INDEX idx_knowledge_embeddings_vector ON knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS Policies for embeddings
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY knowledge_embeddings_insert ON knowledge_embeddings
  FOR INSERT
  WITH CHECK (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN organizations o ON b.organization_id = o.id
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY knowledge_embeddings_delete ON knowledge_embeddings
  FOR DELETE
  USING (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN organizations o ON b.organization_id = o.id
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- 5. Create Search Functions
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

-- 6. Create Update Triggers
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

-- 7. Verify everything was created
SELECT 'Migration completed successfully!' as status;

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('knowledge_base_articles', 'knowledge_embeddings')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
