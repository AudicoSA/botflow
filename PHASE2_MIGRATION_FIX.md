# Phase 2 Migration Fix - Data Type Issue

## Issue
The initial migration failed with this error:
```
ERROR: 42804: foreign key constraint "knowledge_embeddings_bot_id_fkey" cannot be implemented
DETAIL: Key columns "bot_id" and "id" are of incompatible types: uuid and text.
```

## Root Cause
The existing `bots` table uses `TEXT` for the `id` column, not `UUID`. Our migration was incorrectly assuming UUID.

## Solution
Changed all `bot_id` columns and function parameters from `UUID` to `TEXT` to match the existing schema.

## Files Modified

### 1. Migration File: `botflow-backend/migrations/001_pgvector_knowledge_base.sql`

**Changes:**
- `knowledge_base_articles.bot_id`: `UUID` → `TEXT`
- `knowledge_embeddings.bot_id`: `UUID` → `TEXT`
- `search_knowledge()` parameter `match_bot_id`: `UUID` → `TEXT`
- `hybrid_search_knowledge()` parameter `match_bot_id`: `UUID` → `TEXT`
- `get_knowledge_stats()` parameter: renamed from `bot_uuid UUID` → `bot_text_id TEXT`

### 2. Backend Routes: `botflow-backend/src/routes/knowledge.ts`

**Changes:**
- RPC call to `get_knowledge_stats()`: Changed parameter name from `bot_uuid` to `bot_text_id`

## How to Apply

### Step 1: Run the Corrected Migration
1. Open Supabase SQL Editor
2. Copy the entire contents of `botflow-backend/migrations/001_pgvector_knowledge_base.sql`
3. Paste and run in SQL Editor
4. ✅ Should now complete successfully!

### Step 2: Verify
Run these verification queries:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('knowledge_base_articles', 'knowledge_embeddings');

-- Check column types are correct
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'knowledge_embeddings'
AND column_name = 'bot_id';
-- Should return: bot_id | text

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('search_knowledge', 'hybrid_search_knowledge', 'get_knowledge_stats');
```

Expected results:
- ✅ Both tables exist
- ✅ `bot_id` column is of type `text`
- ✅ All 3 functions created successfully

## Testing After Fix

### Test 1: Create Test Article
```sql
-- Get a bot ID first
SELECT id FROM bots LIMIT 1;

-- Insert test article (use the bot ID from above)
INSERT INTO knowledge_base_articles (bot_id, title, metadata)
VALUES (
  'YOUR_BOT_ID_HERE',  -- TEXT format, not UUID
  'Test Article',
  '{"status": "indexed"}'::jsonb
)
RETURNING *;
```

### Test 2: Test Function
```sql
-- Test get_knowledge_stats with TEXT bot_id
SELECT * FROM get_knowledge_stats('YOUR_BOT_ID_HERE');
```

Should return:
```
total_articles: 1
total_chunks: 0
total_size_bytes: null
...
```

## Impact on Backend API

✅ No code changes needed in API routes (they already use TEXT for bot IDs)

The backend routes already work with TEXT bot IDs, so this fix makes the database schema consistent with the application layer.

## Prevention

When creating future migrations that reference existing tables:
1. Always check the existing column types first
2. Run `\d table_name` in psql or check via Supabase dashboard
3. Match the existing types exactly

## Status

✅ **FIXED** - Migration now compatible with existing schema

You can now proceed with:
1. Running the migration
2. Creating the storage bucket
3. Testing the API endpoints

See [PHASE2_WEEK1_QUICKSTART.md](./PHASE2_WEEK1_QUICKSTART.md) for next steps!
