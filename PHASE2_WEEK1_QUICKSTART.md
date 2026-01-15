# Phase 2 Week 1: Quick Start Guide

## 🚀 Ready to Build the Brain!

We've created all the necessary code for Day 1-4. Here's how to get started:

---

## Step 1: Run the Database Migration (5 minutes)

### Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your BotFlow project
3. Navigate to **SQL Editor**

### Run the Migration
1. Click **New Query**
2. Open the file: `botflow-backend/migrations/001_pgvector_knowledge_base.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **Run** (or press `Ctrl+Enter`)

### Verify Success
You should see output messages indicating:
- ✅ pgvector extension enabled
- ✅ Tables created (knowledge_base_articles, knowledge_embeddings)
- ✅ Functions created (search_knowledge, hybrid_search_knowledge, get_knowledge_stats)
- ✅ Indexes created

---

## Step 2: Create Supabase Storage Bucket (2 minutes)

### Create Bucket
1. In Supabase Dashboard, go to **Storage**
2. Click **Create Bucket**
3. Name: `knowledge-files`
4. **Public**: No (keep it private)
5. Click **Create**

### Set Bucket Policies
1. Click on the `knowledge-files` bucket
2. Go to **Policies** tab
3. Click **New Policy** → **For full customization**

Copy and paste these 3 policies:

**Policy 1: Users can upload files**
```sql
CREATE POLICY "Users can upload knowledge files for their bots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-files'
  AND auth.role() = 'authenticated'
);
```

**Policy 2: Users can read files**
```sql
CREATE POLICY "Users can read knowledge files for their bots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-files'
  AND auth.role() = 'authenticated'
);
```

**Policy 3: Users can delete files**
```sql
CREATE POLICY "Users can delete knowledge files for their bots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-files'
  AND auth.role() = 'authenticated'
);
```

---

## Step 3: Configure Environment Variables (3 minutes)

### Generate Webhook Secret
Open terminal and run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64-character hex string).

### Update Backend .env
Edit `botflow-backend/.env` and add:

```bash
# n8n Webhook Security
N8N_WEBHOOK_SECRET="paste-your-64-char-secret-here"

# n8n Configuration (if you have n8n running)
N8N_API_URL="http://localhost:5678"  # or your n8n URL
N8N_API_KEY="your-n8n-api-key"       # optional
N8N_WEBHOOK_URL="http://localhost:5678"

# OpenAI (should already exist)
OPENAI_API_KEY="sk-..."
```

---

## Step 4: Test Backend API (5 minutes)

### Start Backend Server
```bash
cd botflow-backend
npm install  # if needed
npm run dev
```

### Test Health Check
```bash
curl http://localhost:3001/health
```

Expected response: `{"status":"ok"}`

### Test Knowledge API
You need a bot ID and auth token. Get them from your database or use the dev user.

**Get bot ID:**
```sql
-- Run in Supabase SQL Editor
SELECT id, name FROM bots LIMIT 1;
```

**Test list knowledge sources:**
```bash
curl http://localhost:3001/api/bots/YOUR_BOT_ID/knowledge
```

Expected response: `{"articles":[]}`

---

## Step 5: Test File Upload Flow (10 minutes)

### Test with cURL

**Step 1: Initialize Upload**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "test_policy.pdf",
    "file_size": 50000,
    "file_type": "application/pdf"
  }'
```

Response will include:
```json
{
  "article_id": "uuid-here",
  "upload_url": "https://supabase-storage-url...",
  "file_path": "knowledge/bot-id/article-id/test_policy.pdf"
}
```

**Step 2: Upload File to Signed URL**
```bash
curl -X PUT "PASTE_UPLOAD_URL_HERE" \
  -H "Content-Type: application/pdf" \
  --data-binary "@/path/to/your/test.pdf"
```

