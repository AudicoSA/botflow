# Phase 2 Week 3: Intelligent Bot Builder - Implementation Guide

**Status:** Ready to Start 🚀
**Goal:** GPT-powered natural language → Blueprint JSON conversion
**Duration:** 5-7 days
**Prerequisites:** ✅ Week 1 (RAG) + ✅ Week 2 (Workflow Engine)

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [AI Prompt Engineering](#ai-prompt-engineering)
4. [Bot Builder Service](#bot-builder-service)
5. [Conversation Flow](#conversation-flow)
6. [Node Recommendation Engine](#node-recommendation-engine)
7. [Blueprint Generation](#blueprint-generation)
8. [Validation & Testing](#validation--testing)
9. [API Routes](#api-routes)
10. [Examples](#examples)
11. [Day-by-Day Plan](#day-by-day-plan)

---

## Overview

### What We're Building

Week 3 transforms user intent expressed in natural language into working bot workflows:

**Input (Natural Language):**
```
"I want a bot that:
1. Asks customers for their order number
2. Looks up the order in Shopify
3. If the order is shipped, sends tracking info
4. If not shipped, tells them the status"
```

**Output (Blueprint JSON):**
```json
{
  "bot_id": "bot_123",
  "version": "1.0.0",
  "name": "Order Status Bot",
  "nodes": [
    { "id": "1", "type": "whatsapp_trigger", ... },
    { "id": "2", "type": "ask_question", ... },
    { "id": "3", "type": "shopify_lookup", ... },
    { "id": "4", "type": "if_condition", ... },
    { "id": "5", "type": "whatsapp_reply", ... },
    { "id": "6", "type": "whatsapp_reply", ... }
  ],
  "edges": [ ... ]
}
```

### The Magic ✨

GPT-4 analyzes user intent and:
1. **Understands requirements** - Extracts workflow steps
2. **Recommends nodes** - Suggests best node types from library
3. **Generates Blueprint** - Creates valid Blueprint JSON
4. **Validates structure** - Ensures workflow is executable
5. **Optimizes flow** - Suggests improvements

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    User (Dashboard)                     │
│  "I want a bot that checks Shopify stock..."           │
└──────────────────────┬──────────────────────────────────┘
                       │ Natural Language
                       ▼
┌─────────────────────────────────────────────────────────┐
│           Bot Builder API (bot-builder.ts)              │
│   POST /api/bots/:id/builder/analyze                    │
│   POST /api/bots/:id/builder/generate                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│      Bot Builder Service (bot-builder.service.ts)       │
│      - analyzeIntent()                                  │
│      - generateBlueprint()                              │
│      - suggestOptimizations()                           │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│   GPT-4 (OpenAI) │      │   Node Library   │
│   Prompt Engine  │      │  (15 nodes from  │
│                  │      │    Week 2)       │
└──────────────────┘      └──────────────────┘
          │                         │
          └────────────┬────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│         Workflow Compiler (Week 2)                      │
│         - Validates Blueprint                           │
│         - Generates n8n workflow                        │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Natural language description
2. **Intent Analysis** → GPT-4 extracts workflow steps
3. **Node Recommendation** → Match steps to node types
4. **Blueprint Generation** → GPT-4 creates JSON structure
5. **Validation** → Workflow Compiler validates
6. **Optimization** → Suggest improvements
7. **Compilation** → Convert to n8n workflow

---

## AI Prompt Engineering

### System Prompt Strategy

We use a multi-stage prompting approach:

#### Stage 1: Intent Analysis

```typescript
const INTENT_ANALYSIS_PROMPT = `
You are a workflow analysis expert. Analyze the user's bot description and extract:

1. **Trigger** - How the bot starts (keyword, webhook, schedule)
2. **Steps** - Sequential actions the bot should take
3. **Conditions** - Any if/then logic or branching
4. **Integrations** - External services needed (Shopify, Paystack, etc.)
5. **Data Flow** - Variables that pass between steps

User Description:
{{user_description}}

Available Node Types:
{{node_library_summary}}

Output Format:
{
  "trigger": { "type": "...", "description": "..." },
  "steps": [
    { "action": "...", "description": "...", "suggested_node": "..." }
  ],
  "conditions": [...],
  "integrations": [...],
  "variables": [...]
}
`;
```

#### Stage 2: Blueprint Generation

```typescript
const BLUEPRINT_GENERATION_PROMPT = `
You are a workflow compiler. Convert the analyzed intent into valid Blueprint JSON.

Intent Analysis:
{{intent_analysis}}

Node Library:
{{node_library}}

Rules:
1. Each node must have a unique ID (1, 2, 3, ...)
2. Nodes must be from the available node library
3. Edges must connect valid node IDs
4. Variables must use {{variable}} syntax
5. All required node config fields must be provided

Blueprint JSON Schema:
{{blueprint_schema}}

Generate a complete, valid Blueprint JSON.
`;
```

#### Stage 3: Optimization Suggestions

```typescript
const OPTIMIZATION_PROMPT = `
You are a workflow optimization expert. Analyze the generated Blueprint and suggest improvements.

Blueprint:
{{blueprint}}

Analyze for:
1. **Redundant Nodes** - Unnecessary steps
2. **Missing Error Handling** - Where try-catch is needed
3. **Performance** - Opportunities for parallel execution
4. **User Experience** - Confusing messages or flows
5. **Security** - Missing input validation

Provide 3-5 actionable suggestions.
`;
```

### Prompt Templates

**Location:** `src/prompts/bot-builder-prompts.ts`

```typescript
export const PROMPTS = {
  INTENT_ANALYSIS: `...`,
  BLUEPRINT_GENERATION: `...`,
  OPTIMIZATION: `...`,
  NODE_RECOMMENDATION: `...`,
  VALIDATION: `...`
};
```

---

## Bot Builder Service

### Core Service Implementation

**Location:** `src/services/bot-builder.service.ts`

```typescript
import OpenAI from 'openai';
import { Blueprint } from '../types/workflow.js';
import { getNodeLibrary } from './node-library.js';
import { getWorkflowCompiler } from './workflow-compiler.js';
import { PROMPTS } from '../prompts/bot-builder-prompts.js';

export interface IntentAnalysis {
  trigger: {
    type: string;
    description: string;
    suggested_node: string;
  };
  steps: Array<{
    action: string;
    description: string;
    suggested_node: string;
    config_hints: Record<string, any>;
  }>;
  conditions: Array<{
    condition: string;
    true_path: string;
    false_path: string;
  }>;
  integrations: Array<{
    service: string;
    purpose: string;
  }>;
  variables: string[];
}

export interface BlueprintGenerationResult {
  blueprint: Blueprint;
  confidence: number; // 0-1
  warnings: string[];
  suggestions: string[];
}

export class BotBuilderService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Analyze user intent and extract workflow requirements
   */
  async analyzeIntent(
    description: string,
    botId: string
  ): Promise<IntentAnalysis> {
    const nodeLibrary = await getNodeLibrary();
    const nodeSummary = this.createNodeSummary(nodeLibrary);

    const prompt = PROMPTS.INTENT_ANALYSIS
      .replace('{{user_description}}', description)
      .replace('{{node_library_summary}}', nodeSummary);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a workflow analysis expert specializing in WhatsApp bot automation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3 // Low temperature for consistent output
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result as IntentAnalysis;
  }

  /**
   * Generate Blueprint JSON from intent analysis
   */
  async generateBlueprint(
    intent: IntentAnalysis,
    botId: string
  ): Promise<BlueprintGenerationResult> {
    const nodeLibrary = await getNodeLibrary();
    const nodeDetails = this.getNodeDetails(nodeLibrary);

    const prompt = PROMPTS.BLUEPRINT_GENERATION
      .replace('{{intent_analysis}}', JSON.stringify(intent, null, 2))
      .replace('{{node_library}}', JSON.stringify(nodeDetails, null, 2))
      .replace('{{blueprint_schema}}', this.getBlueprintSchema());

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a workflow compiler. Generate valid Blueprint JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content!);
    const blueprint = result.blueprint as Blueprint;

    // Validate the generated Blueprint
    const compiler = getWorkflowCompiler();
    const validation = await compiler.validate(blueprint);

    const confidence = this.calculateConfidence(blueprint, validation);
    const warnings = validation.errors.map(e => e.message);
    const suggestions = await this.generateOptimizations(blueprint);

    return {
      blueprint,
      confidence,
      warnings,
      suggestions
    };
  }

  /**
   * Generate optimization suggestions for a Blueprint
   */
  async generateOptimizations(blueprint: Blueprint): Promise<string[]> {
    const prompt = PROMPTS.OPTIMIZATION
      .replace('{{blueprint}}', JSON.stringify(blueprint, null, 2));

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a workflow optimization expert.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5
    });

    const text = response.choices[0].message.content!;
    // Parse suggestions from response
    const suggestions = text.split('\n').filter(line =>
      line.trim().match(/^\d+\./) // Lines starting with numbers
    );

    return suggestions;
  }

  /**
   * Interactive conversation flow for bot building
   */
  async conversationalBuilder(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    botId: string
  ): Promise<{
    response: string;
    intent?: IntentAnalysis;
    blueprint?: Blueprint;
    complete: boolean;
  }> {
    const nodeLibrary = await getNodeLibrary();
    const nodeSummary = this.createNodeSummary(nodeLibrary);

    // Add context about available nodes
    const systemMessage = `You are a helpful bot building assistant. Help users create WhatsApp bots through conversation.

Available Node Types:
${nodeSummary}

Guide users through:
1. What should trigger the bot?
2. What actions should it take?
3. Are there any conditions (if/then)?
4. What integrations are needed?

When you have enough information, generate a Blueprint JSON.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages
      ],
      temperature: 0.7
    });

    const assistantMessage = response.choices[0].message.content!;

    // Check if we have enough information to generate
    const hasEnoughInfo = messages.length >= 4; // Arbitrary threshold

    if (hasEnoughInfo) {
      // Extract description from conversation
      const description = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n');

      const intent = await this.analyzeIntent(description, botId);
      const { blueprint } = await this.generateBlueprint(intent, botId);

      return {
        response: assistantMessage + '\n\nI have enough information to generate your bot! Here\'s what I\'ll create...',
        intent,
        blueprint,
        complete: true
      };
    }

    return {
      response: assistantMessage,
      complete: false
    };
  }

  /**
   * Calculate confidence score for generated Blueprint
   */
  private calculateConfidence(blueprint: Blueprint, validation: any): number {
    let score = 1.0;

    // Deduct for validation errors
    score -= validation.errors.length * 0.2;

    // Deduct for warnings
    score -= validation.warnings.length * 0.1;

    // Deduct for missing descriptions
    if (!blueprint.description) score -= 0.1;

    // Deduct for single-node workflows (probably incomplete)
    if (blueprint.nodes.length < 2) score -= 0.3;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Create a summary of available nodes for prompts
   */
  private createNodeSummary(nodeLibrary: any): string {
    const nodes = nodeLibrary.listNodes();
    return nodes.map((node: any) =>
      `- ${node.type}: ${node.description}`
    ).join('\n');
  }

  /**
   * Get detailed node information for Blueprint generation
   */
  private getNodeDetails(nodeLibrary: any): any[] {
    return nodeLibrary.listNodes().map((node: any) => ({
      type: node.type,
      category: node.category,
      description: node.description,
      inputs: node.inputs.map((input: any) => ({
        name: input.name,
        type: input.type,
        required: input.required,
        description: input.description
      })),
      outputs: node.outputs
    }));
  }

  /**
   * Get Blueprint JSON schema
   */
  private getBlueprintSchema(): string {
    return JSON.stringify({
      bot_id: 'string',
      version: 'string',
      name: 'string',
      description: 'string (optional)',
      nodes: [
        {
          id: 'string',
          type: 'string',
          name: 'string (optional)',
          config: 'object'
        }
      ],
      edges: [
        {
          id: 'string',
          source: 'string',
          target: 'string',
          sourceHandle: 'string (optional)',
          targetHandle: 'string (optional)'
        }
      ],
      variables: 'object',
      credentials: 'array'
    }, null, 2);
  }
}

// Singleton instance
let instance: BotBuilderService | null = null;

export function getBotBuilderService(): BotBuilderService {
  if (!instance) {
    instance = new BotBuilderService();
  }
  return instance;
}
```

---

## Conversation Flow

### Multi-Turn Conversation

Users can build bots through natural conversation:

**Turn 1:**
```
User: "I want to make a bot for my online store"
Bot: "Great! What should the bot help with?
      - Order status checking
      - Product recommendations
      - Customer support
      Or something else?"
```

**Turn 2:**
```
User: "Order status checking"
Bot: "Perfect! Where do you store your orders?
      - Shopify
      - WooCommerce
      - Custom database
      - Other"
```

**Turn 3:**
```
User: "Shopify"
Bot: "Got it! How should customers trigger the bot?
      - Message 'order' keyword
      - Any message
      - Specific command"
```

**Turn 4:**
```
User: "When they say 'order'"
Bot: "Excellent! Here's what I'll build:

     1. Listen for 'order' keyword
     2. Ask customer for order number
     3. Look up order in Shopify
     4. Show order status and tracking

     Sound good?"
```

**Turn 5:**
```
User: "Yes!"
Bot: "✅ Creating your bot now..."
[Generates Blueprint JSON]
[Validates with Workflow Compiler]
[Shows preview]
"Your bot is ready! Would you like to deploy it or make changes?"
```

---

## Node Recommendation Engine

### Intelligent Node Selection

The system recommends the best nodes based on user intent:

```typescript
export class NodeRecommendationEngine {
  /**
   * Recommend nodes based on action keywords
   */
  recommendNodes(action: string, context: any): string[] {
    const recommendations: string[] = [];

    // Keyword matching
    if (action.match(/ask|prompt|question/i)) {
      recommendations.push('ask_question');
    }

    if (action.match(/reply|send|message/i)) {
      recommendations.push('whatsapp_reply');
    }

    if (action.match(/if|when|check|condition/i)) {
      recommendations.push('if_condition');
    }

    if (action.match(/shopify|product|order|inventory/i)) {
      recommendations.push('shopify_lookup');
    }

    if (action.match(/payment|pay|checkout/i)) {
      recommendations.push('paystack_payment');
    }

    if (action.match(/search|find|knowledge|document/i)) {
      recommendations.push('knowledge_search');
    }

    if (action.match(/api|http|call|request/i)) {
      recommendations.push('http_request');
    }

    if (action.match(/wait|delay|pause/i)) {
      recommendations.push('delay');
    }

    if (action.match(/loop|iterate|each|repeat/i)) {
      recommendations.push('loop');
    }

    if (action.match(/database|query|sql/i)) {
      recommendations.push('database_query');
    }

    return recommendations;
  }

  /**
   * Score nodes based on relevance
   */
  scoreNode(node: string, intent: IntentAnalysis): number {
    let score = 0;

    // Check if node is mentioned in steps
    for (const step of intent.steps) {
      if (step.suggested_node === node) {
        score += 10;
      }
    }

    // Check if node matches integrations
    for (const integration of intent.integrations) {
      if (node.includes(integration.service.toLowerCase())) {
        score += 5;
      }
    }

    return score;
  }
}
```

---

## Blueprint Generation

### JSON Schema Validation

Before returning Blueprint to user, validate against schema:

```typescript
import { z } from 'zod';

const BlueprintNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  config: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

const BlueprintEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional()
});

const BlueprintSchema = z.object({
  bot_id: z.string().uuid(),
  version: z.string(),
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(BlueprintNodeSchema),
  edges: z.array(BlueprintEdgeSchema),
  variables: z.record(z.string()).optional(),
  credentials: z.array(z.object({
    service: z.string(),
    credential_id: z.string().uuid()
  })).optional()
});
```

---

## Validation & Testing

### Testing Strategy

```typescript
describe('BotBuilderService', () => {
  test('analyzes simple intent', async () => {
    const service = new BotBuilderService();
    const intent = await service.analyzeIntent(
      'I want a bot that responds "Hello" when someone says "hi"',
      'bot_123'
    );

    expect(intent.trigger.type).toBe('keyword');
    expect(intent.steps).toHaveLength(1);
    expect(intent.steps[0].suggested_node).toBe('whatsapp_reply');
  });

  test('generates valid Blueprint', async () => {
    const service = new BotBuilderService();
    const intent = {
      trigger: { type: 'keyword', description: 'hello', suggested_node: 'whatsapp_trigger' },
      steps: [
        { action: 'reply', description: 'say hi', suggested_node: 'whatsapp_reply', config_hints: {} }
      ],
      conditions: [],
      integrations: [],
      variables: []
    };

    const result = await service.generateBlueprint(intent, 'bot_123');

    expect(result.blueprint).toBeDefined();
    expect(result.blueprint.nodes.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test('provides optimization suggestions', async () => {
    const service = new BotBuilderService();
    const blueprint = {
      // ... test blueprint
    };

    const suggestions = await service.generateOptimizations(blueprint);

    expect(suggestions.length).toBeGreaterThan(0);
  });
});
```

---

## API Routes

**Location:** `src/routes/bot-builder.ts`

```typescript
/**
 * POST /api/bots/:botId/builder/analyze
 * Analyze user intent
 */
fastify.post<{
  Params: { botId: string };
  Body: { description: string };
}>(
  '/:botId/builder/analyze',
  {
    onRequest: [fastify.authenticate],
    schema: {
      body: z.object({
        description: z.string().min(10).max(5000)
      })
    }
  },
  async (request, reply) => {
    const { botId } = request.params;
    const { description } = request.body;

    const service = getBotBuilderService();
    const intent = await service.analyzeIntent(description, botId);

    return reply.send({
      success: true,
      intent
    });
  }
);

/**
 * POST /api/bots/:botId/builder/generate
 * Generate Blueprint from intent
 */
fastify.post<{
  Params: { botId: string };
  Body: { intent: IntentAnalysis };
}>(
  '/:botId/builder/generate',
  {
    onRequest: [fastify.authenticate]
  },
  async (request, reply) => {
    const { botId } = request.params;
    const { intent } = request.body;

    const service = getBotBuilderService();
    const result = await service.generateBlueprint(intent, botId);

    return reply.send({
      success: true,
      ...result
    });
  }
);

/**
 * POST /api/bots/:botId/builder/conversation
 * Conversational bot building
 */
fastify.post<{
  Params: { botId: string };
  Body: { messages: Array<{ role: string; content: string }> };
}>(
  '/:botId/builder/conversation',
  {
    onRequest: [fastify.authenticate]
  },
  async (request, reply) => {
    const { botId } = request.params;
    const { messages } = request.body;

    const service = getBotBuilderService();
    const result = await service.conversationalBuilder(messages, botId);

    return reply.send({
      success: true,
      ...result
    });
  }
);
```

---

## Examples

### Example 1: Simple Greeting Bot

**Input:**
```
"I want a bot that says 'Hello' when someone says 'hi'"
```

**Generated Blueprint:**
```json
{
  "bot_id": "bot_123",
  "version": "1.0.0",
  "name": "Greeting Bot",
  "nodes": [
    {
      "id": "1",
      "type": "whatsapp_trigger",
      "config": { "keyword": "hi" }
    },
    {
      "id": "2",
      "type": "whatsapp_reply",
      "config": {
        "message": "Hello! 👋",
        "recipient": "{{customer_phone}}"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "1", "target": "2" }
  ]
}
```

### Example 2: Order Status Bot

**Input:**
```
"Create a bot that:
1. Listens for 'order' keyword
2. Asks for order number
3. Looks up order in Shopify
4. If shipped, sends tracking
5. If not shipped, tells status"
```

**Generated Blueprint:**
See `examples/ecommerce-order-bot.json` from Week 2!

---

## Day-by-Day Plan

### Day 1: Prompt Engineering & Architecture

**Morning:**
- [ ] Design prompt templates
- [ ] Create intent analysis prompt
- [ ] Create Blueprint generation prompt
- [ ] Create optimization prompt

**Afternoon:**
- [ ] Implement prompt template system
- [ ] Test prompts with GPT-4
- [ ] Refine based on results
- [ ] Document prompt strategies

**Evening:**
- [ ] Create `bot-builder-prompts.ts`
- [ ] Write unit tests for prompt formatting
- [ ] Document examples

### Day 2: Bot Builder Service Core

**Morning:**
- [ ] Create `BotBuilderService` class
- [ ] Implement `analyzeIntent()` method
- [ ] Test with simple examples
- [ ] Handle edge cases

**Afternoon:**
- [ ] Implement `generateBlueprint()` method
- [ ] Integrate with Workflow Compiler
- [ ] Add validation layer
- [ ] Error handling

**Evening:**
- [ ] Implement confidence scoring
- [ ] Add warning detection
- [ ] Write unit tests
- [ ] Documentation

### Day 3: Conversational Builder

**Morning:**
- [ ] Design conversation flow
- [ ] Create conversation state machine
- [ ] Implement `conversationalBuilder()` method
- [ ] Test multi-turn conversations

**Afternoon:**
- [ ] Add context management
- [ ] Handle clarifying questions
- [ ] Implement completion detection
- [ ] Test with real scenarios

**Evening:**
- [ ] Refine prompts based on testing
- [ ] Add conversation examples
- [ ] Documentation
- [ ] Unit tests

### Day 4: Node Recommendation Engine

**Morning:**
- [ ] Create `NodeRecommendationEngine` class
- [ ] Implement keyword matching
- [ ] Implement scoring algorithm
- [ ] Test recommendations

**Afternoon:**
- [ ] Add context-aware recommendations
- [ ] Integrate with intent analysis
- [ ] Handle ambiguous cases
- [ ] Test edge cases

**Evening:**
- [ ] Optimize recommendation accuracy
- [ ] Add fallback logic
- [ ] Write tests
- [ ] Documentation

### Day 5: API Routes & Integration

**Morning:**
- [ ] Create `bot-builder.ts` routes
- [ ] Implement analyze endpoint
- [ ] Implement generate endpoint
- [ ] Implement conversation endpoint

**Afternoon:**
- [ ] Add Zod validation
- [ ] Implement error handling
- [ ] Add rate limiting
- [ ] Test all endpoints

**Evening:**
- [ ] Integration testing
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Documentation

### Day 6: Optimization & Polish

**Morning:**
- [ ] Implement optimization suggestions
- [ ] Test suggestion quality
- [ ] Refine prompts
- [ ] Add edge case handling

**Afternoon:**
- [ ] Performance optimization
- [ ] Add caching for common patterns
- [ ] Reduce API costs (prompt optimization)
- [ ] Load testing

**Evening:**
- [ ] Code review
- [ ] Security audit
- [ ] Final testing
- [ ] Documentation updates

### Day 7: Testing & Documentation

**Morning:**
- [ ] Comprehensive testing
- [ ] Write test scenarios
- [ ] Test with real user descriptions
- [ ] Document results

**Afternoon:**
- [ ] Create `PHASE2_WEEK3_TESTING.md`
- [ ] Create example conversations
- [ ] Document best practices
- [ ] Create troubleshooting guide

**Evening:**
- [ ] Create `PHASE2_WEEK3_COMPLETE.md`
- [ ] Update `PHASE2_SUMMARY.md`
- [ ] Final review
- [ ] Celebration! 🎉

---

## Success Criteria

### Functional Requirements
- [ ] Analyzes intent with 90%+ accuracy
- [ ] Generates valid Blueprint JSON 100% of time
- [ ] Conversational builder completes in <5 turns
- [ ] Optimization suggestions are actionable
- [ ] Node recommendations match user intent

### Non-Functional Requirements
- [ ] Intent analysis: <3 seconds
- [ ] Blueprint generation: <5 seconds
- [ ] API response time: <10 seconds total
- [ ] Cost per generation: <$0.10
- [ ] Test coverage: >80%

### User Experience
- [ ] Natural conversation flow
- [ ] Clear error messages
- [ ] Helpful suggestions
- [ ] Preview before deployment
- [ ] Easy to understand output

---

## Cost Analysis

### OpenAI API Costs

**GPT-4o Pricing:**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

**Estimated Costs per Bot Generation:**
- Intent Analysis: ~2,000 input tokens + ~500 output = $0.010
- Blueprint Generation: ~3,000 input tokens + ~1,000 output = $0.018
- Optimization: ~2,000 input tokens + ~300 output = $0.008
- **Total per bot:** ~$0.036

**Monthly Estimates:**
- 100 bots created = $3.60
- 1,000 bots created = $36.00
- 10,000 bots created = $360.00

**Cost Optimization Strategies:**
1. Cache common patterns
2. Use shorter prompts
3. Batch requests where possible
4. Use GPT-4o-mini for simple tasks ($0.15/$0.60 per 1M tokens)

---

## Security Considerations

### Input Validation
- Sanitize user descriptions
- Limit description length (max 5,000 chars)
- Rate limit API calls (max 10/hour per user)
- Prevent prompt injection attacks

### Output Validation
- Validate generated Blueprint against schema
- Check for malicious node configurations
- Verify all node types are from library
- Ensure credentials are not leaked

### API Security
- JWT authentication required
- Organization ownership verification
- Audit logging of all generations
- Encryption of stored Blueprints

---

## Performance Optimization

### Caching Strategy
```typescript
// Cache common patterns
const patternCache = new Map<string, IntentAnalysis>();

async function analyzeIntent(description: string): Promise<IntentAnalysis> {
  // Check cache first
  const cacheKey = hash(description);
  if (patternCache.has(cacheKey)) {
    return patternCache.get(cacheKey)!;
  }

  // Generate and cache
  const intent = await generateIntent(description);
  patternCache.set(cacheKey, intent);

  return intent;
}
```

### Prompt Optimization
- Keep system prompts concise
- Use JSON mode for structured output
- Lower temperature for consistent results
- Batch multiple requests when possible

---

## Testing Examples

### Test Case 1: Simple Bot
```typescript
test('generates simple greeting bot', async () => {
  const description = 'Bot that says hello when someone says hi';
  const service = new BotBuilderService();

  const intent = await service.analyzeIntent(description, 'bot_123');
  expect(intent.steps).toHaveLength(1);

  const result = await service.generateBlueprint(intent, 'bot_123');
  expect(result.blueprint.nodes).toHaveLength(2); // trigger + reply
  expect(result.confidence).toBeGreaterThan(0.8);
});
```

### Test Case 2: Complex E-commerce Bot
```typescript
test('generates e-commerce order bot', async () => {
  const description = `
    Create a bot for my Shopify store that:
    1. Listens for "order" keyword
    2. Asks for order number
    3. Looks up order in Shopify
    4. If shipped, sends tracking info
    5. If not shipped, tells status
  `;

  const service = new BotBuilderService();
  const intent = await service.analyzeIntent(description, 'bot_123');

  expect(intent.integrations).toContainEqual(
    expect.objectContaining({ service: 'shopify' })
  );
  expect(intent.conditions).toHaveLength(1); // if shipped

  const result = await service.generateBlueprint(intent, 'bot_123');
  expect(result.blueprint.nodes.length).toBeGreaterThanOrEqual(5);
  expect(result.warnings).toHaveLength(0);
});
```

---

## Documentation Standards

### API Documentation
Every endpoint must have:
- Description
- Authentication requirements
- Request schema
- Response schema
- Example request/response
- Error codes

### Code Documentation
Every function must have:
- JSDoc comment
- Parameter descriptions
- Return value description
- Example usage
- Edge cases

---

## Next Steps

After Week 3 completion:

### Week 4: Visual Builder
- Drag-and-drop interface
- Real-time Blueprint generation
- Integration with Bot Builder API
- Preview mode

### Week 5: End-to-End Integration
- Full flow testing
- Performance optimization
- Error handling
- Beta testing

---

## Quick Start (For New Chat)

```
I'm ready to start Phase 2 Week 3: Intelligent Bot Builder.

Context:
- Week 1 (RAG) is complete ✅
- Week 2 (Workflow Engine) is complete ✅
- I have PHASE2_SUMMARY.md with full context
- I have PHASE2_WEEK3_GUIDE.md with detailed plan

Goal: Build GPT-powered natural language → Blueprint JSON conversion.

Deliverables:
1. AI Prompt Engineering (intent analysis, generation, optimization)
2. Bot Builder Service (core service class)
3. Conversational Builder (multi-turn conversation)
4. Node Recommendation Engine (intelligent suggestions)
5. API Routes (analyze, generate, conversation)
6. Testing & Documentation

Timeline: 5-7 days
Success Criteria: 90%+ intent accuracy, 100% valid Blueprints, <10s response time

Ready to start with Day 1: Prompt Engineering & Architecture!

Please read PHASE2_WEEK3_GUIDE.md and confirm you understand the scope, then let's begin!
```

---

**Created:** 2026-01-16
**Status:** Ready to implement ⏳
**Prerequisites:** ✅ Week 1 + ✅ Week 2
**Estimated Completion:** 5-7 days from start

---

> "From workflows to intelligence. Let's teach the engine to think!" 🧠⚡
