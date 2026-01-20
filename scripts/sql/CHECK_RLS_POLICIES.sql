-- Check Row Level Security policies for the tables used in login

-- 1. Check if RLS is enabled on tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('organization_members', 'whatsapp_accounts', 'organizations')
ORDER BY tablename;

-- 2. Check existing RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('organization_members', 'whatsapp_accounts', 'organizations')
ORDER BY tablename, policyname;

-- 3. Test if authenticated user can see organization_members
-- (Run this after logging in through Supabase client)
-- SET request.jwt.claims = '{"sub": "dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6"}';
-- SELECT * FROM organization_members WHERE user_id = 'dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6';
