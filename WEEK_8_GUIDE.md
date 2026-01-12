# Week 8 Implementation Guide
## Final 8 Tier-3 Templates + Airbnb iCal Integration - 100% COMPLETION!

**Week:** 8 of 13
**Phase:** 3 - Expansion Templates (Final Week)
**Duration:** 7-10 days
**Focus:** Complete all remaining templates + advanced Airbnb integration

---

## Week Overview

Week 8 is the **final template development week** - we'll complete the remaining 8 Tier-3 templates to reach **100% template coverage (20 of 20)**! This week also includes research and implementation of the **Airbnb iCal integration**, a more complex feature requiring calendar sync, availability management, and external API integration.

### What You'll Build

**8 Tier-3 Templates:**
1. **Airbnb/Vacation Rental Template** - Property bookings with iCal sync (COMPLEX)
2. **Lawyer/Legal Services Template** - Consultation bookings, case inquiries
3. **Accountant/Tax Services Template** - Tax appointments, financial queries
4. **Travel Agency Template** - Trip planning, booking assistance
5. **Cleaning Service Template** - Scheduling, quotes, service types
6. **Auto Mechanic Template** - Service bookings, diagnostics, quotes
7. **Veterinarian Template** - Pet appointments, emergency triage
8. **Tutor/Teacher Template** - Lesson bookings, subject inquiries

**Airbnb iCal Integration:**
- iCal URL management (per property)
- Automated calendar sync (scheduled fetching)
- Availability calculation and caching
- Date range queries for AI responses
- Multi-calendar merging (Airbnb + Booking.com + Google)

### Success Criteria

By end of week, you should have:
- ✅ All 20 templates complete and published (100%)
- ✅ Airbnb template with working iCal integration
- ✅ Calendar sync service operational
- ✅ Availability API endpoints functional
- ✅ AI can answer "Is [date] available?" accurately
- ✅ Property management flow documented
- ✅ All templates validated and tested

---

## Quick Links

**Schedule:** [WEEK_SCHEDULE.md](./WEEK_SCHEDULE.md)
**Build Plan:** [BUILD_PLAN_2025.md](./BUILD_PLAN_2025.md)
**Previous Week:** [WEEK_7_SUMMARY.md](./WEEK_7_SUMMARY.md) ✅ Tier-2 Complete!
**Patterns Library:** [TEMPLATE_PATTERNS.md](./botflow-backend/TEMPLATE_PATTERNS.md)
**Quality Checklist:** [TEMPLATE_CHECKLIST.md](./botflow-backend/TEMPLATE_CHECKLIST.md)

---

## Prerequisites

Before starting Week 8, ensure:

### Required from Week 7
- ✅ All 12 templates (Tier-1 + Tier-2) complete and published
- ✅ Template patterns established and documented
- ✅ Copy-paste-modify workflow proven
- ✅ Validation and seeding scripts operational

### Verify Current System

```bash
# 1. Check backend is running
curl http://localhost:3001/health

# 2. Verify 12 templates exist
curl http://localhost:3001/api/templates | grep -o '"name"' | wc -l
# Should return 12 (or 13 with test template)

# 3. Test template API
curl http://localhost:3001/api/templates

# 4. Verify build works
cd botflow-backend && npm run build
```

---

## Architecture Overview

### Week 8 Components

**Templates (8):**
- 7 standard Tier-3 templates (simpler verticals)
- 1 complex Airbnb template (requires integration)

**New Services:**
- `ical-sync.service.ts` - Fetch and parse iCal feeds
- `property-availability.service.ts` - Calculate availability
- `calendar-cache.service.ts` - Store and query blocked dates

**New Routes:**
- `POST /api/properties` - Create property with iCal URL
- `POST /api/properties/:id/sync` - Manual sync trigger
- `GET /api/properties/:id/availability` - Check date availability
- `GET /api/properties/:id/next-openings` - Find next available dates

**New Database Tables:**
- `properties` - Store property details and iCal URLs
- `blocked_dates` - Cache unavailable date ranges
- `sync_logs` - Track sync history and errors

---

## Airbnb iCal Integration - Deep Dive

### Problem Statement

Airbnb hosts need their WhatsApp bot to:
1. Answer "Is [property] available on [dates]?" instantly
2. Sync automatically with Airbnb calendar (no manual updates)
3. Handle multiple calendar sources (Airbnb + Booking.com + Google)
4. Work without Airbnb login credentials (security)

### Solution: iCal URL Approach

**How it Works:**

