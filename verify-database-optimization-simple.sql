-- Simplified Database Optimization for Supabase
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. CHECK PGVECTOR EXTENSION
-- ========================================
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';

-- ========================================
-- 2. CREATE IVFFLAT INDEX (MOST IMPORTANT)
-- ========================================
CREATE INDEX IF NOT EXISTS knowledge_embeddings_embedding_ivfflat_idx
ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ========================================
-- 3. CREATE SUPPORTING INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS knowledge_embeddings_bot_id_idx
ON knowledge_embeddings (bot_id);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_source_id_idx
ON knowledge_embeddings (source_id);

CREATE INDEX IF NOT EXISTS knowledge_embeddings_bot_created_idx
ON knowledge_embeddings (bot_id, created_at DESC);

CREATE INDEX IF NOT EXISTS knowledge_base_articles_bot_id_idx
ON knowledge_base_articles (bot_id);

-- ========================================
-- 4. ANALYZE TABLES
-- ========================================
ANALYZE knowledge_embeddings;
ANALYZE knowledge_base_articles;

-- ========================================
-- 5. VERIFY INDEXES CREATED
-- ========================================
SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('knowledge_embeddings', 'knowledge_base_articles')
ORDER BY tablename, indexname;

-- ========================================
-- 6. CHECK TABLE STATUS
-- ========================================
SELECT
    'knowledge_embeddings' as table_name,
    COUNT(*) as row_count
FROM knowledge_embeddings
UNION ALL
SELECT
    'knowledge_base_articles' as table_name,
    COUNT(*) as row_count
FROM knowledge_base_articles;

-- ========================================
-- DONE! ✅
-- ========================================
-- If you see indexes created and no errors, you're ready to test!
