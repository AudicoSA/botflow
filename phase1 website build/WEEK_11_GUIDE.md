# Week 11 Guide: Ralph Template Assistant & Platform Launch Prep

**Created:** 2026-01-11
**Status:** Ready to start
**Previous Week:** [WEEK_10_SUMMARY.md](./WEEK_10_SUMMARY.md) ✅
**Duration:** 5-7 days
**Approach:** Hybrid (Balanced)

---

## Executive Summary

Week 11 focuses on **building a minimal "Ralph Template Assistant"** for AI-powered template generation, **creating an analytics dashboard** for integration insights, **completing remaining templates**, and **preparing for beta launch**. This hybrid approach balances innovation (AI template generation) with pragmatism (launch readiness).

### Goals:
1. ✅ Build Ralph Template Assistant (AI-powered template generator)
2. ✅ Use Ralph to generate 5-7 new templates
3. ✅ Create integration analytics dashboard
4. ✅ Build admin template management UI
5. ✅ Complete remaining Tier 3 templates
6. ✅ Performance testing & optimization
7. ✅ Beta launch preparation
8. ✅ Documentation finalization

---

## What We Have (Post-Week 10)

### ✅ Complete:
- 20 vertical templates (100%)
- 32 integrations (2 direct + 30 marketplace)
- 30 n8n workflow templates
- AES-256 encryption for credentials
- Integration health monitoring
- Automated hourly health checks
- Scheduler service with 2 cron jobs
- Complete backend API

### 🚧 Needs Work:
- Template generation is manual (slow)
- No analytics dashboard (data exists, no UI)
- Admin template management is database-only
- 7 Tier 3 templates remaining (out of 27 total)
- Performance not benchmarked
- No load testing done
- Beta launch checklist incomplete

---

## Week 11 Schedule (Hybrid Approach)

### **Days 1-2: Ralph Template Assistant**
Build focused AI template generator using Claude API

### **Days 3-4: Analytics Dashboard & Template UI**
Create admin dashboards for insights and template management

### **Day 5: Template Generation Sprint**
Use Ralph to generate 5-7 new templates

### **Days 6-7: Testing, Polish & Launch Prep**
Performance testing, bug fixes, documentation

---

## Day 1-2: Build Ralph Template Assistant

### Goal:
Create an AI-powered template generator that can create bot templates from natural language descriptions. **Scope: Template generation only** (not full debugging/support).

---

### Architecture Overview

```
User Input (Natural Language)
      ↓
Ralph Service (Claude API + Tools)
      ↓
Template Generation Tool
      ↓
Validation & Review
      ↓
Database Seeding
      ↓
New Template Available!
```

---

### Step 1: Create Ralph Service

**File:** `botflow-backend/src/services/ralph.service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import type { BotTemplate, TemplateField, ConversationFlow } from '../types/template.js';

/**
 * Ralph Template Assistant
 *
 * AI-powered template generator that creates bot templates from natural language.
 * Uses Claude API with tool use for template generation.
 */
export class RalphService {
  private client: Anthropic;
  private conversationHistory: Map<string, Anthropic.Messages.MessageParam[]> = new Map();

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      logger.warn('[Ralph] ANTHROPIC_API_KEY not set - Ralph will not be available');
    }
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY || 'dummy-key',
    });
  }

  /**
   * Check if Ralph is enabled
   */
  isEnabled(): boolean {
    return !!env.ANTHROPIC_API_KEY;
  }

  /**
   * Generate a template from a business description
   */
  async generateTemplate(request: {
    businessType: string;
    businessName: string;
    description: string;
    services?: string[];
    bookingRequired?: boolean;
    paymentMethods?: string[];
    additionalRequirements?: string;
  }): Promise<{
    template: BotTemplate;
    explanation: string;
    recommendedIntegrations: string[];
  }> {
    if (!this.isEnabled()) {
      throw new Error('Ralph is not enabled. Set ANTHROPIC_API_KEY in environment.');
    }

    logger.info('[Ralph] Generating template', { businessType: request.businessType });

    // Build the prompt
    const prompt = this.buildTemplateGenerationPrompt(request);

    // Call Claude with tool use
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.7,
      system: this.getSystemPrompt(),
      tools: this.getTools(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Process the response
    return this.processTemplateResponse(response, request);
  }

  /**
   * Refine an existing template based on feedback
   */
  async refineTemplate(
    templateId: string,
    feedback: string
  ): Promise<BotTemplate> {
    logger.info('[Ralph] Refining template', { templateId, feedback });

    // Get existing template
    const { data: existingTemplate, error } = await supabase
      .from('bot_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !existingTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Build refinement prompt
    const prompt = `Please refine this bot template based on the following feedback:

Feedback: ${feedback}

Current Template:
${JSON.stringify(existingTemplate, null, 2)}

Please generate an improved version of the template.`;

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.7,
      system: this.getSystemPrompt(),
      tools: this.getTools(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const result = this.processTemplateResponse(response, {
      businessType: existingTemplate.vertical,
      businessName: existingTemplate.name,
      description: existingTemplate.description,
    });

    return result.template;
  }

  /**
   * Chat with Ralph (general Q&A about templates)
   */
  async chat(
    sessionId: string,
    message: string
  ): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('Ralph is not enabled');
    }

    logger.info('[Ralph] Chat message', { sessionId, message });

    // Get or create conversation history
    let history = this.conversationHistory.get(sessionId) || [];

    // Add user message
    history.push({
      role: 'user',
      content: message,
    });

    // Call Claude
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: this.getChatSystemPrompt(),
      messages: history,
    });

    // Extract assistant response
    const assistantMessage = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.Messages.TextBlock).text)
      .join('\n');

    // Update history
    history.push({
      role: 'assistant',
      content: assistantMessage,
    });

    // Keep last 10 messages only
    if (history.length > 10) {
      history = history.slice(-10);
    }

    this.conversationHistory.set(sessionId, history);

    return assistantMessage;
  }

  /**
   * Clear chat session
   */
  clearChatSession(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * Get Ralph's system prompt for template generation
   * @private
   */
  private getSystemPrompt(): string {
    return `You are Ralph, BotFlow's AI Template Assistant. Your job is to generate high-quality WhatsApp bot templates for South African businesses.

You have deep knowledge of:
- The 20 existing BotFlow templates (taxi, medical, real estate, e-commerce, restaurant, salon, gym, retail, hotel, car rental, plumber, doctor, airbnb, etc.)
- South African business context (payment methods, localization, time zones)
- WhatsApp bot best practices
- Conversation design patterns
- Integration requirements

When generating templates, you must:
1. Follow the exact JSON structure of existing templates
2. Include South African localization (R for Rands, SAST timezone, SA phone format)
3. Design natural, conversational flows
4. Include appropriate intents and rules
5. Specify required fields for onboarding
6. Recommend relevant integrations
7. Consider the target vertical's specific needs

Key patterns to follow:
- systemPrompt: Clear AI instructions with personality for the vertical
- welcomeMessage: Friendly greeting mentioning business name
- intents: Cover booking, inquiry, status, pricing, location, emergency
- rules: Professional tone, data collection, handoff conditions
- required_fields: Minimum needed for bot to function
- handoffConditions: When to escalate to human (complex requests, angry sentiment)

South African specifics:
- Currency: R (not ZAR)
- Emergency numbers: 10177 (ambulance), 10111 (police), 112 (general)
- Timezone: Africa/Johannesburg (SAST)
- Payment methods: PayFast, Yoco, Ozow (prefer SA over international)
- Load shedding awareness for relevant verticals
- Local terms: braai (BBQ), robot (traffic light), bakkie (pickup truck)

Always generate complete, production-ready templates that can be used immediately.`;
  }

  /**
   * Get chat system prompt
   * @private
   */
  private getChatSystemPrompt(): string {
    return `You are Ralph, BotFlow's helpful AI assistant. You help users understand bot templates, integrations, and best practices for WhatsApp automation in South Africa.

Be friendly, concise, and practical. Provide actionable advice.`;
  }

  /**
   * Get available tools for Ralph
   * @private
   */
  private getTools(): Anthropic.Messages.Tool[] {
    return [
      {
        name: 'generate_template',
        description: 'Generate a complete bot template JSON for a specific business vertical',
        input_schema: {
          type: 'object',
          properties: {
            vertical: {
              type: 'string',
              description: 'The business vertical slug (e.g., car_wash, pharmacy, bakery)',
            },
            name: {
              type: 'string',
              description: 'Template display name (e.g., "Car Wash & Detailing")',
            },
            description: {
              type: 'string',
              description: 'Short description of what this template does',
            },
            tagline: {
              type: 'string',
              description: 'Catchy one-liner for marketing',
            },
            icon: {
              type: 'string',
              description: 'Emoji icon for the template',
            },
            tier: {
              type: 'number',
              description: 'Priority tier: 1 (high), 2 (medium), 3 (nice-to-have)',
            },
            required_fields: {
              type: 'array',
              description: 'Array of field definitions for onboarding',
              items: {
                type: 'object',
              },
            },
            conversation_flow: {
              type: 'object',
              description: 'AI behavior configuration with systemPrompt, intents, rules',
            },
            example_prompts: {
              type: 'array',
              description: 'Example user messages for this bot',
              items: {
                type: 'string',
              },
            },
            required_integrations: {
              type: 'array',
              description: 'List of integration categories needed',
              items: {
                type: 'string',
              },
            },
          },
          required: [
            'vertical',
            'name',
            'description',
            'tagline',
            'tier',
            'required_fields',
            'conversation_flow',
          ],
        },
      },
    ];
  }

  /**
   * Build template generation prompt
   * @private
   */
  private buildTemplateGenerationPrompt(request: {
    businessType: string;
    businessName: string;
    description: string;
    services?: string[];
    bookingRequired?: boolean;
    paymentMethods?: string[];
    additionalRequirements?: string;
  }): string {
    return `Please generate a complete bot template for the following business:

Business Type: ${request.businessType}
Business Name: ${request.businessName}
Description: ${request.description}
${request.services ? `Services Offered: ${request.services.join(', ')}` : ''}
${request.bookingRequired !== undefined ? `Booking Required: ${request.bookingRequired ? 'Yes' : 'No'}` : ''}
${request.paymentMethods ? `Payment Methods: ${request.paymentMethods.join(', ')}` : ''}
${request.additionalRequirements ? `Additional Requirements: ${request.additionalRequirements}` : ''}

Please use the generate_template tool to create a complete, production-ready template following BotFlow's standards.

The template should:
1. Have a professional, friendly tone appropriate for ${request.businessType}
2. Include all necessary intents (booking, inquiry, pricing, location, etc.)
3. Specify required fields for onboarding (business name, location, hours, etc.)
4. Include South African localization
5. Recommend appropriate integrations
6. Define clear handoff conditions

Make it conversational and natural, like a real receptionist or customer service agent would speak.`;
  }

  /**
   * Process Claude's response and extract template
   * @private
   */
  private processTemplateResponse(
    response: Anthropic.Messages.Message,
    request: any
  ): {
    template: BotTemplate;
    explanation: string;
    recommendedIntegrations: string[];
  } {
    // Find tool use in response
    const toolUse = response.content.find(
      (block) => block.type === 'tool_use'
    ) as Anthropic.Messages.ToolUseBlock | undefined;

    if (!toolUse || toolUse.name !== 'generate_template') {
      throw new Error('Claude did not generate a template');
    }

    const templateData = toolUse.input as any;

    // Find text explanation
    const textBlocks = response.content.filter(
      (block) => block.type === 'text'
    ) as Anthropic.Messages.TextBlock[];
    const explanation = textBlocks.map((block) => block.text).join('\n\n');

    // Build full template object
    const template: BotTemplate = {
      vertical: templateData.vertical,
      name: templateData.name,
      description: templateData.description,
      tagline: templateData.tagline || `Automate your ${request.businessType} customer service`,
      icon: templateData.icon || '🤖',
      tier: templateData.tier || 3,
      category: this.categorizeVertical(templateData.vertical),
      required_fields: templateData.required_fields || [],
      conversation_flow: templateData.conversation_flow || {},
      example_prompts: templateData.example_prompts || [
        'I need help',
        'What are your prices?',
        'Where are you located?',
      ],
      required_integrations: templateData.required_integrations || [],
      is_published: false, // Needs review before publishing
      created_by: 'ralph',
      version: '1.0.0',
    };

    return {
      template,
      explanation,
      recommendedIntegrations: template.required_integrations,
    };
  }

  /**
   * Categorize vertical into BotFlow category
   * @private
   */
  private categorizeVertical(vertical: string): string {
    const categoryMap: Record<string, string> = {
      // Service businesses
      taxi: 'transportation',
      car_wash: 'automotive',
      car_rental: 'automotive',
      plumber: 'home_services',

      // Health & wellness
      medical: 'healthcare',
      doctor: 'healthcare',
      dentist: 'healthcare',
      pharmacy: 'healthcare',
      gym: 'fitness',
      salon: 'beauty',

      // Hospitality
      restaurant: 'food_beverage',
      hotel: 'hospitality',
      airbnb: 'hospitality',

      // Professional services
      real_estate: 'professional_services',
      lawyer: 'professional_services',
      accountant: 'professional_services',

      // Retail & E-commerce
      retail: 'retail',
      ecommerce: 'ecommerce',
    };

    return categoryMap[vertical] || 'general';
  }
}

// Singleton instance
export const ralphService = new RalphService();
```