1. **Host provides iCal URL** (from Airbnb settings)
   - Airbnb generates unique iCal export URL per listing
   - URL format: `https://www.airbnb.com/calendar/ical/[LISTING_ID].ics`
   - No authentication required (public link)

2. **Backend fetches iCal periodically** (every 5-15 minutes)
   - Scheduled cron job via n8n or backend scheduler
   - Parses `.ics` file into events
   - Events = bookings + manually blocked dates

3. **Store availability in database**
   - Each event stored: start date, end date, UID, summary
   - Precompute daily availability (faster queries)
   - Cache results for AI responses

4. **AI queries availability**
   - User asks: "Is Feb 12-15 available?"
   - AI calls `/api/properties/:id/availability?start=2026-02-12&end=2026-02-15`
   - Backend responds: `{ available: true/false, blockedDates: [...] }`
   - AI uses response in natural reply

### iCal Format Overview

**Sample iCal Event:**
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260212
DTEND;VALUE=DATE:20260215
DTSTAMP:20260111T103000Z
UID:booking123@airbnb.com
SUMMARY:Reserved
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

**Key Fields:**
- `DTSTART`: Start date (inclusive)
- `DTEND`: End date (usually exclusive - checkout day)
- `UID`: Unique event ID (for updates)
- `SUMMARY`: Description ("Reserved", "Airbnb", etc.)

**Important:** End date is exclusive in most calendar formats. If DTEND=2026-02-15, the property is available on Feb 15 (checkout day).

### Database Schema

**Table: `properties`**
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  bot_id UUID REFERENCES bots(id),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
  ical_urls JSONB NOT NULL, -- Array of {url, source} objects
  min_nights INTEGER DEFAULT 1,
  max_nights INTEGER DEFAULT 365,
  check_in_time TIME DEFAULT '14:00',
  check_out_time TIME DEFAULT '10:00',
  buffer_days INTEGER DEFAULT 0, -- Days between bookings
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org properties"
  ON properties FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
```

**Table: `blocked_dates`**
```sql
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL, -- Exclusive (checkout day is available)
  event_uid TEXT, -- iCal UID for updates
  source TEXT NOT NULL, -- 'airbnb', 'booking', 'google', 'manual'
  summary TEXT, -- Event description
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast date queries
CREATE INDEX idx_blocked_dates_property_dates
  ON blocked_dates(property_id, start_date, end_date);

-- Enable RLS
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blocked dates for their properties"
  ON blocked_dates FOR SELECT
  USING (property_id IN (
    SELECT id FROM properties WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  ));
```

**Table: `sync_logs`**
```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL, -- 'success', 'error'
  events_processed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
```

---

## Day-by-Day Breakdown

### Days 1-2: Airbnb Template + Integration Architecture

**Goal:** Complete Airbnb template and design integration system

#### Step 1.1: Create Airbnb/Vacation Rental Template

Create: `botflow-backend/src/data/airbnb-template.json`

**Pattern Source:** Hotel template (booking flow)

**Key Fields (13):**
- property_name (text)
- property_type (select: Apartment, House, Villa, Cottage, etc.)
- location (text)
- contact_number (text)
- email_address (text)
- bedrooms (number)
- bathrooms (number)
- max_guests (number)
- amenities (multiselect: WiFi, Pool, Kitchen, Parking, etc.)
- price_per_night (text: "from R800")
- check_in_time (text: "3pm")
- check_out_time (text: "10am")
- cancellation_policy (text)
- **ical_url (text)** - NEW: Airbnb calendar export URL

**Unique Features:**
- iCal calendar sync for real-time availability
- Multi-night booking minimum
- Cleaning fee mentions
- Guest reviews and ratings discussion
- Self-check-in instructions
- House rules and regulations

**Key Intents:**
- availability_check - "Is it available Feb 12-15?" (queries iCal sync)
- pricing_inquiry - Multi-night pricing calculations
- amenities_question - WiFi, pool, kitchen, etc.
- booking_process - How to book, payment, deposit
- check_in_instructions - Access codes, key collection
- house_rules - Pets, smoking, parties, quiet hours
- cancellation_inquiry - Refund policy

**Handoff Conditions:**
- Booking confirmation (redirect to Airbnb)
- Pricing disputes
- Special requests (early check-in, late checkout)
- Maintenance issues during stay
- Cancellation requests

#### Step 1.2: Design iCal Integration Architecture

**Components:**

1. **iCal Sync Service** (`ical-sync.service.ts`)
   - Fetch iCal URL via HTTP
   - Parse .ics format (use `node-ical` library)
   - Extract events (DTSTART, DTEND, UID, SUMMARY)
   - Handle timezones correctly
   - Upsert blocked_dates (insert new, update existing by UID)
   - Log sync results to sync_logs

2. **Property Availability Service** (`property-availability.service.ts`)
   - Query blocked_dates for date range overlaps
   - Calculate availability: no overlaps = available
   - Apply business rules (min_nights, buffer_days)
   - Return structured response

3. **Calendar Cache Service** (`calendar-cache.service.ts`)
   - Precompute daily availability (optimization)
   - Store in `availability_cache` table (optional)
   - Invalidate on sync

4. **API Routes** (`routes/properties.ts`)
   - POST /api/properties - Create property with iCal URL
   - PATCH /api/properties/:id - Update property details
   - POST /api/properties/:id/sync - Trigger sync now
   - GET /api/properties/:id/availability - Check date range
   - GET /api/properties/:id/blocked-dates - List all blocked dates
   - GET /api/properties/:id/next-openings - Find next N available dates

5. **Scheduled Sync** (n8n or Node cron)
   - Every 15 minutes: loop through all properties
   - Call sync service for each
   - Log results

#### Step 1.3: Install Dependencies

```bash
cd botflow-backend
npm install node-ical
npm install @types/node-ical --save-dev
npm install node-cron
npm install @types/node-cron --save-dev
```

#### Step 1.4: Create Database Migration

Create: `botflow-backend/migrations/002_create_properties_and_availability.sql`

```sql
-- Create properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  bot_id UUID REFERENCES bots(id),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
  ical_urls JSONB NOT NULL,
  min_nights INTEGER DEFAULT 1,
  max_nights INTEGER DEFAULT 365,
  check_in_time TIME DEFAULT '14:00',
  check_out_time TIME DEFAULT '10:00',
  buffer_days INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blocked_dates table
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  event_uid TEXT,
  source TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, event_uid)
);

