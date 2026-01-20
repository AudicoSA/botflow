# Week 3 Implementation Guide
## AI Template Execution Engine

**Week:** 3 of 13
**Phase:** 1 - Template Infrastructure
**Duration:** 5-7 days
**Focus:** Making template-based bots respond intelligently to WhatsApp messages

---

## Week Overview

This week we're building the **AI execution engine** that brings template-based bots to life. Users created bots in Week 2, but they don't respond to messages yet. Week 3 makes those bots intelligent by implementing the conversation flow logic defined in templates.

### What You'll Build
1. Template-aware message processing worker
2. Conversation flow executor using template configuration
3. Dynamic prompt injection system
4. Conversation context manager with memory
5. Integration hooks (maps, calendar, handoff)

### Success Criteria
By end of week, you should be able to:
- ✅ Send a WhatsApp message to a template-based bot
- ✅ Bot responds using template conversation flow
- ✅ Bot remembers conversation context
- ✅ Bot follows template rules and intents
- ✅ Bot handles handoff conditions
- ✅ Template variables are replaced in responses

---

## Quick Links

**Schedule:** [WEEK_SCHEDULE.md](./WEEK_SCHEDULE.md)
**Build Plan:** [BUILD_PLAN_2025.md](./BUILD_PLAN_2025.md)
**Previous Week:** [WEEK_2_SUMMARY.md](./WEEK_2_SUMMARY.md) ✅ Complete
**Next Week:** `WEEK_4_GUIDE.md` (create when ready)

---

## Context from Week 2

### What Was Built Last Week
Week 2 focused on frontend template onboarding:

1. **Template Marketplace** - Users browse and select templates
2. **Setup Wizard** - Multi-step bot configuration flow
3. **Dynamic Forms** - Automatic form generation from template JSON
4. **Bot Creation** - Users create bots with `POST /api/bots/create-from-template`

### What's Missing
The bots exist in the database, but they **don't respond to messages yet**. The existing message queue worker doesn't use template configuration.

### Current Message Flow (Needs Enhancement)
```
Customer sends WhatsApp message
         ↓
Bird/Twilio webhook → Backend
         ↓
Message added to BullMQ queue
         ↓
Worker processes with generic AI prompt ❌ (We need template-specific logic)
         ↓
Response sent via Bird/Twilio
         ↓
Customer receives reply
```

---

## Prerequisites

Before starting Week 3, ensure:

### Required
- ✅ Week 2 complete (frontend onboarding working)
- ✅ At least 1 bot created from template
- ✅ Backend message queue operational
- ✅ Redis running (required for BullMQ)
- ✅ OpenAI API key configured
- ✅ Supabase connection working

### Verify Current System
Run these commands:

```bash
# 1. Check backend is running
curl http://localhost:3001/health

# 2. Check Redis is running
redis-cli ping
# Should return: PONG

# 3. Verify template-based bots exist
# Open Supabase Studio or run SQL:
SELECT id, name, bot_type, config FROM bots WHERE bot_type = 'template-based';

# 4. Check OpenAI key is set
# In botflow-backend/.env - verify OPENAI_API_KEY exists

# 5. Verify Bird/Twilio webhook is configured
# Check botflow-backend/src/routes/webhooks.ts
```

### Database Schema Review
Ensure you understand these tables:
- `bots` - Has `config` JSONB field storing template data
- `bot_templates` - Source templates with conversation_flow
- `conversations` - Tracks customer conversations
- `messages` - All message history
- `conversation_context` - AI memory (pgvector for embeddings)

---

## Architecture Overview

### Current vs New Flow

**Current (Generic AI):**
```
Message → Queue → Worker → OpenAI (generic prompt) → Response
```

**New (Template-Based AI):**
```
Message → Queue → Worker → Load Template Config
                              ↓
                    Build Dynamic Prompt from Template
                              ↓
                    Load Conversation Context
                              ↓
                    Check Intents & Rules
                              ↓
                    OpenAI (template-specific prompt)
                              ↓
                    Post-process Response
                              ↓
                    Check Handoff Conditions
                              ↓
                    Response (or escalate to human)
```

### Key Components

1. **Template Config Loader**
   - Loads bot's template configuration from database
   - Extracts conversation_flow, rules, intents, variables
   - Caches for performance

2. **Prompt Builder**
   - Takes template systemPrompt as base
   - Injects user's field_values (replaces {{variables}})
   - Adds conversation rules
   - Includes intent definitions
   - Appends conversation history

3. **Context Manager**
   - Loads last N messages from conversation
   - Formats for OpenAI messages array
   - Stores conversation embeddings (optional Week 3, required Week 4)

4. **Intent Matcher**
   - Checks customer message against template intents
   - Triggers specific response patterns
   - Enhances prompt with intent context

5. **Handoff Detector**
   - Evaluates handoff conditions from template
   - Detects frustrated customers
   - Flags for human escalation

---

## Day-by-Day Breakdown

### Day 1: Understand Current Message Processing

**Goal:** Map out existing message queue worker and identify integration points

#### Step 1.1: Review Current Worker

Read the existing message processing code:

```bash
# Primary files to review:
botflow-backend/src/queues/message-processor.ts
botflow-backend/src/routes/webhooks.ts
```

**What to understand:**
1. How messages enter the system (webhooks)
2. How BullMQ queue is structured
3. Current OpenAI integration
4. Response sending logic
5. Error handling

#### Step 1.2: Review Template Data Structure

```bash
# Review template structure:
botflow-backend/src/types/template.ts
botflow-backend/src/data/example-taxi-template.json
```