---

### Step 2: Add Environment Variable

**File:** `botflow-backend/src/config/env.ts`

Add to Zod schema:

```typescript
// Add to existing schema
ANTHROPIC_API_KEY: z.string().optional(),
```

**Add to `.env`:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

---

### Step 3: Create Ralph API Routes

**File:** `botflow-backend/src/routes/ralph.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { ralphService } from '../services/ralph.service.js';
import { supabase } from '../config/supabase.js';

const ralphRoutes: FastifyPluginAsync = async (fastify) => {
  // Admin-only middleware
  fastify.addHook('onRequest', async (request, reply) => {
    await request.jwtVerify();

    // Check if user is admin (you'll need to add this to your users table)
    const { data: user } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', request.user.sub)
      .single();

    if (!user?.is_admin) {
      reply.code(403).send({ error: 'Admin access required' });
    }
  });

  /**
   * POST /api/ralph/generate-template
   * Generate a new template from business description
   */
  fastify.post('/generate-template', async (request, reply) => {
    const {
      businessType,
      businessName,
      description,
      services,
      bookingRequired,
      paymentMethods,
      additionalRequirements,
    } = request.body as any;

    if (!businessType || !businessName || !description) {
      return reply.code(400).send({
        error: 'Missing required fields: businessType, businessName, description',
      });
    }

    try {
      const result = await ralphService.generateTemplate({
        businessType,
        businessName,
        description,
        services,
        bookingRequired,
        paymentMethods,
        additionalRequirements,
      });

      return reply.send(result);
    } catch (error) {
      fastify.log.error('Failed to generate template', { error });
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Failed to generate template',
      });
    }
  });

  /**
   * POST /api/ralph/refine-template/:id
   * Refine existing template based on feedback
   */
  fastify.post('/refine-template/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { feedback } = request.body as { feedback: string };

    if (!feedback) {
      return reply.code(400).send({ error: 'Missing feedback' });
    }

    try {
      const refinedTemplate = await ralphService.refineTemplate(id, feedback);
      return reply.send({ template: refinedTemplate });
    } catch (error) {
      fastify.log.error('Failed to refine template', { error });
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Failed to refine template',
      });
    }
  });

  /**
   * POST /api/ralph/chat
   * Chat with Ralph
   */
  fastify.post('/chat', async (request, reply) => {
    const { sessionId, message } = request.body as {
      sessionId: string;
      message: string;
    };

    if (!message) {
      return reply.code(400).send({ error: 'Missing message' });
    }

    try {
      const response = await ralphService.chat(
        sessionId || `session-${Date.now()}`,
        message
      );
      return reply.send({ response });
    } catch (error) {
      fastify.log.error('Ralph chat failed', { error });
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Chat failed',
      });
    }
  });

  /**
   * POST /api/ralph/save-template
   * Save generated template to database
   */
  fastify.post('/save-template', async (request, reply) => {
    const template = request.body as any;

    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .insert({
          ...template,
          is_published: false, // Requires review
        })
        .select()
        .single();

      if (error) throw error;

      return reply.send({ template: data, message: 'Template saved successfully' });
    } catch (error) {
      fastify.log.error('Failed to save template', { error });
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Failed to save template',
      });
    }
  });

  /**
   * GET /api/ralph/status
   * Check if Ralph is enabled
   */
  fastify.get('/status', async (request, reply) => {
    return reply.send({
      enabled: ralphService.isEnabled(),
      model: 'claude-3-5-sonnet-20241022',
      capabilities: ['template_generation', 'template_refinement', 'chat'],
    });
  });
};

export default ralphRoutes;
```

---

### Step 4: Register Ralph Routes

**File:** `botflow-backend/src/server.ts`

```typescript
// Add to existing route registrations
import ralphRoutes from './routes/ralph.js';

// Register routes
fastify.register(ralphRoutes, { prefix: '/api/ralph' });
```

---

### Step 5: Add Anthropic SDK

```bash
cd botflow-backend
npm install @anthropic-ai/sdk
```

---

### Testing Ralph

**Test Template Generation:**

```bash
curl -X POST http://localhost:3001/api/ralph/generate-template \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "car_wash",
    "businessName": "Sparkle Auto Wash",
    "description": "Professional car wash and detailing service offering express washes, full details, and monthly membership plans",
    "services": ["Express Wash", "Full Detail", "Interior Clean", "Monthly Unlimited"],
    "bookingRequired": true,
    "paymentMethods": ["PayFast", "Yoco", "Cash"]
  }'
```

