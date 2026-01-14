# Google OAuth Setup Guide

This guide explains how to configure Google OAuth for BotFlow, enabling:
1. **Google Sign-In** - Users can login/signup with their Google account
2. **Google Sheets Integration** - Users can connect Google Sheets to export data
3. **Google Calendar Integration** - Users can sync appointments with Google Calendar

## Important: Separate OAuth Flows

Google OAuth works with **scopes** (permissions). Each integration requests different scopes:

- **Google Sign-In**: `email`, `profile` (basic user info)
- **Google Sheets**: `spreadsheets` (read/write spreadsheets)
- **Google Calendar**: `calendar` (read/write calendar events)

Users grant permissions separately for each service. Signing in with Google does NOT automatically grant access to Sheets or Calendar.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. **Project Name**: `BotFlow` (or your preferred name)
4. **Organization**: Leave blank or select your organization
5. Click "Create"

## Step 2: Enable Required APIs

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search and enable these APIs:
   - **Google+ API** (for Sign-In)
   - **Google Sheets API** (for Sheets integration)
   - **Google Calendar API** (for Calendar integration)
3. Click "Enable" for each API

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **User Type**:
   - **External**: For public users (recommended)
   - **Internal**: Only for Google Workspace users in your org
3. Click "Create"

### Fill in App Information:

**App Information:**
- **App name**: `BotFlow`
- **User support email**: `kenny@audico.co.za`
- **App logo**: Upload your logo (120x120px minimum)

**App Domain:**
- **Application home page**: `https://botflow-r9q3.vercel.app`
- **Application privacy policy**: `https://botflow-r9q3.vercel.app/privacy`
- **Application terms of service**: `https://botflow-r9q3.vercel.app/terms`

**Authorized domains:**
- `vercel.app`
- `botflow-r9q3.vercel.app`
- `railway.app`
- `botflow-production.up.railway.app`
- (Add your custom domain if you have one)

**Developer contact information:**
- Email: `kenny@audico.co.za`

4. Click "Save and Continue"

### Scopes:

1. Click "Add or Remove Scopes"
2. Add these scopes:
   - `email` - See your primary Google Account email address
   - `profile` - See your personal info, including any personal info you've made publicly available
   - `https://www.googleapis.com/auth/spreadsheets` - See, edit, create, and delete your spreadsheets
   - `https://www.googleapis.com/auth/calendar` - See, edit, share, and permanently delete all calendars
3. Click "Update" → "Save and Continue"

### Test Users (for development):

1. Add test emails (while app is in "Testing" status):
   - `kenny@audico.co.za`
   - Add any other emails you want to test with
2. Click "Save and Continue"

### Publishing Status:

- **Testing**: Only test users can use the app
- **In Production**: Anyone can use it (requires Google verification for sensitive scopes)

For now, leave it in "Testing" mode. You'll need to submit for verification when ready to launch publicly.

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. **Application type**: Web application
4. **Name**: `BotFlow Web Client`

### Authorized JavaScript origins:

Add these URLs:
```
https://botflow-r9q3.vercel.app
https://botflow-production.up.railway.app
http://localhost:3000
http://localhost:3001
```

### Authorized redirect URIs:

Add these URLs:
```
https://botflow-r9q3.vercel.app/auth/google/callback
https://botflow-r9q3.vercel.app/auth/google/success
https://botflow-production.up.railway.app/api/auth/google/callback
http://localhost:3000/auth/google/callback
http://localhost:3001/api/auth/google/callback
```

5. Click "Create"
6. **Copy the Client ID and Client Secret** - you'll need these next

## Step 5: Configure Environment Variables

### Backend (Railway):

Add these environment variables to Railway:

```bash
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### Frontend (Vercel):

No Google-specific env vars needed. The frontend redirects to the backend OAuth endpoint.

## Step 6: Test the Integration

### Test Google Sign-In:

1. Go to https://botflow-r9q3.vercel.app/login
2. Click "Continue with Google"
3. You should be redirected to Google's consent screen
4. Choose your Google account
5. Grant permissions
6. You should be redirected back to the dashboard

### Test Google Sheets Integration:

1. Login to BotFlow
2. Go to Dashboard → Integrations
3. Find "Google Sheets" and click "Connect"
4. Grant Sheets permissions
5. Should show "Connected" status

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in your code doesn't match what's configured in Google Cloud Console

**Fix**:
1. Check the error message for the actual redirect URI being used
2. Add that exact URI to "Authorized redirect URIs" in Google Cloud Console
3. Wait 5 minutes for changes to propagate

### Error: "invalid_client"

**Cause**: Client ID or Client Secret is wrong

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth 2.0 Client ID
3. Copy the Client ID and Client Secret again
4. Update Railway environment variables
5. Redeploy

### Error: "access_denied"

**Cause**: User denied permission or app is not published

**Fix**:
1. Make sure your email is added to "Test users" in OAuth consent screen
2. OR publish the app (requires verification for sensitive scopes)

### Error: "This app isn't verified"

**Cause**: App is in testing mode and user is not a test user

**Fix**:
1. Add the user's email to "Test users" in OAuth consent screen
2. OR click "Advanced" → "Go to BotFlow (unsafe)" during consent (only for testing)
3. For production, submit app for verification

## Current Configuration

**Frontend URL**: https://botflow-r9q3.vercel.app
**Backend URL**: https://botflow-production.up.railway.app

**OAuth Endpoints**:
- Start Google Sign-In: `GET /api/auth/google`
- OAuth Callback: `GET /api/auth/google/callback`
- Success Page: `/auth/google/success`
- Error Page: `/auth/google/error`

**Google Sheets Integration**:
- Start OAuth: `GET /api/integrations/google-sheets/auth`
- OAuth Callback: `GET /api/integrations/google-sheets/callback`

## Security Best Practices

1. **Never commit** Client Secret to git
2. **Store secrets** in environment variables only
3. **Use HTTPS** in production (required by Google)
4. **Validate tokens** on the backend
5. **Request minimal scopes** - only what you need
6. **Refresh tokens** - store refresh tokens securely for long-term access

## Next Steps

After setup is complete:

1. ✅ Test Google Sign-In with your account
2. ✅ Test Google Sheets integration
3. ✅ Add more test users if needed
4. 📋 Submit for Google verification when ready to launch publicly
5. 📋 Add custom domain to authorized domains
6. 📋 Update Privacy Policy and Terms of Service pages

## Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [API Library](https://console.cloud.google.com/apis/library)
