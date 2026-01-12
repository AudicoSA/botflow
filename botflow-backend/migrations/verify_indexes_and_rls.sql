-- Verification script for indexes and RLS policies
-- Run these queries in Supabase SQL Editor

-- ========================================
-- PART 1: Verify Indexes
-- ========================================

-- Check all indexes on bot_templates table
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bot_templates'
ORDER BY indexname;

-- Expected indexes:
-- 1. bot_templates_pkey (PRIMARY KEY on id)
-- 2. idx_templates_vertical
-- 3. idx_templates_published
-- 4. idx_templates_tier

-- Explain query plans to verify indexes are being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bot_templates WHERE vertical = 'taxi';

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bot_templates WHERE is_published = true;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bot_templates WHERE tier = 1;

-- ========================================
-- PART 2: Verify RLS is Enabled
-- ========================================

-- Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'bot_templates';

-- Expected: rowsecurity = true

-- ========================================
-- PART 3: Verify RLS Policies
-- ========================================

-- List all policies on bot_templates
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
WHERE tablename = 'bot_templates'
ORDER BY policyname;

-- Expected policies:
-- 1. "Public can read published templates" - SELECT, using is_published = true
-- 2. "Authenticated users can read templates" - SELECT, authenticated role
-- 3. "Admins can manage templates" - ALL, authenticated role

-- ========================================
-- PART 4: Test RLS Policies
-- ========================================

-- Test 1: As anon user, should only see published templates
SET ROLE anon;
SELECT COUNT(*) as published_count
FROM bot_templates
WHERE is_published = true;
-- Should return count

SELECT COUNT(*) as unpublished_count
FROM bot_templates
WHERE is_published = false;
-- Should return 0 (anon can't see unpublished)

RESET ROLE;

-- Test 2: Check trigger function exists
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'bot_templates';

-- Expected: update_bot_templates_updated_at trigger on UPDATE

-- ========================================
-- SUMMARY CHECK
-- ========================================

-- Quick summary
SELECT
    'Indexes' as check_type,
    COUNT(*) as count,
    'Should be 4 (including primary key)' as expected
FROM pg_indexes
WHERE tablename = 'bot_templates'

UNION ALL

SELECT
    'RLS Enabled' as check_type,
    CASE WHEN rowsecurity THEN 1 ELSE 0 END as count,
    'Should be 1 (true)' as expected
FROM pg_tables
WHERE tablename = 'bot_templates'

UNION ALL

SELECT
    'Policies' as check_type,
    COUNT(*) as count,
    'Should be 3' as expected
FROM pg_policies
WHERE tablename = 'bot_templates'

UNION ALL

SELECT
    'Triggers' as check_type,
    COUNT(*) as count,
    'Should be 1' as expected
FROM information_schema.triggers
WHERE event_object_table = 'bot_templates';