**Expected Response:**
```json
{
  "template": {
    "vertical": "car_wash",
    "name": "Car Wash & Detailing",
    "description": "Automated booking and customer service for car wash businesses",
    "tagline": "Keep your cars sparkling with automated bookings",
    "icon": "🚗",
    "tier": 3,
    "required_fields": [...],
    "conversation_flow": {...},
    "example_prompts": [...]
  },
  "explanation": "Generated a car wash template with booking flow...",
  "recommendedIntegrations": ["calendar", "payment", "crm"]
}
```

---

## Day 3-4: Analytics Dashboard & Template Management UI

### Goal:
Build admin dashboards for integration analytics and template management.

---

### Part 1: Integration Analytics Service

**File:** `botflow-backend/src/services/integration-analytics.service.ts`

```typescript
import { supabase } from '../config/supabase.js';

export interface IntegrationMetrics {
  totalEvents: number;
  successRate: number;
  avgDurationMs: number;
  byIntegration: Array<{
    integrationName: string;
    eventCount: number;
    successRate: number;
    avgDurationMs: number;
  }>;
  revenueAttribution?: number;
  topIntegrations: Array<{
    name: string;
    usageCount: number;
  }>;
}

export class IntegrationAnalyticsService {
  /**
   * Get integration metrics for a bot
   */
  async getBotMetrics(
    botId: string,
    dateRange: { start: string; end: string }
  ): Promise<IntegrationMetrics> {
    // Get all integration logs for this bot
    const { data: logs, error } = await supabase
      .from('integration_logs')
      .select(
        `
        *,
        bot_integration:bot_integration_id (
          integration:integration_id (
            name
          )
        )
      `
      )
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .eq('bot_integration.bot_id', botId);

    if (error || !logs) {
      throw new Error(`Failed to get metrics: ${error?.message}`);
    }

    // Calculate metrics
    const totalEvents = logs.length;
    const successfulEvents = logs.filter((l) => l.status === 'success').length;
    const successRate = totalEvents > 0 ? successfulEvents / totalEvents : 0;

    const totalDuration = logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0);
    const avgDurationMs = totalEvents > 0 ? totalDuration / totalEvents : 0;

    // Group by integration
    const byIntegrationMap = new Map<
      string,
      { count: number; success: number; totalDuration: number }
    >();

    logs.forEach((log) => {
      const integrationName =
        (log.bot_integration as any)?.integration?.name || 'Unknown';
      const current = byIntegrationMap.get(integrationName) || {
        count: 0,
        success: 0,
        totalDuration: 0,
      };

      current.count++;
      if (log.status === 'success') current.success++;
      current.totalDuration += log.duration_ms || 0;

      byIntegrationMap.set(integrationName, current);
    });

    const byIntegration = Array.from(byIntegrationMap.entries()).map(
      ([name, data]) => ({
        integrationName: name,
        eventCount: data.count,
        successRate: data.count > 0 ? data.success / data.count : 0,
        avgDurationMs: data.count > 0 ? data.totalDuration / data.count : 0,
      })
    );

    // Top integrations
    const topIntegrations = byIntegration
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)
      .map((i) => ({
        name: i.integrationName,
        usageCount: i.eventCount,
      }));

    // Revenue attribution (if event_metadata has revenue)
    const revenueAttribution = logs.reduce(
      (sum, l) => sum + ((l.event_metadata as any)?.revenue || 0),
      0
    );

    return {
      totalEvents,
      successRate,
      avgDurationMs,
      byIntegration,
      revenueAttribution: revenueAttribution > 0 ? revenueAttribution : undefined,
      topIntegrations,
    };
  }

  /**
   * Get organization-wide integration metrics
   */
  async getOrganizationMetrics(
    organizationId: string,
    dateRange: { start: string; end: string }
  ): Promise<IntegrationMetrics> {
    // Get all bots for this organization
    const { data: bots } = await supabase
      .from('bots')
      .select('id')
      .eq('organization_id', organizationId);

    if (!bots || bots.length === 0) {
      return {
        totalEvents: 0,
        successRate: 0,
        avgDurationMs: 0,
        byIntegration: [],
        topIntegrations: [],
      };
    }

    // Get metrics for each bot and aggregate
    const allMetrics = await Promise.all(
      bots.map((bot) => this.getBotMetrics(bot.id, dateRange))
    );

    // Aggregate
    const totalEvents = allMetrics.reduce((sum, m) => sum + m.totalEvents, 0);
    const successRate =
      allMetrics.reduce((sum, m) => sum + m.successRate * m.totalEvents, 0) /
      totalEvents;
    const avgDurationMs =
      allMetrics.reduce((sum, m) => sum + m.avgDurationMs * m.totalEvents, 0) /
      totalEvents;

    // Merge by integration data
    const integrationMap = new Map<
      string,
      { count: number; success: number; duration: number }
    >();

    allMetrics.forEach((metrics) => {
      metrics.byIntegration.forEach((int) => {
        const current = integrationMap.get(int.integrationName) || {
          count: 0,
          success: 0,
          duration: 0,
        };

        current.count += int.eventCount;
        current.success += int.successRate * int.eventCount;
        current.duration += int.avgDurationMs * int.eventCount;

        integrationMap.set(int.integrationName, current);
      });
    });

    const byIntegration = Array.from(integrationMap.entries()).map(
      ([name, data]) => ({
        integrationName: name,
        eventCount: data.count,
        successRate: data.count > 0 ? data.success / data.count : 0,
        avgDurationMs: data.count > 0 ? data.duration / data.count : 0,
      })
    );

    const topIntegrations = byIntegration
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)
      .map((i) => ({
        name: i.integrationName,
        usageCount: i.eventCount,
      }));

    return {
      totalEvents,
      successRate,
      avgDurationMs,
      byIntegration,
      topIntegrations,
    };
  }
}

export const integrationAnalyticsService = new IntegrationAnalyticsService();
```

