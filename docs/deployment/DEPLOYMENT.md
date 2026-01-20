# BotFlow - Deployment Guide

## Quick Deploy to Vercel & Railway

### Frontend (Vercel) - 5 minutes

1. **Push to GitHub**
   ```bash
   cd "C:\Users\kenny\OneDrive\Whatsapp Service"
   git init
   git add .
   git commit -m "Initial BotFlow commit"
   ```

2. **Create GitHub repo**
   - Go to github.com/new
   - Name: `botflow`
   - Don't initialize with README
   - Copy the commands and run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/botflow.git
   git branch -M main
   git push -u origin main
   ```

3. **Deploy Frontend to Vercel**
   - Go to vercel.com
   - Click "New Project"
   - Import your GitHub repo
   - **Root Directory:** `botflow-website`
   - **Framework Preset:** Next.js
   - **Environment Variables:**
     - `NEXT_PUBLIC_API_URL` = (we'll add this after backend is deployed)
   - Click "Deploy"

### Backend (Railway) - 5 minutes

1. **Deploy to Railway**
   - Go to railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `botflow` repo
   - **Root Directory:** `botflow-backend`
   - Click "Deploy"

2. **Add Environment Variables in Railway**
   Go to your project → Variables tab, add:
   ```
   NODE_ENV=production
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   BIRD_API_KEY=your_bird_key
   BIRD_WORKSPACE_ID=your_workspace_id
   OPENAI_API_KEY=your_openai_key
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

3. **Get Railway URL**
   - Railway will give you a URL like: `https://botflow-backend-production.up.railway.app`
   - Copy this URL

4. **Update Vercel Environment Variable**
   - Go back to Vercel → Your project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-railway-url.railway.app`
   - Redeploy

### Alternative: All on Vercel

You can also deploy the backend on Vercel:

1. **Create `vercel.json` in botflow-backend:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/server.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/server.ts"
       }
     ]
   }
   ```

2. **Deploy backend separately**
   - New Vercel project
   - Root: `botflow-backend`
   - Add all environment variables

---

## Simpler Option: Just Deploy Landing Page

If you just want to get the landing page live quickly:

1. **Deploy only botflow-website to Vercel**
   - Root Directory: `botflow-website`
   - No environment variables needed
   - The landing page will work perfectly!

2. **Point your domain**
   - In Vercel: Settings → Domains
   - Add `botflow.co.za`
   - Update your DNS records

---

## What would you like to do?

**Option A:** Deploy everything (frontend + backend) - Full platform
**Option B:** Deploy just the landing page - Quick & simple
**Option C:** I'll help you debug the local setup

Let me know and I'll guide you through it! 🚀