**Key fields to understand:**
- `conversation_flow.systemPrompt` - Base AI instruction
- `conversation_flow.rules` - Behavioral guidelines
- `conversation_flow.intents` - Keyword triggers and responses
- `conversation_flow.handoffConditions` - When to escalate
- `required_fields` - User's business data (replaces {{variables}})

#### Step 1.3: Plan Integration Points

Create a document: `botflow-backend/INTEGRATION_PLAN.md`

```markdown
# Template Integration Points

## 1. Bot Loading
- Current: Load bot by ID
- Add: Load bot.config (template data)
- Add: Extract conversation_flow

## 2. Prompt Construction
- Current: Generic system prompt
- New: Use template systemPrompt
- New: Replace {{variables}} with field_values
- New: Add template rules to prompt

## 3. Intent Detection
- Current: None
- New: Match customer message to template intents
- New: Enhance prompt with matched intent

## 4. Context Loading
- Current: Loads last 10 messages
- Keep: Same logic
- Enhance: Format according to template

## 5. Response Processing
- Current: Send directly
- Add: Check handoff conditions
- Add: Variable replacement in response

## 6. Error Handling
- Current: Generic error messages
- Keep: Same
- Enhance: Template-specific fallbacks
```

#### Validation Checklist for Day 1
- [ ] Identified all files that need changes
- [ ] Understand current message flow
- [ ] Understand template data structure
- [ ] Have clear integration plan
- [ ] Documented current vs new behavior

---

### Day 2: Template Config Loader

**Goal:** Build service to load and parse template configuration

#### Step 2.1: Create Template Config Service

Create file: `botflow-backend/src/services/template-config.service.ts`

```typescript
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Template Configuration Service
 * Loads and caches bot template configurations
 */

interface TemplateConfig {
  botId: string;
  botName: string;
  templateId: string | null;
  conversationFlow: {
    systemPrompt: string;
    welcomeMessage: string;
    rules: string[];
    intents: Record<string, {
      triggers: string[];
      response: string;
    }>;
    handoffConditions: string[];
  };
  fieldValues: Record<string, any>;
  variables: Record<string, string>; // Processed for {{replacement}}
}

// In-memory cache (TODO: Move to Redis in Week 4)
const configCache = new Map<string, { config: TemplateConfig; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load template configuration for a bot
 */
export async function loadTemplateConfig(botId: string): Promise<TemplateConfig | null> {
  try {
    // Check cache first
    const cached = configCache.get(botId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug({ botId }, 'Template config loaded from cache');
      return cached.config;
    }

    // Load bot from database
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name, config, template_id')
      .eq('id', botId)
      .single();

    if (error || !bot) {
      logger.error({ botId, error }, 'Failed to load bot');
      return null;
    }

    // Check if bot has template configuration
    if (!bot.config || !bot.config.conversation_flow) {
      logger.warn({ botId }, 'Bot has no template configuration');
      return null;
    }

    // Extract configuration
    const config: TemplateConfig = {
      botId: bot.id,
      botName: bot.name,
      templateId: bot.template_id,
      conversationFlow: bot.config.conversation_flow,
      fieldValues: bot.config.field_values || {},
      variables: extractVariables(bot.config.field_values || {}),
    };

    // Cache it
    configCache.set(botId, { config, timestamp: Date.now() });

    logger.info({ botId, templateId: bot.template_id }, 'Template config loaded');
    return config;

  } catch (error) {
    logger.error({ botId, error }, 'Error loading template config');
    return null;
  }
}

/**
 * Extract and format variables for replacement
 * Converts field_values to simple key-value map
 */
function extractVariables(fieldValues: Record<string, any>): Record<string, string> {
  const variables: Record<string, string> = {};

  Object.entries(fieldValues).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      variables[key] = '';
    } else if (Array.isArray(value)) {
      // Convert arrays to comma-separated strings
      variables[key] = value.join(', ');
    } else if (typeof value === 'object') {
      // Convert objects to JSON string
      variables[key] = JSON.stringify(value);
    } else {
      variables[key] = String(value);
    }
  });

  return variables;
}

/**
 * Replace {{variable}} placeholders in text
 */
export function replaceVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Clear cache for a specific bot (call when bot config changes)
 */
export function clearConfigCache(botId: string): void {
  configCache.delete(botId);
  logger.debug({ botId }, 'Config cache cleared');
}

/**
 * Clear entire cache
 */
export function clearAllConfigCache(): void {
  configCache.clear();
  logger.debug('All config cache cleared');
}
```

#### Step 2.2: Create Tests

Create file: `botflow-backend/src/services/template-config.service.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { replaceVariables, extractVariables } from './template-config.service.js';

describe('Template Config Service', () => {
  describe('replaceVariables', () => {
    it('should replace single variable', () => {
      const text = 'Hello {{name}}!';
      const variables = { name: 'John' };
      expect(replaceVariables(text, variables)).toBe('Hello John!');
    });

    it('should replace multiple variables', () => {
      const text = '{{business_name}} operates in {{service_area}}';
      const variables = {
        business_name: 'Cape Town Cabs',
        service_area: 'Cape Town CBD'
      };
      expect(replaceVariables(text, variables)).toBe('Cape Town Cabs operates in Cape Town CBD');
    });

    it('should handle missing variables gracefully', () => {
      const text = 'Hello {{name}}!';
      const variables = {};
      expect(replaceVariables(text, variables)).toBe('Hello {{name}}!');
    });

    it('should replace same variable multiple times', () => {
      const text = '{{name}} is {{name}}';
      const variables = { name: 'John' };
      expect(replaceVariables(text, variables)).toBe('John is John');
    });
  });

  describe('extractVariables', () => {
    it('should convert array to comma-separated string', () => {
      const fieldValues = {
        vehicle_types: ['Sedan', 'SUV', 'Van']
      };
      const result = extractVariables(fieldValues);
      expect(result.vehicle_types).toBe('Sedan, SUV, Van');
    });

    it('should handle null and undefined', () => {
      const fieldValues = {
        optional_field: null,
        missing_field: undefined
      };
      const result = extractVariables(fieldValues);
      expect(result.optional_field).toBe('');
      expect(result.missing_field).toBe('');
    });

    it('should convert numbers to strings', () => {
      const fieldValues = {
        base_rate: 50,
        per_km_rate: 12.5
      };
      const result = extractVariables(fieldValues);
      expect(result.base_rate).toBe('50');
      expect(result.per_km_rate).toBe('12.5');
    });
  });
});
```

