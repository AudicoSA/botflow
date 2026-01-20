# Week 9: Hybrid Integration Strategy
## Direct Integrations + n8n Marketplace (400+ Apps)

**Strategy:** Build 2 critical direct integrations + enable 30-50 pre-configured n8n workflows

---

## Phase 1: Direct Integrations (Days 1-4)

### Critical Path - Build Ourselves

**1. Google Calendar Integration** (Days 1-2)
- **Why Direct:** Speed critical for bookings, <500ms response time needed
- **Features:** OAuth 2.0, event CRUD, availability checking, multi-calendar support
- **Used By:** 15 of 20 templates (all booking-based verticals)
- **Priority:** P0 - Blocking for launch

**2. Stripe Payment Integration** (Days 3-4)
- **Why Direct:** Security/compliance, PCI-DSS requirements
- **Features:** Checkout sessions, payment intents, webhooks, subscriptions, refunds
- **Used By:** 18 of 20 templates (all except Lawyer, Accountant)
- **Priority:** P0 - Blocking for launch

---

## Phase 2: n8n Integration Marketplace (Days 5-7)

### Top 30 Pre-Built Workflows by Category

#### **Calendar & Scheduling** (Universal - All Booking Templates)
1. ✅ **Google Calendar** (Direct integration)
2. **Microsoft Outlook Calendar** - Enterprise bookings
3. **Calendly** - Advanced scheduling
4. **Acuity Scheduling** - Class bookings
5. **Cal.com** - Open-source scheduling

#### **Payments & Billing** (18 of 20 Templates)
6. ✅ **Stripe** (Direct integration)
7. **PayPal** - Alternative payment method
8. **Square** - POS + payments (Salon, Restaurant, Retail)
9. **Yoco** - South African payment processor
10. **QuickBooks** - Accounting & invoicing
11. **Xero** - Cloud accounting

#### **CRM & Lead Management** (All 20 Templates)
12. **HubSpot** - Marketing automation + CRM
13. **Salesforce** - Enterprise CRM
14. **Pipedrive** - Sales pipeline
15. **Zoho CRM** - Affordable CRM
16. **Airtable** - Flexible database + CRM
17. **Notion** - All-in-one workspace

#### **Communication** (All 20 Templates)
18. **Slack** - Team notifications
19. **Gmail** - Email automation
20. **Telegram** - Alternative messaging
21. **Twilio SMS** - Text notifications
22. **SendGrid** - Email marketing
23. **Mailchimp** - Newsletter automation

#### **E-commerce & Retail** (Ecommerce, Retail Templates)
24. **Shopify** - E-commerce platform
25. **WooCommerce** - WordPress store
26. **Wix Stores** - Website builder store
27. **Magento** - Enterprise e-commerce

#### **Specialized Vertical Integrations**
28. **OpenTable** - Restaurant reservations
29. **Mindbody** - Fitness & wellness bookings (Gym, Salon)
30. **Airbnb API** - Vacation rental sync
31. **Booking.com** - Hotel reservations
32. **DocuSign** - E-signatures (Real Estate, Lawyer)
33. **Zoom** - Video appointments
34. **Google Meet** - Video consultations

---

## Template-to-Integration Mapping

### **Tier 1 Templates** (High-Impact)

#### **Taxi & Shuttle Service** (`taxi`)
**Recommended Integrations (8):**
- ✅ Google Calendar (bookings)
- ✅ Stripe (payments)
- Google Maps API (routing)
- Twilio SMS (driver notifications)
- HubSpot (lead tracking)
- QuickBooks (invoicing)
- Slack (dispatch alerts)
- Waze API (real-time traffic)

#### **Medical & Dental Practice** (`medical`)
**Recommended Integrations (7):**
- ✅ Google Calendar (appointments)
- ✅ Stripe (payments)
- Zoho CRM (patient records)
- Gmail (appointment reminders)
- DocuSign (consent forms)
- Zoom (telehealth)
- Calendly (complex scheduling)

#### **Real Estate Agent** (`real_estate`)
**Recommended Integrations (8):**
- ✅ Google Calendar (viewings)
- Salesforce (lead management)
- DocuSign (contracts)
- Mailchimp (property alerts)
- Airtable (property database)
- Zapier (workflow automation)
- Google Sheets (listing export)
- Slack (team coordination)

#### **E-commerce Store** (`ecommerce`)
**Recommended Integrations (10):**
- ✅ Stripe (checkout)
- Shopify (store sync)
- WooCommerce (WordPress)
- PayPal (alternative payment)
- Mailchimp (abandoned cart)
- Klaviyo (email marketing)
- Google Analytics (tracking)
- ShipStation (fulfillment)
- QuickBooks (accounting)
- Zendesk (support tickets)

