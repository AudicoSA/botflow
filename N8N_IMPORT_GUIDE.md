# n8n Workflow Import & Setup Guide

## Quick Start (5 Minutes)

### Step 1: Import Workflow into n8n

1. **Login to n8n Cloud**
   - Go to: `https://botflowsa.app.n8n.cloud`
   - Login with your credentials

2. **Import the Workflow**
   - Click **"Workflows"** in the left sidebar
   - Click **"Add Workflow"** → **"Import from File"**
   - Select: `n8n-knowledge-ingestion-workflow.json`
   - Click **"Import"**

3. **Workflow Imported!**
   - You should see 14 nodes in the canvas
   - Workflow name: "Knowledge Ingestion Pipeline"

---

### Step 2: Configure Environment Variables

In n8n, go to **Settings → Environment Variables** and add:

```env
OPENAI_API_KEY=sk-proj-your-openai-key-here
SUPABASE_URL=https://ajtnixmnfuqtrgrakxss.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
N8N_WEBHOOK_SECRET=244c564393ffbe3c4d0e08727d007d9bfc7c6505ac7bf5b03e265edef29edc18
```

**Where to find these:**
- `OPENAI_API_KEY`: OpenAI Dashboard → API Keys
- `SUPABASE_URL`: Already in your `.env` file
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → service_role key
- `N8N_WEBHOOK_SECRET`: Already set (from backend `.env`)

---

### Step 3: Install Dependencies (if needed)

If using n8n self-hosted, install `pdf-parse`:

```bash
npm install pdf-parse
```

**For n8n Cloud:** Dependencies are pre-installed! Skip this step.

---

### Step 4: Get Webhook URL

1. **Activate the Workflow**
   - Click **"Active"** toggle in top-right (turn it ON)

2. **Get Webhook URL**
   - Click on the **"Webhook Trigger"** node
   - Copy the **Production URL**, should be:
     ```
     https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion
     ```

3. **Save this URL** - you'll need it for the backend configuration

---

### Step 5: Update Backend with Webhook URL

1. **Open backend env file**
   ```bash
   cd botflow-backend
   code .env
   ```

2. **Add n8n webhook URL**
   ```env
   N8N_WEBHOOK_URL=https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion
   ```

3. **Restart backend** (if running)
   ```bash
   npm run dev
   ```

---

## Workflow Node Overview

The workflow has 14 nodes:

1. **Webhook Trigger** - Receives file upload notifications
2. **HMAC Verify** - Security check (verifies signature)
3. **Download PDF** - Gets file from Supabase Storage
4. **Parse PDF** - Extracts text using pdf-parse
5. **Chunk Text** - Splits into 2000-char chunks with 200-char overlap
6. **Split In Batches** - Processes 10 chunks at a time
7. **Generate Embedding** - Calls OpenAI API
8. **Format Embedding** - Prepares data for database
9. **Insert Embedding** - Stores in PostgreSQL
10. **Loop Back** - Returns to batch processing
11. **Aggregate Results** - Collects stats after all chunks
12. **Update Status to Indexed** - Marks article as complete
13. **Generate Callback Signature** - Creates HMAC for callback
14. **Callback to Backend** - Notifies backend of completion

---

## Testing the Workflow

### Option 1: Test with n8n Test Button

1. Click on **"Webhook Trigger"** node
2. Click **"Listen for Test Event"**
3. In another terminal, send test payload:

```powershell
# PowerShell
$headers = @{
    "Content-Type" = "application/json"
    "x-webhook-signature" = "test-signature-here"
}

$body = @{
    article_id = "test-uuid-123"
    bot_id = "bot-uuid-456"
    file_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    metadata = @{
        file_name = "test.pdf"
        file_size = 13264
        file_type = "application/pdf"
    }
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion" -Method POST -Headers $headers -Body $body
```

### Option 2: Test via Backend API

```powershell
# 1. Login to get token
$loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"your-email","password":"your-password"}'
$token = ($loginResponse.Content | ConvertFrom-Json).token

# 2. Create knowledge article
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    title = "Test Document"
    file_name = "test.pdf"
    file_size = 13264
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3001/api/bots/YOUR_BOT_ID/knowledge" -Method POST -Headers $headers -Body $body
$response.Content
```

---

## Verifying Success

### 1. Check n8n Execution History

- Go to **Executions** tab in n8n
- You should see successful execution (green checkmark)
- Click to view details of each node

### 2. Check Database

```sql
-- Check if embeddings were created
SELECT COUNT(*) as total_embeddings
FROM knowledge_embeddings
WHERE source_id = 'your-article-id';

-- Check article status
SELECT
    id,
    title,
    metadata->>'status' as status,
    (metadata->>'total_chunks')::int as chunks,
    created_at
FROM knowledge_base_articles
WHERE id = 'your-article-id';
```

