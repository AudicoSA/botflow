# Phase 3 Week 3: Template System & Intelligence Enhancement

**Status:** ✅ COMPLETED
**Prerequisites:** Week 1 & 2 Complete (Agent Foundation + Frontend)
**Completed:** January 2026

---

## Overview

Week 3 focuses on building the workflow template library and enhancing the AI agent's intelligence. Users will be able to start from pre-built templates and the AI will learn from successful workflows to make better suggestions.

---

## Completed in Previous Weeks (Reference)

### Week 1: Agent Foundation
- Intent Parser (GPT-4o powered NLU)
- Context Manager (session & state management)
- Workflow Generator (Blueprint JSON generation)
- Conversation Engine (main orchestrator)
- API Routes (`/api/bots/:botId/agent/*`)

### Week 2: Conversation System & Frontend
- AI Agent API service (`ai-agent.service.ts`)
- useAIAgent custom hook
- Split-panel AI Builder page
- Chat interface with message bubbles
- Real-time workflow preview (React Flow)
- Suggested actions component
- Session persistence

---

## Week 3 Tasks

### Day 1-2: Template Library Database

**Database Migration:**

```sql
-- Create workflow_templates table
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'workflow',

  -- Matching
  trigger_phrases TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',

  -- Requirements
  required_integrations TEXT[] DEFAULT '{}',
  vertical TEXT,

  -- Blueprint
  blueprint JSONB NOT NULL,
  variables JSONB DEFAULT '[]',
  configurable_fields JSONB DEFAULT '[]',

  -- Metadata
  popularity_score INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  is_public BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast searching
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_keywords ON workflow_templates USING GIN(keywords);
CREATE INDEX idx_workflow_templates_trigger_phrases ON workflow_templates USING GIN(trigger_phrases);
CREATE INDEX idx_workflow_templates_vertical ON workflow_templates(vertical);
```

**File:** `botflow-backend/src/routes/workflow-templates.ts`

```typescript
// API Endpoints
GET  /api/workflow-templates                    // List all templates
GET  /api/workflow-templates/:slug              // Get specific template
GET  /api/workflow-templates/category/:category // Filter by category
GET  /api/workflow-templates/search?q=query    // Search templates
POST /api/workflow-templates/:slug/instantiate  // Create workflow from template
```

### Day 3-4: Template Matching Service

**File:** `botflow-backend/src/services/ai-agent/template-matcher.ts`

```typescript
interface TemplateMatch {
  template: WorkflowTemplate;
  confidence: number;
  matchReason: string;
  requiredCustomizations: string[];
}

class TemplateMatcherService {
  /**
   * Find best matching templates for an intent
   */
  async findMatches(
    intent: ParsedIntent,
    availableIntegrations: string[],
    limit: number = 5
  ): Promise<TemplateMatch[]>;

  /**
   * Score template match based on intent
   */
  private calculateMatchScore(
    template: WorkflowTemplate,
    intent: ParsedIntent
  ): number;

  /**
   * Customize template with user requirements
   */
  async customizeTemplate(
    template: WorkflowTemplate,
    customizations: Record<string, unknown>
  ): Promise<Blueprint>;
}
```

**Matching Algorithm:**
1. Keyword matching (30%) - Match trigger phrases and keywords
2. Intent type matching (25%) - Match workflow type (order_tracking, booking, etc.)
3. Integration matching (25%) - Prefer templates using user's integrations
4. Vertical matching (15%) - Boost templates for user's business vertical
5. Popularity score (5%) - Slight boost for proven templates

### Day 5: Seed Initial Templates

**File:** `botflow-backend/src/data/workflow-templates/`

Create 10-15 initial templates:

| Category | Template | Description |
|----------|----------|-------------|
| E-commerce | Order Tracking (Shopify) | Track orders via Shopify API |
| E-commerce | Order Tracking (WooCommerce) | Track orders via WooCommerce |
| E-commerce | Stock Inquiry | Check product availability |
| Booking | Appointment Booking | Book appointments with calendar |
| Booking | Availability Check | Check slot availability |
| Support | FAQ Responder | Answer common questions from KB |
| Support | Ticket Creation | Create support tickets |
| Payment | Payment Link | Send payment links (PayFast/Yoco) |
| Payment | Invoice Request | Generate and send invoices |
| Notification | Order Confirmation | Send order confirmations |
| Notification | Appointment Reminder | Send booking reminders |

