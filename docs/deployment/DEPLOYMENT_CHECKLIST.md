# n8n Integration - Deployment Checklist

## ✅ Completed

- [x] n8n API client service created
- [x] Workflow generator implemented (Booking Bot template)
- [x] Database migration SQL ready
- [x] Environment variables configured
- [x] Railway deployment guide created
- [x] Setup documentation complete

---

## 🚀 Next Steps (Do These Now)

### Step 1: Deploy n8n to Railway (5 minutes)

1. **Open Railway**: https://railway.app/template/n8n
2. **Click "Deploy Now"**
3. **Set these environment variables**:
   ```
   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=BotFlow2026SecurePassword
   ```
4. **Click Deploy** and wait 2-3 minutes
5. **Copy your Railway URL** (e.g., `https://n8n-production-xxxx.up.railway.app`)

### Step 2: Get n8n API Key (2 minutes)

1. **Open your Railway URL** in browser
2. **Login**: admin / BotFlow2026SecurePassword
3. **Go to**: Settings → API
4. **Click**: "Create API Key"
5. **Copy the key** (you'll need it in Step 3)

### Step 3: Update BotFlow Backend (1 minute)

Edit `botflow-backend/.env` and update these lines:

```env
# Replace with your actual Railway URL and API key
N8N_API_URL=https://your-railway-url.up.railway.app/api/v1
N8N_API_KEY=your_api_key_from_step_2
N8N_WEBHOOK_URL=https://your-railway-url.up.railway.app/webhook
```

### Step 4: Run Database Migration (2 minutes)

1. **Open Supabase**: https://supabase.com/dashboard/project/ajtnixmnfuqtrgrakxss/sql
2. **Copy** the contents of `botflow-backend/migrations/003_n8n_integration.sql`
3. **Paste** into SQL Editor
4. **Click "Run"**
5. **Verify**: You should see "Success. No rows returned"

### Step 5: Test Connection (1 minute)

```bash
cd botflow-backend
npm run dev
```

**Look for this in the logs**:
```
✅ n8n connection test: OK
```

---

## 🎯 What You'll Have After This

1. ✅ n8n instance running on Railway (publicly accessible)
2. ✅ API connection working between BotFlow and n8n
3. ✅ Database tables ready for workflow storage
4. ✅ Ready to create your first bot template!

---

## 📝 Quick Reference

### Important Files
- **Railway Guide**: `N8N_RAILWAY_DEPLOY.md`
- **Database Migration**: `botflow-backend/migrations/003_n8n_integration.sql`
- **Environment Config**: `botflow-backend/.env`

### Important URLs
- **Railway Template**: https://railway.app/template/n8n
- **Supabase SQL Editor**: https://supabase.com/dashboard/project/ajtnixmnfuqtrgrakxss/sql
- **Your n8n Instance**: (You'll get this after deployment)

---

## ⏭️ After Deployment

Once n8n is deployed and connected, we'll:

1. Create the Booking Bot UI in the dashboard
2. Test workflow generation
3. Connect to WhatsApp
4. Create your first working bot!

**Estimated time to complete all steps: ~10 minutes**

Ready to deploy? Follow the steps above! 🚀
