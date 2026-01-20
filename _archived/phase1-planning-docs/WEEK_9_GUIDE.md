# Week 9 Implementation Guide
## Polish, Testing & Core Integrations
## Production-Ready Template Library

**Week:** 9 of 13
**Phase:** 3 - Polish & Enhancement
**Duration:** 5-7 days
**Focus:** Template refinement + core integrations + production readiness

---

## Week Overview

With **100% template coverage achieved** in Week 8, Week 9 shifts focus to **production readiness**. We'll refine the templates based on testing, add essential integrations (Google Calendar, Stripe payments, CRM), build frontend property management, and ensure the entire system is polished and ready for beta launch.

### What You'll Build

**Template Refinement:**
1. Conversation flow optimization
2. Intent trigger improvements
3. Edge case handling
4. Tone consistency across templates
5. SA localization enhancements

**Core Integrations:**
1. **Google Calendar Sync** - Universal appointment booking
2. **Stripe Payment Integration** - Deposits, memberships, payments
3. **CRM Integration** - Lead tracking and management
4. **n8n Workflows** - Automation and third-party connections

**Frontend Development:**
1. Property management UI (for Airbnb/vacation rentals)
2. Template preview enhancements
3. Bot analytics dashboard
4. Integration configuration UI

**Testing & Quality:**
1. End-to-end testing all 20 templates
2. Performance optimization
3. Security hardening
4. Documentation completion

### Success Criteria

By end of week, you should have:
- ✅ All 20 templates refined and tested
- ✅ Google Calendar integration working
- ✅ Stripe payment flow functional
- ✅ CRM lead tracking operational
- ✅ Property management UI complete
- ✅ All templates tested end-to-end
- ✅ Performance benchmarks met
- ✅ Production deployment ready

---

## Quick Links

**Schedule:** [WEEK_SCHEDULE.md](./WEEK_SCHEDULE.md) ✅ Updated
**Build Plan:** [BUILD_PLAN_2025.md](./BUILD_PLAN_2025.md)
**Previous Week:** [WEEK_8_SUMMARY.md](./WEEK_8_SUMMARY.md) ✅ 100% Templates!
**Template Library:** [TEMPLATE_PATTERNS.md](./botflow-backend/TEMPLATE_PATTERNS.md)
**iCal Integration:** [WEEK_8_AIRBNB_PROGRESS.md](./WEEK_8_AIRBNB_PROGRESS.md)

---

## Prerequisites

Before starting Week 9, ensure:

### Required from Week 8
- ✅ All 20 templates complete and published
- ✅ iCal integration operational
- ✅ Template validation passing
- ✅ Database seeding successful

### Verify Current System

```bash
# 1. Check backend is running
curl http://localhost:3001/health

# 2. Verify all 20 templates exist
curl http://localhost:3001/api/templates | grep -o '"name"' | wc -l
# Should return 20

# 3. Test template instantiation
curl -X POST http://localhost:3001/api/bots/create-from-template \
  -H "Authorization: Bearer JWT" \
  -d '{"template_id": "...", "field_values": {...}}'

# 4. Test iCal properties API
curl "http://localhost:3001/api/properties/ID/availability?start=2026-02-12&end=2026-02-15"

# 5. Verify build works
cd botflow-backend && npm run build
```

---

## Architecture Overview

### Week 9 Components

**Template Enhancements:**
- Conversation flow refinement
- Intent optimization
- Error handling
- Edge case coverage

**New Integrations:**
- Google Calendar API (OAuth 2.0)
- Stripe API (checkout, webhooks)
- CRM system (lead capture)
- n8n workflows

**Frontend Features:**
- Property management dashboard
- Integration configuration UI
- Enhanced analytics
- Template comparison

**Testing Infrastructure:**
- E2E test suites
- Performance benchmarks
- Load testing scripts
- Security scanning

---

## Day-by-Day Breakdown

### Days 1-2: Google Calendar Integration

**Goal:** Enable appointment booking across all booking-based templates

#### Step 1.1: Research Google Calendar API

**Key Requirements:**
- OAuth 2.0 authentication flow
- Create/update/delete events
- Availability checking
- Multiple calendar support
- Recurring events

