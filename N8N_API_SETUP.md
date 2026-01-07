# n8n Cloud API Setup - Action Required

## Issue Found

The access token you provided is for n8n's **MCP Server** (Model Context Protocol), not the **REST API** that BotFlow needs.

We need to get the correct API credentials from your n8n Cloud account.

---

## How to Get n8n Cloud API Credentials

### Step 1: Access n8n Cloud Settings

1. Go to: https://botflowsa.app.n8n.cloud
2. Login with: admin@botflow.co.za
3. Click on your **profile/avatar** (top right)
4. Select **Settings**

### Step 2: Generate API Key

1. In Settings, look for **"API"** or **"API Keys"** section
2. Click **"Create API Key"** or **"Generate New Key"**
3. Give it a name like "BotFlow Integration"
4. Copy the generated API key

### Step 3: Update BotFlow Configuration

Once you have the API key, update `botflow-backend/.env`:

```env
# n8n Integration (n8n Cloud)
N8N_API_URL=https://botflowsa.app.n8n.cloud/api/v1
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxx  # Replace with your actual API key
N8N_WEBHOOK_URL=https://botflowsa.app.n8n.cloud/webhook
```

---

## Alternative: Use Railway Deployment Instead

If n8n Cloud doesn't provide REST API access in your plan, we can use the Railway deployment you created earlier:

**Railway URL**: https://n8n-production-c4730.up.railway.app

### Get Railway n8n API Key:

1. Go to: https://n8n-production-c4730.up.railway.app
2. Create an account or login
3. Go to Settings → API
4. Generate API key
5. Update `.env`:

```env
# n8n Integration (Railway)
N8N_API_URL=https://n8n-production-c4730.up.railway.app/api/v1
N8N_API_KEY=your_railway_n8n_api_key
N8N_WEBHOOK_URL=https://n8n-production-c4730.up.railway.app/webhook
```

---

## Which Should You Use?

**n8n Cloud** (Recommended if API available):
- ✅ Fully managed
- ✅ Better uptime
- ✅ Auto-updates

**Railway** (If Cloud API not available):
- ✅ Full API access
- ✅ Free tier
- ✅ You control it

---

## Next Steps

1. Try to get API key from n8n Cloud settings
2. If not available, use Railway deployment
3. Update `.env` with correct credentials
4. Run test: `npx tsx src/test-n8n-debug.ts`
5. Look for: `✅ Connection successful!`

Let me know which option you'd like to use!
