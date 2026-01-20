# Phase 4: Launch Readiness

**Goal:** Get BotFlow ready for first paying customers with a working WhatsApp onboarding flow.

**Prerequisites:**
- Redis instance (Upstash or Railway) - User signing up now
- Meta Developer App configured for Embedded Signup

---

## Current State Summary

### What's Working
- Backend API (20+ routes, authentication, templates)
- Frontend (landing, auth, dashboard, bot editor, wizard)
- 21 business templates ready
- Knowledge base with RAG
- Webhook handlers for Bird + Twilio
- Message queue with AI responses (needs Redis)
- API client (`lib/api.ts`)

### What's Missing
- WhatsApp onboarding (Embedded Signup)
- Backend `/api/whatsapp/connect` endpoint (currently stub)
- Billing/subscription UI
- Conversation inbox UI

---

## Phase 4 Tasks

### 4.1 WhatsApp Embedded Signup (Priority: CRITICAL)

**Goal:** Allow users to connect their WhatsApp Business number via Meta's Embedded Signup flow.

#### 4.1.1 Meta Developer Setup

Prerequisites (done once by you, the developer):

1. **Create Meta App** at developers.facebook.com
   - App Type: Business
   - Add WhatsApp product
   - Configure Embedded Signup

2. **Get App Credentials**
   - App ID
   - App Secret
   - Configure OAuth redirect URI: `https://your-backend.com/api/whatsapp/callback`

3. **Configure Webhook**
   - Webhook URL: `https://your-backend.com/webhooks/meta/whatsapp`
   - Verify token: Generate and store in env
   - Subscribe to: `messages`, `messaging_postbacks`

4. **Environment Variables to Add**
   ```env
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   META_WEBHOOK_VERIFY_TOKEN=random_string_you_generate
   ```

#### 4.1.2 Backend: WhatsApp Routes

**File:** `botflow-backend/src/routes/whatsapp.ts`

Implement these endpoints:

```typescript
// GET /api/whatsapp/accounts
// List connected WhatsApp accounts for the organization

// POST /api/whatsapp/connect
// Save WhatsApp credentials after Embedded Signup
// Body: { accessToken, phoneNumberId, wabaId, phoneNumber, displayName }

// DELETE /api/whatsapp/accounts/:id
// Disconnect a WhatsApp account

// GET /api/whatsapp/embedded-signup-url
// Return the Embedded Signup URL with state parameter
```

#### 4.1.3 Backend: Meta Webhook Handler

**File:** `botflow-backend/src/routes/webhooks.ts`

Add Meta webhook handler (alongside existing Bird/Twilio):

```typescript
// GET /webhooks/meta/whatsapp - Webhook verification
// POST /webhooks/meta/whatsapp - Receive messages

// Message flow:
// 1. Parse Meta webhook payload
// 2. Find whatsapp_account by phone_number_id
// 3. Create/find conversation
// 4. Save message
// 5. Queue for AI processing
```

#### 4.1.4 Backend: Meta Message Sending Service

**File:** `botflow-backend/src/services/meta-whatsapp.service.ts`

```typescript
// sendMessage(phoneNumberId, accessToken, to, message)
// Uses Meta Graph API: POST /{phone_number_id}/messages
```

#### 4.1.5 Frontend: WhatsApp Connection Page

**File:** `botflow-website/app/dashboard/whatsapp/page.tsx`

New page with:

1. **Introduction Section**
   - Explain what connecting WhatsApp does
   - Show benefits

2. **Number Options Info**
   ```
   Which number should I use?

   RECOMMENDED: Business Landline
   - Use your existing office number (e.g., 010 xxx xxxx)
   - Voice calls still go to your phone/call center
   - WhatsApp messages go to BotFlow
   - Customers already know this number

   ALTERNATIVE: Dedicated Mobile
   - Get a prepaid SIM for R29 at Vodacom/MTN
   - RICA registration takes 10 minutes
   - Keep it separate from personal WhatsApp

   DO NOT USE: Personal Mobile
   - Your personal WhatsApp will be disconnected
   - Friends and family will talk to your bot
   - You cannot undo this
   ```

3. **Connect Button**
   - Opens Meta Embedded Signup popup
   - Handles callback with credentials
   - Shows success/error state

4. **Connected Accounts List**
   - Show phone number, display name
   - Status indicator (active/inactive)
   - Disconnect button

#### 4.1.6 Frontend: Embedded Signup Component

**File:** `botflow-website/app/components/WhatsAppEmbeddedSignup.tsx`

```typescript
// Load Meta SDK
// Handle launchWhatsAppSignup()
// Capture sessionInfoListener callback
// POST credentials to /api/whatsapp/connect
// Handle errors gracefully
```

#### 4.1.7 Update Message Queue Worker

**File:** `botflow-backend/src/queues/message.worker.ts`

Update to support Meta API for sending:

```typescript
// Detect provider from whatsapp_account (bird, twilio, meta)
// Use appropriate service to send response
// For meta: use meta-whatsapp.service.ts
```

---

### 4.2 Redis Integration (Priority: CRITICAL)

**Goal:** Ensure message queue works for AI responses.

#### 4.2.1 Redis Setup

1. Sign up for Upstash (free tier: 10k commands/day) OR Railway Redis
2. Get connection URL

#### 4.2.2 Environment Variables

```env
REDIS_URL=redis://default:password@host:port
# OR individual vars:
REDIS_HOST=host
REDIS_PORT=6379
REDIS_PASSWORD=password
```

#### 4.2.3 Verify Queue Worker