**API Endpoints Needed:**
- `POST /calendar/v3/calendars/{calendarId}/events` - Create event
- `GET /calendar/v3/calendars/{calendarId}/events` - List events
- `PATCH /calendar/v3/calendars/{calendarId}/events/{eventId}` - Update event
- `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}` - Delete event
- `GET /calendar/v3/freeBusy` - Check availability

#### Step 1.2: Set Up Google Cloud Project

1. Create project in Google Cloud Console
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Configure consent screen
5. Add redirect URIs
6. Download client secrets

#### Step 1.3: Install Dependencies

```bash
cd botflow-backend
npm install googleapis
# Already installed from Week 8 Google Sheets integration
```

#### Step 1.4: Create Google Calendar Service

Create: `botflow-backend/src/services/google-calendar.service.ts`

**Key Methods:**
- `createEvent()` - Book appointment
- `updateEvent()` - Modify booking
- `deleteEvent()` - Cancel booking
- `listEvents()` - Get appointments
- `checkAvailability()` - Free/busy query
- `refreshAccessToken()` - Token management

#### Step 1.5: Create Calendar API Routes

Create: `botflow-backend/src/routes/calendar.ts`

**Endpoints:**
- `POST /api/calendar/connect` - OAuth flow start
- `GET /api/calendar/callback` - OAuth callback
- `POST /api/calendar/events` - Create appointment
- `GET /api/calendar/events` - List appointments
- `PATCH /api/calendar/events/:id` - Update appointment
- `DELETE /api/calendar/events/:id` - Cancel appointment
- `GET /api/calendar/availability` - Check free slots

#### Step 1.6: Update Message Processor

Enhance AI to detect booking intents and create calendar events:
- Parse date/time from conversation
- Extract booking details
- Call Google Calendar API
- Confirm with customer
- Send calendar invite

#### Step 1.7: Test Calendar Integration

```bash
# Test OAuth flow
# Navigate to /api/calendar/connect

# Test event creation
curl -X POST http://localhost:3001/api/calendar/events \
  -H "Authorization: Bearer JWT" \
  -d '{
    "summary": "Haircut Appointment",
    "description": "Customer: John Doe",
    "start": "2026-02-15T10:00:00+02:00",
    "end": "2026-02-15T11:00:00+02:00"
  }'
```

---

### Days 3-4: Stripe Payment Integration

**Goal:** Enable deposit collection and membership payments

#### Step 2.1: Research Stripe Integration

**Key Requirements:**
- Checkout sessions
- Payment intent flow
- Webhook handling
- Subscription management
- Refunds

**API Endpoints Needed:**
- `POST /v1/checkout/sessions` - Create checkout
- `POST /v1/payment_intents` - Create payment intent
- `POST /v1/refunds` - Process refund
- `POST /v1/subscriptions` - Create subscription
- Webhook endpoint for events

#### Step 2.2: Set Up Stripe Account

1. Create Stripe account
2. Get API keys (test and live)
3. Configure webhooks
4. Set up products/prices
5. Configure payment methods

#### Step 2.3: Install Dependencies

```bash
cd botflow-backend
npm install stripe
# Already installed from initial setup
```

#### Step 2.4: Create Stripe Service

Create: `botflow-backend/src/services/stripe-payment.service.ts`

**Key Methods:**
- `createCheckoutSession()` - Payment page
- `createPaymentIntent()` - Direct payment
- `processRefund()` - Refund handling
- `createSubscription()` - Membership
- `handleWebhook()` - Event processing

#### Step 2.5: Create Payment API Routes

Create or enhance: `botflow-backend/src/routes/payments.ts`

**Endpoints:**
- `POST /api/payments/checkout` - Create checkout session
- `POST /api/payments/intent` - Create payment intent
- `POST /api/payments/refund` - Process refund
- `GET /api/payments/:id` - Get payment status
- `POST /webhooks/stripe` - Stripe webhook handler

#### Step 2.6: Frontend Checkout Component

Create payment flow UI:
- Payment button in bot configuration
- Checkout redirect
- Success/cancel handling
- Receipt display

#### Step 2.7: Test Payment Flow

```bash
# Test checkout session
curl -X POST http://localhost:3001/api/payments/checkout \
  -H "Authorization: Bearer JWT" \
  -d '{
    "amount": 50000,
    "currency": "zar",
    "description": "Salon deposit",
    "success_url": "https://...",
    "cancel_url": "https://..."
  }'

# Test webhook (use Stripe CLI)
stripe listen --forward-to localhost:3001/webhooks/stripe
```

