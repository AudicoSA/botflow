# Week 1 Implementation Guide
## Template Data Model & API

**Week:** 1 of 13
**Phase:** 1 - Template Infrastructure
**Duration:** 5-7 days
**Focus:** Backend foundation for template system

---

## Week Overview

This week we're building the **core template system** that will power all 20 vertical templates. Think of this as building the engine before adding the cars.

### What You'll Build
1. Database table for storing templates
2. API endpoints for template CRUD operations
3. Template JSON structure definition
4. Template validation logic
5. Template → Bot instantiation mechanism

### Success Criteria
By end of week, you should be able to:
- ✅ Create a template via API with all required fields
- ✅ Retrieve templates from database
- ✅ Validate template structure automatically
- ✅ Instantiate a bot from a template
- ✅ Have at least 1 test template working

---

## Quick Links

**Schedule:** [WEEK_SCHEDULE.md](./WEEK_SCHEDULE.md)
**Build Plan:** [BUILD_PLAN_2025.md](./BUILD_PLAN_2025.md)
**Next Week:** `WEEK_2_GUIDE.md` (create when ready)

---

## Day-by-Day Breakdown

### Day 1: Database Schema
**Goal:** Set up template storage infrastructure

#### Tasks
1. Create `bot_templates` table in Supabase
2. Set up indexes for performance
3. Add RLS policies for security
4. Test basic CRUD via Supabase dashboard

#### Database Migration

Create file: `botflow-backend/migrations/001_create_bot_templates.sql`

```sql
-- Create bot_templates table
CREATE TABLE bot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vertical TEXT NOT NULL, -- 'taxi', 'restaurant', 'salon', etc.
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  description TEXT,
  tagline TEXT, -- Short one-liner for cards
  icon TEXT, -- Icon name or emoji
  required_fields JSONB NOT NULL DEFAULT '{}', -- Form field definitions
  conversation_flow JSONB NOT NULL DEFAULT '{}', -- AI instructions & prompts
  example_prompts TEXT[] DEFAULT '{}',
  integrations TEXT[] DEFAULT '{}', -- ['maps', 'calendar', 'payment']
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_templates_vertical ON bot_templates(vertical);
CREATE INDEX idx_templates_published ON bot_templates(is_published);
CREATE INDEX idx_templates_tier ON bot_templates(tier);

-- Row Level Security
ALTER TABLE bot_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published templates
CREATE POLICY "Public can read published templates"
  ON bot_templates FOR SELECT
  USING (is_published = true);

-- Policy: Authenticated users can read all templates
CREATE POLICY "Authenticated users can read templates"
  ON bot_templates FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert/update/delete templates
-- (We'll implement admin role checking later)
CREATE POLICY "Admins can manage templates"
  ON bot_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_templates_updated_at
  BEFORE UPDATE ON bot_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Run Migration
```bash
# Option 1: Via Supabase Dashboard
# Go to SQL Editor and paste the migration

# Option 2: Via command line (if using Supabase CLI)
supabase db push
```

#### Validation
Test in Supabase dashboard:
```sql
-- Insert test template
INSERT INTO bot_templates (name, vertical, tier, description, tagline)
VALUES (
  'Test Taxi Template',
  'taxi',
  1,
  'Book rides and get quotes',
  'Automate your taxi bookings'
);

-- Query it back
SELECT * FROM bot_templates;
```

---

### Day 2: Template JSON Structure
**Goal:** Define the standard template format

#### Template Structure Definition

Create file: `botflow-backend/src/types/template.ts`

```typescript
export interface TemplateField {
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'time' | 'json';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[]; // For select/multiselect
  };
  helpText?: string;
  defaultValue?: any;
}

export interface TemplateFields {
  [fieldName: string]: TemplateField;
}

export interface ConversationFlow {
  systemPrompt: string; // Main AI instruction
  welcomeMessage?: string; // First message to customer
  exampleConversations?: Array<{
    customer: string;
    bot: string;
  }>;
  rules?: string[]; // Behavioral rules
  intents?: {
    [intentName: string]: {
      triggers: string[]; // Keywords/phrases
      response: string; // How to handle
    };
  };
  handoffConditions?: string[]; // When to escalate to human
}