#### Step 2.3: Run Tests

```bash
cd botflow-backend
npm test template-config.service.test.ts
```

#### Validation Checklist for Day 2
- [ ] Template config service created
- [ ] Can load bot configuration from database
- [ ] Variable extraction works correctly
- [ ] Variable replacement works correctly
- [ ] Caching implemented
- [ ] All tests passing

---

### Day 3: Dynamic Prompt Builder

**Goal:** Build system to construct AI prompts from template configuration

#### Step 3.1: Create Prompt Builder Service

Create file: `botflow-backend/src/services/prompt-builder.service.ts`

```typescript
import { TemplateConfig, replaceVariables } from './template-config.service.js';
import { logger } from '../config/logger.js';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Prompt Builder Service
 * Constructs OpenAI prompts from template configuration
 */

/**
 * Build system prompt from template configuration
 */
export function buildSystemPrompt(config: TemplateConfig): string {
  let prompt = '';

  // 1. Start with template system prompt (with variable replacement)
  const basePrompt = replaceVariables(
    config.conversationFlow.systemPrompt,
    config.variables
  );
  prompt += basePrompt + '\n\n';

  // 2. Add rules as numbered list
  if (config.conversationFlow.rules && config.conversationFlow.rules.length > 0) {
    prompt += '## Important Rules:\n';
    config.conversationFlow.rules.forEach((rule, index) => {
      prompt += `${index + 1}. ${rule}\n`;
    });
    prompt += '\n';
  }

  // 3. Add intent definitions
  if (config.conversationFlow.intents) {
    prompt += '## Intent Recognition:\n';
    prompt += 'When the customer mentions these keywords, respond accordingly:\n\n';

    Object.entries(config.conversationFlow.intents).forEach(([intentName, intent]) => {
      prompt += `**${intentName.replace(/_/g, ' ')}:**\n`;
      prompt += `- Triggers: ${intent.triggers.join(', ')}\n`;
      prompt += `- Action: ${intent.response}\n\n`;
    });
  }

  // 4. Add current context
  prompt += '## Current Conversation:\n';
  prompt += 'Below is the conversation history. Respond to the most recent customer message.\n';

  return prompt;
}

/**
 * Build complete messages array for OpenAI
 */
export function buildMessagesArray(
  config: TemplateConfig,
  conversationHistory: Array<{ role: string; content: string; created_at: string }>,
  currentMessage: string
): Message[] {
  const messages: Message[] = [];

  // 1. System message (template-based prompt)
  messages.push({
    role: 'system',
    content: buildSystemPrompt(config)
  });

  // 2. Conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);

  recentHistory.forEach((msg) => {
    messages.push({
      role: msg.role === 'customer' ? 'user' : 'assistant',
      content: msg.content
    });
  });

  // 3. Current customer message
  messages.push({
    role: 'user',
    content: currentMessage
  });

  logger.debug({
    botId: config.botId,
    messageCount: messages.length,
    historyCount: recentHistory.length
  }, 'Messages array built for OpenAI');

  return messages;
}

/**
 * Enhance prompt with matched intent
 */
export function enhancePromptWithIntent(
  basePrompt: string,
  matchedIntent: { name: string; response: string } | null
): string {
  if (!matchedIntent) {
    return basePrompt;
  }

  const enhancement = `\n\n## MATCHED INTENT: ${matchedIntent.name}\n`;
  const action = `The customer's message matches the "${matchedIntent.name}" intent.\n`;
  const instruction = `${matchedIntent.response}\n`;

  return basePrompt + enhancement + action + instruction;
}

/**
 * Match customer message to template intents
 */
export function matchIntent(
  message: string,
  config: TemplateConfig
): { name: string; response: string } | null {
  if (!config.conversationFlow.intents) {
    return null;
  }

  const lowerMessage = message.toLowerCase();

  // Check each intent's triggers
  for (const [intentName, intent] of Object.entries(config.conversationFlow.intents)) {
    const hasMatch = intent.triggers.some((trigger) =>
      lowerMessage.includes(trigger.toLowerCase())
    );

    if (hasMatch) {
      logger.info({
        botId: config.botId,
        intent: intentName,
        triggers: intent.triggers
      }, 'Intent matched');

      return {
        name: intentName,
        response: intent.response
      };
    }
  }

  return null;
}
```

#### Step 3.2: Create Tests

Create file: `botflow-backend/src/services/prompt-builder.service.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, matchIntent, enhancePromptWithIntent } from './prompt-builder.service.js';