---

### Day 5: CRM Integration (Lead Tracking)

**Goal:** Capture and track leads from conversations

#### Step 3.1: Choose CRM System

**Options:**
- **Simple:** Custom database tables (leads, contacts)
- **Third-party:** HubSpot, Pipedrive, Zoho CRM
- **Recommendation:** Start with custom, integrate third-party later

#### Step 3.2: Create Lead Capture Database

**Table: `leads`**
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  bot_id UUID REFERENCES bots(id),
  conversation_id UUID REFERENCES conversations(id),
  name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'new', -- new, contacted, qualified, converted, lost
  lead_score INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_organization ON leads(organization_id);
CREATE INDEX idx_leads_status ON leads(status);
```

#### Step 3.3: Create Lead Service

Create: `botflow-backend/src/services/lead-capture.service.ts`

**Key Methods:**
- `captureLead()` - Create lead from conversation
- `updateLeadStatus()` - Change status
- `scoreLead()` - Calculate lead score
- `enrichLead()` - Add metadata
- `exportLeads()` - Export to CSV/Excel

#### Step 3.4: Create Leads API Routes

Create: `botflow-backend/src/routes/leads.ts`

**Endpoints:**
- `GET /api/leads` - List all leads
- `GET /api/leads/:id` - Get lead details
- `PATCH /api/leads/:id` - Update lead
- `POST /api/leads/:id/notes` - Add note
- `GET /api/leads/export` - Export leads

#### Step 3.5: Auto-Capture from Conversations

Update message processor to:
- Detect new conversations
- Extract contact info
- Calculate lead score (engagement level)
- Create lead record
- Tag conversations

#### Step 3.6: Frontend Leads Dashboard

Create: `botflow-website/app/dashboard/leads/page.tsx`

**Features:**
- Lead list with filters
- Lead detail view
- Status pipeline
- Export functionality
- Lead scoring visualization

---

### Day 6: Property Management UI (Frontend)

**Goal:** Build interface for managing vacation rental properties

#### Step 4.1: Create Property List Page

Create: `botflow-website/app/dashboard/properties/page.tsx`

**Features:**
- List all properties
- Add new property button
- Property cards with key info
- Sync status indicators
- Last synced timestamp

#### Step 4.2: Create Property Form Component

Create: `botflow-website/app/components/PropertyForm.tsx`

**Fields:**
- Property name
- iCal URLs (multiple, dynamic)
- Min/max nights
- Check-in/check-out times
- Buffer days
- Timezone selector

#### Step 4.3: Create Property Detail Page

Create: `botflow-website/app/dashboard/properties/[id]/page.tsx`

**Features:**
- Property details
- Blocked dates calendar view
- Manual sync button
- Sync logs table
- Edit property button
- Delete property button

#### Step 4.4: Create Calendar Visualization

Use library like `react-big-calendar` or `@fullcalendar/react`

**Display:**
- Blocked dates in red
- Available dates in green
- Current date highlighted
- Month/week/day views

#### Step 4.5: Create Sync Logs Component

Show sync history:
- Timestamp
- Status (success/error)
- Events processed
- Duration
- Error messages

---

### Day 7: Testing, Documentation & Polish

**Goal:** Ensure everything works perfectly

#### Step 5.1: End-to-End Template Testing

**Test all 20 templates:**
1. Create bot from template
2. Send test WhatsApp messages
3. Verify AI responses
4. Test all intents
5. Check handoff conditions
6. Verify integrations work

**Testing Matrix:**
- 20 templates × 3-5 scenarios each = 60-100 tests
- Document results
- Fix any issues found

#### Step 5.2: Performance Testing

**Metrics to measure:**
- API response times (target: <200ms)
- Template loading speed
- Message processing time
- Database query performance
- Memory usage
- Concurrent user handling

**Tools:**
- Apache Bench (ab)
- k6 load testing
- Lighthouse (frontend)
- New Relic / Datadog (monitoring)

#### Step 5.3: Security Audit

**Check:**
- SQL injection prevention
- XSS vulnerabilities
- CSRF protection
- Authentication bypasses
- RLS policy coverage
- Sensitive data exposure
- API rate limiting

**Tools:**
- OWASP ZAP
- npm audit
- Snyk
- Manual code review

#### Step 5.4: Documentation Polish

**Update:**
- API documentation (Swagger/OpenAPI)
- Template usage guides
- Integration setup guides
- Deployment instructions
- Troubleshooting guides
- User FAQs

#### Step 5.5: Code Cleanup

- Remove console.logs
- Fix linting errors
- Improve error messages
- Add JSDoc comments
- Optimize imports
- Remove dead code

---

## Integration Details

### Google Calendar Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Calendar API                       │
│           (OAuth 2.0, Events, FreeBusy)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS API Calls
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Google Calendar Service (Backend)                 │
│  - OAuth flow management                                    │
│  - Event CRUD operations                                    │
│  - Availability checking                                    │
│  - Token refresh                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Store credentials
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database                              │
│  integrations table (encrypted credentials)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Query
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             Message Processor (AI)                           │
│  Detects booking intent → Creates calendar event            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Confirmation
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                WhatsApp Customer                             │
│  Receives booking confirmation + calendar invite            │
└─────────────────────────────────────────────────────────────┘
```

