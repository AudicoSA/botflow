-- ============================================
-- FORCE Supabase PostgREST Schema Reload
-- ============================================
-- Run this in Supabase SQL Editor

-- Method 1: Send reload signal (repeat multiple times)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- Method 2: Verify table structure exists with ALL columns
SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('knowledge_base_articles', 'knowledge_embeddings')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- YOU SHOULD SEE 'metadata' COLUMN HERE!

-- Method 3: Force PostgREST to notice by making a trivial change
COMMENT ON TABLE knowledge_base_articles IS 'Knowledge base articles - force reload';
COMMENT ON TABLE knowledge_embeddings IS 'Vector embeddings - force reload';

-- Send reload again after comment change
NOTIFY pgrst, 'reload schema';

-- Method 4: Test that service role can insert
-- This simulates what the backend API does
SELECT has_table_privilege('service_role', 'knowledge_base_articles', 'INSERT');

-- Method 5: Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('knowledge_base_articles', 'knowledge_embeddings');

-- ============================================
-- IF NOTHING WORKS: Dashboard Restart
-- ============================================
-- Last resort (do this if SQL methods don't work):
-- 1. Go to Supabase Dashboard
-- 2. Settings → API
-- 3. Click "Restart PostgREST Server" button
-- 4. Wait 30-60 seconds
-- 5. Try backend API again