-- Create sync_logs table
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  events_processed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_blocked_dates_property_dates
  ON blocked_dates(property_id, start_date, end_date);
CREATE INDEX idx_properties_organization
  ON properties(organization_id);
CREATE INDEX idx_sync_logs_property
  ON sync_logs(property_id, synced_at DESC);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their org properties"
  ON properties FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view blocked dates for their properties"
  ON blocked_dates FOR SELECT
  USING (property_id IN (
    SELECT id FROM properties WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view sync logs for their properties"
  ON sync_logs FOR SELECT
  USING (property_id IN (
    SELECT id FROM properties WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  ));
```

---

### Days 3-4: Implement iCal Sync Service

**Goal:** Build working calendar sync functionality

#### Step 3.1: Create iCal Sync Service

Create: `botflow-backend/src/services/ical-sync.service.ts`

```typescript
import ical from 'node-ical';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

interface ICalEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
}

export class ICalSyncService {
  /**
   * Sync a property's iCal feed(s)
   */
  async syncProperty(propertyId: string): Promise<{
    success: boolean;
    eventsProcessed: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Fetch property details
      const { data: property, error: fetchError } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError || !property) {
        throw new Error(`Property not found: ${propertyId}`);
      }

      logger.info(`Syncing property: ${property.name}`);

      // Fetch and parse all iCal URLs
      const allEvents: ICalEvent[] = [];

      for (const icalSource of property.ical_urls) {
        const events = await this.fetchICalEvents(icalSource.url, icalSource.source);
        allEvents.push(...events);
      }

      logger.info(`Fetched ${allEvents.length} events from ${property.ical_urls.length} calendars`);

      // Upsert blocked dates
      await this.upsertBlockedDates(propertyId, allEvents);

      // Update last_synced_at
      await supabaseAdmin
        .from('properties')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', propertyId);

      // Log success
      const duration = Date.now() - startTime;
      await this.logSync(propertyId, 'success', allEvents.length, duration);

      return {
        success: true,
        eventsProcessed: allEvents.length
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Sync failed for property ${propertyId}: ${errorMessage}`);

      await this.logSync(propertyId, 'error', 0, duration, errorMessage);

      return {
        success: false,
        eventsProcessed: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Fetch and parse iCal events from URL
   */
  private async fetchICalEvents(icalUrl: string, source: string): Promise<ICalEvent[]> {
    try {
      // Fetch iCal data
      const response = await fetch(icalUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
      }

      const icalData = await response.text();

      // Parse iCal
      const parsed = ical.parseICS(icalData);

      // Extract events
      const events: ICalEvent[] = [];

      for (const key in parsed) {
        const event = parsed[key];

        if (event.type === 'VEVENT' && event.start && event.end) {
          events.push({
            uid: event.uid || `${source}-${key}`,
            start: new Date(event.start),
            end: new Date(event.end),
            summary: event.summary || 'Reserved'
          });
        }
      }

      return events;
    } catch (error) {
      logger.error(`Failed to fetch/parse iCal from ${icalUrl}: ${error}`);
      throw error;
    }
  }

  /**
   * Upsert blocked dates from events
   */
  private async upsertBlockedDates(propertyId: string, events: ICalEvent[]): Promise<void> {
    // Delete old events that no longer exist
    const eventUids = events.map(e => e.uid);

    await supabaseAdmin
      .from('blocked_dates')
      .delete()
      .eq('property_id', propertyId)
      .not('event_uid', 'in', `(${eventUids.join(',')})`);

    // Upsert new/updated events
    for (const event of events) {
      await supabaseAdmin
        .from('blocked_dates')
        .upsert({
          property_id: propertyId,
          event_uid: event.uid,
          start_date: event.start.toISOString().split('T')[0],
          end_date: event.end.toISOString().split('T')[0],
          source: 'airbnb', // or derive from event
          summary: event.summary
        }, {
          onConflict: 'property_id,event_uid'
        });
    }
  }

  /**
   * Log sync result
   */
  private async logSync(
    propertyId: string,
    status: 'success' | 'error',
    eventsProcessed: number,
    durationMs: number,
    errorMessage?: string
  ): Promise<void> {
    await supabaseAdmin
      .from('sync_logs')
      .insert({
        property_id: propertyId,
        status,
        events_processed: eventsProcessed,
        duration_ms: durationMs,
        error_message: errorMessage
      });
  }

  /**
   * Sync all properties (for scheduled job)
   */
  async syncAllProperties(): Promise<void> {
    const { data: properties } = await supabaseAdmin
      .from('properties')
      .select('id, name');

    if (!properties) return;

    logger.info(`Starting sync for ${properties.length} properties`);

    for (const property of properties) {
      await this.syncProperty(property.id);
    }

    logger.info('Sync complete for all properties');
  }
}

export const icalSyncService = new ICalSyncService();
```

#### Step 3.2: Create Property Availability Service

Create: `botflow-backend/src/services/property-availability.service.ts`

```typescript
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

interface AvailabilityQuery {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (exclusive)
}

interface AvailabilityResponse {
  available: boolean;
  blockedDates: Array<{
    start: string;
    end: string;
    reason: string;
  }>;
  minNights?: number;
  message?: string;
}

export class PropertyAvailabilityService {
  /**
   * Check if property is available for date range
   */
  async checkAvailability(
    propertyId: string,
    query: AvailabilityQuery
  ): Promise<AvailabilityResponse> {
    try {
      // Fetch property details
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (!property) {
        throw new Error('Property not found');
      }

      // Calculate number of nights
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Check min/max nights
      if (nights < property.min_nights) {
        return {
          available: false,
          blockedDates: [],
          minNights: property.min_nights,
          message: `Minimum stay is ${property.min_nights} nights`
        };
      }

      if (nights > property.max_nights) {
        return {
          available: false,
          blockedDates: [],
          message: `Maximum stay is ${property.max_nights} nights`
        };
      }

      // Query blocked dates that overlap with requested range
      const { data: blockedDates } = await supabaseAdmin
        .from('blocked_dates')
        .select('*')
        .eq('property_id', propertyId)
        .or(`start_date.lte.${query.endDate},end_date.gte.${query.startDate}`);

      if (!blockedDates || blockedDates.length === 0) {
        return {
          available: true,
          blockedDates: []
        };
      }

      // Property is blocked
      return {
        available: false,
        blockedDates: blockedDates.map(bd => ({
          start: bd.start_date,
          end: bd.end_date,
          reason: bd.summary || 'Reserved'
        }))
      };
    } catch (error) {
      logger.error(`Availability check failed: ${error}`);
      throw error;
    }
  }

  /**
   * Find next N available date ranges
   */
  async findNextOpenings(
    propertyId: string,
    fromDate: string,
    minNights: number,
    count: number = 5
  ): Promise<Array<{ start: string; end: string }>> {
    // Implementation: iterate through dates, find gaps in blocked_dates
    // Return first N gaps that are >= minNights long

    // Simplified version - can be optimized
    const openings: Array<{ start: string; end: string }> = [];
    let currentDate = new Date(fromDate);
    const maxDaysToCheck = 365; // Don't search more than a year ahead

    // TODO: Implement gap-finding algorithm

    return openings;
  }
}

export const propertyAvailabilityService = new PropertyAvailabilityService();
```

#### Step 3.3: Create Properties API Routes

Create: `botflow-backend/src/routes/properties.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import { icalSyncService } from '../services/ical-sync.service.js';
import { propertyAvailabilityService } from '../services/property-availability.service.js';
import { supabaseAdmin } from '../config/supabase.js';

export async function propertiesRoutes(fastify: FastifyInstance) {
  // Create property
  fastify.post('/properties', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user;
    const body = request.body as any;

    // Get user's organization
    const { data: member } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return reply.code(403).send({ error: 'User not in organization' });
    }

    // Create property
    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .insert({
        organization_id: member.organization_id,
        bot_id: body.bot_id,
        name: body.name,
        timezone: body.timezone || 'Africa/Johannesburg',
        ical_urls: body.ical_urls,
        min_nights: body.min_nights || 1,
        max_nights: body.max_nights || 365,
        check_in_time: body.check_in_time || '14:00',
        check_out_time: body.check_out_time || '10:00',
        buffer_days: body.buffer_days || 0
      })
      .select()
      .single();

    if (error) {
      return reply.code(400).send({ error: error.message });
    }

    // Trigger initial sync
    await icalSyncService.syncProperty(property.id);

    return reply.send({ property });
  });

  // Trigger property sync
  fastify.post('/properties/:id/sync', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await icalSyncService.syncProperty(id);

    return reply.send(result);
  });

  // Check availability
  fastify.get('/properties/:id/availability', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { start, end } = request.query as { start: string; end: string };

    if (!start || !end) {
      return reply.code(400).send({ error: 'start and end dates required' });
    }

    const result = await propertyAvailabilityService.checkAvailability(id, {
      startDate: start,
      endDate: end
    });

    return reply.send(result);
  });

  // Get blocked dates
  fastify.get('/properties/:id/blocked-dates', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: blockedDates } = await supabaseAdmin
      .from('blocked_dates')
      .select('*')
      .eq('property_id', id)
      .order('start_date', { ascending: true });

    return reply.send({ blockedDates });
  });
}
```

#### Step 3.4: Register Routes

Update: `botflow-backend/src/server.ts`

```typescript
// ... existing imports
import { propertiesRoutes } from './routes/properties.js';

// ... after other routes
await fastify.register(propertiesRoutes, { prefix: '/api' });
```

#### Step 3.5: Set Up Scheduled Sync (Optional - n8n or Node Cron)

**Option A: Node Cron (built-in)**

Create: `botflow-backend/src/services/scheduler.service.ts`

```typescript
import cron from 'node-cron';
import { icalSyncService } from './ical-sync.service.js';
import { logger } from '../config/logger.js';

export function startScheduler() {
  // Sync all properties every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running scheduled property sync');
    await icalSyncService.syncAllProperties();
  });

  logger.info('Scheduler started: syncing properties every 15 minutes');
}
```

Update `server.ts` to start scheduler:
```typescript
import { startScheduler } from './services/scheduler.service.js';

// ... after fastify.listen()
startScheduler();
```

**Option B: n8n Workflow**

Create n8n workflow:
1. Cron node (every 15 minutes)
2. HTTP Request to `POST /api/properties/sync-all` (new endpoint)
3. Log results

---

### Days 5-6: Complete Remaining 7 Tier-3 Templates

**Goal:** Rapid template creation for simpler verticals

Use copy-paste-modify strategy from proven templates.

#### Template 2: Lawyer/Legal Services

Create: `botflow-backend/src/data/lawyer-template.json`

**Pattern Source:** Doctor template (consultation bookings)

**Key Fields:**
- practice_name, lawyer_name, specialization
- Location, contact, email
- Practice areas (multiselect: Family Law, Criminal, Corporate, etc.)
- Consultation fee, payment methods
- Operating hours

**Unique:**
- Legal consultations (not medical)
- Case type inquiry
- Document requirements
- Confidentiality emphasis
- Professional tone

**Intents:**
- book_consultation
- case_inquiry
- fees_inquiry
- practice_areas
- document_requirements

---

#### Template 3: Accountant/Tax Services

Create: `botflow-backend/src/data/accountant-template.json`

**Pattern Source:** Lawyer template (professional services)

**Key Fields:**
- practice_name, services_offered
- Specialization (Tax, Audit, Bookkeeping, etc.)
- Consultation fee, hourly rate
- Location, contact, email
- Operating hours

**Unique:**
- Tax deadlines mentions (SARS)
- Financial year-end
- Bookkeeping services
- VAT registration
- Professional and trustworthy tone

---

#### Template 4: Travel Agency

Create: `botflow-backend/src/data/travel-agency-template.json`

**Pattern Source:** Real Estate (consultative approach)

**Key Fields:**
- agency_name, specialties (multiselect)
- Destinations (multiselect: Domestic, Africa, Europe, etc.)
- Services (Flight booking, Hotels, Packages, etc.)
- Contact, email, hours

**Unique:**
- Trip planning workflow
- Budget discovery
- Travel dates inquiry
- Package recommendations
- Visa assistance
- Exciting and adventurous tone

---

#### Template 5: Cleaning Service

Create: `botflow-backend/src/data/cleaning-template.json`

**Pattern Source:** Plumber (service booking)

**Key Fields:**
- business_name, service_type
- Services (Home, Office, Deep Clean, Move-in/out, etc.)
- Coverage areas
- Pricing (hourly or fixed)
- Contact, hours

**Unique:**
- Service frequency (once-off, weekly, monthly)
- Cleaning supplies (provided or BYO)
- Number of cleaners
- Transparent pricing
- Friendly and reliable tone

---

#### Template 6: Auto Mechanic

Create: `botflow-backend/src/data/auto-mechanic-template.json`

**Pattern Source:** Plumber (emergency + scheduled)

**Key Fields:**
- business_name, services_offered
- Specializations (General, Electrical, Brakes, etc.)
- Coverage areas
- Hourly rate, callout fee
- Contact, hours

**Unique:**
- Emergency roadside assistance
- Service types (repairs, maintenance, diagnostics)
- Make/model expertise
- COC for roadworthy
- Knowledgeable and helpful tone

---

#### Template 7: Veterinarian

Create: `botflow-backend/src/data/veterinarian-template.json`

**Pattern Source:** Doctor template (medical appointments)

**Key Fields:**
- practice_name, vet_name
- Services (Consultations, Vaccinations, Surgery, Emergency, etc.)
- Pet types accepted (Dogs, Cats, Exotic, etc.)
- Consultation fee
- Location, contact, hours

**Unique:**
- Pet type inquiry
- Emergency animal care (triage)
- Vaccination schedules
- Spay/neuter services
- Compassionate and caring tone

---

#### Template 8: Tutor/Teacher

Create: `botflow-backend/src/data/tutor-template.json`

**Pattern Source:** Gym template (session booking)

**Key Fields:**
- tutor_name, subjects (multiselect)
- Grade levels (multiselect: Grade 1-12, University, etc.)
- Location, contact
- Session fee (per hour)
- Available times

**Unique:**
- Subject expertise
- Lesson format (in-person, online)
- Group vs individual
- Homework help
- Exam prep
- Encouraging and educational tone

---

### Day 7: Validation, Testing & Documentation

**Goal:** Ensure all templates work correctly

#### Step 7.1: Build and Validate

```bash
cd botflow-backend

# Build TypeScript
npm run build

# Copy all new templates to dist
cp src/data/airbnb-template.json dist/data/
cp src/data/lawyer-template.json dist/data/
cp src/data/accountant-template.json dist/data/
cp src/data/travel-agency-template.json dist/data/
cp src/data/cleaning-template.json dist/data/
cp src/data/auto-mechanic-template.json dist/data/
cp src/data/veterinarian-template.json dist/data/
cp src/data/tutor-template.json dist/data/

# Validate all 20 templates
node dist/scripts/run-validate.js

# Should see: "✅ All templates are valid!" with 20 templates
```

#### Step 7.2: Seed to Database

```bash
# Seed all templates
node dist/scripts/run-seed.js

# Should see 20 templates (8 new + 12 existing)
# Verify: 8 created, 12 updated
```

#### Step 7.3: Test API Endpoints

```bash
# Test templates API
curl http://localhost:3001/api/templates | grep -o '"name"' | wc -l
# Should return 20 (or 21 with test template)

# Test Airbnb template specifically
curl http://localhost:3001/api/templates/vertical/airbnb

# Test properties API (create property)
curl -X POST http://localhost:3001/api/properties \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sea View Cottage",
    "ical_urls": [{"url": "https://airbnb.com/calendar/ical/123.ics", "source": "airbnb"}],
    "min_nights": 2
  }'

# Test sync
curl -X POST http://localhost:3001/api/properties/PROPERTY_ID/sync \
  -H "Authorization: Bearer YOUR_JWT"

# Test availability
curl "http://localhost:3001/api/properties/PROPERTY_ID/availability?start=2026-02-12&end=2026-02-15"
```

#### Step 7.4: Test iCal Integration End-to-End

1. Get real Airbnb iCal URL (from test listing or create dummy .ics file)
2. Create property with iCal URL
3. Trigger sync
4. Verify blocked_dates table populated
5. Query availability for blocked dates (should return false)
6. Query availability for open dates (should return true)
7. Test AI bot asking "Is it available Feb 12-15?"

#### Step 7.5: Run Database Migration

```bash
# Connect to Supabase and run migration
psql $DATABASE_URL -f botflow-backend/migrations/002_create_properties_and_availability.sql
```

Or via Supabase dashboard SQL editor.

#### Step 7.6: Create Week 8 Summary

Create: `WEEK_8_SUMMARY.md`

Include:
- All 8 templates completed
- **20 of 20 templates (100%)** milestone!
- Airbnb iCal integration working
- API endpoints functional
- Testing results
- Next steps for Week 9

---

## Airbnb Integration - Implementation Checklist

### Backend Services ✅
- [ ] Install dependencies (node-ical, node-cron)
- [ ] Create database migration (properties, blocked_dates, sync_logs)
- [ ] Implement ICalSyncService
- [ ] Implement PropertyAvailabilityService
- [ ] Create properties API routes
- [ ] Register routes in server.ts
- [ ] Set up scheduler (cron or n8n)

### Database ✅
- [ ] Run migration to create tables
- [ ] Verify indexes created
- [ ] Test RLS policies
- [ ] Seed sample property (optional)

### Testing ✅
- [ ] Test iCal fetch and parse
- [ ] Test blocked_dates upsert
- [ ] Test availability queries
- [ ] Test multi-calendar merge
- [ ] Test edge cases (invalid URLs, timezones, etc.)

### AI Integration ✅
- [ ] Update message processor to detect availability queries
- [ ] Call /api/properties/:id/availability from AI worker
- [ ] Parse response and formulate natural reply
- [ ] Handle "not available" gracefully
- [ ] Suggest alternative dates

### Frontend (Optional - Week 9) ✅
- [ ] Property management UI
- [ ] Add iCal URL input field
- [ ] Show sync status and logs
- [ ] Display blocked dates calendar view
- [ ] Manual sync button

---

## Template Quick Reference

### Template Comparison Matrix

| Template | Fields | Intents | Booking? | Emergency? | Integration | Complexity |
|----------|--------|---------|----------|------------|-------------|------------|
| Airbnb/Vacation Rental | 13 | 9 | Yes | No | iCal, Maps | HIGH |
| Lawyer/Legal Services | 10 | 7 | Yes | No | Calendar | MEDIUM |
| Accountant/Tax Services | 9 | 6 | Yes | No | Calendar | MEDIUM |
| Travel Agency | 11 | 8 | No | No | None | MEDIUM |
| Cleaning Service | 9 | 7 | Yes | No | Calendar | LOW |
| Auto Mechanic | 10 | 8 | Yes | Yes | Calendar | MEDIUM |
| Veterinarian | 11 | 8 | Yes | Yes | Calendar | MEDIUM |
| Tutor/Teacher | 9 | 7 | Yes | No | Calendar | LOW |

### Field Count Target: 9-13 fields per template

### Intent Count Target: 6-9 intents per template

---

## South African Localization

All templates must include:

### Currency & Pricing ✅
- Rand (R) for all fees
- SA-typical price ranges
- Payment methods (EFT, Cash, Card, SnapScan)

### Business Context ✅
- SARS tax deadlines (Accountant)
- POPIA compliance (where applicable)
- Load shedding mentions (where relevant)
- Local terminology

### Emergency Numbers ✅
- 10177, 112 for medical/vet emergencies
- Roadside assistance numbers (Auto Mechanic)

---

## Common Issues & Solutions

### Issue: iCal Parsing Fails

**Problem:** node-ical can't parse some iCal formats
**Solution:**
- Add error handling and logging
- Test with multiple iCal sources (Airbnb, Booking.com, Google)
- Handle malformed .ics gracefully

### Issue: Timezone Confusion

**Problem:** Dates don't match expected availability
**Solution:**
- Store property timezone in DB
- Convert all dates to UTC for storage
- Apply timezone offset when displaying to user
- Use date-only format (YYYY-MM-DD) for blocked_dates

### Issue: End Date Exclusive vs Inclusive

**Problem:** Checkout day showing as blocked
**Solution:**
- Treat DTEND as exclusive (checkout day is available)
- Document this clearly in code comments
- Test edge cases thoroughly

### Issue: Multiple Calendars Conflicting

**Problem:** Same dates blocked in multiple calendars
**Solution:**
- Store all events separately
- Merge availability logic: ANY calendar blocked = property blocked
- Don't duplicate blocked_dates rows

---

## Week 8 Success Checklist

Before moving to Week 9, verify:

### Template Functionality ✅
- [ ] All 8 Tier-3 templates create bots successfully
- [ ] Airbnb template includes iCal URL field
- [ ] All 20 templates seed without errors
- [ ] Intent matching works for all templates
- [ ] Variables replace correctly

### Airbnb Integration ✅
- [ ] Properties table created in database
- [ ] iCal sync service fetches and parses .ics files
- [ ] Blocked dates stored correctly
- [ ] Availability API returns correct results
- [ ] Scheduler syncs properties periodically
- [ ] AI can query availability and respond naturally

### Documentation ✅
- [ ] WEEK_8_SUMMARY.md created
- [ ] CLAUDE.md updated with all 20 templates
- [ ] WEEK_SCHEDULE.md shows 100% progress
- [ ] Airbnb integration documented
- [ ] API endpoints documented

### Quality ✅
- [ ] All JSON validates without errors
- [ ] Consistent formatting across all templates
- [ ] South African context included
- [ ] No typos in prompts or triggers
- [ ] Field count 9-13 per template
- [ ] Intent count 6-9 per template

### Testing ✅
- [ ] 3-5 test scenarios per template (24-40 total)
- [ ] Airbnb availability queries tested
- [ ] iCal sync tested with real URLs
- [ ] Edge cases handled (invalid dates, timezone issues)

---

## Week 8 Completion Metrics

### Templates (8 of 8 - 100%)

By end of Week 8:
- ✅ Airbnb/Vacation Rental (with iCal integration)
- ✅ Lawyer/Legal Services
- ✅ Accountant/Tax Services
- ✅ Travel Agency
- ✅ Cleaning Service
- ✅ Auto Mechanic
- ✅ Veterinarian
- ✅ Tutor/Teacher

### Total Progress (End of Week 8)
- **Total Templates:** 20 of 20 (100%) ✅ **COMPLETE!**
- **Total Fields:** ~220 configuration fields
- **Total Intents:** ~140 unique intents
- **Total Rules:** ~180 behavioral rules
- **Total Lines of JSON:** ~11,000 lines
- **Integration Services:** 3 (iCal sync, availability, scheduler)

---

## Week 9 Preview: Polish, Testing & Integrations

With 100% template coverage, Week 9 focuses on:

**Template Polish:**
- Refine conversation flows
- Add edge case handling
- Improve SA localization
- Standardize tones across templates

**Additional Integrations:**
- Google Calendar sync (for general booking templates)
- Stripe payment integration (deposits, memberships)
- CRM integration (lead tracking)

**Testing:**
- End-to-end testing all 20 templates
- Performance optimization
- Bug fixes
- User acceptance testing

**Target:** Production-ready template library + core integrations

---

## Resources

**Tier-1 & Tier-2 Templates (for reference):**
- All 12 existing templates in `botflow-backend/src/data/`

**Documentation:**
- [Template Patterns](./botflow-backend/TEMPLATE_PATTERNS.md)
- [Quality Checklist](./botflow-backend/TEMPLATE_CHECKLIST.md)
- [Week 7 Summary](./WEEK_7_SUMMARY.md)

**Industry References:**
- Airbnb: [Airbnb South Africa](https://www.airbnb.co.za/)
- iCal Spec: [RFC 5545](https://tools.ietf.org/html/rfc5545)
- node-ical: [npm package](https://www.npmjs.com/package/node-ical)

**Useful Libraries:**
- `node-ical` - iCal parsing
- `node-cron` - Scheduled tasks
- `date-fns` - Date manipulation
- `date-fns-tz` - Timezone handling

---

## Week 8 Ready! 🚀

**Achievement Target: 100% Template Coverage + Advanced Integration**

You're about to complete the entire template library AND implement a sophisticated calendar sync system! This is the final template development week before moving into polish and integrations.

**Key Strategy:**
- Rapid template creation for simpler Tier-3 verticals
- Deep focus on Airbnb iCal integration (complex)
- Test thoroughly before declaring 100%
- Document integration architecture for future use

**Expected Outcome:**
- 100% template coverage (20 of 20)
- Working Airbnb availability system
- Clear path to Week 9 polish and additional integrations
- Production-ready template library

---

**Ready to complete the template library? Let's finish strong and hit 100%! 💪**