export interface BotTemplate {
  id: string;
  name: string;
  vertical: string;
  tier: 1 | 2 | 3;
  description: string;
  tagline: string;
  icon: string;
  required_fields: TemplateFields;
  conversation_flow: ConversationFlow;
  example_prompts: string[];
  integrations: string[];
  is_published: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateInstantiationData {
  template_id: string;
  organization_id: string;
  whatsapp_account_id: string;
  bot_name: string;
  field_values: Record<string, any>; // User-provided data
}
```

#### Example Template JSON

Create file: `botflow-backend/src/data/example-taxi-template.json`

```json
{
  "name": "Taxi & Shuttle Service",
  "vertical": "taxi",
  "tier": 1,
  "description": "Automate ride bookings, quotes, and confirmations for your taxi or shuttle service.",
  "tagline": "Book rides in seconds",
  "icon": "🚕",
  "required_fields": {
    "business_name": {
      "type": "text",
      "label": "Business Name",
      "placeholder": "e.g. Cape Town Cabs",
      "required": true
    },
    "service_area": {
      "type": "text",
      "label": "Service Area",
      "placeholder": "e.g. Cape Town CBD and surrounding areas",
      "required": true,
      "helpText": "Describe where you operate"
    },
    "vehicle_types": {
      "type": "multiselect",
      "label": "Vehicle Types",
      "required": true,
      "validation": {
        "options": ["Sedan (4 seater)", "SUV (6 seater)", "Mini-bus (14 seater)", "Luxury vehicle"]
      }
    },
    "pricing_model": {
      "type": "select",
      "label": "Pricing Model",
      "required": true,
      "validation": {
        "options": ["Per kilometer", "Fixed routes", "Hourly rate", "Custom quote"]
      }
    },
    "base_rate": {
      "type": "number",
      "label": "Base Rate (R)",
      "placeholder": "e.g. 50",
      "required": false,
      "helpText": "Starting price for rides"
    },
    "per_km_rate": {
      "type": "number",
      "label": "Rate per Kilometer (R)",
      "placeholder": "e.g. 12",
      "required": false
    },
    "operating_hours": {
      "type": "text",
      "label": "Operating Hours",
      "placeholder": "e.g. 24/7 or 6am-10pm",
      "required": true
    },
    "booking_phone": {
      "type": "text",
      "label": "Booking Phone Number",
      "placeholder": "e.g. 021 123 4567",
      "required": true
    }
  },
  "conversation_flow": {
    "systemPrompt": "You are a helpful taxi booking assistant for {{business_name}}. You help customers:\n1. Book rides\n2. Get price quotes\n3. Confirm pickup locations and times\n4. Answer questions about service areas and vehicle types\n\nService Area: {{service_area}}\nVehicle Types: {{vehicle_types}}\nPricing: {{pricing_model}} - Base: R{{base_rate}}, Per km: R{{per_km_rate}}\nOperating Hours: {{operating_hours}}\nBooking Phone: {{booking_phone}}\n\nAlways be professional, friendly, and efficient. Collect: pickup location, destination, date/time, number of passengers, and preferred vehicle type before confirming.",
    "welcomeMessage": "Hi! 👋 Welcome to {{business_name}}. I can help you book a ride or get a price quote. Where would you like to go?",
    "exampleConversations": [
      {
        "customer": "I need a ride to the airport tomorrow at 6am",
        "bot": "Great! I can help you book that. Where should we pick you up from?"
      },
      {
        "customer": "From 123 Main Street, Cape Town",
        "bot": "Perfect! For tomorrow at 6am from 123 Main Street to Cape Town Airport:\n- Distance: ~22km\n- Estimated fare: R{{calculated_fare}}\n- Vehicle: Sedan (4 seater)\n\nShall I confirm this booking?"
      }
    ],
    "rules": [
      "Always confirm pickup location, destination, and time before booking",
      "Calculate and show estimated fare when possible",
      "Ask for number of passengers to recommend appropriate vehicle",
      "Mention if pickup is outside service area",
      "Provide booking confirmation with details"
    ],
    "intents": {
      "book_ride": {
        "triggers": ["book", "need a ride", "pickup", "drop off"],
        "response": "Collect: pickup location, destination, date/time, passengers, vehicle preference"
      },
      "get_quote": {
        "triggers": ["how much", "price", "cost", "quote"],
        "response": "Ask for pickup and destination to calculate fare"
      },
      "check_availability": {
        "triggers": ["available", "can you", "do you serve"],
        "response": "Check if location is within service area"
      },
      "cancel_booking": {
        "triggers": ["cancel", "change booking"],
        "response": "Handoff to human for cancellations"
      }
    },
    "handoffConditions": [
      "Customer is angry or frustrated",
      "Request is outside standard booking (special requirements)",
      "Technical issue with booking system",
      "Customer wants to cancel or modify existing booking"
    ]
  },
  "example_prompts": [
    "I need a ride to the airport tomorrow morning",
    "How much is it from Camps Bay to the Waterfront?",
    "Do you have a 6-seater available tonight?",
    "What's your service area?"
  ],
  "integrations": ["maps", "calendar"],
  "is_published": true,
  "version": 1
}
```

---

### Day 3: Template API Endpoints
**Goal:** Build CRUD API for templates

#### Create Route File

File: `botflow-backend/src/routes/templates.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';

const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/templates - List all published templates
  fastify.get('/', async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .select('*')
        .eq('is_published', true)
        .order('tier', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return reply.send({ templates: data });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch templates' });
    }
  });

  // GET /api/templates/:id - Get specific template
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      return reply.send({ template: data });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch template' });
    }
  });

  // GET /api/templates/vertical/:vertical - Get templates by vertical
  fastify.get('/vertical/:vertical', async (request, reply) => {
    const { vertical } = request.params as { vertical: string };

    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .select('*')
        .eq('vertical', vertical)
        .eq('is_published', true);

      if (error) throw error;

      return reply.send({ templates: data });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch templates' });
    }
  });

  // POST /api/templates - Create new template (admin only)
  fastify.post('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    // TODO: Add admin role check

    const templateSchema = z.object({
      name: z.string().min(1),
      vertical: z.string().min(1),
      tier: z.number().min(1).max(3),
      description: z.string(),
      tagline: z.string().optional(),
      icon: z.string().optional(),
      required_fields: z.record(z.any()),
      conversation_flow: z.object({
        systemPrompt: z.string(),
        welcomeMessage: z.string().optional(),
        exampleConversations: z.array(z.any()).optional(),
        rules: z.array(z.string()).optional(),
        intents: z.record(z.any()).optional(),
        handoffConditions: z.array(z.string()).optional(),
      }),
      example_prompts: z.array(z.string()).optional(),
      integrations: z.array(z.string()).optional(),
      is_published: z.boolean().default(false),
    });

    try {
      const templateData = templateSchema.parse(request.body);

      const { data, error } = await supabase
        .from('bot_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;

      return reply.code(201).send({ template: data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create template' });
    }
  });

  // PATCH /api/templates/:id - Update template (admin only)
  fastify.patch('/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body;

    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return reply.send({ template: data });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update template' });
    }
  });

  // DELETE /api/templates/:id - Delete template (admin only)
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const { error } = await supabase
        .from('bot_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete template' });
    }
  });
};