#### **Restaurant & Food Service** (`restaurant`)
**Recommended Integrations (7):**
- ✅ Google Calendar (reservations)
- OpenTable (reservation sync)
- Square POS (table management)
- Uber Eats API (delivery)
- Mr. D Food (SA delivery)
- Gmail (booking confirmations)
- Google Reserve (discovery)

#### **Hair Salon & Beauty** (`salon`)
**Recommended Integrations (8):**
- ✅ Google Calendar (appointments)
- ✅ Stripe (deposits)
- Mindbody (salon management)
- Square Appointments (booking)
- Instagram API (portfolio sync)
- Mailchimp (promotions)
- Xero (accounting)
- Calendly (stylist scheduling)

#### **Gym & Fitness Center** (`gym`)
**Recommended Integrations (9):**
- ✅ Google Calendar (class booking)
- ✅ Stripe (memberships)
- Mindbody (class management)
- Zoom (virtual classes)
- Mailchimp (member communications)
- HubSpot (lead nurturing)
- Xero (billing)
- Acuity Scheduling (PT sessions)
- Strava API (workout tracking)

### **Tier 2 Templates** (Specialized)

#### **Retail Store** (`retail`)
**Recommended Integrations (7):**
- ✅ Stripe (in-store payments)
- Square POS (inventory)
- Shopify (online store)
- Yoco (SA card payments)
- QuickBooks (accounting)
- Mailchimp (promotions)
- Google Sheets (inventory export)

#### **Hotel & Guesthouse** (`hotel`)
**Recommended Integrations (8):**
- ✅ Google Calendar (bookings)
- ✅ Stripe (deposits)
- Booking.com (OTA sync)
- Airbnb (channel manager)
- iCal (calendar sync)
- Gmail (confirmations)
- Xero (invoicing)
- Google Maps (directions)

#### **Car Rental Service** (`car_rental`)
**Recommended Integrations (7):**
- ✅ Google Calendar (fleet management)
- ✅ Stripe (deposits)
- QuickBooks (invoicing)
- DocuSign (rental agreements)
- Twilio SMS (pickup reminders)
- Google Maps (locations)
- HubSpot (customer tracking)

#### **Plumber & Home Services** (`plumber`)
**Recommended Integrations (7):**
- ✅ Google Calendar (job scheduling)
- ✅ Stripe (deposits)
- QuickBooks (invoicing)
- Google Maps (routing)
- Twilio SMS (technician dispatch)
- HubSpot (service history)
- Slack (emergency alerts)

#### **Doctor & Clinic** (`doctor`)
**Recommended Integrations (8):**
- ✅ Google Calendar (appointments)
- ✅ Stripe (consultation fees)
- Zoho CRM (patient records)
- Zoom (telehealth)
- Gmail (reminders)
- DocuSign (medical forms)
- Calendly (complex scheduling)
- Microsoft Teams (video calls)

### **Tier 3 Templates** (Niche)

#### **Airbnb & Vacation Rental** (`airbnb`)
**Recommended Integrations (9):**
- ✅ Google Calendar (availability)
- ✅ iCal Sync (multi-platform) - Already built!
- ✅ Stripe (booking payments)
- Airbnb API (sync)
- Booking.com (OTA sync)
- VRBO (channel manager)
- Gmail (guest communications)
- Xero (accounting)
- Guesty (property management)

#### **Lawyer** (`lawyer`) - Future
**Recommended Integrations (7):**
- ✅ Google Calendar (consultations)
- DocuSign (contracts)
- Zoom (video consultations)
- Salesforce (case management)
- QuickBooks (billing)
- Clio (legal practice management)
- Gmail (client communications)

#### **Accountant** (`accountant`) - Future
**Recommended Integrations (7):**
- ✅ Google Calendar (appointments)
- QuickBooks (client sync)
- Xero (cloud accounting)
- Google Sheets (reports)
- DocuSign (tax forms)
- Zoom (consultations)
- Gmail (client communications)

---

## Implementation Plan

### **Day 1-2: Google Calendar Direct Integration**

**Files to Create:**
- `botflow-backend/src/services/google-calendar.service.ts`
- `botflow-backend/src/routes/calendar.ts`
- `botflow-backend/src/types/calendar.ts`

