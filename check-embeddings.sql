-- Check if embeddings were created for the most recent article
SELECT
  'knowledge_base_articles' as table_name,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM knowledge_base_articles
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'

UNION ALL

SELECT
  'knowledge_embeddings' as table_name,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354';

-- Show recent articles with their status
SELECT
  id,
  title,
  metadata->>'status' as status,
  metadata->>'total_chunks' as chunks,
  created_at,
  updated_at
FROM knowledge_base_articles
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY created_at DESC
LIMIT 5;

-- Show sample embeddings
SELECT
  id,
  source_id,
  LEFT(content, 100) as content_preview,
  metadata->>'chunk_index' as chunk_index,
  created_at
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY created_at DESC
LIMIT 10;