### 3. Test Vector Search

```sql
-- Get a sample embedding
SELECT embedding
FROM knowledge_embeddings
LIMIT 1;

-- Test search (replace with actual embedding)
SELECT
    content,
    1 - (embedding <=> '[0.1, 0.2, ..., 0.5]'::vector) as similarity
FROM knowledge_embeddings
WHERE bot_id = 'your-bot-id'
ORDER BY embedding <=> '[0.1, 0.2, ..., 0.5]'::vector
LIMIT 5;
```

---

## Troubleshooting

### Error: "Missing webhook signature"

**Solution:** Ensure backend is sending `x-webhook-signature` header

Check backend code in `botflow-backend/src/routes/knowledge.ts`:
```typescript
headers: {
  'x-webhook-signature': signature
}
```

### Error: "Invalid webhook signature"

**Solution:** Verify `N8N_WEBHOOK_SECRET` matches in both:
- Backend `.env` file
- n8n environment variables

### Error: "pdf-parse not found"

**Solution:**
- **n8n Cloud:** Should work automatically
- **Self-hosted:** Run `npm install pdf-parse` in n8n directory

### Error: "OpenAI rate limit"

**Solution:**
- Reduce batch size from 10 to 5 in "Split In Batches" node
- Add 1-second delay between batches
- Check OpenAI dashboard for quota limits

### Error: "Supabase connection failed"

**Solution:**
- Verify `SUPABASE_URL` is correct (no trailing slash)
- Check `SUPABASE_SERVICE_ROLE_KEY` has full permissions
- Test connection in Supabase dashboard

### Workflow stops at "Download PDF"

**Solution:**
- Verify file URL is publicly accessible
- Check file is in Supabase Storage bucket
- Ensure signed URL hasn't expired (60 min default)

---

## Performance Tuning

### For Small PDFs (<10 pages)
- Keep batch size at 10
- No delays needed
- Expected time: 5-10 seconds

### For Large PDFs (>50 pages)
- Increase batch size to 20
- Add 500ms delay between batches
- Expected time: 30-60 seconds

### For Very Large PDFs (>200 pages)
- Consider splitting into multiple documents
- Or increase timeout limits
- Monitor OpenAI API usage

---

## Next Steps After Setup

1. **Test with Real PDF**
   - Upload a business document (policy, FAQ, manual)
   - Verify embeddings are created
   - Test search function

2. **Integrate RAG into Chat**
   - Add knowledge retrieval to WhatsApp workflow
   - Test responses include citations
   - Verify accuracy of answers

3. **Monitor Performance**
   - Check execution times in n8n
   - Monitor OpenAI API costs
   - Track database storage usage

4. **Build Frontend UI**
   - Create upload page in dashboard
   - Show processing status
   - Display statistics

---

## Environment Variables Checklist

Make sure these are set in n8n:

- [ ] `OPENAI_API_KEY` - For embedding generation
- [ ] `SUPABASE_URL` - Database connection
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Full database access
- [ ] `N8N_WEBHOOK_SECRET` - For HMAC verification

And in backend `.env`:

- [ ] `N8N_WEBHOOK_URL` - To trigger the workflow
- [ ] `N8N_WEBHOOK_SECRET` - Same as in n8n
- [ ] All other existing variables

---

## Cost Estimates

### Per 10-page PDF:
- **OpenAI Embeddings:** ~20 chunks × $0.00002 = $0.0004 (basically free)
- **Supabase Storage:** ~100KB = negligible
- **Database:** ~6KB per chunk × 20 = ~120KB

### Per 1000 PDFs (10 pages each):
- **Total cost:** ~$0.40 for embeddings
- **Storage:** ~100MB for files, ~120MB for embeddings
- **Well within free tier!**

---

## Support & Documentation

- **n8n Docs:** https://docs.n8n.io
- **OpenAI Embeddings:** https://platform.openai.com/docs/guides/embeddings
- **pgvector:** https://github.com/pgvector/pgvector
- **Phase 2 Guides:**
  - [PHASE2_WEEK1_GUIDE.md](./PHASE2_WEEK1_GUIDE.md)
  - [PHASE2_WEEK1.2_GUIDE.md](./PHASE2_WEEK1.2_GUIDE.md)
  - [PHASE2_N8N_WORKFLOW_GUIDE.md](./PHASE2_N8N_WORKFLOW_GUIDE.md)

---

**Ready to go! 🚀** Import the workflow and start testing!

Last updated: 2026-01-15
