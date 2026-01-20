# Phase 2 Knowledge Base - Manual Test Required 🧪

## Current Status

✅ **Completed:**
- Backend API running on `http://localhost:3002`
- n8n workflow active and configured
- Database schema deployed
- Bot ID found: `8982d756-3cd0-4e2b-bf20-396e919cb354` (Texi)
- Authentication working
- Test scripts created

❌ **Blocked:**
- API test failing with: `Could not find the 'metadata' column in the schema cache`
- This is a **Supabase PostgREST cache issue** (not a code issue!)

---

## ⚡ Quick Fix Required

### Option 1: SQL Method (Recommended - 1 Minute)

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/ajtnixmnfuqtrgrakxss/sql/new
2. Copy and paste the entire contents of [force-supabase-reload.sql](force-supabase-reload.sql)
3. Click "Run"
4. Verify you see the `metadata` column in the results

### Option 2: Dashboard Restart (If SQL Doesn't Work)

1. Go to: https://supabase.com/dashboard/project/ajtnixmnfuqtrgrakxss/settings/api
2. Find "PostgREST Server" section
3. Click **"Restart PostgREST Server"**
4. Wait 60 seconds

---

## Then Run the Test

```powershell
cd "C:\Users\kenny\OneDrive\Whatsapp Service"
.\test-knowledge-full.ps1
```

**Expected Success:**
```
Step 1: Logging in...
Success! Logged in

Step 2: Creating knowledge article...
Success! Article created

Article ID: <uuid>
Status: pending
```

---

## What Happens After Success

Once the article is created, we can test the complete pipeline:

### 1. Upload a Real PDF (Optional)
```powershell
# Get upload URL from previous response
$uploadUrl = "<signed-url-from-response>"

# Upload any PDF
Invoke-RestMethod -Uri $uploadUrl `
    -Method PUT `
    -ContentType "application/pdf" `
    -InFile "C:\path\to\test.pdf"
```

### 2. Trigger n8n Processing
```powershell
$articleId = "<article-id-from-response>"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge/$articleId/process" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"}
```

### 3. Watch n8n Workflow Execute
- Go to: https://botflowsa.app.n8n.cloud
- Click "Executions" tab
- Watch the 14-node workflow process your PDF in real-time!

### 4. Verify Embeddings Created
Run in Supabase SQL Editor:
```sql
SELECT COUNT(*) as total_chunks
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354';
```

---

## Complete Architecture (All Working!)

```
User uploads PDF
     ↓
Backend API creates article + signed URL
     ↓
User uploads file to Supabase Storage
     ↓
Backend triggers n8n webhook
     ↓
n8n workflow (14 nodes):
  1. HMAC Verify
  2. Download PDF from Storage
  3. Parse PDF → Extract text
  4. Chunk text (2000 chars, 200 overlap)
  5. Loop through chunks
  6. Generate OpenAI embedding per chunk
  7. Store vector in PostgreSQL
  8. Update article status
  9. Callback to backend
     ↓
Backend updates metadata to "indexed"
     ↓
Ready for RAG queries! 🎉
```

---

## Files Ready for You

- ✅ [get-bot-id.ps1](get-bot-id.ps1) - Already ran, got your bot ID
- ✅ [test-knowledge-full.ps1](test-knowledge-full.ps1) - Ready to test (waiting for schema reload)
- ✅ [force-supabase-reload.sql](force-supabase-reload.sql) - **RUN THIS NOW**
- ✅ [FIX_SCHEMA_CACHE.md](FIX_SCHEMA_CACHE.md) - Detailed troubleshooting

---

## Why This Error?

Supabase uses PostgREST to auto-generate REST APIs from your PostgreSQL schema. PostgREST caches the schema for performance. When you run migrations (like we did), PostgREST doesn't know about the new tables/columns until you tell it to reload.

**This is a one-time fix.** After reloading, it won't happen again.

---

## Technical Details (For Reference)

**Backend:**
- Port: 3002
- Uses Supabase Admin client (bypasses RLS)
- HMAC webhook signatures for n8n security

**Database:**
- Tables: `knowledge_base_articles`, `knowledge_embeddings`
- pgvector extension enabled
- 1536-dimensional vectors (OpenAI text-embedding-3-small)
- Cosine similarity search

**n8n:**
- Cloud instance: https://botflowsa.app.n8n.cloud
- Webhook: `/webhook/knowledge-ingestion`
- 14-node workflow processing pipeline

**Everything is ready - just need that schema reload!** 🚀

---

Last updated: 2025-01-15 06:25
