# Meta Developer App Setup Guide

This guide walks you through setting up a Meta Developer App for WhatsApp Business API integration with BotFlow.

## Prerequisites

- A Facebook account
- A Meta Business Suite account (create one at business.facebook.com if needed)
- A phone number to use for WhatsApp Business (NOT your personal WhatsApp number)

---

## Step 1: Create a Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Click **Get Started** in the top right
3. Log in with your Facebook account
4. Accept the Meta Platform Terms and Developer Policies
5. Verify your account (phone number or credit card)

---

## Step 2: Create a New App

1. From the [Meta Developer Dashboard](https://developers.facebook.com/apps/), click **Create App**

2. Select **Other** for the use case, then click **Next**

3. Select **Business** as the app type, then click **Next**

4. Fill in the app details:
   - **App name**: `BotFlow WhatsApp` (or your preferred name)
   - **App contact email**: Your business email
   - **Business Account**: Select your Meta Business account (or create one)

5. Click **Create App**

6. You may be asked to re-enter your Facebook password

---

## Step 3: Add WhatsApp Product

1. From your app dashboard, scroll down to **Add products to your app**

2. Find **WhatsApp** and click **Set up**

3. You'll be taken to the WhatsApp Getting Started page

---

## Step 4: Configure WhatsApp Business Account

### Option A: Create a New WhatsApp Business Account

1. Click **Create a WhatsApp Business Account**
2. Follow the prompts to:
   - Enter your business name
   - Select your business category
   - Add your business phone number
3. Verify the phone number via SMS or voice call

### Option B: Use an Existing WhatsApp Business Account

1. Click **Select a WhatsApp Business Account**
2. Choose your existing WABA from the dropdown
3. Select or add a phone number

---

## Step 5: Get Your Credentials

After setup, you'll need these values for BotFlow:

### 5.1 App ID and App Secret

1. Go to **App Settings** → **Basic** (in the left sidebar)
2. Copy your **App ID** (visible on page)
3. Click **Show** next to **App Secret** and copy it

```
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
```

### 5.2 Phone Number ID and WABA ID

1. Go to **WhatsApp** → **API Setup** (in the left sidebar)
2. Under **Send and receive messages**, you'll see:
   - **Phone number ID**: A numeric ID like `123456789012345`
   - **WhatsApp Business Account ID**: Found in the URL or under account settings

### 5.3 Permanent Access Token

For production, you need a permanent token (the temporary one expires in 24 hours):

1. Go to **Business Settings** at [business.facebook.com/settings](https://business.facebook.com/settings)

2. Navigate to **Users** → **System Users**

3. Click **Add** to create a new system user:
   - Name: `BotFlow API`
   - Role: **Admin**

4. Click on the system user you created

5. Click **Add Assets** and add your WhatsApp Business Account with **Full Control**

6. Click **Generate New Token**:
   - Select your app
   - Token expiration: **Never**
   - Permissions: Select these:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`

7. Copy the generated token (you won't see it again!)

```
# This is the token users will enter in the BotFlow Embedded Signup
```

---

## Step 6: Configure Webhook

The webhook allows Meta to send incoming WhatsApp messages to BotFlow.

### 6.1 Set Webhook URL

1. Go to **WhatsApp** → **Configuration** in your app dashboard

2. Under **Webhook**, click **Edit**

3. Enter your webhook details:
   - **Callback URL**: `https://your-backend-url.com/webhooks/meta/whatsapp`
   - **Verify token**: Generate a random string (e.g., `bf_verify_abc123xyz`)

4. Click **Verify and Save**

```
META_WEBHOOK_VERIFY_TOKEN=bf_verify_abc123xyz
```

### 6.2 Subscribe to Webhook Events

1. After verification, click **Manage** under Webhook fields

2. Subscribe to these fields:
   - ✅ `messages` - Incoming messages
   - ✅ `message_template_status_update` - Template approval updates (optional)

3. Click **Done**

---

## Step 7: Configure Embedded Signup (Optional)

If you want users to connect their own WhatsApp numbers via OAuth:

### 7.1 Create Embedded Signup Configuration

1. Go to **WhatsApp** → **Embedded Signup** in your app dashboard

2. Click **Create Configuration**

3. Fill in the details:
   - **Configuration name**: `BotFlow Signup`
   - **Callback URL**: `https://your-frontend-url.com/dashboard/whatsapp`

4. Under **Permissions**, enable:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`

5. Click **Create**

6. Copy the **Configuration ID** for use in your app

### 7.2 Configure OAuth Settings

1. Go to **App Settings** → **Basic**

2. Add your domain to **App Domains**:
   - `your-frontend-url.com`
   - `localhost` (for development)

3. Go to **Facebook Login** → **Settings** (add this product if not present)

4. Add Valid OAuth Redirect URIs:
   - `https://your-frontend-url.com/dashboard/whatsapp`
   - `http://localhost:3000/dashboard/whatsapp` (for development)

---

## Step 8: Set Environment Variables

Add these to your backend `.env` file:

```env
# Meta WhatsApp Configuration
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_verify_token

# These are set per-user in the database, not in env:
# - meta_phone_number_id
# - meta_waba_id
# - meta_access_token
```

---

## Step 9: Test the Integration

### 9.1 Test Webhook Verification

Your backend should respond to GET requests:

```bash
curl "https://your-backend.com/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test123"
# Should return: test123
```

### 9.2 Send a Test Message

From the Meta Developer Console:

1. Go to **WhatsApp** → **API Setup**
2. Under **Send and receive messages**, enter a test phone number
3. Click **Send Message**
4. Check your webhook logs for the incoming message

### 9.3 Test from BotFlow

1. Log into your BotFlow dashboard
2. Go to **WhatsApp** → **Connect WhatsApp**
3. Enter your credentials (manual mode) or complete Embedded Signup
4. Send a test message to your connected number
5. Verify the bot responds

---

## Troubleshooting

### Webhook Verification Fails

- Ensure your backend is publicly accessible (not localhost)
- Check that `META_WEBHOOK_VERIFY_TOKEN` matches exactly
- Verify your backend returns the challenge as plain text, not JSON

### Messages Not Arriving

- Check webhook subscription includes `messages`
- Verify phone number is correctly linked to your WABA
- Check backend logs for errors
- Ensure the phone number is not registered with regular WhatsApp

### Token Expired

- System User tokens with "Never" expiration don't expire
- If using temporary tokens, regenerate from API Setup page

### "Phone number not registered" Error

- The phone number must complete WhatsApp Business verification
- Check Meta Business Suite for verification status

---

## Security Best Practices

1. **Never commit secrets**: Use environment variables, not hardcoded values
2. **Rotate tokens**: Periodically regenerate access tokens
3. **Verify signatures**: Always verify webhook signatures in production
4. **Use HTTPS**: Webhooks require HTTPS (except localhost for testing)
5. **Limit permissions**: Only request necessary permissions

---

## Useful Links

- [Meta Developer Documentation](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Cloud API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Embedded Signup Guide](https://developers.facebook.com/docs/whatsapp/embedded-signup)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)

---

## Quick Reference: Environment Variables

```env
# Required for Meta WhatsApp integration
META_APP_ID=123456789012345
META_APP_SECRET=abcdef123456789abcdef123456789ab
META_WEBHOOK_VERIFY_TOKEN=bf_verify_your_random_string_here
```

---

## Next Steps After Setup

1. Run the database migration: `006_whatsapp_meta_support.sql`
2. Deploy your backend with the new environment variables
3. Verify webhook is receiving test messages
4. Connect your first WhatsApp number via BotFlow dashboard
5. Create a bot and assign it to the WhatsApp number
6. Test the full flow: Customer message → AI response