---

### Part 2: Analytics API Routes

**File:** `botflow-backend/src/routes/analytics.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { integrationAnalyticsService } from '../services/integration-analytics.service.js';

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request) => {
    await request.jwtVerify();
  });

  /**
   * GET /api/analytics/integrations/:botId
   * Get integration metrics for a bot
   */
  fastify.get('/integrations/:botId', async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const { start, end } = request.query as { start?: string; end?: string };

    // Default to last 30 days
    const dateRange = {
      start: start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: end || new Date().toISOString(),
    };

    try {
      const metrics = await integrationAnalyticsService.getBotMetrics(
        botId,
        dateRange
      );
      return reply.send(metrics);
    } catch (error) {
      fastify.log.error('Failed to get integration metrics', { error });
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Failed to get metrics',
      });
    }
  });

  /**
   * GET /api/analytics/organization/:organizationId/integrations
   * Get organization-wide integration metrics
   */
  fastify.get(
    '/organization/:organizationId/integrations',
    async (request, reply) => {
      const { organizationId } = request.params as { organizationId: string };
      const { start, end } = request.query as { start?: string; end?: string };

      const dateRange = {
        start: start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: end || new Date().toISOString(),
      };

      try {
        const metrics = await integrationAnalyticsService.getOrganizationMetrics(
          organizationId,
          dateRange
        );
        return reply.send(metrics);
      } catch (error) {
        fastify.log.error('Failed to get organization metrics', { error });
        return reply.code(500).send({
          error: error instanceof Error ? error.message : 'Failed to get metrics',
        });
      }
    }
  );
};

export default analyticsRoutes;
```

Register in `server.ts`:
```typescript
import analyticsRoutes from './routes/analytics.js';
fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
```

---

### Part 3: Frontend Analytics Dashboard

