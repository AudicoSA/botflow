# Week 12 Testing Checklist

## Status: Ready to Begin
**Last Updated:** 2026-01-12

---

## Phase 1: Database Setup ✅

### Migration Status

- [ ] **Migration 001** - Bot Templates Table
  - [ ] Table created: `bot_templates`
  - [ ] Indexes created (vertical, published, tier)
  - [ ] RLS policies active
  - [ ] Triggers working (updated_at)

- [ ] **Migration 002** - Properties & Availability (Airbnb)
  - [ ] Table created: `properties`
  - [ ] Table created: `blocked_dates`
  - [ ] Table created: `sync_logs`
  - [ ] Indexes created
  - [ ] RLS policies active

- [ ] **Migration 003** - Payments & Subscriptions
  - [ ] Table created: `payments`
  - [ ] Table created: `subscriptions`
  - [ ] Indexes created
  - [ ] RLS policies active

- [ ] **Migration 004** - Integration Marketplace
  - [ ] Table created: `integration_marketplace`
  - [ ] Table created: `bot_integrations`
  - [ ] Table created: `integration_logs`
  - [ ] Google Calendar seeded (direct integration)
  - [ ] Paystack seeded (direct integration)
  - [ ] Indexes created
  - [ ] RLS policies active

### Data Seeding Status

- [ ] **Templates Seeded** (Expected: 20 templates)
  - [ ] Tier 1 (7 templates):
    - [ ] Taxi & Shuttle Service
    - [ ] Medical & Dental Practice
    - [ ] Real Estate Agent
    - [ ] E-commerce Store
    - [ ] Restaurant & Food Service
    - [ ] Hair Salon & Beauty
    - [ ] Gym & Fitness Center
  - [ ] Tier 2 (5 templates):
    - [ ] Retail Store
    - [ ] Hotel & Guesthouse
    - [ ] Car Rental Service
    - [ ] Plumber & Home Services
    - [ ] Doctor & Clinic
  - [ ] Tier 3 (8 templates):
    - [ ] Airbnb & Vacation Rental
    - [ ] Lawyer & Legal Services
    - [ ] Accountant & Bookkeeping
    - [ ] Travel Agency
    - [ ] Cleaning Service
    - [ ] Tutor/Teacher
    - [ ] Auto Mechanic
    - [ ] Veterinarian

- [ ] **Integrations Seeded** (Expected: 32 integrations)
  - [ ] Direct Integrations (2):
    - [ ] Google Calendar
    - [ ] Paystack
  - [ ] Marketplace Integrations (30):
    - [ ] Calendar category (5)
    - [ ] Payment category (5)
    - [ ] CRM category (5)
    - [ ] Communication category (5)
    - [ ] E-commerce category (5)
    - [ ] Analytics category (2)
    - [ ] Productivity category (2)
    - [ ] Specialized category (1)

### Database Verification

- [ ] **Table Counts**
  ```sql
  SELECT COUNT(*) FROM bot_templates; -- Should be 20
  SELECT COUNT(*) FROM integration_marketplace; -- Should be 32
  ```

- [ ] **RLS Verification**
  ```sql
  SELECT COUNT(*) FROM pg_policies
  WHERE tablename IN ('bot_templates', 'properties', 'blocked_dates', 'sync_logs',
                      'payments', 'subscriptions', 'integration_marketplace',
                      'bot_integrations', 'integration_logs');
  -- Should have multiple policies
  ```

- [ ] **Index Verification**
  ```sql
  SELECT tablename, COUNT(*) as index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('bot_templates', 'properties', 'payments',
                      'integration_marketplace', 'bot_integrations')
  GROUP BY tablename;
  -- Each table should have multiple indexes
  ```

---

## Phase 2: Backend API Testing

### Health & Status Endpoints

- [ ] `GET /health`
  - [ ] Returns 200 status
  - [ ] Returns `{"status":"ok","timestamp":"..."}`

- [ ] `GET /api/ralph/status` (authenticated)
  - [ ] Returns Ralph configuration
  - [ ] Shows enabled status
  - [ ] Shows model name (claude-3-5-sonnet-20241022)

### Template API Endpoints

- [ ] `GET /api/templates` (public)
  - [ ] Returns 200 status
  - [ ] Returns array of 20 templates
  - [ ] Only shows published templates
  - [ ] Each template has required fields

