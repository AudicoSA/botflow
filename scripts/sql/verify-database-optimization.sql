-- Database Optimization Verification Script for BotFlow RAG System
-- Run this in Supabase SQL Editor to verify indexes and optimize performance

-- ========================================
-- 1. CHECK PGVECTOR EXTENSION
-- ========================================
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';

-- ========================================
-- 2. VERIFY INDEXES ON KNOWLEDGE_EMBEDDINGS
-- ========================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'knowledge_embeddings'
ORDER BY indexname;

-- ========================================
-- 3. CHECK INDEX USAGE STATISTICS
-- ========================================
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'knowledge_embeddings'
ORDER BY idx_scan DESC;

-- ========================================
-- 4. CREATE IVFFLAT INDEX (if not exists)
-- ========================================
-- This creates an approximate nearest neighbor index for vector search
-- IVFFLAT is faster for larger datasets (>10k rows)
CREATE INDEX IF NOT EXISTS knowledge_embeddings_embedding_ivfflat_idx
ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative: HNSW index (better for larger datasets, requires pgvector 0.5.0+)
-- Uncomment if you want to use HNSW instead of IVFFLAT
-- CREATE INDEX IF NOT EXISTS knowledge_embeddings_embedding_hnsw_idx
-- ON knowledge_embeddings
-- USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

-- ========================================
-- 5. CREATE ADDITIONAL INDEXES FOR FILTERS
-- ========================================

-- Index on bot_id for fast filtering by bot
CREATE INDEX IF NOT EXISTS knowledge_embeddings_bot_id_idx
ON knowledge_embeddings (bot_id);

-- Index on source_id for fast filtering by article
CREATE INDEX IF NOT EXISTS knowledge_embeddings_source_id_idx
ON knowledge_embeddings (source_id);

-- Composite index for bot_id + created_at (useful for recent queries)
CREATE INDEX IF NOT EXISTS knowledge_embeddings_bot_created_idx
ON knowledge_embeddings (bot_id, created_at DESC);

-- ========================================
-- 6. INDEXES FOR KNOWLEDGE_BASE_ARTICLES
-- ========================================

-- Index on bot_id for articles
CREATE INDEX IF NOT EXISTS knowledge_base_articles_bot_id_idx
ON knowledge_base_articles (bot_id);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS knowledge_base_articles_status_idx
ON knowledge_base_articles ((metadata->>'status'));

-- Composite index for bot + status
CREATE INDEX IF NOT EXISTS knowledge_base_articles_bot_status_idx
ON knowledge_base_articles (bot_id, ((metadata->>'status')));

-- ========================================
-- 7. ANALYZE TABLES FOR QUERY PLANNER
-- ========================================
ANALYZE knowledge_embeddings;
ANALYZE knowledge_base_articles;

-- ========================================
-- 8. CHECK TABLE SIZES AND ROW COUNTS
-- ========================================
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows
FROM pg_stat_user_tables
WHERE tablename IN ('knowledge_embeddings', 'knowledge_base_articles')
ORDER BY tablename;

-- ========================================
-- 9. TEST QUERY PERFORMANCE (EXPLAIN ANALYZE)
-- ========================================
-- Replace with a real embedding vector and bot_id to test
-- Example: Use a test embedding from OpenAI
-- This shows the query execution plan and actual performance

-- Sample query (you'll need to replace the vector with a real one)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> '[0.1, 0.2, 0.3]'::vector(1536)) AS similarity
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY embedding <=> '[0.1, 0.2, 0.3]'::vector(1536)
LIMIT 5;

-- Look for in the output:
-- ✓ "Index Scan" or "Bitmap Index Scan" (good - using index)
-- ✗ "Seq Scan" (bad - full table scan, needs optimization)
-- ✓ Execution time < 50ms for small datasets

-- ========================================
-- 10. CLEANUP ORPHANED RECORDS
-- ========================================
-- Check for embeddings without parent articles
SELECT COUNT(*)
FROM knowledge_embeddings e
LEFT JOIN knowledge_base_articles a ON e.source_id = a.id
WHERE a.id IS NULL;

-- Delete orphaned embeddings (if any found)
-- DELETE FROM knowledge_embeddings
-- WHERE source_id NOT IN (SELECT id FROM knowledge_base_articles);

-- ========================================
-- 11. VACUUM AND REINDEX (Optional)
-- ========================================
-- Run these periodically to maintain performance
-- VACUUM is already done automatically by PostgreSQL, but you can force it

-- Reclaim space and update statistics
VACUUM ANALYZE knowledge_embeddings;
VACUUM ANALYZE knowledge_base_articles;

-- Rebuild indexes if they become fragmented (rare, only if needed)
-- REINDEX TABLE knowledge_embeddings;
-- REINDEX TABLE knowledge_base_articles;

-- ========================================
-- 12. CHECK FOR MISSING FOREIGN KEYS
-- ========================================
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid IN (
    'knowledge_embeddings'::regclass,
    'knowledge_base_articles'::regclass
)
AND contype = 'f';  -- 'f' for foreign key

-- ========================================
-- 13. SUMMARY QUERY - OPTIMIZATION STATUS
-- ========================================
SELECT
    'pgvector Extension' AS check_name,
    CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')
        THEN '✓ Installed' ELSE '✗ Missing' END AS status
UNION ALL
SELECT
    'IVFFLAT Index',
    CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'knowledge_embeddings' AND indexname LIKE '%ivfflat%')
        THEN '✓ Present' ELSE '✗ Missing' END
UNION ALL
SELECT
    'HNSW Index',
    CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'knowledge_embeddings' AND indexname LIKE '%hnsw%')
        THEN '✓ Present' ELSE '⚠ Optional' END
UNION ALL
SELECT
    'bot_id Index',
    CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = 'knowledge_embeddings' AND indexdef LIKE '%bot_id%')
        THEN '✓ Present' ELSE '✗ Missing' END
UNION ALL
SELECT
    'Embeddings Count',
    COUNT(*)::TEXT || ' rows'
FROM knowledge_embeddings
UNION ALL
SELECT
    'Articles Count',
    COUNT(*)::TEXT || ' rows'
FROM knowledge_base_articles;

-- ========================================
-- OPTIMIZATION COMPLETE
-- ========================================
-- After running this script:
-- 1. Verify all indexes are created
-- 2. Check index usage statistics after running searches
-- 3. Monitor query performance with EXPLAIN ANALYZE
-- 4. Run performance benchmarks with test-performance.ps1
