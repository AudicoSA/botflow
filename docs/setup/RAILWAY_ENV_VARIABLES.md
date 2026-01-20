# Railway Environment Variables - URGENT FIX

## Issue 1: Google Sheets OAuth Redirecting to Localhost

The `FRONTEND_URL` environment variable in Railway is currently set to `http://localhost:3000`, which causes Google OAuth callbacks to redirect to localhost instead of your production site.

## Fix Required

Go to Railway Dashboard and update this environment variable:

### Current (WRONG):
```
FRONTEND_URL=http://localhost:3000
```

### Should be (CORRECT):
```
FRONTEND_URL=https://botflow-r9q3.vercel.app
```

## Steps to Fix

1. Go to [Railway Dashboard](https://railway.app/)
2. Select your `botflow-backend` project
3. Click on **Variables** tab
4. Find `FRONTEND_URL`
5. Change the value to: `https://botflow-r9q3.vercel.app`
6. Click **Deploy** to restart the service with the new variable

## Verification

After the fix, test:
1. Dashboard → Integrations → Google Sheets → Connect
2. After Google OAuth approval, you should be redirected back to:
   `https://botflow-r9q3.vercel.app/dashboard/integrations` (NOT localhost)

## All Required Railway Environment Variables

Here's a complete list of what should be set in Railway:

### Required (Core)
```bash
# Supabase
SUPABASE_URL=https://yfmntscuqgxnnqppxdha.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret

# Frontend
FRONTEND_URL=https://botflow-r9q3.vercel.app

# OpenAI
OPENAI_API_KEY=your_openai_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### Optional (Integrations)
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://botflow-production.up.railway.app/api/integrations/google-sheets/callback

# Bird (WhatsApp)
BIRD_API_KEY=your_bird_key
BIRD_WORKSPACE_ID=your_workspace_id

# Twilio (WhatsApp fallback)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Redis (for message queue)
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# n8n (for workflows)
N8N_API_URL=your_n8n_url
N8N_API_KEY=your_n8n_key
```

## Priority

**HIGH PRIORITY** - Fix `FRONTEND_URL` immediately to resolve Google Sheets OAuth redirect issue.