**Key Methods:**
```typescript
class GoogleCalendarService {
  async createEvent(params: CalendarEvent): Promise<Event>
  async updateEvent(eventId: string, params: Partial<CalendarEvent>): Promise<Event>
  async deleteEvent(eventId: string): Promise<void>
  async listEvents(startDate: Date, endDate: Date): Promise<Event[]>
  async checkAvailability(startDate: Date, endDate: Date): Promise<FreeBusy>
  async refreshAccessToken(): Promise<string>
}
```

**Database Addition:**
```sql
-- Add to integrations table configuration
ALTER TABLE integrations
ADD COLUMN calendar_id TEXT,
ADD COLUMN calendar_timezone TEXT DEFAULT 'Africa/Johannesburg';
```

---

### **Day 3-4: Stripe Direct Integration**

**Files to Create:**
- `botflow-backend/src/services/stripe-payment.service.ts`
- `botflow-backend/src/routes/payments.ts`
- `botflow-backend/src/types/payment.ts`

**Key Methods:**
```typescript
class StripePaymentService {
  async createCheckoutSession(params: CheckoutParams): Promise<Session>
  async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent>
  async processRefund(paymentId: string, amount?: number): Promise<Refund>
  async createSubscription(params: SubscriptionParams): Promise<Subscription>
  async handleWebhook(event: StripeEvent): Promise<void>
}
```

**Database Addition:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  bot_id UUID REFERENCES bots(id),
  conversation_id UUID REFERENCES conversations(id),
  stripe_payment_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'zar',
  status TEXT NOT NULL, -- pending, succeeded, failed, refunded
  payment_type TEXT, -- checkout, intent, subscription
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_organization ON payments(organization_id);
CREATE INDEX idx_payments_status ON payments(status);
```

---

### **Day 5-6: n8n Integration Marketplace**

**Files to Create:**
- `botflow-backend/src/data/n8n-workflows/` (30 workflow JSON files)
- `botflow-backend/src/services/integration-marketplace.service.ts`
- `botflow-backend/src/routes/marketplace.ts`
- `botflow-website/app/dashboard/marketplace/page.tsx`

**Database Addition:**
```sql
CREATE TABLE integration_marketplace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- calendar, payment, crm, communication, ecommerce, specialized
  description TEXT,
  icon_url TEXT,
  requires_auth BOOLEAN DEFAULT true,
  auth_type TEXT, -- oauth, api_key, none
  n8n_workflow_template TEXT, -- JSON workflow
  recommended_for_verticals TEXT[], -- Array of template verticals
  pricing_model TEXT, -- free, freemium, paid
  popularity_score INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  documentation_url TEXT,
  setup_instructions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bot_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES bots(id) NOT NULL,
  integration_id UUID REFERENCES integration_marketplace(id) NOT NULL,
  n8n_workflow_id TEXT, -- Created workflow ID in n8n
  credentials JSONB, -- Encrypted
  configuration JSONB, -- Integration-specific settings
  status TEXT DEFAULT 'active', -- active, inactive, error
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, integration_id)
);