Test that messages flow through:
1. Send WhatsApp message to connected number
2. Verify webhook receives it
3. Verify message queued in Redis
4. Verify AI generates response
5. Verify response sent back via WhatsApp

---

### 4.3 Database Schema Updates (Priority: HIGH)

#### 4.3.1 Update `whatsapp_accounts` Table

Ensure columns exist:

```sql
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'meta';
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_waba_id TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_access_token TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMPTZ;
-- Existing columns: bird_channel_id, phone_number, display_name, etc.
```

#### 4.3.2 Migration File

**File:** `botflow-backend/src/migrations/005_whatsapp_meta_support.sql`

---

### 4.4 End-to-End Testing (Priority: HIGH)

#### 4.4.1 Test Scenarios

1. **Signup Flow**
   - New user signs up
   - Redirected to dashboard
   - Token stored correctly

2. **Bot Creation Flow**
   - Select template (e.g., Salon)
   - Fill config form
   - Bot created successfully
   - Bot appears in list

3. **WhatsApp Connection Flow**
   - Navigate to WhatsApp settings
   - Click Connect
   - Complete Embedded Signup
   - Account saved to database
   - Webhook configured

4. **Message Flow**
   - Send test message to connected number
   - Webhook receives message
   - Message saved to database
   - AI generates response
   - Response sent via WhatsApp
   - Response received on phone

5. **Conversation View**
   - Messages appear in dashboard
   - Can view conversation history

---

### 4.5 Billing UI (Priority: MEDIUM)

#### 4.5.1 Pricing Page Component

**File:** `botflow-website/app/dashboard/billing/page.tsx`

- Show current plan (free trial)
- Display 3 pricing tiers
- Upgrade button for each tier

#### 4.5.2 Paystack Integration

- Connect Paystack checkout
- Handle success/cancel callbacks
- Update organization tier in database

#### 4.5.3 Usage Tracking

- Track conversations per month
- Show usage vs limit
- Warn when approaching limit

---

### 4.6 Conversation Inbox (Priority: MEDIUM)

#### 4.6.1 Conversations List Page

**File:** `botflow-website/app/dashboard/conversations/page.tsx`

Currently placeholder. Implement:
- List all conversations
- Show customer name/phone
- Show last message preview
- Show timestamp
- Filter by bot

#### 4.6.2 Conversation Detail Page

**File:** `botflow-website/app/dashboard/conversations/[id]/page.tsx`

- Show full message history
- Real-time updates (WebSocket)
- Manual reply option (human takeover)

---

## Implementation Order

```
Week 1: Core WhatsApp Flow
├── Day 1-2: Meta Developer setup + Backend routes
├── Day 3-4: Frontend WhatsApp page + Embedded Signup
├── Day 5: Meta webhook handler + message sending
├── Day 6-7: End-to-end testing + bug fixes

Week 2: Polish & Billing
├── Day 1-2: Conversation inbox UI
├── Day 3-4: Billing page + Paystack
├── Day 5-7: Testing, documentation, soft launch
```

---

## Files to Create/Modify

### New Files
- `botflow-website/app/dashboard/whatsapp/page.tsx`
- `botflow-website/app/components/WhatsAppEmbeddedSignup.tsx`
- `botflow-backend/src/services/meta-whatsapp.service.ts`
- `botflow-backend/src/migrations/005_whatsapp_meta_support.sql`
- `botflow-website/app/dashboard/billing/page.tsx`
- `botflow-website/app/dashboard/conversations/[id]/page.tsx`

### Files to Modify
- `botflow-backend/src/routes/whatsapp.ts` - Implement endpoints
- `botflow-backend/src/routes/webhooks.ts` - Add Meta handler
- `botflow-backend/src/queues/message.worker.ts` - Support Meta sending
- `botflow-backend/src/config/env.ts` - Add Meta env vars
- `botflow-website/app/dashboard/conversations/page.tsx` - Real implementation
- `botflow-website/lib/api.ts` - Add WhatsApp methods

---

## Environment Variables Summary

### Required for Phase 4
```env
# Redis (CRITICAL - needed for message queue)
REDIS_URL=redis://...

# Meta WhatsApp (for Embedded Signup)
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=

# Existing (should already have)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
JWT_SECRET=
```

### Optional
```env
# Paystack (for billing)
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=

# Bird (legacy, keep if existing customers)
BIRD_API_KEY=
BIRD_WORKSPACE_ID=
```

---

## Success Criteria

Phase 4 is complete when:

1. [ ] User can sign up and create account
2. [ ] User can create bot from template
3. [ ] User can connect WhatsApp via Embedded Signup
4. [ ] Customer WhatsApp message triggers AI response
5. [ ] User can view conversations in dashboard
6. [ ] User can upgrade to paid plan via Paystack
7. [ ] All critical paths tested end-to-end

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Meta App review delays | Can't go live | Apply early, use test mode initially |
| Redis costs at scale | Budget | Start with Upstash free tier, monitor |
| Embedded Signup complexity | Dev time | Follow Meta docs exactly, test thoroughly |
| WhatsApp message limits | User experience | Implement rate limiting, warn users |

---

## Notes for Next Chat

1. **Start with Redis** - Verify it's connected before anything else
2. **Meta Developer Account** - You'll need access to developers.facebook.com
3. **Test Number** - Have a test phone ready (not your personal WhatsApp)
4. **Patience with Meta** - Their docs are verbose, but Embedded Signup is well-documented

---

## Reference Links

- [Meta Embedded Signup Docs](https://developers.facebook.com/docs/whatsapp/embedded-signup)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Upstash Redis](https://upstash.com/)
- [Paystack Docs](https://paystack.com/docs/)
