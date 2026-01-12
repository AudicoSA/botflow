# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BotFlow is an AI-powered WhatsApp automation platform for South African businesses. It's a full-stack SaaS application with a Next.js frontend and Fastify backend, enabling businesses to create and manage AI-powered WhatsApp service agents.

This is a monorepo containing:
- `botflow-website/` - Next.js 15 frontend (landing page + dashboard)
- `botflow-backend/` - Fastify API server (Node.js + TypeScript)
- Documentation files (business plan, technical specs, deployment guides)

## Development Commands

### Frontend (botflow-website/)

```bash
cd botflow-website
npm install
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend (botflow-backend/)

```bash
cd botflow-backend
npm install
npm run dev          # Start dev server with tsx watch on http://localhost:3001
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled JavaScript from dist/
npm run lint         # Run ESLint
npm run test         # Run Vitest tests
```

## Architecture Overview

### Tech Stack

**Frontend:**
- Next.js 15 (App Router) with React 19
- TypeScript (strict mode enabled)
- TailwindCSS for styling
- Path alias: `@/*` maps to root directory

**Backend:**
- Fastify 4 with TypeScript (ESNext modules)
- Zod for validation and environment configuration
- Supabase for PostgreSQL database, auth, and storage
- OpenAI GPT-4o for AI responses
- BullMQ + Redis for message queue processing
- Pino for structured logging
- JWT authentication via @fastify/jwt

**Integrations:**
- WhatsApp via Bird API (primary) or Twilio (secondary)
- Stripe for payments
- Google Sheets OAuth for data export
- n8n for workflow automation

### Message Processing Flow

1. Customer sends WhatsApp message
2. Bird/Twilio sends webhook to `/webhooks/bird/whatsapp` or `/webhooks/whatsapp`
3. Backend creates/finds conversation in database
4. Message queued via BullMQ (requires Redis)
5. AI worker processes with OpenAI GPT-4 using conversation context
6. Response sent via Bird/Twilio API
7. Customer receives reply on WhatsApp

### Database Schema

The application uses Supabase (PostgreSQL) with 13 main tables:
- `organizations` - Multi-tenant customer accounts
- `organization_members` - Team membership and roles
- `whatsapp_accounts` - Connected WhatsApp Business numbers
- `bots` - AI bot configurations (booking, FAQ, order_tracking types)
- `bot_workflows` - Visual workflow definitions (React Flow nodes/edges)
- `conversations` - Customer conversation threads
- `messages` - All inbound/outbound messages
- `conversation_context` - AI memory and embeddings (pgvector)
- `knowledge_base_articles` - FAQ content with embeddings
- `message_templates` - WhatsApp approved templates
- `conversation_metrics` - Analytics data
- `usage_records` - Billing and usage tracking
- `integrations` - Third-party service connections

Row-Level Security (RLS) is enabled for multi-tenancy.

### Backend Architecture

**Entry point:** `botflow-backend/src/server.ts`

**Key directories:**
- `src/config/` - Environment validation (env.ts), Supabase client, Redis, logging
- `src/routes/` - Fastify route handlers (auth, bots, conversations, webhooks, integrations, etc.)
- `src/services/` - External service clients (Bird API, n8n, workflow generator)
- `src/queues/` - BullMQ message processing workers
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

**Authentication:** JWT-based with `fastify.authenticate` decorator. Verify with `await request.jwtVerify()`.

**API Routes:**
- `/health` - Health check endpoint
- `/api/auth/*` - Authentication (signup, login, logout)
- `/api/organizations/*` - Organization management
- `/api/whatsapp/*` - WhatsApp account management
- `/api/bots/*` - Bot CRUD operations
- `/api/bots/:id/knowledge` - Knowledge base per bot
- `/api/integrations/*` - Google Sheets OAuth and integrations
- `/api/conversations/*` - Conversation management
- `/webhooks/*` - Incoming webhooks from Bird/Twilio

**Environment Configuration:**

All environment variables are validated via Zod schema in `src/config/env.ts`. Required variables:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

Optional (feature-dependent):
- Bird: `BIRD_API_KEY`, `BIRD_WORKSPACE_ID`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (required for message queue)
- n8n: `N8N_API_URL`, `N8N_API_KEY`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

### Frontend Architecture

**Entry point:** `botflow-website/app/page.tsx` (landing page)

**Structure:**
- `app/` - Next.js App Router pages and layouts
- `app/components/` - Reusable React components (Hero, Features, Pricing, Navigation, Footer)
- `app/dashboard/` - Dashboard pages (main, bots, conversations, analytics, integrations)
- `app/login/` and `app/signup/` - Authentication pages
- `app/globals.css` - Global styles (TailwindCSS)

**Key pages:**
- `/` - Landing page with pricing (R499/R899/R1,999 tiers)
- `/dashboard` - Main dashboard overview
- `/dashboard/bots` - Bot management and creation
- `/dashboard/bots/[id]` - Individual bot detail
- `/dashboard/conversations` - Message inbox
- `/dashboard/analytics` - Analytics and metrics
- `/dashboard/integrations` - Google Sheets OAuth flow

## Template System

BotFlow uses a template-based approach to enable rapid bot creation across 20 business verticals. Users select a template, fill in configuration fields, and get a working bot instantly.

### Database
The `bot_templates` table stores all vertical templates with the following key fields:
- `vertical`: Identifier (taxi, restaurant, salon, etc.)
- `tier`: 1, 2, or 3 (launch priority - Tier 1 templates are launched first)
- `required_fields`: JSONB defining the dynamic onboarding form
- `conversation_flow`: AI instructions, prompts, and behavior rules
- `is_published`: Only published templates are shown to users
- `version`: Template version for tracking updates

Row-Level Security (RLS) policies:
- Public users can read published templates
- Authenticated users can read all templates
- Admin users can create/update/delete templates

### Template Structure

Templates define:
1. **Required Fields** - Dynamic form configuration
   - Field types: text, textarea, number, select, multiselect, time, json
   - Validation rules (min, max, options, patterns)
   - Labels, placeholders, help text

2. **Conversation Flow** - AI behavior configuration
   - `systemPrompt`: Main AI instruction with variable placeholders (`{{business_name}}`)
   - `welcomeMessage`: First message to customer
   - `rules`: Behavioral guidelines
   - `intents`: Keyword triggers and response patterns
   - `handoffConditions`: When to escalate to human

3. **Metadata**
   - Name, description, tagline, icon
   - Example prompts for users
   - Required integrations (maps, calendar, payment, etc.)

### API Endpoints
- `GET /api/templates` - List all published templates (public)
- `GET /api/templates/:id` - Get specific template (public)
- `GET /api/templates/vertical/:vertical` - Get templates by vertical (public)
- `POST /api/templates` - Create template (admin only, requires auth)
- `PATCH /api/templates/:id` - Update template (admin only, requires auth)
- `DELETE /api/templates/:id` - Delete template (admin only, requires auth)
- `POST /api/bots/create-from-template` - Instantiate bot from template (requires auth)

### Template Instantiation Flow

When a user creates a bot from a template:

1. **Validation** - System validates field_values against template's required_fields
   - Checks required fields are present
   - Validates data types (number, text, etc.)
   - Validates select/multiselect options
   - Validates min/max constraints

2. **Variable Replacement** - System replaces `{{variable}}` placeholders
   - Processes systemPrompt: `{{business_name}}` → actual business name
   - Processes welcomeMessage with user data
   - Converts arrays to comma-separated strings for display

3. **Bot Creation** - System creates bot record
   - Copies template metadata (name, description, vertical)
   - Stores full configuration with processed conversation_flow
   - Links to organization and WhatsApp account
   - Sets default AI model (gpt-4o) and temperature (0.7)

4. **Result** - Bot is immediately active and ready to receive messages

### Template Files

**Type Definitions:** `botflow-backend/src/types/template.ts`
- `TemplateField` - Field definition interface
- `ConversationFlow` - AI behavior interface
- `BotTemplate` - Complete template interface
- `TemplateInstantiationData` - Bot creation payload

**Example Templates:** `botflow-backend/src/data/`
- `example-taxi-template.json` - Taxi & Shuttle Service (Week 4)
- `medical-template.json` - Medical & Dental Practice (Week 5)
- `real-estate-template.json` - Real Estate Agent (Week 5)
- `ecommerce-template.json` - E-commerce Store (Week 5)
- `restaurant-template.json` - Restaurant & Food Service (Week 6)
- `salon-template.json` - Hair Salon & Beauty (Week 6)
- `gym-template.json` - Gym & Fitness Center (Week 6)
- `retail-template.json` - Retail Store (Week 7)
- `hotel-template.json` - Hotel & Guesthouse (Week 7)
- `car-rental-template.json` - Car Rental Service (Week 7)
- `plumber-template.json` - Plumber & Home Services (Week 7)
- `doctor-template.json` - Doctor & Clinic (Week 7)

**Services:** `botflow-backend/src/services/template-instantiation.service.ts`
- `instantiateBot()` - Creates bot from template with validation
- `validateFieldValues()` - Validates user input against template
- `generateBotConfig()` - Merges template with user data
- `replaceVariables()` - Processes `{{placeholder}}` syntax

**Scripts:** `botflow-backend/src/scripts/`
- `seed-templates.ts` - Loads templates into database
- `validate-template.ts` - Validates template JSON structure

### Adding a New Template

1. Create template JSON in `src/data/` following the structure
2. Validate with: `node dist/scripts/run-validate.js`
3. Seed with: `node dist/scripts/run-seed.js`
4. Verify via API: `GET /api/templates`

### Template Tiers

Templates are organized into 3 tiers for phased rollout:

**Tier 1** (High-impact businesses - Weeks 4-6): ✅ COMPLETE!
- ✅ Taxi & Shuttle Service (Week 4)
- ✅ Medical & Dental Practice (Week 5)
- ✅ Real Estate Agent (Week 5)
- ✅ E-commerce Store (Week 5)
- ✅ Restaurant & Food Service (Week 6)
- ✅ Hair Salon & Beauty (Week 6)
- ✅ Gym & Fitness Center (Week 6)

**Tier 2** (Specialized businesses - Week 7): ✅ COMPLETE!
- ✅ Retail Store (Week 7)
- ✅ Hotel & Guesthouse (Week 7)
- ✅ Car Rental Service (Week 7)
- ✅ Plumber & Home Services (Week 7)
- ✅ Doctor & Clinic (Week 7)

**Tier 3** (Niche businesses - Weeks 8-9):
- ✅ Airbnb & Vacation Rental (Week 8)
- Lawyer, Accountant, Travel Agency, Cleaning Service, Tutor/Teacher, Auto Mechanic, Veterinarian

**Progress:** 13 of 20 templates complete (65%). Tier 1: 7 of 7 (100%) ✅ | Tier 2: 5 of 5 (100%) ✅ | Tier 3: 1 of 8 (12.5%)

This approach allows focused development and testing of high-impact verticals first.

### Completed Templates (Tier 1 - 100% Complete!)

**Taxi & Shuttle Service** (`taxi`) - Week 4
- Ride booking with pickup/dropoff locations
- Fare estimation and payment options
- Real-time ETA and driver tracking
- Safety features and emergency contacts
- Integration: Maps, Payment, CRM

**Medical & Dental Practice** (`medical`) - Week 5
- Appointment booking with patient details
- Emergency detection and routing (10177, 112)
- Medical aid verification (South African schemes)
- POPIA compliance for patient privacy
- Professional medical receptionist tone
- Integration: Calendar, CRM

**Real Estate Agent** (`real_estate`) - Week 5
- Property inquiry and lead qualification
- Viewing booking workflow
- Budget, area, and timeline discovery
- Relationship-building conversational style
- Enthusiastic and consultative approach
- Integration: Calendar, Maps, CRM

**E-commerce Store** (`ecommerce`) - Week 5
- 24/7 customer service automation
- Product inquiry and recommendations
- Order tracking with identity verification
- Return policy automation
- Multi-category support (Fashion, Electronics, Home, Beauty, etc.)
- Integration: E-commerce Platform, Payment, Shipping

**Restaurant & Food Service** (`restaurant`) - Week 6
- Table reservation management with party size
- Menu inquiries and signature dish recommendations
- Dietary requirements (halal, kosher, vegan, allergies)
- Special occasion bookings (birthdays, anniversaries)
- Load shedding contingency mentions
- Warm and hospitable tone
- Integration: Calendar, Maps

**Hair Salon & Beauty** (`salon`) - Week 6
- Appointment booking with service selection
- Hair type/texture sensitivity (African, European, mixed)
- Stylist preference handling
- Bridal and special event styling
- Service pricing and duration inquiries
- Personal and pampering tone
- Integration: Calendar

**Gym & Fitness Center** (`gym`) - Week 6
- Membership inquiries with multiple packages
- Class booking system (yoga, spinning, CrossFit)
- Personal training consultation offers
- Fitness goal discussion and motivation
- Trial visit and gym tour coordination
- Energetic and motivating tone
- Integration: Calendar, CRM, Payment

### Completed Templates (Tier 2 - 100% Complete!)

**Retail Store** (`retail`) - Week 7
- Product inquiries and store information
- Store hours and location assistance
- Payment methods and return policy
- Layaway and special services
- Load shedding impact on card payments
- Helpful and knowledgeable store assistant tone
- Integration: Maps, CRM

**Hotel & Guesthouse** (`hotel`) - Week 7
- Room availability and booking inquiries
- Amenities information (WiFi, pool, parking, breakfast)
- Check-in/out procedures
- Special requests and cancellation policy
- Local area attractions and directions
- Warm and hospitable receptionist tone
- Integration: Calendar, Maps

**Car Rental Service** (`car_rental`) - Week 7
- Vehicle availability and rental bookings
- Insurance options explanation (CDW, comprehensive, excess waiver)
- Age and license requirements
- Additional services (GPS, child seats, extra driver)
- Pickup/dropoff arrangements including airport
- Professional and informative rental agent tone
- Integration: Calendar, Maps, Payment

**Plumber & Home Services** (`plumber`) - Week 7
- Emergency detection (burst pipes, leaks, flooding)
- Scheduled service booking
- Service inquiries and quotes
- Coverage area confirmation
- Load shedding issues (geyser timers, surge damage)
- COC certification mentions
- Reassuring and responsive service coordinator tone
- Integration: Calendar, Maps

**Doctor & Clinic** (`doctor`) - Week 7
- Appointment scheduling with patient details
- Emergency detection and triage (10177, 112)
- Medical aid verification (Discovery, Bonitas, etc.)
- Consultation fee transparency
- Prescription renewal requests
- POPIA compliance for patient privacy
- Professional and empathetic medical receptionist tone
- Integration: Calendar, CRM

### Completed Templates (Tier 3 - In Progress)

**Airbnb & Vacation Rental** (`airbnb`) - Week 8
- Property availability inquiries with real-time calendar sync
- iCal integration with Airbnb, Booking.com, Google Calendar
- Multi-night booking with min/max night constraints
- Property details (bedrooms, bathrooms, max guests, amenities)
- Check-in/check-out instructions and house rules
- Self-check-in process automation
- SA localization (braai facilities, load shedding backup, security)
- Integration: Calendar, iCal Sync, Maps

**iCal Integration Features:**
- Automated calendar sync every 15 minutes
- Multi-calendar support (merge Airbnb + Booking.com + Google)
- Real-time availability queries via API
- Blocked dates management
- Buffer days for cleaning between bookings
- Min/max night constraints
- Timezone handling

**Template Documentation:**
- [TEMPLATE_PATTERNS.md](./botflow-backend/TEMPLATE_PATTERNS.md) - Reusable patterns library
- [TEMPLATE_CHECKLIST.md](./botflow-backend/TEMPLATE_CHECKLIST.md) - Quality assurance checklist
- [TEST_WEEK_5_TEMPLATES.md](./botflow-backend/TEST_WEEK_5_TEMPLATES.md) - Week 5 testing guide
- [TEST_WEEK_6_TEMPLATES.md](./botflow-backend/TEST_WEEK_6_TEMPLATES.md) - Week 6 testing guide
- [WEEK_5_SUMMARY.md](./WEEK_5_SUMMARY.md) - Week 5 completion report
- [WEEK_6_SUMMARY.md](./WEEK_6_SUMMARY.md) - Week 6 completion report (Tier 1 100%!)
- [WEEK_7_SUMMARY.md](./WEEK_7_SUMMARY.md) - Week 7 completion report (Tier 2 100%!)
- [WEEK_8_AIRBNB_PROGRESS.md](./WEEK_8_AIRBNB_PROGRESS.md) - Airbnb template + iCal integration

## Important Implementation Notes

### ESM Modules
The backend uses ESM modules (`"type": "module"` in package.json). Always use:
- `.js` extensions in imports (TypeScript compiles to JS)
- `import` instead of `require`
- No `__dirname` - use `import { fileURLToPath } from 'url'` if needed

### CORS Configuration
Backend has dynamic CORS configured in `server.ts`:
- Allows localhost on any port
- Allows Vercel deployments (`*.vercel.app`)
- Allows configured `FRONTEND_URL`
- Rejects other origins

### Error Handling
Global error handler in `server.ts` handles:
- Validation errors (400)
- Unauthorized errors (401)
- Generic errors (500)
- Development mode includes full error messages

### Message Queue
BullMQ workers require Redis. If Redis is not configured, message processing will fail. For local development without Redis, you can test other endpoints but not the full WhatsApp message flow.

### Integration Patterns
When adding new integrations:
1. Add optional env vars to `src/config/env.ts` Zod schema
2. Create service client in `src/services/`
3. Add route handler in `src/routes/`
4. Register route in `src/server.ts`
5. Update integration record in `integrations` table

### Google Sheets OAuth Flow
The Google Sheets integration uses OAuth 2.0:
1. User clicks "Connect" in dashboard
2. Frontend redirects to `/api/integrations/google-sheets/auth`
3. Backend redirects to Google OAuth consent screen
4. User approves, Google redirects to `/api/integrations/google-sheets/callback`
5. Backend exchanges code for tokens, stores encrypted credentials
6. Frontend shows success state

**Important:** The Google OAuth implementation uses ESM imports for `googleapis`. Never use `require()` or nested imports like `googleapis/build/src/*`.

## Deployment

### Frontend (Vercel)
- Root Directory: `botflow-website`
- Framework: Next.js
- Build Command: `npm run build`
- Environment Variables: `NEXT_PUBLIC_API_URL` (backend URL)

### Backend (Railway/Render)
- Root Directory: `botflow-backend`
- Build Command: `npm run build`
- Start Command: `npm run start`
- Environment Variables: See env.ts for full list

### Database (Supabase)
- Schema is defined in documentation (technical_implementation_plan.md)
- Enable pgvector extension for embeddings
- Configure RLS policies for multi-tenancy

## Testing

The backend uses Vitest for testing. Tests are located alongside source files or in a dedicated test directory.

```bash
cd botflow-backend
npm run test
```

## Common Workflows

### Adding a new API route:
1. Create route file in `botflow-backend/src/routes/`
2. Export Fastify plugin with route definitions
3. Register in `src/server.ts` with appropriate prefix
4. Add authentication via `onRequest: [fastify.authenticate]` if needed

### Adding a new bot workflow node type:
1. Define type in bot workflow schema
2. Update workflow execution logic in message queue worker
3. Add UI component in frontend bot builder

### Adding a new WhatsApp message template:
1. Create template in Bird/Twilio dashboard
2. Get approval from WhatsApp
3. Store in `message_templates` table
4. Reference in bot configuration

## Known Issues & Considerations

- TypeScript `strict` mode is disabled in backend (set to `false` in tsconfig.json)
- Redis is optional but required for message queue functionality
- Bird API is the primary WhatsApp provider, Twilio is secondary
- All credentials are stored encrypted in database
- 24-hour message window applies to WhatsApp conversations (service messages are free)

## Project Status

Current status is tracked in [STATUS.md](./STATUS.md). The project has:
- Working backend API with authentication
- Supabase database fully configured
- Bird WhatsApp integration operational
- Frontend landing page and dashboard structure
- Message queue with AI-powered responses

Key remaining work:
- Full dashboard UI implementation
- Visual bot builder with React Flow
- Advanced analytics
- Billing integration completion
