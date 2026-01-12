# Google Calendar OAuth Setup Guide

## Current Status
❌ Google Calendar returns "Error 400: invalid_request" - Missing redirect_uri parameter

## Root Cause
The backend needs Google OAuth credentials configured in Railway environment variables.

## Setup Steps

### 1. Get Your Railway Backend URL
1. Go to [Railway Dashboard](https://railway.app/)
2. Find your BotFlow backend project
3. Copy the deployment URL (e.g., `https://botflow-backend-production.up.railway.app`)

### 2. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create project "BotFlow"
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: "BotFlow Backend"

5. Configure Authorized Redirect URIs:
   - Add: `https://your-backend-url.up.railway.app/api/calendar/callback`
   - Example: `https://botflow-backend-production.up.railway.app/api/calendar/callback`
   - Click "Create"

6. Copy credentials:
   - **Client ID**: Copy this (looks like: `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like: `GOCSPX-abc123def456`)

### 3. Add Environment Variables to Railway

1. Go to Railway Dashboard
2. Select your backend project
3. Go to "Variables" tab
4. Add these three variables:

```
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_REDIRECT_URI=https://your-backend-url.up.railway.app/api/calendar/callback
```

4. Railway will automatically redeploy (takes ~2 minutes)

### 4. Test the Integration

1. Clear browser data (F12 → Application → Clear site data)
2. Go to https://your-frontend.vercel.app/dashboard/marketplace
3. Find "Google Calendar" integration
4. Click "Connect" or "Enable"
5. You should be redirected to Google OAuth consent screen
6. Grant permissions
7. You'll be redirected back to BotFlow with success message

## Troubleshooting

### Error: "redirect_uri_mismatch"
- The redirect URI in Google Console doesn't match Railway backend URL
- Make sure there are no typos
- Make sure it ends with `/api/calendar/callback`

### Error: "Access blocked: This app's request is invalid"
- Google OAuth credentials not configured in Railway
- Check that all 3 environment variables are set
- Wait for Railway deployment to complete

### Error: "invalid_request"
- Environment variables not set in Railway
- Verify variables are saved in Railway dashboard

## Architecture

```
User clicks "Connect Google Calendar"
    ↓
Frontend redirects to: Backend/api/calendar/auth
    ↓
Backend redirects to: Google OAuth consent screen
    ↓
User grants permissions
    ↓
Google redirects to: Backend/api/calendar/callback?code=...
    ↓
Backend exchanges code for access tokens
    ↓
Backend stores tokens in database (encrypted)
    ↓
Backend redirects to: Frontend/dashboard/integrations?status=success
    ↓
User sees success message
```

## Security Notes

- OAuth tokens are stored in the database
- **TODO**: Implement encryption for stored credentials (currently not encrypted)
- Tokens include refresh_token for long-term access
- Scopes requested: Calendar read/write access

## Next Steps After Setup

Once Google Calendar is connected, bots can:
1. Check availability in user's calendar
2. Create booking events automatically
3. Send calendar invites to customers
4. Update/cancel appointments
5. Check for scheduling conflicts

## Files Modified

No code changes needed - this is pure configuration:
- Railway: Environment variables
- Google Console: OAuth credentials

---

**Estimated Setup Time**: 10-15 minutes
**Priority**: Medium (optional feature, doesn't block core bot creation)