- [ ] `GET /api/templates/:id` (public)
  - [ ] Returns single template
  - [ ] Returns 404 for invalid ID
  - [ ] Includes all fields (required_fields, conversation_flow, etc.)

- [ ] `GET /api/templates/vertical/:vertical` (public)
  - [ ] Returns templates for specific vertical
  - [ ] Returns empty array for non-existent vertical

- [ ] `POST /api/bots/create-from-template` (authenticated)
  - [ ] Creates bot successfully with valid data
  - [ ] Returns 400 for missing required fields
  - [ ] Returns 401 without authentication
  - [ ] Validates field_values against template
  - [ ] Replaces {{variables}} in conversation flow

### Integration Marketplace Endpoints

- [ ] `GET /api/marketplace` (public)
  - [ ] Returns 200 status
  - [ ] Returns array of 32 integrations
  - [ ] Includes both direct and marketplace integrations

- [ ] `GET /api/marketplace/:slug` (public)
  - [ ] Returns single integration by slug
  - [ ] Returns 404 for invalid slug
  - [ ] Includes setup_instructions

- [ ] `GET /api/marketplace/category/:category` (public)
  - [ ] Returns integrations for category
  - [ ] Valid categories: calendar, payment, crm, communication, ecommerce, analytics, productivity, specialized

- [ ] `POST /api/marketplace/:slug/enable` (authenticated)
  - [ ] Enables integration for bot
  - [ ] Returns 400 for missing bot_id
  - [ ] Returns 401 without authentication
  - [ ] Creates record in bot_integrations table

- [ ] `DELETE /api/marketplace/:slug/disable` (authenticated)
  - [ ] Disables integration
  - [ ] Returns 404 if not enabled
  - [ ] Removes record from bot_integrations table

### Google Calendar Integration

- [ ] `GET /api/calendar/auth` (authenticated)
  - [ ] Redirects to Google OAuth consent screen
  - [ ] Includes state parameter for security
  - [ ] Includes bot_id in state

- [ ] `GET /api/calendar/callback` (OAuth callback)
  - [ ] Exchanges code for tokens
  - [ ] Stores encrypted credentials
  - [ ] Updates bot_integrations status to 'active'
  - [ ] Redirects to frontend with success

- [ ] `POST /api/calendar/events` (authenticated)
  - [ ] Creates calendar event successfully
  - [ ] Returns event ID and link
  - [ ] Validates start_time and end_time
  - [ ] Returns 400 for invalid bot_id

- [ ] `GET /api/calendar/availability` (authenticated)
  - [ ] Checks availability for date range
  - [ ] Returns available time slots
  - [ ] Respects working hours configuration

### Paystack Integration

- [ ] `POST /api/payments/initialize` (authenticated)
  - [ ] Initializes payment successfully
  - [ ] Returns payment URL
  - [ ] Returns reference code
  - [ ] Validates amount (must be positive)
  - [ ] Validates email format

- [ ] `POST /api/payments/webhook` (public, signature verified)
  - [ ] Verifies Paystack signature
  - [ ] Updates payment status
  - [ ] Returns 200 on success
  - [ ] Returns 400 for invalid signature

- [ ] `GET /api/payments/:reference/verify` (authenticated)
  - [ ] Verifies payment status
  - [ ] Returns payment details
  - [ ] Returns 404 for invalid reference

### Ralph Template Generation

- [ ] `POST /api/ralph/generate-template` (authenticated)
  - [ ] Generates template successfully
  - [ ] Returns complete template structure
  - [ ] Includes required_fields
  - [ ] Includes conversation_flow
  - [ ] Recommends integrations
  - [ ] Takes 2-3 minutes
  - [ ] Returns 503 if Ralph not enabled

- [ ] `POST /api/ralph/refine-template` (authenticated)
  - [ ] Refines existing template
  - [ ] Accepts feedback
  - [ ] Returns improved version
  - [ ] Maintains template structure

- [ ] `POST /api/ralph/chat` (authenticated)
  - [ ] Responds to chat messages
  - [ ] Maintains conversation context
  - [ ] Returns helpful responses

### Airbnb iCal Integration

