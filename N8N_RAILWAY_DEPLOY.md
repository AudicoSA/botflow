# n8n Railway Deployment Guide

## Quick Deploy to Railway (5 minutes)

Railway offers the easiest way to deploy n8n with a publicly accessible URL that works with WhatsApp webhooks immediately.

### Step 1: Deploy n8n to Railway

1. **Go to Railway**: https://railway.app
2. **Sign up/Login** (GitHub account recommended)
3. **Click "New Project"**
4. **Select "Deploy from Template"**
5. **Search for "n8n"** or use this direct link:
   - https://railway.app/template/n8n

### Step 2: Configure Environment Variables

Railway will prompt you to set these variables:

```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=BotFlow2026SecurePassword

N8N_ENCRYPTION_KEY=generate_random_32_char_string_here

WEBHOOK_URL=https://your-app-name.up.railway.app/
N8N_PROTOCOL=https
N8N_HOST=your-app-name.up.railway.app
```

**Important:** Railway will auto-generate a PostgreSQL database for you!

### Step 3: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for deployment
3. Railway will provide a URL like: `https://your-app-name.up.railway.app`

### Step 4: Access n8n

1. Open your Railway URL in browser
2. Login with:
   - Username: `admin`
   - Password: `BotFlow2026SecurePassword`

### Step 5: Generate API Key

1. In n8n UI, go to **Settings** → **API**
2. Click **"Create API Key"**
3. Copy the generated key
4. Save it securely

### Step 6: Update BotFlow Backend

Edit `botflow-backend/.env`:

```env
# n8n Integration (Railway)
N8N_API_URL=https://your-app-name.up.railway.app/api/v1
N8N_API_KEY=your_generated_api_key_from_step_5
N8N_WEBHOOK_URL=https://your-app-name.up.railway.app/webhook
```

### Step 7: Run Database Migration

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Go to your project: `ajtnixmnfuqtrgrakxss`
3. Click **SQL Editor**
4. Copy contents of `botflow-backend/migrations/003_n8n_integration.sql`
5. Paste and click **"Run"**

### Step 8: Test Connection

```bash
cd botflow-backend
npm run dev
```

Look for log message: `"n8n connection test: OK"`

---

## Alternative: Local Docker (If you prefer)

If you want to run n8n locally, you'll need to:

1. **Start Docker Desktop**
   - Open Docker Desktop application
   - Wait for it to fully start

2. **Deploy n8n**
   ```bash
   cd "C:\Users\kenny\OneDrive\Whatsapp Service"
   docker-compose -f n8n-docker-compose.yml up -d
   ```

3. **Access n8n**
   - Open: http://localhost:5678
   - Login: admin / BotFlow2026SecurePassword

**Note:** Local deployment won't work with WhatsApp webhooks until you use ngrok or deploy to production.

---

## Cost Comparison

### Railway (Recommended)
- **Free Tier**: $5 credit/month (enough for development)
- **Hobby Plan**: $5/month (500 hours)
- **Pro Plan**: $20/month (unlimited)
- ✅ Publicly accessible
- ✅ Auto-scaling
- ✅ Managed database included

### Local Docker
- **Free** but requires:
  - Docker Desktop (free for personal use)
  - ngrok for webhooks ($8/month for custom domains)
  - Your computer running 24/7

**Recommendation:** Use Railway for both development and production.

---

## Next Steps After Deployment

1. ✅ n8n deployed and accessible
2. ✅ API key generated
3. ✅ BotFlow backend configured
4. ✅ Database migration run
5. ⏳ Create first bot template
6. ⏳ Test workflow generation
7. ⏳ Test with WhatsApp messages

---

## Troubleshooting

### Can't access Railway URL
- Wait 2-3 minutes after deployment
- Check Railway dashboard for deployment status
- Look for errors in Railway logs

### API key not working
- Verify you copied the full key
- Check for extra spaces in .env file
- Restart BotFlow backend after updating .env

### Database migration fails
- Ensure you're using the correct Supabase project
- Check for syntax errors in SQL
- Verify you have admin access to Supabase

---

## Railway Deployment Screenshot Guide

1. **New Project** → **Deploy Template**
2. **Search "n8n"** → Select official template
3. **Configure** → Set environment variables
4. **Deploy** → Wait for completion
5. **Open** → Access your n8n instance

**Your n8n instance will be live in ~3 minutes!** 🚀