**File:** `botflow-website/app/dashboard/analytics/integrations/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface IntegrationMetrics {
  totalEvents: number;
  successRate: number;
  avgDurationMs: number;
  byIntegration: Array<{
    integrationName: string;
    eventCount: number;
    successRate: number;
    avgDurationMs: number;
  }>;
  topIntegrations: Array<{
    name: string;
    usageCount: number;
  }>;
}

export default function IntegrationAnalytics() {
  const params = useParams();
  const botId = params?.id as string;

  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  });

  useEffect(() => {
    fetchMetrics();
  }, [botId, dateRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/integrations/${botId}?start=${dateRange.start}&end=${dateRange.end}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8">
        <p className="text-gray-500">No metrics available</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integration Analytics</h1>
        <p className="text-gray-600">
          Monitor integration usage, performance, and success rates
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Total Events</div>
          <div className="text-3xl font-bold">{metrics.totalEvents.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Last 30 days</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Success Rate</div>
          <div className="text-3xl font-bold text-green-600">
            {(metrics.successRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(metrics.totalEvents * metrics.successRate)} successful
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Avg Response Time</div>
          <div className="text-3xl font-bold">
            {metrics.avgDurationMs < 1000
              ? `${Math.round(metrics.avgDurationMs)}ms`
              : `${(metrics.avgDurationMs / 1000).toFixed(2)}s`}
          </div>
          <div className="text-xs text-gray-400 mt-1">Per integration call</div>
        </div>
      </div>

      {/* Top Integrations */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Most Used Integrations</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {metrics.topIntegrations.map((integration, index) => (
              <div key={integration.name} className="flex items-center">
                <div className="w-8 text-gray-400 font-medium">{index + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{integration.name}</span>
                    <span className="text-sm text-gray-500">
                      {integration.usageCount.toLocaleString()} calls
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(integration.usageCount / metrics.totalEvents) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Integration Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Integration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metrics.byIntegration
                .sort((a, b) => b.eventCount - a.eventCount)
                .map((integration) => (
                  <tr key={integration.integrationName}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {integration.integrationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {integration.eventCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          integration.successRate > 0.9
                            ? 'bg-green-100 text-green-800'
                            : integration.successRate > 0.7
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {(integration.successRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {integration.avgDurationMs < 1000
                        ? `${Math.round(integration.avgDurationMs)}ms`
                        : `${(integration.avgDurationMs / 1000).toFixed(2)}s`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## Day 5: Template Generation Sprint

### Goal:
Use Ralph to generate 5-7 new templates for remaining Tier 3 verticals.

---

### Remaining Tier 3 Verticals:

1. **Lawyer & Legal Services**
2. **Accountant & Tax Services**
3. **Travel Agency**
4. **Cleaning Service**
5. **Tutor & Education**
6. **Auto Mechanic**
7. **Veterinarian**

---

### Workflow:

**For Each Vertical:**

1. **Define Requirements**
```json
{
  "businessType": "lawyer",
  "businessName": "Smith & Associates Legal",
  "description": "Full-service law firm specializing in family law, corporate law, and estate planning",
  "services": [
    "Consultation",
    "Document Review",
    "Court Representation",
    "Estate Planning"
  ],
  "bookingRequired": true,
  "additionalRequirements": "Must handle confidential information, screen for conflicts of interest, explain legal processes clearly"
}
```

2. **Call Ralph API**
```bash
curl -X POST http://localhost:3001/api/ralph/generate-template \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @lawyer-request.json
```

3. **Review Generated Template**
- Check conversation flow makes sense
- Verify South African localization
- Ensure required_fields are appropriate
- Test example prompts

4. **Refine if Needed**
```bash
curl -X POST http://localhost:3001/api/ralph/refine-template/TEMPLATE_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feedback": "Add more emphasis on client confidentiality and data protection"}'
```

5. **Save to Database**
```bash
curl -X POST http://localhost:3001/api/ralph/save-template \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @generated-template.json
```

6. **Manual Review & Publish**
- Test template in staging
- Verify AI responses
- Set `is_published = true`

---

## Days 6-7: Testing, Polish & Launch Prep

### Testing Checklist:

**1. Performance Testing**
- [ ] Load test with 50 concurrent users
- [ ] API response times < 200ms (p95)
- [ ] AI response times < 2s (p95)
- [ ] Database query optimization
- [ ] Memory leak checks

**2. Integration Testing**
- [ ] Test 5 most popular integrations end-to-end
- [ ] Verify n8n workflows execute correctly
- [ ] Test credential encryption/decryption
- [ ] Verify health checks work

**3. Template Testing**
- [ ] Test all 27 templates (20 + 7 new)
- [ ] Verify conversation flows
- [ ] Test field validation
- [ ] Check SA localization

**4. Security Audit**
- [ ] Verify all credentials encrypted
- [ ] Test JWT authentication
- [ ] Check RLS policies
- [ ] SQL injection testing
- [ ] XSS prevention verified

**5. User Acceptance Testing**
- [ ] Create bot from template
- [ ] Enable integrations
- [ ] Send test messages
- [ ] Check analytics dashboard
- [ ] Verify billing (if applicable)

---

### Launch Preparation:

**1. Documentation**
- [ ] API documentation complete
- [ ] Template guide for users
- [ ] Integration setup guides
- [ ] FAQ/troubleshooting
- [ ] Video tutorials (optional)

**2. Infrastructure**
- [ ] Production database migrated
- [ ] Environment variables set
- [ ] n8n instance deployed
- [ ] Redis configured
- [ ] Monitoring enabled

**3. Support**
- [ ] Support email configured
- [ ] Issue tracking set up (GitHub)
- [ ] Support knowledge base
- [ ] Response SLAs defined

**4. Marketing**
- [ ] Landing page finalized
- [ ] Pricing confirmed (R499/R899/R1999)
- [ ] Beta signup form ready
- [ ] Email templates for onboarding
- [ ] Social media assets

**5. Legal**
- [ ] Terms of Service
- [ ] Privacy Policy (POPIA compliance)
- [ ] SLA agreement
- [ ] Acceptable Use Policy

---

## Deliverables

### By End of Week 11:

**Code:**
- ✅ Ralph Template Assistant (600+ lines)
- ✅ Integration Analytics Service (250+ lines)
- ✅ Analytics Dashboard Frontend
- ✅ Admin Template Management UI
- ✅ 5-7 new templates (Ralph-generated)

**Documentation:**
- ✅ Week 11 Summary
- ✅ Ralph User Guide
- ✅ Template Generation Guide
- ✅ API Documentation Update
- ✅ Launch Checklist

**Testing:**
- ✅ Performance benchmarks met
- ✅ All integrations tested
- ✅ Security audit passed
- ✅ 27 templates verified

---

## Success Criteria

Week 11 is successful if:
1. ✅ Ralph can generate quality templates from descriptions
2. ✅ 5-7 new templates created and published (27 total)
3. ✅ Analytics dashboard shows integration metrics
4. ✅ Performance targets met (< 200ms API, < 2s AI)
5. ✅ All critical systems tested and passing
6. ✅ Platform ready for beta launch
7. ✅ Documentation complete

---

## Files to Create

### Backend:
```
botflow-backend/
├── src/
│   ├── services/
│   │   ├── ralph.service.ts (NEW - 600 lines)
│   │   └── integration-analytics.service.ts (NEW - 250 lines)
│   ├── routes/
│   │   ├── ralph.ts (NEW - 150 lines)
│   │   └── analytics.ts (NEW - 100 lines)
│   └── data/
│       └── (7 new template JSON files)
└── .env (add ANTHROPIC_API_KEY)
```

### Frontend:
```
botflow-website/
└── app/
    └── dashboard/
        ├── analytics/
        │   └── integrations/
        │       └── page.tsx (NEW)
        └── admin/
            ├── templates/
            │   └── page.tsx (NEW)
            └── ralph/
                └── page.tsx (NEW)
