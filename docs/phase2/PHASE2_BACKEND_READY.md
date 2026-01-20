# Phase 2 Backend Status - READY! ✅

## Completed Setup (Day 1)

### ✅ Environment Configuration
- Generated webhook secret: `244c564393ffbe3c4d0e08727d007d9bfc7c6505ac7bf5b03e265edef29edc18`
- Added `N8N_WEBHOOK_SECRET` to `.env` file
- All required environment variables configured

### ✅ Backend Server Running
- Server started successfully on `http://localhost:3002`
- Health check passing: `GET http://localhost:3002/health` returns 200 OK
- Supabase clients initialized
- Redis connected (with minor connection warnings - non-blocking)

### ✅ API Routes Available
The knowledge API is now available with 6 endpoints:

1. **POST** `/api/bots/:botId/knowledge` - Initialize file upload
2. **POST** `/api/bots/:botId/knowledge/:articleId/process` - Trigger n8n processing
3. **POST** `/api/bots/:botId/knowledge/:articleId/complete` - n8n webhook callback
4. **GET** `/api/bots/:botId/knowledge` - List all knowledge sources
5. **GET** `/api/bots/:botId/knowledge/stats` - Get statistics
6. **DELETE** `/api/bots/:botId/knowledge/:articleId` - Delete source

### ✅ Storage Bucket Configured
- Bucket: `knowledge-files`
- Policies: Select, Insert, Delete (authenticated users only)

---

## Next Steps - Run Database Migration

Before testing the API endpoints, you need to run the database migration to create the tables and functions.

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://ajtnixmnfuqtrgrakxss.supabase.co
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the Migration

Copy the **entire contents** of this file:
```
botflow-backend/migrations/001_pgvector_knowledge_base.sql
```

Paste it into the SQL Editor and click "RUN".

### Step 3: Verify Migration Success

Run these verification queries in the SQL Editor:

```sql
-- Check pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('knowledge_base_articles', 'knowledge_embeddings');

-- Check column types are correct
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'knowledge_embeddings'
AND column_name = 'bot_id';
-- Should return: bot_id | text

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('search_knowledge', 'hybrid_search_knowledge', 'get_knowledge_stats');
```

**Expected Results:**
- ✅ pgvector extension shows version info
- ✅ Both tables (`knowledge_base_articles`, `knowledge_embeddings`) exist
- ✅ `bot_id` column is of type `text` (NOT uuid)
- ✅ All 3 functions exist

---

## Testing the Knowledge API

Once the migration is complete, you can test the API endpoints.

### Test 1: Initialize File Upload

```bash
# Replace YOUR_JWT_TOKEN with actual token from login
# Replace YOUR_BOT_ID with actual bot ID from your database

curl -X POST http://localhost:3002/api/bots/YOUR_BOT_ID/knowledge \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Policy Document",
    "metadata": {
      "file_name": "test_policy.pdf",
      "file_size": 50000,
      "file_type": "application/pdf"
    }
  }'
```

**Expected Response:**
```json
{
  "article": {
    "id": "uuid-here",
    "bot_id": "your-bot-id",
    "title": "Test Policy Document",
    "metadata": {...},
    "created_at": "timestamp"
  },
  "uploadUrl": "https://ajtnixmnfuqtrgrakxss.supabase.co/storage/v1/object/upload/..."
}
```

### Test 2: List Knowledge Sources

```bash
curl -X GET http://localhost:3002/api/bots/YOUR_BOT_ID/knowledge \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "articles": [
    {
      "id": "uuid",
      "bot_id": "your-bot-id",
      "title": "Test Policy Document",
      "metadata": {...},
      "created_at": "timestamp"
    }
  ]
}
```

### Test 3: Get Statistics

```bash
curl -X GET http://localhost:3002/api/bots/YOUR_BOT_ID/knowledge/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "stats": {
    "total_articles": 1,
    "total_chunks": 0,
    "total_size_bytes": 50000,
    "avg_chunks_per_article": 0,
    "indexed_articles": 0,
    "processing_articles": 0,
    "failed_articles": 0
  }
}
```

---

## How to Get JWT Token for Testing

### Option 1: Use Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Click on a user
3. Copy the access token from the "User UID" section

### Option 2: Login via API
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

Response will include `access_token` - use this as your JWT token.

---

## Webhook Secret for n8n

When you build the n8n workflow (Day 2-3), use this webhook secret for HMAC verification:

```
244c564393ffbe3c4d0e08727d007d9bfc7c6505ac7bf5b03e265edef29edc18
```

The backend will send this in the `x-webhook-signature` header with each webhook trigger.

---

## Current Status Summary

✅ **Day 1 Complete:**
- Database schema designed (UUID→TEXT fix applied)
- Backend API implemented (6 endpoints)
- Environment configured (webhook secret generated)
- Storage bucket ready (policies configured)
- Backend server running successfully

⏳ **Pending - Run Migration:**
- Execute `001_pgvector_knowledge_base.sql` in Supabase SQL Editor
- Verify tables and functions created

🔜 **Day 2-3 Next:**
- Build n8n Knowledge Ingestion workflow
- Implement HMAC signature verification
- Test PDF upload → processing → embeddings flow

---

## Troubleshooting

### If Backend Won't Start
```bash
cd botflow-backend
npm install
npm run dev
```

### If Migration Fails
- Check that pgvector extension is available in Supabase
- Verify no conflicting table names exist
- Check that bots table exists with TEXT id column

### If API Returns 401 Unauthorized
- Verify JWT token is valid
- Check Authorization header format: `Bearer YOUR_TOKEN`
- Ensure user belongs to organization that owns the bot

### If Storage Upload Fails
- Verify bucket `knowledge-files` exists
- Check RLS policies are configured correctly
- Ensure signed URL hasn't expired (1-hour TTL)

---

Last updated: 2026-01-14 17:35
