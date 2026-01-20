# n8n Integration Setup Guide

## Quick Start

### 1. Deploy n8n Instance

#### Option A: Local Docker (Development)
```bash
# Navigate to project root
cd "C:\Users\kenny\OneDrive\Whatsapp Service"

# Copy environment file
copy n8n.env.example n8n.env

# Edit n8n.env with your database credentials

# Start n8n
docker-compose -f n8n-docker-compose.yml up -d

# Check logs
docker logs -f botflow-n8n
```

n8n will be available at: http://localhost:5678

#### Option B: Railway Deployment (Production)
1. Go to https://railway.app
2. Click "New Project" → "Deploy n8n"
3. Set environment variables:
   - `N8N_BASIC_AUTH_USER=admin`
   - `N8N_BASIC_AUTH_PASSWORD=your_secure_password`
   - `N8N_API_KEY_AUTH_ENABLED=true`
   - `WEBHOOK_URL=https://your-app.railway.app/`
4. Deploy and note the URL

### 2. Get n8n API Key

1. Access n8n UI: http://localhost:5678 (or your Railway URL)
2. Login with credentials:
   - Username: `admin`
   - Password: `BotFlow2026SecurePassword` (or your custom password)
3. Go to Settings → API
4. Generate new API key
5. Copy the API key

### 3. Configure BotFlow Backend

Update `botflow-backend/.env`:
```env
# n8n Integration
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your_generated_api_key_here
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

For Railway deployment:
```env
N8N_API_URL=https://your-app.railway.app/api/v1
N8N_API_KEY=your_generated_api_key_here
N8N_WEBHOOK_URL=https://your-app.railway.app/webhook
```

### 4. Run Database Migration

```bash
cd botflow-backend

# Connect to Supabase and run migration
# You can use Supabase SQL Editor or psql
```

Copy the contents of `migrations/003_n8n_integration.sql` and run in Supabase SQL Editor.

### 5. Test n8n Connection

```bash
# Start BotFlow backend
npm run dev

# The backend will test n8n connection on startup
# Check logs for: "n8n connection test: OK"
```

## Architecture

```
┌─────────────────────────────────────────┐
│     BotFlow Backend (Fastify)           │
│  - Receives WhatsApp messages           │
│  - Generates n8n workflows              │
│  - Forwards to n8n via webhook          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│     n8n Instance (Docker/Railway)       │
│  - Executes workflows                   │
│  - Handles integrations                 │
│  - Returns results                      │
└─────────────────────────────────────────┘
```

## Next Steps

1. ✅ Deploy n8n instance
2. ✅ Get API key
3. ✅ Configure BotFlow backend
4. ✅ Run database migration
5. ⏳ Create first bot template (Booking Bot)
6. ⏳ Test end-to-end flow
7. ⏳ Add more templates

## Troubleshooting

### n8n won't start
- Check Docker is running
- Check port 5678 is not in use
- Check database connection

### API connection fails
- Verify API key is correct
- Check n8n URL is accessible
- Check firewall settings

### Workflows don't execute
- Check workflow is activated in n8n
- Verify webhook URL is correct
- Check n8n execution logs

## Resources

- n8n Documentation: https://docs.n8n.io
- n8n API Reference: https://docs.n8n.io/api/
- BotFlow Integration Strategy: See `n8n_node_integration_strategy.md`