describe('Prompt Builder Service', () => {
  const mockConfig = {
    botId: 'test-bot',
    botName: 'Test Taxi Bot',
    templateId: 'taxi-template',
    conversationFlow: {
      systemPrompt: 'You are a helpful assistant for {{business_name}}. We operate in {{service_area}}.',
      welcomeMessage: 'Hello!',
      rules: [
        'Always be polite',
        'Confirm details before booking',
        'Ask for pickup location'
      ],
      intents: {
        book_ride: {
          triggers: ['book', 'need a ride', 'pickup'],
          response: 'Collect pickup location, destination, time, and passengers'
        },
        get_quote: {
          triggers: ['how much', 'price', 'cost'],
          response: 'Ask for pickup and destination to calculate fare'
        }
      },
      handoffConditions: ['customer is angry']
    },
    fieldValues: {
      business_name: 'Cape Town Cabs',
      service_area: 'Cape Town CBD'
    },
    variables: {
      business_name: 'Cape Town Cabs',
      service_area: 'Cape Town CBD'
    }
  };

  describe('buildSystemPrompt', () => {
    it('should include system prompt with variables replaced', () => {
      const prompt = buildSystemPrompt(mockConfig);
      expect(prompt).toContain('Cape Town Cabs');
      expect(prompt).toContain('Cape Town CBD');
      expect(prompt).not.toContain('{{business_name}}');
    });

    it('should include all rules', () => {
      const prompt = buildSystemPrompt(mockConfig);
      expect(prompt).toContain('Always be polite');
      expect(prompt).toContain('Confirm details before booking');
      expect(prompt).toContain('Ask for pickup location');
    });

    it('should include intent definitions', () => {
      const prompt = buildSystemPrompt(mockConfig);
      expect(prompt).toContain('book_ride');
      expect(prompt).toContain('book, need a ride, pickup');
      expect(prompt).toContain('Collect pickup location');
    });
  });

  describe('matchIntent', () => {
    it('should match "book" intent', () => {
      const message = 'I need to book a ride to the airport';
      const match = matchIntent(message, mockConfig);
      expect(match).not.toBeNull();
      expect(match?.name).toBe('book_ride');
    });

    it('should match "quote" intent', () => {
      const message = 'How much does it cost to go to Camps Bay?';
      const match = matchIntent(message, mockConfig);
      expect(match).not.toBeNull();
      expect(match?.name).toBe('get_quote');
    });

    it('should return null for no match', () => {
      const message = 'What is your phone number?';
      const match = matchIntent(message, mockConfig);
      expect(match).toBeNull();
    });

    it('should be case insensitive', () => {
      const message = 'I NEED TO BOOK A RIDE';
      const match = matchIntent(message, mockConfig);
      expect(match).not.toBeNull();
    });
  });

  describe('enhancePromptWithIntent', () => {
    it('should add intent information to prompt', () => {
      const basePrompt = 'You are a helpful assistant';
      const intent = {
        name: 'book_ride',
        response: 'Collect pickup location'
      };
      const enhanced = enhancePromptWithIntent(basePrompt, intent);
      expect(enhanced).toContain('MATCHED INTENT: book_ride');
      expect(enhanced).toContain('Collect pickup location');
    });

    it('should return original prompt if no intent', () => {
      const basePrompt = 'You are a helpful assistant';
      const enhanced = enhancePromptWithIntent(basePrompt, null);
      expect(enhanced).toBe(basePrompt);
    });
  });
});
```

#### Validation Checklist for Day 3
- [ ] Prompt builder service created
- [ ] System prompt includes variables
- [ ] Rules are formatted correctly
- [ ] Intents are included in prompt
- [ ] Intent matching works
- [ ] Prompt enhancement works
- [ ] All tests passing

---

### Day 4: Update Message Queue Worker

**Goal:** Integrate template system into message processing

#### Step 4.1: Update Message Processor

Edit file: `botflow-backend/src/queues/message-processor.ts`

Find the message processing function and update it:

```typescript
import { loadTemplateConfig } from '../services/template-config.service.js';
import { buildMessagesArray, matchIntent, enhancePromptWithIntent } from '../services/prompt-builder.service.js';

// ... existing imports ...

export async function processMessage(job: Job) {
  const { messageId, conversationId, botId, customerMessage } = job.data;

  try {
    logger.info({ messageId, conversationId, botId }, 'Processing message');

    // 1. Load bot and template configuration
    const templateConfig = await loadTemplateConfig(botId);

    if (!templateConfig) {
      // Fallback to generic AI if no template
      logger.warn({ botId }, 'No template config, using generic AI');
      return await processGenericAI(messageId, conversationId, botId, customerMessage);
    }

    // 2. Load conversation history
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // 3. Load recent messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (msgError) {
      throw new Error('Failed to load message history');
    }

    // 4. Match customer intent
    const matchedIntent = matchIntent(customerMessage, templateConfig);

    // 5. Build OpenAI messages array
    let messagesArray = buildMessagesArray(
      templateConfig,
      messages || [],
      customerMessage
    );

    // 6. Enhance with matched intent
    if (matchedIntent) {
      const systemMessage = messagesArray[0];
      systemMessage.content = enhancePromptWithIntent(
        systemMessage.content,
        matchedIntent
      );
    }

    // 7. Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messagesArray,
      temperature: 0.7,
      max_tokens: 500,
    });

    const botResponse = response.choices[0].message.content;

    if (!botResponse) {
      throw new Error('No response from OpenAI');
    }

    // 8. Check handoff conditions
    const needsHandoff = checkHandoffConditions(
      botResponse,
      customerMessage,
      templateConfig
    );

    // 9. Save bot response to database
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'bot',
        content: botResponse,
        metadata: {
          intent: matchedIntent?.name,
          needs_handoff: needsHandoff,
        },
      });

    if (insertError) {
      throw new Error('Failed to save bot response');
    }

    // 10. Send response via WhatsApp
    await sendWhatsAppMessage(
      conversation.customer_phone,
      botResponse,
      conversation.whatsapp_account_id
    );

    // 11. Handle handoff if needed
    if (needsHandoff) {
      await notifyHumanAgent(conversationId, conversation.customer_phone);
    }

    logger.info({
      messageId,
      conversationId,
      intent: matchedIntent?.name,
      needsHandoff
    }, 'Message processed successfully');

    return {
      success: true,
      botResponse,
      intent: matchedIntent?.name,
      needsHandoff
    };

  } catch (error) {
    logger.error({ messageId, conversationId, error }, 'Error processing message');
    throw error;
  }
}