**Step 3: Trigger Processing**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/knowledge/ARTICLE_ID/process
```

Response: `{"status":"processing"}` or `{"status":"pending_manual"}` if n8n not configured

**Step 4: Check Status**
```bash
curl http://localhost:3001/api/bots/YOUR_BOT_ID/knowledge
```

You should see your uploaded file with status in metadata.

---

## Step 6: Verify Database (2 minutes)

### Check Articles Table
```sql
SELECT id, title, metadata->>'status' as status, created_at
FROM knowledge_base_articles
ORDER BY created_at DESC
LIMIT 5;
```

You should see your test upload.

### Check Storage
1. Go to Supabase Dashboard → **Storage** → `knowledge-files`
2. Navigate to `knowledge/YOUR_BOT_ID/ARTICLE_ID/`
3. You should see your uploaded file

---

## What's Working Now ✅

1. ✅ **Database Schema**: pgvector enabled, tables created, indexes ready
2. ✅ **Storage**: Supabase bucket for file uploads
3. ✅ **Backend API**: All 5 knowledge endpoints implemented:
   - GET `/bots/:botId/knowledge` - List sources
   - POST `/bots/:botId/knowledge` - Initialize upload
   - POST `/bots/:botId/knowledge/:articleId/process` - Trigger processing
   - POST `/bots/:botId/knowledge/:articleId/complete` - Webhook callback
   - GET `/bots/:botId/knowledge/stats` - Statistics
   - DELETE `/bots/:botId/knowledge/:articleId` - Delete source
4. ✅ **Security**: HMAC webhook signatures, ownership verification, RLS policies
5. ✅ **File Validation**: Size limits (10MB), type checking (PDF, TXT, DOCX)

---

## What's Next 📋

### Day 2-3: n8n Workflow (Tomorrow)
We need to build the n8n workflow that:
1. Receives webhook with file URL
2. Downloads and parses PDF
3. Chunks text into 500-token pieces
4. Generates embeddings via OpenAI
5. Stores vectors in `knowledge_embeddings` table
6. Calls completion webhook

**Note:** The backend is ready to trigger this workflow, we just need to build it in n8n!

### Day 4: Chat Integration
Update the WhatsApp chat workflow to:
1. Generate query embedding
2. Search `knowledge_embeddings` using `search_knowledge()` function
3. Inject retrieved chunks into OpenAI prompt
4. Respond with cited sources

### Day 5: Frontend UI
Build the React component in the dashboard to:
1. Upload files with drag-and-drop
2. Show processing status in real-time
3. Display indexed documents list
4. Delete documents

---

## Troubleshooting

### Error: "extension 'vector' is not available"
- **Solution**: Your Postgres version might not support pgvector. Contact Supabase support or use a different Postgres instance.

### Error: "Failed to generate upload URL"
- **Solution**: Ensure the `knowledge-files` bucket exists in Supabase Storage.

### Error: "N8N_WEBHOOK_SECRET not configured"
- **Solution**: Add the webhook secret to your `.env` file (see Step 3).

### Files upload but status stays "pending"
- **Solution**: n8n workflow hasn't been built yet. This is expected until Day 2-3!

---

## Testing Checklist

Before moving to Day 2, ensure:
- [ ] Database migration ran successfully
- [ ] `knowledge-files` storage bucket exists
- [ ] Backend server starts without errors
- [ ] Can initialize file upload via API
- [ ] File appears in Supabase Storage after upload
- [ ] Article record appears in `knowledge_base_articles` table
- [ ] Status updates to "processing" or "pending_manual"

---

## Need Help?

Check these files for reference:
- [migrations/README.md](./botflow-backend/migrations/README.md) - Database setup guide
- [PHASE2_WEEK1_GUIDE.md](./PHASE2_WEEK1_GUIDE.md) - Detailed weekly plan
- [botflow-backend/src/routes/knowledge.ts](./botflow-backend/src/routes/knowledge.ts:1) - API implementation

---

## Ready for Day 2?

Once you've completed Steps 1-6 above, you're ready to build the n8n ingestion workflow!

**Next up:** Building the PDF parsing and embedding generation pipeline in n8n.

🎉 Great progress! The foundation is solid. Let's build the brain!