export default templatesRoutes;
```

#### Register Route in Server

Edit: `botflow-backend/src/server.ts`

```typescript
// Add to imports
import templateRoutes from './routes/templates.js';

// Add to route registrations (around line 115)
await fastify.register(templateRoutes, { prefix: '/api/templates' });
```

---

### Day 4: Template Instantiation Logic
**Goal:** Create bots from templates

#### Create Service File

File: `botflow-backend/src/services/template-instantiation.service.ts`

```typescript
import { supabase } from '../config/supabase.js';
import { BotTemplate, TemplateInstantiationData } from '../types/template.js';

export class TemplateInstantiationService {
  /**
   * Create a bot from a template
   */
  static async instantiateBot(data: TemplateInstantiationData) {
    try {
      // 1. Fetch the template
      const { data: template, error: templateError } = await supabase
        .from('bot_templates')
        .select('*')
        .eq('id', data.template_id)
        .single();

      if (templateError || !template) {
        throw new Error('Template not found');
      }

      // 2. Validate field values against template requirements
      this.validateFieldValues(template, data.field_values);

      // 3. Generate bot configuration from template
      const botConfig = this.generateBotConfig(template, data.field_values);

      // 4. Create the bot in database
      const { data: bot, error: botError } = await supabase
        .from('bots')
        .insert({
          organization_id: data.organization_id,
          whatsapp_account_id: data.whatsapp_account_id,
          name: data.bot_name,
          description: template.description,
          task_type: template.vertical,
          is_active: true,
          configuration: botConfig,
          ai_model: 'gpt-4o',
          ai_temperature: 0.7,
          fallback_behavior: 'human_handoff',
        })
        .select()
        .single();

      if (botError) throw botError;

      return { bot, template };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate that user-provided field values match template requirements
   */
  private static validateFieldValues(template: BotTemplate, fieldValues: Record<string, any>) {
    const requiredFields = template.required_fields;

    for (const [fieldName, fieldDef] of Object.entries(requiredFields)) {
      const value = fieldValues[fieldName];

      // Check required fields
      if (fieldDef.required && (value === undefined || value === null || value === '')) {
        throw new Error(`Missing required field: ${fieldDef.label}`);
      }

      // Type validation
      if (value !== undefined) {
        if (fieldDef.type === 'number' && typeof value !== 'number') {
          throw new Error(`Field ${fieldDef.label} must be a number`);
        }

        // Validation rules
        if (fieldDef.validation) {
          if (fieldDef.validation.min && value < fieldDef.validation.min) {
            throw new Error(`${fieldDef.label} must be at least ${fieldDef.validation.min}`);
          }
          if (fieldDef.validation.max && value > fieldDef.validation.max) {
            throw new Error(`${fieldDef.label} must be at most ${fieldDef.validation.max}`);
          }
          if (fieldDef.validation.options && !fieldDef.validation.options.includes(value)) {
            throw new Error(`${fieldDef.label} must be one of: ${fieldDef.validation.options.join(', ')}`);
          }
        }
      }
    }
  }

  /**
   * Generate bot configuration by merging template with user data
   */
  private static generateBotConfig(template: BotTemplate, fieldValues: Record<string, any>) {
    // Replace template variables in conversation flow
    const conversationFlow = JSON.parse(JSON.stringify(template.conversation_flow));

    // Replace {{variable}} placeholders with actual values
    const systemPrompt = this.replaceVariables(conversationFlow.systemPrompt, fieldValues);
    const welcomeMessage = conversationFlow.welcomeMessage
      ? this.replaceVariables(conversationFlow.welcomeMessage, fieldValues)
      : undefined;

    return {
      template_id: template.id,
      template_version: template.version,
      template_name: template.name,
      vertical: template.vertical,
      field_values: fieldValues,
      conversation_flow: {
        ...conversationFlow,
        systemPrompt,
        welcomeMessage,
      },
      integrations: template.integrations,
    };
  }

  /**
   * Replace {{variable}} placeholders in text
   */
  private static replaceVariables(text: string, values: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(values)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }
}
```

#### Add Instantiation Endpoint

Add to `botflow-backend/src/routes/bots.ts`:

```typescript
import { TemplateInstantiationService } from '../services/template-instantiation.service.js';

// POST /api/bots/create-from-template
fastify.post('/create-from-template', {
  onRequest: [fastify.authenticate]
}, async (request, reply) => {
  const schema = z.object({
    template_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    whatsapp_account_id: z.string().uuid(),
    bot_name: z.string().min(1),
    field_values: z.record(z.any()),
  });

  try {
    const data = schema.parse(request.body);

    const result = await TemplateInstantiationService.instantiateBot(data);

    return reply.code(201).send({
      success: true,
      bot: result.bot,
      template: result.template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: 'Validation error', details: error.errors });
    }
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message || 'Failed to create bot from template' });
  }
});
```

---

### Day 5: Seed First Template
**Goal:** Load example taxi template into database

#### Create Seed Script

File: `botflow-backend/src/scripts/seed-templates.ts`

```typescript
import { supabase } from '../config/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedTemplates() {
  console.log('🌱 Seeding templates...');

  // Load taxi template
  const taxiTemplatePath = path.join(__dirname, '../data/example-taxi-template.json');
  const taxiTemplate = JSON.parse(fs.readFileSync(taxiTemplatePath, 'utf-8'));

  try {
    const { data, error } = await supabase
      .from('bot_templates')
      .insert(taxiTemplate)
      .select()
      .single();

    if (error) {
      console.error('❌ Error seeding template:', error);
      throw error;
    }

    console.log('✅ Successfully seeded template:', data.name);
    console.log('   ID:', data.id);
    console.log('   Vertical:', data.vertical);

    return data;
  } catch (error) {
    console.error('❌ Failed to seed templates:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTemplates()
    .then(() => {
      console.log('✅ Template seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Template seeding failed:', error);
      process.exit(1);
    });
}

export { seedTemplates };
```

#### Run Seed Script

```bash
cd botflow-backend
npm run build
node dist/scripts/seed-templates.js
```

---

### Day 6: Testing & Validation
**Goal:** Test entire template flow

#### Create Test File

File: `botflow-backend/src/tests/template-flow.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '../config/supabase.js';
import { TemplateInstantiationService } from '../services/template-instantiation.service.js';

describe('Template System End-to-End', () => {
  let templateId: string;
  let orgId: string;
  let whatsappAccountId: string;

  beforeAll(async () => {
    // Get first published template
    const { data: template } = await supabase
      .from('bot_templates')
      .select('id')
      .eq('is_published', true)
      .limit(1)
      .single();

    templateId = template?.id || '';

    // Create test org (or use existing)
    // Add your setup here
  });

  it('should fetch all templates', async () => {
    const { data, error } = await supabase
      .from('bot_templates')
      .select('*')
      .eq('is_published', true);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should fetch template by ID', async () => {
    const { data, error } = await supabase
      .from('bot_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.name).toBeDefined();
  });

  it('should instantiate bot from template', async () => {
    const instantiationData = {
      template_id: templateId,
      organization_id: orgId,
      whatsapp_account_id: whatsappAccountId,
      bot_name: 'Test Taxi Bot',
      field_values: {
        business_name: 'Test Taxis',
        service_area: 'Cape Town',
        vehicle_types: ['Sedan (4 seater)'],
        pricing_model: 'Per kilometer',
        base_rate: 50,
        per_km_rate: 12,
        operating_hours: '24/7',
        booking_phone: '021 123 4567',
      },
    };

    const result = await TemplateInstantiationService.instantiateBot(instantiationData);

    expect(result.bot).toBeDefined();
    expect(result.bot.name).toBe('Test Taxi Bot');
    expect(result.bot.configuration.field_values.business_name).toBe('Test Taxis');
  });

  it('should validate required fields', async () => {
    const invalidData = {
      template_id: templateId,
      organization_id: orgId,
      whatsapp_account_id: whatsappAccountId,
      bot_name: 'Invalid Bot',
      field_values: {
        // Missing required fields
      },
    };

    await expect(
      TemplateInstantiationService.instantiateBot(invalidData)
    ).rejects.toThrow('Missing required field');
  });
});
```

#### Manual Testing via API

Create file: `test-template-api.http` (use REST Client extension in VS Code)

```http
### Get all templates
GET http://localhost:3001/api/templates
Content-Type: application/json

### Get specific template
GET http://localhost:3001/api/templates/{{template_id}}
Content-Type: application/json

### Create bot from template
POST http://localhost:3001/api/bots/create-from-template
Content-Type: application/json
Authorization: Bearer {{your_jwt_token}}

{
  "template_id": "{{template_id}}",
  "organization_id": "{{org_id}}",
  "whatsapp_account_id": "{{whatsapp_account_id}}",
  "bot_name": "My Taxi Bot",
  "field_values": {
    "business_name": "Cape Town Cabs",
    "service_area": "Cape Town CBD and suburbs",
    "vehicle_types": ["Sedan (4 seater)", "SUV (6 seater)"],
    "pricing_model": "Per kilometer",
    "base_rate": 50,
    "per_km_rate": 12,
    "operating_hours": "24/7",
    "booking_phone": "021 555 1234"
  }
}
```

---

### Day 7: Documentation & Cleanup
**Goal:** Document everything and prepare for Week 2

#### Update CLAUDE.md

Add to `CLAUDE.md`:

```markdown
## Template System

### Database
The `bot_templates` table stores all vertical templates. Key fields:
- `vertical`: Identifier (taxi, restaurant, salon, etc.)
- `tier`: 1, 2, or 3 (launch priority)
- `required_fields`: JSONB defining onboarding form
- `conversation_flow`: AI instructions and prompts
- `is_published`: Only published templates shown to users

### API Endpoints
- `GET /api/templates` - List all published templates
- `GET /api/templates/:id` - Get specific template
- `GET /api/templates/vertical/:vertical` - Get templates by vertical
- `POST /api/bots/create-from-template` - Instantiate bot from template

### Template Instantiation
When a user creates a bot from a template:
1. System validates field values against template requirements
2. Replaces `{{variables}}` in conversation flow with user data
3. Creates bot with merged configuration
4. Bot is ready to receive messages
```

#### Create Week 1 Summary

File: `WEEK_1_SUMMARY.md`

```markdown
# Week 1 Summary

## What We Built
✅ `bot_templates` database table with indexes and RLS
✅ Template JSON structure definition
✅ `/api/templates` CRUD endpoints
✅ Template validation logic
✅ Template instantiation service
✅ Taxi template example seeded
✅ End-to-end tests

## Key Files Created
- `botflow-backend/migrations/001_create_bot_templates.sql`
- `botflow-backend/src/types/template.ts`
- `botflow-backend/src/routes/templates.ts`
- `botflow-backend/src/services/template-instantiation.service.ts`
- `botflow-backend/src/data/example-taxi-template.json`
- `botflow-backend/src/scripts/seed-templates.ts`

## API Endpoints Working
- GET /api/templates
- GET /api/templates/:id
- POST /api/bots/create-from-template

## What's Next (Week 2)
- Build frontend vertical selection screen
- Create template preview component
- Build dynamic form generator
- Implement multi-step onboarding wizard
```

---

## Success Checklist

Before moving to Week 2, verify:

- [ ] `bot_templates` table exists in Supabase
- [ ] Can query templates via SQL
- [ ] API endpoints respond correctly
- [ ] Can create bot from template via API
- [ ] At least 1 template (taxi) seeded
- [ ] Template validation works (rejects missing fields)
- [ ] Variable replacement works ({{business_name}} → actual value)
- [ ] Tests pass (or manual testing complete)
- [ ] Code committed to git
- [ ] Documentation updated

---

## Troubleshooting

### Issue: Can't connect to Supabase
**Solution:** Check .env has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Issue: Template validation fails
**Solution:** Check field_values match required_fields structure in template

### Issue: Bot created but configuration looks wrong
**Solution:** Check variable replacement logic in `generateBotConfig()`

### Issue: RLS policy blocking access
**Solution:** Use service role key for backend operations, not anon key

---

## Resources

**Database Tools:**
- Supabase Dashboard SQL Editor
- pgAdmin (if using local Postgres)

**API Testing:**
- REST Client (VS Code extension)
- Postman
- curl commands

**Code Examples:**
- See `example-taxi-template.json` for template structure
- See tests for usage examples

---

## Next Steps

When ready to start Week 2:
1. Create `WEEK_2_GUIDE.md`
2. Review Week 2 tasks in `BUILD_PLAN_2025.md`
3. Reference `WEEK_SCHEDULE.md` for overview

**Week 2 Focus:** Frontend template selection and onboarding flow

---

**Questions?** Review [CLAUDE.md](./CLAUDE.md) for project architecture or [BUILD_PLAN_2025.md](./BUILD_PLAN_2025.md) for full roadmap.