**Template Structure:**

```json
{
  "slug": "order-tracking-shopify",
  "name": "Shopify Order Tracking",
  "category": "e-commerce",
  "description": "Allow customers to track their Shopify orders via WhatsApp",
  "icon": "package",
  "trigger_phrases": [
    "track order", "where is my order", "order status",
    "track my package", "delivery status"
  ],
  "keywords": ["order", "tracking", "shopify", "delivery", "status"],
  "required_integrations": ["shopify"],
  "vertical": "ecommerce",
  "blueprint": {
    "name": "Shopify Order Tracking",
    "nodes": [
      {
        "id": "trigger-1",
        "type": "trigger",
        "data": { "label": "WhatsApp Message", "triggerType": "message_received" },
        "position": { "x": 200, "y": 50 }
      },
      {
        "id": "condition-1",
        "type": "condition",
        "data": { "label": "Intent: Track Order?", "condition": "intent_match", "value": "order_tracking" },
        "position": { "x": 200, "y": 150 }
      },
      {
        "id": "action-1",
        "type": "action",
        "data": { "label": "Extract Order Number", "actionType": "extract_entity", "entity": "order_number" },
        "position": { "x": 200, "y": 250 }
      },
      {
        "id": "integration-1",
        "type": "integration",
        "data": { "label": "Query Shopify", "integration": "shopify", "action": "get_order" },
        "position": { "x": 200, "y": 350 }
      },
      {
        "id": "action-2",
        "type": "action",
        "data": { "label": "Format Response", "actionType": "format_message", "template": "order_status" },
        "position": { "x": 200, "y": 450 }
      },
      {
        "id": "action-3",
        "type": "action",
        "data": { "label": "Send Reply", "actionType": "send_message" },
        "position": { "x": 200, "y": 550 }
      }
    ],
    "edges": [
      { "id": "e1", "source": "trigger-1", "target": "condition-1" },
      { "id": "e2", "source": "condition-1", "target": "action-1", "sourceHandle": "yes" },
      { "id": "e3", "source": "action-1", "target": "integration-1" },
      { "id": "e4", "source": "integration-1", "target": "action-2" },
      { "id": "e5", "source": "action-2", "target": "action-3" }
    ]
  },
  "variables": [
    { "key": "shopify_store", "label": "Shopify Store URL", "type": "text", "required": true }
  ],
  "configurable_fields": [
    { "key": "response_style", "label": "Response Style", "type": "select", "options": ["brief", "detailed"] }
  ]
}
```

### Day 6: Integration with Conversation Engine

**Update:** `botflow-backend/src/services/ai-agent/conversation-engine.ts`

Enhance the conversation engine to:

1. **Suggest Templates** - When user describes intent, suggest matching templates
2. **Template Preview** - Show template details before instantiation
3. **Template Customization** - Gather required variables through conversation
4. **Hybrid Generation** - Use templates as base, customize with AI

**New Conversation Flow:**

```
User: "I want to track orders from my Shopify store"

Agent: "I found a template that matches your needs!

📦 Shopify Order Tracking
- Lets customers check order status via WhatsApp
- Requires: Shopify integration (you have this connected!)
- 6 workflow steps

Would you like to:
1. Use this template (quick setup)
2. Customize it further
3. Build from scratch

[Use Template] [Customize] [Build from Scratch]"

User: "Use template"

Agent: "I need one piece of info to set this up:
- What's your Shopify store URL? (e.g., mystore.myshopify.com)"

User: "acmeshop.myshopify.com"

Agent: "✅ Your order tracking workflow is ready!

Customers can now message your WhatsApp with:
- 'Track order #12345'
- 'Where is my order?'
- 'Check order status'

[Deploy Now] [Preview] [Modify]"
```