CREATE INDEX idx_bot_integrations_bot ON bot_integrations(bot_id);
CREATE INDEX idx_marketplace_category ON integration_marketplace(category);
CREATE INDEX idx_marketplace_vertical ON integration_marketplace USING GIN(recommended_for_verticals);
```

**API Endpoints:**
```typescript
// GET /api/marketplace - List all available integrations
// GET /api/marketplace/recommended/:botId - Get recommended for specific bot/template
// POST /api/marketplace/:integrationId/enable - Enable integration for bot
// DELETE /api/marketplace/:integrationId/disable - Disable integration
// GET /api/bots/:botId/integrations - List enabled integrations for bot
```

---

### **Day 7: Frontend Integration UI**

**Files to Create:**
- `botflow-website/app/dashboard/marketplace/page.tsx` - Browse integrations
- `botflow-website/app/dashboard/marketplace/[slug]/page.tsx` - Integration detail
- `botflow-website/app/components/IntegrationCard.tsx`
- `botflow-website/app/components/IntegrationCategoryFilter.tsx`
- `botflow-website/app/components/EnableIntegrationModal.tsx`

**Features:**
- Browse by category (Calendar, Payments, CRM, etc.)
- Filter by vertical (show only relevant to template type)
- One-click enable (OAuth flow or API key input)
- Status indicators (connected, disconnected, error)
- Usage analytics (how many events synced, etc.)

---

## n8n Workflow Templates

### Example: HubSpot Lead Capture Workflow

```json
{
  "name": "BotFlow → HubSpot Lead Capture",
  "nodes": [
    {
      "id": "webhook",
      "name": "BotFlow Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "botflow-lead-capture",
        "responseMode": "responseNode"
      }
    },
    {
      "id": "hubspot",
      "name": "Create HubSpot Contact",
      "type": "n8n-nodes-base.hubspot",
      "parameters": {
        "resource": "contact",
        "operation": "create",
        "email": "={{$json.customer_phone}}@botflow.lead",
        "additionalFields": {
          "phone": "={{$json.customer_phone}}",
          "firstname": "={{$json.customer_name}}",
          "lead_source": "WhatsApp Bot",
          "bot_name": "={{$json.bot_name}}"
        }
      },
      "credentials": {
        "hubspotApi": "BotFlow HubSpot"
      }
    }
  ],
  "connections": {
    "webhook": {
      "main": [[{"node": "hubspot", "type": "main", "index": 0}]]
    }
  }
}
```

### Example: Google Calendar Booking Workflow (via n8n)

```json
{
  "name": "BotFlow → Google Calendar Booking",
  "nodes": [
    {
      "id": "webhook",
      "name": "BotFlow Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "botflow-calendar-booking"
      }
    },
    {
      "id": "calendar",
      "name": "Create Calendar Event",
      "type": "n8n-nodes-base.googleCalendar",
      "parameters": {
        "operation": "create",
        "calendarId": "={{$json.calendar_id}}",
        "summary": "={{$json.event_title}}",
        "description": "={{$json.event_description}}",
        "start": "={{$json.start_time}}",
        "end": "={{$json.end_time}}"
      }
    },
    {
      "id": "notify",
      "name": "Send Confirmation",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{$json.callback_url}}",
        "method": "POST",
        "jsonParameters": true,
        "options": {
          "bodyContentType": "json"
        },
        "bodyParametersJson": {
          "status": "booked",
          "event_id": "={{$node['calendar'].json.id}}"
        }
      }
    }
  ]
}
```

---

## Success Metrics

### Week 9 Completion Criteria

**Direct Integrations:**
- ✅ Google Calendar: 100% event creation success rate
- ✅ Stripe: 100% test payment success rate
- ✅ OAuth flows working end-to-end
- ✅ Webhook handling functional

**n8n Marketplace:**
- ✅ 30+ pre-built workflows created
- ✅ All 20 templates have recommended integrations mapped
- ✅ One-click enable working for 5+ integrations
- ✅ Integration marketplace UI complete

**Performance:**
- Google Calendar API: <500ms response time
- Stripe checkout: <1s page load
- n8n workflow execution: <3s average

**Coverage:**
- 100% of booking templates have calendar integration
- 90% of templates have payment integration
- 100% of templates have 3+ recommended integrations
- Top 10 integrations ready for production

---

## Competitive Advantage

**Before Week 9:**
- BotFlow: 20 templates, 3 integrations (WhatsApp, OpenAI, Supabase)

**After Week 9:**
- BotFlow: 20 templates, 400+ integrations available, 30+ pre-configured
- Competitors: 5-10 templates, 5-15 integrations

**Marketing Message:**
> "BotFlow connects your business to 400+ apps - from Google Calendar to HubSpot, Stripe to Shopify. Every template comes with recommended integrations pre-configured. One click to connect."

---

## Next Steps After Week 9

### Week 10: Integration Analytics & Monitoring
- Usage tracking per integration
- Error monitoring and alerting
- Integration health dashboard
- Cost optimization (n8n workflow efficiency)

### Week 11: Custom Workflow Builder
- Visual n8n workflow editor in BotFlow UI
- Template marketplace for user-created workflows
- Workflow sharing between organizations

### Week 12: Enterprise Integrations
- Salesforce advanced features
- Microsoft Dynamics 365
- SAP integrations
- Custom API builder

---

## Resources

**Direct Integration Docs:**
- [Google Calendar API](https://developers.google.com/calendar)
- [Stripe API Documentation](https://stripe.com/docs/api)

**n8n Resources:**
- [n8n Integration List](https://n8n.io/integrations/)
- [n8n Workflow Templates](https://n8n.io/workflows/)
- [n8n API Documentation](https://docs.n8n.io/api/)

**Research Sources:**
- [7 Essential Booking Software Integrations](https://gravitybooking.com/essential-booking-software-integrations/)
- [OpenTable Integrations & APIs](https://www.opentable.com/restaurant-solutions/integrations/)
- [Square Appointments vs. Mindbody](https://thesalonbusiness.com/square-appointments-vs-mindbody/)
- [Mindbody Software Reviews 2026](https://www.softwareadvice.com/gymnastics/mindbody-profile/)

---

**Status:** Ready to implement! 🚀
**Timeline:** 7 days
**Expected Outcome:** Production-ready integration marketplace with 400+ apps available
