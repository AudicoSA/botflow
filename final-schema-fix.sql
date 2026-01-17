-- FINAL Schema Cache Fix - Nuclear Option
-- This forces PostgREST to completely rebuild its schema cache

-- Method 1: Drop and recreate the table comment (forces schema change detection)
COMMENT ON TABLE knowledge_base_articles IS NULL;
COMMENT ON TABLE knowledge_base_articles IS 'Knowledge base articles for RAG';

-- Method 2: Add and remove a temporary column (forces full schema reload)
ALTER TABLE knowledge_base_articles ADD COLUMN IF NOT EXISTS temp_column TEXT;
ALTER TABLE knowledge_base_articles DROP COLUMN IF EXISTS temp_column;

-- Method 3: Send NOTIFY multiple times with delay
DO $$
BEGIN
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_sleep(1);
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_sleep(1);
    PERFORM pg_notify('pgrst', 'reload schema');
END $$;

-- Method 4: Verify schema is visible to PostgREST role
GRANT ALL ON knowledge_base_articles TO postgres;
GRANT ALL ON knowledge_base_articles TO service_role;
GRANT ALL ON knowledge_embeddings TO postgres;
GRANT ALL ON knowledge_embeddings TO service_role;

-- Method 5: Check what PostgREST can actually see
SELECT
    table_name,
    column_name,
    data_type,
    has_column_privilege('service_role', 'knowledge_base_articles', column_name, 'SELECT') as can_select,
    has_column_privilege('service_role', 'knowledge_base_articles', column_name, 'INSERT') as can_insert
FROM information_schema.columns
WHERE table_name = 'knowledge_base_articles'
ORDER BY ordinal_position;

-- Final check: Can we insert directly?
INSERT INTO knowledge_base_articles (bot_id, title, content, category, metadata)
VALUES (
    '8982d756-3cd0-4e2b-bf20-396e919cb354',
    'SQL Direct Test',
    'Testing direct SQL insert',
    'test',
    '{"status": "test", "source": "sql"}'::jsonb
) RETURNING id, title, metadata->'status' as status;