### Stripe Payment Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Stripe API                                │
│         (Checkout, PaymentIntent, Webhooks)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS API Calls
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Stripe Payment Service (Backend)                  │
│  - Create checkout sessions                                 │
│  - Handle payment intents                                   │
│  - Process webhooks                                         │
│  - Manage subscriptions                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Store payment records
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database                              │
│  payments table (transaction history)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Trigger
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             Message Processor (AI)                           │
│  Detects payment request → Creates checkout link            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Payment link
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                WhatsApp Customer                             │
│  Clicks link → Stripe checkout → Payment confirmation       │
└─────────────────────────────────────────────────────────────┘
```

---

## Template Refinement Checklist

For each of the 20 templates, review and improve:

### Conversation Flow
- [ ] Opening message is welcoming and clear
- [ ] All intents have natural triggers
- [ ] Responses are contextually appropriate
- [ ] Transitions between topics are smooth
- [ ] Handoff conditions are well-defined

### Intent Quality
- [ ] Triggers cover variations and typos
- [ ] No overlapping intents
- [ ] Rare intents accounted for
- [ ] Emergency/urgent intents prioritized
- [ ] Fallback responses appropriate

### South African Localization
- [ ] Currency in Rand (R)
- [ ] Local terminology used
- [ ] Emergency numbers correct
- [ ] Regional context included
- [ ] Cultural sensitivity maintained

### Error Handling
- [ ] Invalid inputs handled gracefully
- [ ] Unclear requests prompt clarification
- [ ] Out-of-scope queries redirected
- [ ] System errors have friendly messages
- [ ] Recovery paths clear

### Tone & Voice
- [ ] Matches business vertical
- [ ] Consistent throughout conversation
- [ ] Professional but approachable
- [ ] Empathetic where appropriate
- [ ] No jargon or overly technical language

---

## Testing Strategy

### Unit Tests
**What:** Individual functions/methods
**Where:** Service files (*.service.ts)
**Tool:** Vitest
**Coverage Target:** 80%+

```bash
cd botflow-backend
npm run test
```

### Integration Tests
**What:** API endpoints + database
**Where:** Route tests (*.test.ts)
**Tool:** Vitest + Supertest
**Coverage:** All API routes

### End-to-End Tests
**What:** Full user flows
**Where:** Frontend + Backend
**Tool:** Playwright or Cypress
**Scenarios:** Bot creation, message flow, integrations

### Load Tests
**What:** Performance under load
**Where:** API endpoints
**Tool:** k6, Apache Bench
**Target:** 100 req/s, <200ms response

---

## Environment Variables

### New Variables for Week 9

```env
# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/calendar/callback