- [ ] `POST /api/properties` (authenticated)
  - [ ] Creates property successfully
  - [ ] Validates ical_urls array
  - [ ] Sets default timezone

- [ ] `POST /api/properties/:id/sync` (authenticated)
  - [ ] Triggers calendar sync
  - [ ] Fetches iCal data
  - [ ] Parses VEVENT entries
  - [ ] Inserts blocked_dates
  - [ ] Creates sync_log entry

- [ ] `GET /api/properties/:id/availability` (authenticated)
  - [ ] Checks date range availability
  - [ ] Respects blocked_dates
  - [ ] Respects min/max nights
  - [ ] Respects buffer_days

---

## Phase 3: Frontend Testing

### Landing Page (/)

- [ ] Page loads without errors
- [ ] Navigation menu works
- [ ] Hero section displays correctly
- [ ] Features section visible
- [ ] Pricing section shows 3 tiers (R499, R899, R1,999)
- [ ] CTA buttons work
- [ ] Footer links work
- [ ] Mobile responsive (375px width)

### Authentication

- [ ] **Login** (/login)
  - [ ] Form validation works
  - [ ] Successful login redirects to dashboard
  - [ ] Error messages display correctly
  - [ ] "Forgot password" link works

- [ ] **Signup** (/signup)
  - [ ] Form validation works
  - [ ] Password strength indicator works
  - [ ] Successful signup creates account
  - [ ] Redirects to dashboard after signup
  - [ ] Email verification (if enabled)

### Dashboard Home (/dashboard)

- [ ] Loads without errors
- [ ] Shows organization name
- [ ] Displays bot count
- [ ] Shows conversation count
- [ ] Recent activity visible
- [ ] Quick actions work
- [ ] Mobile responsive

### Template Marketplace (/dashboard/templates)

- [ ] **Template List**
  - [ ] Shows 20 template cards
  - [ ] Cards display name, description, icon
  - [ ] Tier badges visible (1, 2, 3)
  - [ ] Filter by tier works
  - [ ] Search/filter functionality

- [ ] **Template Preview Modal**
  - [ ] Opens on card click
  - [ ] Shows full description
  - [ ] Shows example prompts (3-5 examples)
  - [ ] Shows required fields list
  - [ ] Shows required integrations
  - [ ] Shows template features
  - [ ] "Use This Template" button visible

- [ ] **Template Onboarding Flow**
  - [ ] Click "Use This Template"
  - [ ] Dynamic form renders with correct fields
  - [ ] Field types render correctly (text, textarea, select, multiselect, time, number)
  - [ ] Form validation works
  - [ ] Required fields marked with *
  - [ ] Help text displays
  - [ ] Submit creates bot
  - [ ] Success toast appears
  - [ ] Redirects to bot detail page

### Integration Marketplace (/dashboard/marketplace)

- [ ] **Integration List**
  - [ ] Shows 32 integration cards
  - [ ] Cards display name, description, icon
  - [ ] Category badges visible
  - [ ] Filter by category works (8 categories)
  - [ ] Search functionality works
  - [ ] Featured integrations highlighted

- [ ] **Integration Detail Modal**
  - [ ] Opens on card click
  - [ ] Shows long description
  - [ ] Shows setup instructions
  - [ ] Shows pricing model
  - [ ] Shows supported features
  - [ ] "Enable Integration" button visible
  - [ ] Documentation link works

- [ ] **Enable Integration Flow**
  - [ ] Click "Enable Integration"
  - [ ] Modal asks for bot selection
  - [ ] Configuration form appears (if needed)
  - [ ] For OAuth (Google Calendar):
    - [ ] Redirects to Google consent screen
    - [ ] User approves
    - [ ] Redirects back with success
  - [ ] For API Key (Paystack):
    - [ ] Form shows API key fields
    - [ ] Secret key field is password type
    - [ ] Test connection button works
  - [ ] Success toast appears
  - [ ] Integration status shows "Active"

### Bot Management (/dashboard/bots)

- [ ] **Bot List**
  - [ ] Shows all user bots
  - [ ] Displays bot name, vertical, status
  - [ ] Active/inactive toggle works
  - [ ] Delete button works (with confirmation)
  - [ ] Create new bot button works

