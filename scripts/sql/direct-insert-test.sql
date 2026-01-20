-- Direct SQL Insert Test
-- Run this in Supabase SQL Editor to verify the table actually works

-- Step 1: Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'knowledge_base_articles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Try direct insert (should work if schema is correct)
INSERT INTO knowledge_base_articles (
    bot_id,
    title,
    content,
    category,
    metadata
) VALUES (
    '8982d756-3cd0-4e2b-bf20-396e919cb354',
    'Direct SQL Test Article',
    '',
    'test',
    jsonb_build_object(
        'file_name', 'test.pdf',
        'file_size', 1000,
        'status', 'pending'
    )
) RETURNING id, title, metadata;

-- Step 3: If insert worked, check if PostgREST can see it
SELECT id, bot_id, title, metadata, created_at
FROM knowledge_base_articles
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY created_at DESC
LIMIT 1;
