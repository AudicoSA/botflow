# Fix Supabase PostgREST Schema Cache Issue

## The Problem

Backend error: `Could not find the 'metadata' column of 'knowledge_base_articles' in the schema cache`

**Root Cause:** Supabase's PostgREST caches the database schema. After running migrations, PostgREST needs to be told to reload its cache.

## The Solution (2 Minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/ajtnixmnfuqtrgrakxss
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run This SQL (Aggressive Method)

Copy and paste the entire content of `force-supabase-reload.sql`:

```sql
-- Send reload signal multiple times
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- Verify columns exist
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('knowledge_base_articles', 'knowledge_embeddings')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Force PostgREST to notice by making a trivial change
COMMENT ON TABLE knowledge_base_articles IS 'Knowledge base articles - force reload';
COMMENT ON TABLE knowledge_embeddings IS 'Vector embeddings - force reload';

-- Send reload again
NOTIFY pgrst, 'reload schema';
```

**Important**: Make sure you see `metadata` column in the results!

### Step 3: Verify Results

You should see output like this:

```
table_name                  | column_name  | data_type
---------------------------|--------------|-------------
knowledge_base_articles    | id           | uuid
knowledge_base_articles    | bot_id       | uuid
knowledge_base_articles    | file_url     | text
knowledge_base_articles    | file_name    | text
knowledge_base_articles    | metadata     | jsonb        ← THIS IS THE IMPORTANT ONE!
knowledge_base_articles    | created_at   | timestamp
knowledge_embeddings       | id           | uuid
knowledge_embeddings       | bot_id       | uuid
knowledge_embeddings       | source_id    | uuid
knowledge_embeddings       | content      | text
knowledge_embeddings       | embedding    | vector
knowledge_embeddings       | metadata     | jsonb
knowledge_embeddings       | created_at   | timestamp
```

### Step 4: Dashboard Restart (If SQL Didn't Work)

If the SQL commands don't fix it, use the Supabase Dashboard:

1. Go to Settings → API in Supabase Dashboard
2. Find "PostgREST Server" section
3. Click **"Restart PostgREST Server"** button
4. Wait 30-60 seconds for restart to complete

### Step 5: Restart Backend (Optional)

Sometimes backend needs restart too:

```powershell
# In your backend terminal:
# Press Ctrl+C to stop
# Then:
cd "C:\Users\kenny\OneDrive\Whatsapp Service\botflow-backend"
npm run dev
```

### Step 6: Test Again

```powershell
cd "C:\Users\kenny\OneDrive\Whatsapp Service"
.\test-knowledge-full.ps1
```

**Expected Success Output:**
```
Step 2: Creating knowledge article...
Success! Article created

Article ID: <uuid>
Status: pending
```

---

## Why This Happens

Supabase uses PostgREST to create the REST API from your PostgreSQL database. PostgREST caches the schema for performance. When you run migrations, it doesn't automatically know about the changes until you send the `NOTIFY pgrst, 'reload schema'` command.

This is a **one-time fix**. After reloading, it won't happen again unless you make more schema changes.

---

## Alternative: Web Dashboard

If SQL Editor doesn't work, try this:

1. Go to Database → Schema Refresh
2. Click "Refresh Schema"
3. Wait 10 seconds
4. Try API again

---

## Success Indicator

When it works, you'll see:
```
Success! Article created

Article ID: <some-uuid>
Status: pending
```

Instead of:
```
Error: Failed to create article record
```

---

Last updated: 2025-01-15 06:14
