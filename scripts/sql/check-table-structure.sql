-- Check the actual structure of knowledge_base_articles table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'knowledge_base_articles'
ORDER BY ordinal_position;

-- Also check if the table actually exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'knowledge_base_articles'
) as table_exists;

-- Try a direct insert test to see the actual error
-- This will fail but show us the real error message
INSERT INTO knowledge_base_articles (
    bot_id,
    title,
    content,
    category,
    metadata
) VALUES (
    '8982d756-3cd0-4e2b-bf20-396e919cb354',
    'Direct SQL Test',
    '',
    'test',
    '{"status": "pending"}'::jsonb
) RETURNING *;
