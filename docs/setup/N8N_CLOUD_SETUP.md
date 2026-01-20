# n8n Cloud Setup (No Enterprise Plan Needed!) 🚀

## Good News!

You **DO NOT need environment variables** or the enterprise plan. We can configure everything directly in the workflow nodes!

---

## Recommended: n8n Cloud ✅

**Use n8n Cloud** - it's simpler and you're already set up there!

---

## Quick Setup (10 Minutes)

### Step 1: Import Workflow

1. Login: `https://botflowsa.app.n8n.cloud`
2. Workflows → Add Workflow → Import from File
3. Select: `n8n-knowledge-ingestion-workflow-no-env.json`

### Step 2: Configure OpenAI

1. Settings → Credentials → New Credential
2. Search: "OpenAI API"
3. Enter your API key: `sk-proj-...`
4. Save as: "OpenAI API Key"
5. In workflow, click "Generate Embedding" node → Select this credential

### Step 3: Configure Supabase

Edit 2 nodes with your Supabase service role key from `.env`:

**Node 1: "Insert Embedding to Supabase"**
- Replace: `YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE` (appears twice in headers)

**Node 2: "Update Status to Indexed"**
- Replace: `YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE` (appears twice in headers)

### Step 4: Activate

1. Toggle "Active" → ON
2. Copy webhook URL: `https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion`
3. Add to `botflow-backend/.env`:
   ```
   N8N_WEBHOOK_URL=https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion
   ```

**Done!** ✅

---

## Self-Hosted Alternative (Optional)

Only if you want full control. Requires:
- VPS or cloud server ($5-10/month)
- Docker setup
- SSL certificate
- Webhook URL exposure

**Docker Setup:**
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e OPENAI_API_KEY=sk-proj-... \
  -e SUPABASE_URL=https://ajtnixmnfuqtrgrakxss.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJhbG... \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

**Recommendation:** Stick with n8n Cloud for now!

---

Last updated: 2026-01-15