### Day 7: Template Analytics & Learning

**Track Template Usage:**

```sql
-- Template usage tracking
CREATE TABLE workflow_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id),
  bot_id UUID REFERENCES bots(id),
  organization_id UUID REFERENCES organizations(id),
  customizations JSONB DEFAULT '{}',
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  -- Success metrics
  messages_processed INTEGER DEFAULT 0,
  successful_completions INTEGER DEFAULT 0,
  user_rating INTEGER, -- 1-5 stars

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Update Template Scores:**
- Increment `usage_count` on instantiation
- Calculate `success_rate` from completion data
- Update `popularity_score` based on recent usage + success

---

## File Structure

```
botflow-backend/src/
├── routes/
│   └── workflow-templates.ts         # Template API endpoints
├── services/
│   └── ai-agent/
│       ├── template-matcher.ts       # Template matching service
│       └── template-library.ts       # Template CRUD operations
├── data/
│   └── workflow-templates/
│       ├── ecommerce/
│       │   ├── order-tracking-shopify.json
│       │   ├── order-tracking-woocommerce.json
│       │   └── stock-inquiry.json
│       ├── booking/
│       │   ├── appointment-booking.json
│       │   └── availability-check.json
│       ├── support/
│       │   ├── faq-responder.json
│       │   └── ticket-creation.json
│       ├── payment/
│       │   ├── payment-link.json
│       │   └── invoice-request.json
│       └── notification/
│           ├── order-confirmation.json
│           └── appointment-reminder.json
└── scripts/
    └── seed-workflow-templates.ts    # Seed templates to database

botflow-website/app/
└── dashboard/
    └── bots/
        └── [id]/
            └── ai-builder/
                └── TemplateSelector.tsx  # Template selection UI
```

---

## API Endpoints

### Template Routes

```typescript
// List all templates
GET /api/workflow-templates
Response: { templates: WorkflowTemplate[], total: number }

// Get template by slug
GET /api/workflow-templates/:slug
Response: WorkflowTemplate

// Search templates
GET /api/workflow-templates/search?q=order+tracking&category=ecommerce
Response: { templates: WorkflowTemplate[], total: number }

// Get template categories
GET /api/workflow-templates/categories
Response: { categories: { name: string, count: number }[] }

// Instantiate template
POST /api/workflow-templates/:slug/instantiate
Body: { botId: string, variables: Record<string, unknown> }
Response: { workflow: Blueprint, sessionId: string }

// Get recommended templates for a bot
GET /api/workflow-templates/recommended/:botId
Response: { templates: TemplateMatch[] }
```

---

## Success Criteria

- [x] Workflow templates table created and migrated
- [x] 10+ templates seeded across categories (12 templates created)
- [x] Template matching returns relevant results
- [x] Templates can be instantiated to create workflows
- [x] Conversation engine suggests templates when appropriate
- [x] Template usage is tracked
- [x] Template selector UI component works

---

## Testing Scenarios

### Template Matching
1. User says "track orders" → Suggest order tracking templates
2. User has Shopify connected → Boost Shopify templates
3. User vertical is "salon" → Boost booking templates

### Template Instantiation
1. Select template → Shows required variables
2. Fill variables → Generates valid Blueprint
3. Deploy template → Bot workflow updated

### Learning
1. Template deployed → Usage count incremented
2. Workflow successful → Success rate updated
3. Popular templates → Higher in search results

---

## Dependencies

**Backend:**
- No new packages required

**Frontend:**
- No new packages required

---

## Notes for Implementation

1. **Template Quality** - Each template should be tested and validated before seeding
2. **SA Context** - Include South African specific templates (PayFast, Yoco, etc.)
3. **Versioning** - Consider template versions for future updates
4. **Fallback** - If no template matches, still allow AI generation from scratch
5. **Caching** - Cache popular templates for faster matching

---

## Next Steps (Week 4)

After Week 3 is complete, Week 4 will focus on:
- Intelligence enhancement (pattern learning)
- Error recovery improvements
- Advanced workflow features (loops, parallel execution)
- Testing and polish
