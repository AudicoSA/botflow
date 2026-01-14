# Quick Fix Guide - Bot Creation Issue

## Problem
Bot creation fails with "Missing organization or WhatsApp account" even though local database has the data.

## Root Cause
Railway backend is likely connected to a **different Supabase database** than your local environment, OR Railway environment variables are not set correctly.

## Solution - Pick ONE method:

---

### Method 1: Check Railway Environment Variables (FASTEST - 2 minutes)

1. Go to https://railway.app/dashboard
2. Find your project: `botflow-backend` or `botflow-production`
3. Click on the project
4. Go to **Variables** tab
5. Check if these variables exist and match your local `.env`:
   ```
   SUPABASE_URL=https://ajtnixmnfuqtrgrakxss.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**If they DON'T match:**
- Railway is using a different Supabase instance
- You need to either:
  - **Option A**: Update Railway variables to match your local `.env` (then redeploy)
  - **Option B**: Run the SQL script (Method 2) on Railway's Supabase instance

**If they DO match:**
- Continue to Method 2 to verify data exists in Supabase

---

### Method 2: Run SQL Script in Supabase (5 minutes)

This directly creates the organization and WhatsApp account in your Supabase database.

1. Go to https://supabase.com/dashboard
2. Select your project: `ajtnixmnfuqtrgrakxss`
3. Go to **SQL Editor** (left sidebar)
4. Open the file: `RAILWAY_SETUP.sql` (in this folder)
5. Copy all the SQL
6. Paste into SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. You should see results showing your organization and WhatsApp account

**Expected Output:**
```
Step 1: Should show your user ID (dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6)
Step 2-4: Will create/update organization, membership, and WhatsApp account
Step 5: Should return 1 row with WhatsApp account details
```

---

### Method 3: Wait for Debug Endpoints (10-15 minutes)

Railway is currently deploying. Once complete:

```powershell
.\test-debug-endpoints.ps1
```

This will show which Supabase instance Railway is connected to.

---

## After the Fix

Once data is in the correct database:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Open incognito window** (Ctrl+Shift+N)
3. **Login** at https://botflow-r9q3.vercel.app/login
4. **Check localStorage**:
   ```javascript
   console.log(localStorage.getItem('botflow_whatsappAccountId'))
   // Should show: 213f8716-852b-4cac-8d5b-f06c54c33dc6
   ```
5. **Try creating a bot** - Should work!

---

## Still Not Working?

If after Method 1 or 2 it still doesn't work, you may also need to update Vercel:

1. Go to https://vercel.com/dashboard
2. Find project: `botflow-website` or `botflow-r9q3`
3. Go to **Settings** → **Environment Variables**
4. Verify `NEXT_PUBLIC_API_URL` = `https://botflow-production.up.railway.app`
5. If changed, redeploy: **Deployments** → **...** → **Redeploy**

---

## Verification Script

Run this after making changes:

```powershell
.\test-production-login.ps1
```

Expected result: **WhatsApp Account: Found** (not NULL)
