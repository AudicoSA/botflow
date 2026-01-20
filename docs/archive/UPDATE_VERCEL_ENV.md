# Update Vercel Environment Variable

## Issue
The Vercel frontend at https://botflow-r9q3.vercel.app is pointing to the wrong backend URL.

## Current Status
- **Current API URL**: Unknown (needs to be checked in Vercel dashboard)
- **Correct API URL**: `https://botflow-production.up.railway.app`

## Steps to Fix

### Option 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Find your project: `botflow-website` or similar
3. Click on the project
4. Go to **Settings** → **Environment Variables**
5. Find `NEXT_PUBLIC_API_URL`
6. Update its value to: `https://botflow-production.up.railway.app`
7. Select which environments to apply to: **Production**, **Preview**, **Development**
8. Click **Save**
9. Go to **Deployments** tab
10. Click the **three dots** (⋮) on the latest deployment
11. Click **Redeploy** to apply the new environment variable

### Option 2: Vercel CLI

If you have Vercel CLI installed:

```bash
cd botflow-website
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://botflow-production.up.railway.app
vercel --prod
```

## Verification

After redeployment, test:

1. Open https://botflow-r9q3.vercel.app/login in **incognito window**
2. Open browser console (F12)
3. Before logging in, run:
   ```javascript
   console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'Not set')
   ```
4. Login with kenny@audico.co.za
5. After login, check localStorage:
   ```javascript
   console.log('Organization ID:', localStorage.getItem('botflow_organizationId'))
   console.log('WhatsApp Account ID:', localStorage.getItem('botflow_whatsappAccountId'))
   ```
6. Both should show UUIDs (not null)

## Expected Result

- Organization ID: `d6c7bc1b-9c84-406a-a18d-1106a25ddf6f`
- WhatsApp Account ID: `213f8716-852b-4cac-8d5b-f06c54c33dc6`

## Next Steps

Once the environment variable is updated and redeployed:
1. Clear browser cache
2. Login in incognito
3. Try creating a bot from the Gym & Fitness template
4. Should work without "Missing organization or WhatsApp account" error

---

**Note**: If you don't have access to the Vercel dashboard, you may need to:
- Check who deployed the project originally
- Ask them to update the environment variable
- Or transfer the project to your Vercel account
