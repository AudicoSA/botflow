-- Force Supabase PostgREST to reload schema cache
-- Run this in the Supabase SQL Editor

-- Send reload signal to PostgREST
NOTIFY pgrst, 'reload schema';

-- Verify the tables exist
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('knowledge_base_articles', 'knowledge_embeddings')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- This should show both tables with all their columns including 'metadata'