/**
 * Check if conversation needs human handoff
 */
function checkHandoffConditions(
  botResponse: string,
  customerMessage: string,
  config: TemplateConfig
): boolean {
  if (!config.conversationFlow.handoffConditions) {
    return false;
  }

  const combinedText = (botResponse + ' ' + customerMessage).toLowerCase();

  // Check each handoff condition
  for (const condition of config.conversationFlow.handoffConditions) {
    const lowerCondition = condition.toLowerCase();

    // Simple keyword matching (can be enhanced with ML later)
    if (lowerCondition.includes('angry') || lowerCondition.includes('frustrated')) {
      // Check for anger keywords
      const angerKeywords = ['angry', 'frustrated', 'terrible', 'horrible', 'worst', 'useless', 'stupid'];
      if (angerKeywords.some(keyword => combinedText.includes(keyword))) {
        logger.info({ condition }, 'Handoff condition matched: customer frustration');
        return true;
      }
    }

    if (lowerCondition.includes('outside') || lowerCondition.includes('special')) {
      // Check if bot admits it can't help
      if (combinedText.includes('unable to') || combinedText.includes('cannot help')) {
        logger.info({ condition }, 'Handoff condition matched: bot limitation');
        return true;
      }
    }

    // Add more condition types as needed
  }

  return false;
}

/**
 * Notify human agent of handoff request
 */
async function notifyHumanAgent(conversationId: string, customerPhone: string): Promise<void> {
  // TODO: Implement actual notification system
  // For now, just update conversation status
  await supabase
    .from('conversations')
    .update({
      status: 'needs_handoff',
      metadata: {
        handoff_requested_at: new Date().toISOString()
      }
    })
    .eq('id', conversationId);

  logger.info({ conversationId, customerPhone }, 'Human handoff requested');
}

/**
 * Fallback to generic AI for non-template bots
 */
async function processGenericAI(
  messageId: string,
  conversationId: string,
  botId: string,
  customerMessage: string
) {
  // Keep existing generic AI logic for backward compatibility
  // ... existing code ...
}
```

#### Step 4.2: Test Message Processing

Create test file: `botflow-backend/src/queues/message-processor.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { checkHandoffConditions } from './message-processor.js';

describe('Message Processor', () => {
  const mockConfig = {
    botId: 'test-bot',
    botName: 'Test Bot',
    templateId: 'taxi',
    conversationFlow: {
      systemPrompt: 'You are helpful',
      welcomeMessage: 'Hello',
      rules: [],
      intents: {},
      handoffConditions: [
        'Customer is angry or frustrated',
        'Request is outside standard booking'
      ]
    },
    fieldValues: {},
    variables: {}
  };

  describe('checkHandoffConditions', () => {
    it('should detect angry customer', () => {
      const botResponse = 'I understand you are frustrated';
      const customerMessage = 'This is terrible service!';
      const needsHandoff = checkHandoffConditions(botResponse, customerMessage, mockConfig);
      expect(needsHandoff).toBe(true);
    });

    it('should detect bot limitation', () => {
      const botResponse = 'I am unable to help with that request';
      const customerMessage = 'Can you do X?';
      const needsHandoff = checkHandoffConditions(botResponse, customerMessage, mockConfig);
      expect(needsHandoff).toBe(true);
    });

    it('should not trigger handoff for normal conversation', () => {
      const botResponse = 'I can help you with that';
      const customerMessage = 'I need a taxi';
      const needsHandoff = checkHandoffConditions(botResponse, customerMessage, mockConfig);
      expect(needsHandoff).toBe(false);
    });
  });
});
```

#### Validation Checklist for Day 4
- [ ] Message processor updated
- [ ] Template config loading integrated
- [ ] Prompt building integrated
- [ ] Intent matching works
- [ ] Handoff detection works
- [ ] Tests pass
- [ ] Backward compatibility maintained

---

### Day 5: End-to-End Testing

**Goal:** Test complete flow from WhatsApp message to bot response

#### Step 5.1: Manual Testing Setup

**Prerequisites:**
1. Bot created from taxi template (Week 2)
2. Webhook URL configured (Bird or Twilio)
3. Redis running
4. Backend running with queue worker

**Get Bot Details:**
```sql
-- Run in Supabase SQL Editor
SELECT
  id,
  name,
  config->>'conversation_flow' as conversation_flow,
  config->>'field_values' as field_values
FROM bots
WHERE bot_type = 'template-based'
LIMIT 1;
```

**Note the bot ID and WhatsApp number associated with it.**

#### Step 5.2: Test Scenarios

Create test plan: `botflow-backend/TEST_SCENARIOS.md`

```markdown
# Week 3 Test Scenarios

## Test 1: Basic Greeting
**Customer:** "Hello"
**Expected:** Bot responds with welcome message (from template)
**Verify:**
- [ ] Response includes business name
- [ ] Response includes service area
- [ ] Tone matches template

## Test 2: Intent Matching - Book Ride
**Customer:** "I need to book a ride to the airport"
**Expected:** Bot asks for pickup location, time, passengers
**Verify:**
- [ ] Intent "book_ride" is matched
- [ ] Bot follows intent response pattern
- [ ] All required info is requested