- [ ] **Bot Detail** (/dashboard/bots/:id)
  - [ ] Shows bot configuration
  - [ ] Shows conversation count
  - [ ] Shows active integrations
  - [ ] Edit configuration works
  - [ ] View conversations link works
  - [ ] Pause/resume bot works

### Conversations (/dashboard/conversations)

- [ ] Conversation list loads
- [ ] Shows customer name/phone
- [ ] Shows last message preview
- [ ] Shows timestamp
- [ ] Click opens conversation detail
- [ ] Search/filter works

### Analytics (/dashboard/analytics)

- [ ] Page loads without errors
- [ ] Shows basic metrics
- [ ] Charts render (if implemented)
- [ ] Date range filter works

---

## Phase 4: Performance Testing

### Load Testing Setup

- [ ] Artillery installed: `npm install -g artillery`
- [ ] Load test config created: `load-test.yml`
- [ ] Test scenarios defined

### Load Test Results

- [ ] **Warm-up Phase** (60s, 10 req/s)
  - [ ] No errors
  - [ ] Response time < 500ms

- [ ] **Sustained Load** (120s, 50 req/s)
  - [ ] Error rate < 1%
  - [ ] p95 response time < 200ms
  - [ ] p99 response time < 500ms

- [ ] **Spike Test** (60s, 100 req/s)
  - [ ] System handles spike
  - [ ] Error rate < 5%
  - [ ] No crashes

### Performance Benchmarks

API Response Times:
- [ ] `GET /api/templates` - < 100ms
- [ ] `GET /api/templates/:id` - < 50ms
- [ ] `POST /api/bots/create-from-template` - < 500ms
- [ ] `GET /api/marketplace` - < 150ms
- [ ] `POST /api/ralph/generate-template` - < 30 seconds
- [ ] `POST /api/calendar/events` - < 300ms
- [ ] `POST /api/payments/initialize` - < 400ms

Database Queries:
- [ ] Template list query - < 20ms
- [ ] Integration list query - < 30ms
- [ ] Bot creation transaction - < 200ms
- [ ] Calendar availability check - < 100ms

Frontend:
- [ ] Template marketplace page load - < 2s
- [ ] Integration marketplace page load - < 2s
- [ ] Template preview modal - < 500ms
- [ ] Form submission - < 1s

---

## Phase 5: Security Audit

### Authentication & Authorization

- [ ] JWT tokens expire after 24 hours
- [ ] Refresh token mechanism (if implemented)
- [ ] Password hashing with bcrypt (cost 10+)
- [ ] Rate limiting on auth endpoints (100 req/min)
- [ ] CORS properly configured (only trusted origins)
- [ ] No sensitive data in JWT payload
- [ ] Session management secure

### Data Security

- [ ] All API keys encrypted (AES-256-GCM)
- [ ] OAuth tokens encrypted
- [ ] Environment variables not in git (.gitignore)
- [ ] Database uses SSL connections
- [ ] RLS policies active on all tables
- [ ] Service role key never exposed to frontend
- [ ] Credentials never logged

### API Security

- [ ] Input validation on all endpoints (Zod)
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention (sanitized input)
- [ ] CSRF protection (for state-changing ops)
- [ ] Rate limiting enabled
- [ ] Authentication required on protected routes
- [ ] Error messages don't leak sensitive info

### Integration Security

- [ ] OAuth 2.0 state parameter used
- [ ] Webhook signatures verified (Paystack)
- [ ] API keys encrypted in database
- [ ] HTTPS enforced in production
- [ ] Secrets rotation policy defined
- [ ] No hardcoded credentials

### Penetration Testing (Manual)

- [ ] Attempt SQL injection on all inputs
- [ ] Test for XSS in text fields
- [ ] Try to access other users' data (RLS test)
- [ ] Attempt to bypass authentication
- [ ] Test rate limiting (spam requests)
- [ ] Try to decode/modify JWT tokens
- [ ] Test CORS with unauthorized origins

---

## Phase 6: Monitoring Setup

### Error Tracking

- [ ] Sentry or equivalent installed
- [ ] Error alerts configured
- [ ] Performance monitoring enabled
- [ ] Source maps uploaded (frontend)
- [ ] Backend error tracking
- [ ] Slack/email notifications

### Analytics

