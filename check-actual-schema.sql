-- Check what columns ACTUALLY exist in the database
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'knowledge_base_articles'
ORDER BY ordinal_position;

-- Also check if table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'knowledge_base_articles'
) as table_exists;