## Test 3: Intent Matching - Get Quote
**Customer:** "How much does it cost to Camps Bay?"
**Expected:** Bot asks for pickup location to calculate
**Verify:**
- [ ] Intent "get_quote" is matched
- [ ] Bot asks for missing info
- [ ] Pricing model is mentioned

## Test 4: Variable Replacement
**Customer:** "What's your service area?"
**Expected:** Bot mentions service area from field_values
**Verify:**
- [ ] Service area is stated correctly
- [ ] No {{variable}} placeholders in response

## Test 5: Rule Following
**Customer:** "Book me a ride now from Main St to Airport"
**Expected:** Bot confirms all details before booking
**Verify:**
- [ ] Bot doesn't immediately confirm
- [ ] Bot asks to verify details
- [ ] Bot follows template rules

## Test 6: Handoff Condition - Anger
**Customer:** "This is terrible service! I'm very angry!"
**Expected:** Conversation flagged for human handoff
**Verify:**
- [ ] Handoff condition detected
- [ ] Conversation status updated
- [ ] Human agent notified (check logs)

## Test 7: Handoff Condition - Special Request
**Customer:** "Can you arrange a wheelchair accessible van?"
**Expected:** Bot might escalate (if outside standard options)
**Verify:**
- [ ] Bot attempts to help
- [ ] If can't help, triggers handoff
- [ ] Explanation given to customer

## Test 8: Conversation Context
Send multiple messages in sequence:
1. "I need a taxi"
2. "From Main Street"
3. "To the airport"
4. "At 3pm today"

**Expected:** Bot remembers previous messages
**Verify:**
- [ ] Bot doesn't ask for already-given info
- [ ] Bot can reference earlier messages
- [ ] Conversation flows naturally

## Test 9: Multiple Customers
Send messages from 2 different phone numbers

**Expected:** Conversations are separate
**Verify:**
- [ ] Bot doesn't mix up customers
- [ ] Each has their own context
- [ ] No cross-contamination

## Test 10: Edge Cases
Test various edge cases:
- Very long message
- Special characters
- Emoji
- Multiple questions in one message

**Expected:** Bot handles gracefully
**Verify:**
- [ ] No crashes
- [ ] Reasonable responses
- [ ] Error handling works
```

#### Step 5.3: Execute Tests

Run through each test scenario:

1. Send WhatsApp message to bot number
2. Check backend logs for processing
3. Verify bot response
4. Check database for message records

**Check Logs:**
```bash
# Watch backend logs
cd botflow-backend
npm run dev | grep -i "processing message"
```

**Check Database:**
```sql
-- View recent messages
SELECT
  m.id,
  m.role,
  m.content,
  m.metadata,
  m.created_at,
  c.customer_phone
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE c.bot_id = 'YOUR_BOT_ID'
ORDER BY m.created_at DESC
LIMIT 20;
```

#### Step 5.4: Debug Common Issues

**Issue: Bot Not Responding**
```bash
# Check queue is running
redis-cli KEYS "bull:*"

# Check for failed jobs
redis-cli LLEN "bull:message-processing:failed"

# View job details
redis-cli LRANGE "bull:message-processing:failed" 0 -1
```

**Issue: Wrong Template Loaded**
```typescript
// Add debug logging in template-config.service.ts
console.log('Loaded config:', JSON.stringify(config, null, 2));
```

**Issue: Variables Not Replaced**
```typescript
// Add debug logging in prompt-builder.service.ts
console.log('Variables:', config.variables);
console.log('Prompt before:', prompt);
console.log('Prompt after:', replaceVariables(prompt, config.variables));
```

#### Validation Checklist for Day 5
- [ ] All 10 test scenarios pass
- [ ] Bot responds within 5 seconds
- [ ] Conversation context maintained
- [ ] Intents are matched correctly
- [ ] Variables are replaced
- [ ] Handoff conditions trigger
- [ ] No errors in logs
- [ ] Database records correct

---

### Day 6: Polish & Optimization

**Goal:** Refine system for performance and reliability

#### Step 6.1: Add Metrics and Monitoring

Create file: `botflow-backend/src/services/metrics.service.ts`

```typescript
import { logger } from '../config/logger.js';

/**
 * Metrics Service
 * Track key performance indicators
 */

interface Metrics {
  messageProcessingTime: number[];
  templateLoadTime: number[];
  openaiResponseTime: number[];
  intentMatches: Map<string, number>;
  handoffs: number;
}

const metrics: Metrics = {
  messageProcessingTime: [],
  templateLoadTime: [],
  openaiResponseTime: [],
  intentMatches: new Map(),
  handoffs: 0
};

export function recordMessageProcessingTime(ms: number): void {
  metrics.messageProcessingTime.push(ms);
  // Keep only last 100
  if (metrics.messageProcessingTime.length > 100) {
    metrics.messageProcessingTime.shift();
  }
}

export function recordTemplateLoadTime(ms: number): void {
  metrics.templateLoadTime.push(ms);
  if (metrics.templateLoadTime.length > 100) {
    metrics.templateLoadTime.shift();
  }
}

export function recordOpenAIResponseTime(ms: number): void {
  metrics.openaiResponseTime.push(ms);
  if (metrics.openaiResponseTime.length > 100) {
    metrics.openaiResponseTime.shift();
  }
}

export function recordIntentMatch(intent: string): void {
  const current = metrics.intentMatches.get(intent) || 0;
  metrics.intentMatches.set(intent, current + 1);
}

export function recordHandoff(): void {
  metrics.handoffs++;
}