```

### Documentation:
```
├── WEEK_11_SUMMARY.md
├── RALPH_GUIDE.md
├── TEMPLATE_GENERATION_GUIDE.md
└── BETA_LAUNCH_CHECKLIST.md
```

---

## Risk Mitigation

**Risk 1:** Ralph generates low-quality templates
**Mitigation:** Human review before publishing, refinement loop, test conversations

**Risk 2:** Claude API costs too high
**Mitigation:** Cache common requests, rate limiting, monitor costs daily

**Risk 3:** Template generation takes too long
**Mitigation:** Generate in background, show progress, async workflow

**Risk 4:** Performance testing reveals issues
**Mitigation:** Start testing early (Day 6), prioritize critical paths, optimize bottlenecks

---

## Timeline

**Day 1:** Ralph service + API routes
**Day 2:** Ralph testing + refinement
**Day 3:** Analytics service + API
**Day 4:** Analytics dashboard UI
**Day 5:** Generate 7 templates with Ralph
**Day 6:** Performance testing + bug fixes
**Day 7:** Final polish + launch prep

---

## Budget Estimates

**Claude API Usage (Ralph):**
- Template generation: ~8K tokens per request
- Cost per template: ~$0.10
- 7 templates: ~$0.70
- Refinements: ~$0.30
- **Total: ~$1.00** (negligible!)

**Infrastructure:**
- No new services required
- Existing Supabase, Redis, n8n sufficient

---

## Next Steps After Week 11

**Week 12: Beta Launch**
- Invite first 10-20 users
- Monitor usage and feedback
- Fix critical bugs
- Iterate on UX

**Week 13: Scale & Optimize**
- Add more templates based on demand
- Expand Ralph capabilities
- Implement user feedback
- Prepare for public launch

---

## Quick Reference

**Start Here:**
1. Read this guide completely
2. Set up ANTHROPIC_API_KEY in .env
3. Install @anthropic-ai/sdk
4. Build Ralph service (Day 1-2)
5. Build analytics (Day 3-4)
6. Generate templates (Day 5)
7. Test & polish (Day 6-7)

**When Stuck:**
- Reference WEEK_10_SUMMARY.md for context
- Check Anthropic API docs
- Test Ralph with simple examples first
- Ask for clarification

**When Done:**
- Create WEEK_11_SUMMARY.md
- Update WEEK_SCHEDULE.md
- Launch beta! 🚀

---

**Status:** ✅ Ready to start
**Duration:** 5-7 days
**Complexity:** High (AI integration + analytics)
**Priority:** Critical (launch blocker)

**Let's build Ralph and ship BotFlow! 🎉**