# Stripe (already exists)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Third-party CRM
HUBSPOT_API_KEY=your_hubspot_key
PIPEDRIVE_API_TOKEN=your_pipedrive_token
```

---

## Success Metrics

### Template Quality
- [ ] All 20 templates tested end-to-end
- [ ] 90%+ user satisfaction score (simulated)
- [ ] <5% handoff rate (AI handles 95%+ queries)
- [ ] Zero critical bugs

### Integration Functionality
- [ ] Google Calendar: 100% success rate on event creation
- [ ] Stripe: 100% payment success rate (test mode)
- [ ] CRM: All leads captured correctly
- [ ] iCal: 100% sync success rate

### Performance
- [ ] API response time <200ms (p95)
- [ ] Template loading <100ms
- [ ] Message processing <3s
- [ ] Database queries <50ms

### Code Quality
- [ ] 80%+ test coverage
- [ ] Zero linting errors
- [ ] All TypeScript strict checks passing
- [ ] Security audit clean

---

## Documentation Deliverables

### Technical Documentation
- [ ] API reference (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Service architecture diagrams
- [ ] Integration setup guides

### User Documentation
- [ ] Template usage guides (20 templates)
- [ ] Bot creation tutorial
- [ ] Integration configuration guides
- [ ] Troubleshooting FAQ

### Deployment Documentation
- [ ] Environment setup guide
- [ ] Database migration guide
- [ ] Monitoring setup
- [ ] Backup and recovery procedures

---

## Week 9 Completion Checklist

### Templates ✅
- [ ] All 20 templates refined
- [ ] End-to-end testing complete
- [ ] Documentation updated
- [ ] Edge cases handled

### Integrations ✅
- [ ] Google Calendar working
- [ ] Stripe payments functional
- [ ] CRM lead tracking operational
- [ ] All integrations tested

### Frontend ✅
- [ ] Property management UI complete
- [ ] Integration config UI working
- [ ] Analytics dashboard enhanced
- [ ] Mobile responsive

### Testing ✅
- [ ] Unit tests passing (80%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Load tests meeting targets
- [ ] Security audit clean

### Documentation ✅
- [ ] API docs complete
- [ ] User guides written
- [ ] Deployment guide ready
- [ ] Troubleshooting FAQ created

### Production Readiness ✅
- [ ] Performance optimized
- [ ] Security hardened
- [ ] Monitoring configured
- [ ] Backup system in place
- [ ] Error tracking setup

---

## Common Issues & Solutions

### Issue: Google Calendar OAuth Timeout
**Problem:** OAuth flow times out or fails
**Solution:**
- Check redirect URI matches exactly
- Verify scope permissions
- Clear browser cookies
- Check token expiry and refresh

### Issue: Stripe Webhook Not Receiving Events
**Problem:** Webhooks not triggering
**Solution:**
- Verify webhook endpoint URL
- Check webhook secret matches
- Use Stripe CLI for local testing
- Ensure HTTPS in production

### Issue: Calendar Sync Delays
**Problem:** Appointments not syncing quickly
**Solution:**
- Reduce sync frequency (trade-off with API limits)
- Implement webhook-based sync
- Add manual sync button
- Cache calendar data

### Issue: Payment Failures
**Problem:** Stripe checkout not completing
**Solution:**
- Check Stripe API keys (test vs live)
- Verify webhook signature
- Add detailed error logging
- Test with Stripe test cards

---

## Next Steps After Week 9

### Week 10: Final Polish & Beta Testing
- User acceptance testing with real businesses
- Bug fixes and refinements
- Performance optimization
- Analytics dashboard completion

### Week 11: Launch Preparation
- Marketing site completion
- Pricing finalization
- Support documentation
- Beta customer onboarding

### Week 12: Soft Launch
- Limited beta release
- Monitor system performance
- Collect user feedback
- Rapid iteration

### Week 13: Public Launch
- Full public availability
- Marketing campaign
- Press releases
- Customer success tracking

---

## Resources

### APIs & Documentation
- [Google Calendar API](https://developers.google.com/calendar)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Supabase Documentation](https://supabase.com/docs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

### Testing Tools
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [k6 Load Testing](https://k6.io/)
- [OWASP ZAP](https://www.zaproxy.org/)

### Frontend Libraries
- [React Big Calendar](https://github.com/jquense/react-big-calendar)
- [FullCalendar](https://fullcalendar.io/)
- [Recharts](https://recharts.org/) (analytics)

---

## Week 9 Ready! 🚀

**Achievement Target: Production-Ready Template Library + Core Integrations**

With 100% template coverage complete, Week 9 focuses on polish and production readiness. By the end of this week, BotFlow will be a fully functional, production-grade system ready for beta launch!

**Key Focus Areas:**
- Quality over quantity
- User experience excellence
- Performance optimization
- Production readiness

**Expected Outcome:**
- Templates refined and tested
- Core integrations operational
- System performant and secure
- Documentation comprehensive
- Ready for beta customers

---

**Ready to polish and integrate? Let's make BotFlow production-ready! 💪**