export function getMetrics() {
  const avgProcessingTime = average(metrics.messageProcessingTime);
  const avgTemplateLoad = average(metrics.templateLoadTime);
  const avgOpenAI = average(metrics.openaiResponseTime);

  return {
    averages: {
      messageProcessing: Math.round(avgProcessingTime) + 'ms',
      templateLoad: Math.round(avgTemplateLoad) + 'ms',
      openaiResponse: Math.round(avgOpenAI) + 'ms',
    },
    totals: {
      messagesProcessed: metrics.messageProcessingTime.length,
      intentMatches: Object.fromEntries(metrics.intentMatches),
      handoffs: metrics.handoffs,
    }
  };
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Add endpoint to view metrics
export function setupMetricsEndpoint(fastify: any): void {
  fastify.get('/api/metrics/template-engine', async (request: any, reply: any) => {
    return getMetrics();
  });
}
```

Add metrics to message processor:

```typescript
// In message-processor.ts
import {
  recordMessageProcessingTime,
  recordTemplateLoadTime,
  recordOpenAIResponseTime,
  recordIntentMatch,
  recordHandoff
} from '../services/metrics.service.js';

export async function processMessage(job: Job) {
  const startTime = Date.now();

  try {
    // ... existing code ...

    // Record template load time
    const templateStart = Date.now();
    const templateConfig = await loadTemplateConfig(botId);
    recordTemplateLoadTime(Date.now() - templateStart);

    // Record intent match
    if (matchedIntent) {
      recordIntentMatch(matchedIntent.name);
    }

    // Record OpenAI time
    const openaiStart = Date.now();
    const response = await openai.chat.completions.create({...});
    recordOpenAIResponseTime(Date.now() - openaiStart);

    // Record handoff
    if (needsHandoff) {
      recordHandoff();
    }

    // Record total processing time
    recordMessageProcessingTime(Date.now() - startTime);

  } catch (error) {
    // ... error handling ...
  }
}
```

#### Step 6.2: Add Error Recovery

Improve error handling in message processor:

```typescript
export async function processMessage(job: Job) {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // ... message processing logic ...
      return result;

    } catch (error: any) {
      logger.error({
        messageId: job.data.messageId,
        attempt,
        error: error.message
      }, 'Message processing failed');

      // Retry on transient errors
      if (attempt < maxRetries && isRetryable(error)) {
        logger.info({ messageId: job.data.messageId, attempt }, 'Retrying...');
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }

      // Send fallback message to customer on final failure
      if (attempt === maxRetries) {
        await sendFallbackMessage(job.data.conversationId);
      }

      throw error;
    }
  }
}

function isRetryable(error: any): boolean {
  // Retry on network errors, rate limits, temporary failures
  const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '429', '503'];
  return retryableCodes.some(code =>
    error.code === code || error.message?.includes(code)
  );
}

async function sendFallbackMessage(conversationId: string): Promise<void> {
  try {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('customer_phone, whatsapp_account_id')
      .eq('id', conversationId)
      .single();

    if (conversation) {
      await sendWhatsAppMessage(
        conversation.customer_phone,
        "I'm having trouble processing your message right now. A human agent will assist you shortly.",
        conversation.whatsapp_account_id
      );
    }
  } catch (err) {
    logger.error({ conversationId, err }, 'Failed to send fallback message');
  }
}
```

#### Step 6.3: Optimize Performance

**Cache Template Configs in Redis:**

```typescript
// In template-config.service.ts
import { createClient } from 'redis';

const redis = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redis.connect().catch(console.error);

export async function loadTemplateConfig(botId: string): Promise<TemplateConfig | null> {
  try {
    // Try Redis cache first
    const cached = await redis.get(`template:config:${botId}`);
    if (cached) {
      logger.debug({ botId }, 'Template config from Redis');
      return JSON.parse(cached);
    }

    // Load from database
    const config = await loadFromDatabase(botId);

    if (config) {
      // Cache in Redis for 5 minutes
      await redis.setEx(
        `template:config:${botId}`,
        300,
        JSON.stringify(config)
      );
    }

    return config;

  } catch (error) {
    logger.error({ botId, error }, 'Error loading template config');
    return null;
  }
}
```

#### Validation Checklist for Day 6
- [ ] Metrics tracking implemented
- [ ] Metrics endpoint accessible
- [ ] Error recovery with retries
- [ ] Fallback messages sent on failure
- [ ] Redis caching working
- [ ] Performance acceptable (< 3s response)
- [ ] No memory leaks

---

### Day 7: Documentation & Handoff

**Goal:** Document Week 3 work and prepare for Week 4

#### Step 7.1: Create Week 3 Summary

Create file: `WEEK_3_SUMMARY.md` (similar to Week 1 & 2)

Include:
- What was built
- Files created/modified
- API changes
- Testing results
- Performance metrics
- Known limitations
- Next steps

#### Step 7.2: Update Documentation

Update these files:

**CLAUDE.md:**
Add section on template execution engine

**README.md:**
Update architecture diagram to show template flow

**bot_flow_prd_twilio_migration_vertical_templates.md:**
Mark template execution as complete

#### Step 7.3: Code Comments

Add JSDoc comments to all new functions:

```typescript
/**
 * Load template configuration for a bot from database or cache
 *
 * @param botId - UUID of the bot
 * @returns Template configuration or null if not found
 *
 * @example
 * const config = await loadTemplateConfig('bot-uuid-123');
 * if (config) {
 *   console.log(config.conversationFlow.systemPrompt);
 * }
 */
export async function loadTemplateConfig(botId: string): Promise<TemplateConfig | null> {
  // ...
}
```

#### Step 7.4: Create Test Documentation

Create file: `botflow-backend/TESTING.md`

Document:
- How to run tests
- How to add new tests
- Test coverage expectations
- Manual testing procedures

#### Step 7.5: Performance Benchmarks

Document baseline performance:

```markdown
# Week 3 Performance Benchmarks

