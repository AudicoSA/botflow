# Vercel Environment Variables Setup Guide

## 🔧 Required Environment Variables for Vercel

You need to add these environment variables in Vercel for the frontend to connect to your backend:

### Go to Vercel Dashboard:
1. Open: https://vercel.com/audico-sa/botflow-r9q3/settings/environment-variables
2. Add each variable below:

---

### Environment Variables to Add:

**NEXT_PUBLIC_API_URL**
- Value: `https://your-railway-backend-url.railway.app/api`
- Environment: Production, Preview, Development
- Description: Backend API URL

**NEXT_PUBLIC_SUPABASE_URL**
- Value: `https://ajtnixmnfuqtrgrakxss.supabase.co`
- Environment: Production, Preview, Development
- Description: Supabase project URL

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Value: Your Supabase anon key
- Environment: Production, Preview, Development
- Description: Supabase anonymous key

---

## 🚂 Get Your Railway Backend URL

### Option 1: Check Railway Dashboard
1. Go to: https://railway.app/dashboard
2. Find your backend project
3. Click on the service
4. Look for "Domains" or "Public URL"
5. Copy the URL (e.g., `https://botflow-backend-production.up.railway.app`)

### Option 2: Check Railway CLI
```bash
railway status
```

---

## 📝 Quick Setup Steps

1. **Get Railway URL** (from Railway dashboard)
2. **Add to Vercel**:
   - Go to Vercel project settings
   - Environment Variables
   - Add `NEXT_PUBLIC_API_URL` = `https://your-railway-url.railway.app/api`
3. **Redeploy**:
   - Vercel → Deployments
   - Click "..." on latest deployment
   - Click "Redeploy"

---

## 🧪 Test After Setup

1. Wait for Vercel redeploy (~2 minutes)
2. Go to: `https://botflow-r9q3.vercel.app/dashboard/bots/create`
3. Try creating a bot
4. Should work now! ✅

---

## 🐛 If Still Not Working

**Check**:
1. Railway backend is deployed and running
2. Environment variables are set correctly in Vercel
3. Railway backend has CORS enabled for Vercel domain
4. Browser console for specific error messages

**Common Issues**:
- Railway URL wrong → Check Railway dashboard
- CORS error → Add Vercel domain to backend CORS config
- 404 error → Backend route not found, check Railway logs