- [ ] Google Analytics or PostHog installed
- [ ] Key events tracked:
  - [ ] User signup
  - [ ] User login
  - [ ] Bot creation
  - [ ] Template selection
  - [ ] Integration enabled
  - [ ] Message sent/received
- [ ] Conversion funnel defined
- [ ] Dashboard created

### Logging

- [ ] Pino logging configured
- [ ] Log levels appropriate (info in prod)
- [ ] Sensitive data excluded from logs
- [ ] Log aggregation (Datadog, Logtail, etc.)
- [ ] Log retention policy defined

### Uptime Monitoring

- [ ] UptimeRobot or equivalent configured
- [ ] Monitor endpoints:
  - [ ] `/health`
  - [ ] `/api/templates`
  - [ ] `/api/marketplace`
- [ ] Alert when down > 5 minutes
- [ ] Status page created (optional)

---

## Phase 7: Beta Launch Preparation

### Documentation

- [ ] **Getting Started Guide** created
  - [ ] Account creation steps
  - [ ] Bot creation walkthrough
  - [ ] First message example
  - [ ] Basic configuration

- [ ] **Template Guide** created
  - [ ] Overview of 20 templates
  - [ ] When to use each template
  - [ ] Required fields explained
  - [ ] Best practices per vertical

- [ ] **Integration Guide** created
  - [ ] How to enable integrations
  - [ ] Google Calendar OAuth flow
  - [ ] Paystack setup guide
  - [ ] n8n workflow import (if available)

- [ ] **API Documentation** created
  - [ ] Authentication guide
  - [ ] Template endpoints
  - [ ] Integration endpoints
  - [ ] Webhook setup

- [ ] **FAQ** created
  - [ ] Common questions
  - [ ] Troubleshooting tips
  - [ ] Pricing information
  - [ ] Support contact

### Beta User Preparation

- [ ] Identified 10-20 beta users
- [ ] Beta invitation email drafted
- [ ] Beta user welcome kit prepared
- [ ] Feedback collection system setup
- [ ] Beta Slack/WhatsApp group created
- [ ] Support system ready

### Beta User List

Target Industries:
- [ ] 2-3 Taxi/transport businesses
- [ ] 2-3 Salons/spas
- [ ] 2-3 Restaurants/cafes
- [ ] 2-3 Medical/dental practices
- [ ] 2-3 Retail stores
- [ ] 2-3 Service providers (plumber, mechanic, etc.)
- [ ] 1-2 Hotels/guesthouses
- [ ] 1-2 Real estate agents

---

## Critical Issues Found

### Blocker Issues (Must fix before beta)

1. [ ] Issue #1: [Description]
   - Impact: [High/Medium/Low]
   - Fix: [Solution]

### Major Issues (Should fix before beta)

1. [ ] Issue #1: [Description]
   - Impact: [High/Medium/Low]
   - Fix: [Solution]

### Minor Issues (Can fix during beta)

1. [ ] Issue #1: [Description]
   - Impact: [High/Medium/Low]
   - Fix: [Solution]

---

## Week 12 Summary

### Completion Status

- [ ] Phase 1: Database Setup - **0%**
- [ ] Phase 2: Backend API Testing - **0%**
- [ ] Phase 3: Frontend Testing - **0%**
- [ ] Phase 4: Performance Testing - **0%**
- [ ] Phase 5: Security Audit - **0%**
- [ ] Phase 6: Monitoring Setup - **0%**
- [ ] Phase 7: Beta Launch Prep - **0%**

**Overall Week 12 Progress:** 0%

### Key Metrics

- **Templates Seeded:** 0 / 20
- **Integrations Seeded:** 0 / 32
- **Backend Tests Passed:** 0 / 40
- **Frontend Tests Passed:** 0 / 30
- **Security Issues:** 0 found
- **Performance Benchmarks:** 0 / 8 met
- **Beta Users Onboarded:** 0 / 10

---

## Next Steps

1. Run database migrations (see [RUN_MIGRATIONS.md](./botflow-backend/RUN_MIGRATIONS.md))
2. Seed templates: `npm run build && node dist/scripts/run-seed.js`
3. Seed integrations: `node dist/scripts/seed-integrations.js`
4. Start backend testing with HTTP files
5. Continue through checklist systematically

---

**Last Updated:** 2026-01-12
**Status:** Ready to Begin Week 12 Testing