## Response Times (Average)
- Total message processing: 2.8s
- Template config load: 45ms (cached: 5ms)
- OpenAI API call: 1.9s
- Database operations: 120ms
- WhatsApp send: 400ms

## Throughput
- Messages per minute: 20-25
- Concurrent conversations: 50+

## Cache Hit Rates
- Template config: 85%
- Conversation history: N/A (not cached yet)

## Error Rates
- Total errors: < 1%
- Retryable errors: 0.3%
- Fatal errors: < 0.1%
```

#### Validation Checklist for Day 7
- [ ] Week 3 summary created
- [ ] All documentation updated
- [ ] Code comments added
- [ ] Test documentation complete
- [ ] Performance benchmarks recorded
- [ ] Known issues documented
- [ ] Week 4 prerequisites listed

---

## Success Checklist

Before moving to Week 4, verify:

### Functionality ✅
- [ ] Template-based bot responds to messages
- [ ] Variables are replaced in responses
- [ ] Intents are matched correctly
- [ ] Rules are followed
- [ ] Conversation context maintained
- [ ] Handoff conditions trigger
- [ ] Multiple customers handled separately

### Code Quality ✅
- [ ] All TypeScript compiles without errors
- [ ] All tests passing
- [ ] Code is commented
- [ ] Services are modular
- [ ] Error handling is robust

### Performance ✅
- [ ] Response time < 5 seconds
- [ ] Template config cached
- [ ] No memory leaks
- [ ] Queue processing stable

### Documentation ✅
- [ ] Week 3 summary created
- [ ] CLAUDE.md updated
- [ ] Test scenarios documented
- [ ] Code is commented

---

## Common Issues & Solutions

### Templates Not Loading
**Symptoms:** Bot uses generic AI instead of template
**Solutions:**
1. Check bot has `config.conversation_flow` in database
2. Verify `loadTemplateConfig` is called
3. Check logs for loading errors
4. Verify bot was created via template (not manually)

### Variables Not Replaced
**Symptoms:** Response contains `{{variable_name}}`
**Solutions:**
1. Check `field_values` exists in bot config
2. Verify `extractVariables` is called
3. Check variable names match exactly
4. Add debug logging to `replaceVariables`

### Intents Not Matching
**Symptoms:** Bot doesn't follow intent response patterns
**Solutions:**
1. Check intent triggers are lowercase in comparison
2. Verify customer message contains trigger keywords
3. Test with exact trigger phrases first
4. Add debug logging to `matchIntent`

### Handoff Not Triggering
**Symptoms:** Angry customer not escalated
**Solutions:**
1. Check `handoffConditions` exists in template
2. Verify condition keywords match logic
3. Test with explicit anger keywords
4. Check `checkHandoffConditions` is called

### Slow Response Times
**Symptoms:** Bot takes > 5 seconds to respond
**Solutions:**
1. Enable Redis caching for template configs
2. Reduce conversation history limit (currently 10)
3. Check OpenAI API latency
4. Profile database query times
5. Ensure WhatsApp API isn't timing out

---

## Resources

**OpenAI Documentation:**
- [Chat Completions API](https://platform.openai.com/docs/guides/chat)
- [Best Practices for Prompts](https://platform.openai.com/docs/guides/prompt-engineering)

**BullMQ Documentation:**
- [Queue Processing](https://docs.bullmq.io/guide/jobs)
- [Error Handling](https://docs.bullmq.io/guide/jobs/fails)

**Design References:**
- [Intercom AI Agent](https://www.intercom.com/fin) - Intent detection
- [Ada CX](https://www.ada.cx/) - Template-based responses
- [Drift Conversational AI](https://www.drift.com/) - Context management

---

## Next Steps (Week 4)

Week 4 will build the first production templates:

### Tier-1 Templates Part 1
1. **Taxi & Shuttle Service** (already have taxi template)
2. **Restaurant Reservations**
3. **Hair Salon Bookings**

Each template will need:
- Complete conversation flow
- Industry-specific intents
- Integration requirements (calendar, maps, payments)
- Real-world testing

**Preparation for Week 4:**
- Study restaurant booking flows
- Research hair salon scheduling
- Understand appointment management
- Review payment integration options

---

## Week 3 Summary

### What We Built

1. **Template Config Loader** - Loads bot template configuration
2. **Prompt Builder** - Constructs AI prompts from templates
3. **Intent Matcher** - Matches customer messages to intents
4. **Context Manager** - Loads conversation history
5. **Handoff Detector** - Identifies escalation needs
6. **Message Processor** - Integrates everything into queue worker

### Key Features
- ✅ Dynamic prompt generation from templates
- ✅ Variable replacement ({{business_name}})
- ✅ Intent recognition and routing
- ✅ Rule enforcement
- ✅ Handoff condition detection
- ✅ Conversation context management
- ✅ Performance metrics
- ✅ Error recovery

### Files Created
1. `src/services/template-config.service.ts`
2. `src/services/prompt-builder.service.ts`
3. `src/services/metrics.service.ts`
4. Test files for each service

### Files Modified
1. `src/queues/message-processor.ts` - Added template integration
2. `src/server.ts` - Added metrics endpoint

---

**Week 3 Complete!** 🎉

Template-based bots are now intelligent and can have real conversations. Users can create bots via the UI (Week 2), and those bots respond using template configuration (Week 3).

**Ready for Week 4:** Building production-ready vertical templates!

---

**Questions?** Review [CLAUDE.md](./CLAUDE.md) for architecture or [WEEK_2_SUMMARY.md](./WEEK_2_SUMMARY.md) for frontend context.
