# Template Integration Plan
## Day 1: Current System Analysis & Integration Points

**Date:** January 11, 2026
**Status:** ✅ ANALYSIS COMPLETE

---

## Current Message Flow

### 1. Message Arrives (webhooks.ts)
**File:** `src/routes/webhooks.ts`

```
Customer sends WhatsApp message
         ↓
Bird/Twilio webhook hits /bird/whatsapp or /twilio/whatsapp
         ↓
Normalize payload structure
         ↓
Find/Create conversation in database
         ↓
Assign bot_id to conversation (first active bot)
         ↓
Save incoming message to messages table
         ↓
Queue message for AI processing via BullMQ
```

**Key observations:**
- Bot assignment happens early (lines 86-99)
- Bot is attached to conversation, not individual message
- Message queued with: conversationId, messageId, messageContent, whatsappAccountId

### 2. Message Processing (message.queue.ts)
**File:** `src/queues/message.queue.ts`

```
Worker receives job from BullMQ
         ↓
Load conversation + bot (line 37-46)
         ↓
Load conversation context (line 51-55)
         ↓
Build conversation history (10 messages, line 58-68)
         ↓
Generate GENERIC system prompt based on task_type (line 71-92) ❌
         ↓
Call OpenAI with generic prompt (line 95-103)
         ↓
Save AI response to database (line 108-118)
         ↓
Send via Bird WhatsApp (line 121-139)
         ↓
Update conversation context (line 142-152)
```

**Problem:** Lines 71-92 use hardcoded prompts based on `task_type` (booking/faq/order_tracking), NOT template configuration!

---

## Template Data Structure

### Bot Record (bots table)
```typescript
{
  id: string,
  name: string,
  organization_id: string,
  whatsapp_account_id: string,
  task_type: string,  // Old system - "booking", "faq", "order_tracking"
  bot_type: string,   // NEW - "template-based" or "custom"
  template_id: string | null,  // Links to bot_templates table
  config: {
    conversation_flow: ConversationFlow,
    field_values: Record<string, any>
  },
  ai_model: string,
  ai_temperature: number,
  is_active: boolean
}
```

### Template Configuration (from config field)
```typescript
{
  conversation_flow: {
    systemPrompt: string,          // With {{variables}} to replace
    welcomeMessage: string,
    exampleConversations: Array,
    rules: string[],               // Behavioral guidelines
    intents: {
      [name]: {
        triggers: string[],        // Keywords to match
        response: string           // Action instruction
      }
    },
    handoffConditions: string[]    // When to escalate
  },
  field_values: {
    business_name: "Cape Town Cabs",
    service_area: "Cape Town CBD",
    vehicle_types: ["Sedan (4 seater)", "SUV (6 seater)"],
    pricing_model: "Per kilometer",
    base_rate: 50,
    per_km_rate: 12,
    operating_hours: "24/7",
    booking_phone: "021 123 4567"
  }
}
```

---

## Integration Points

### Point 1: Bot Loading
**Current Location:** `message.queue.ts:37-46`

**Current Code:**
```typescript
const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('*, bots(*)')
    .eq('id', conversationId)
    .single();

const bot = conversation.bots;
```

**Changes Needed:**
- ✅ Already loads full bot record
- ✅ Bot has `config` field with template data
- ✅ Bot has `template_id` field
- ❌ Need to extract `config.conversation_flow`
- ❌ Need to extract `config.field_values`

**New Approach:**
```typescript
// Load bot with config
const bot = conversation.bots;

// Load template configuration (NEW SERVICE)
const templateConfig = await loadTemplateConfig(bot.id);

if (!templateConfig) {
  // Fallback to generic AI for non-template bots
  return await processGenericAI(...);
}
```

---

### Point 2: Prompt Construction
**Current Location:** `message.queue.ts:71-92`

**Current Code:**
```typescript
let systemPrompt = '';

switch (bot.task_type) {
    case 'booking':
        systemPrompt = `You are a helpful booking assistant...`;
        break;
    // ... other cases
}
```

**Changes Needed:**
- ❌ Replace entire switch statement
- ❌ Use `config.conversation_flow.systemPrompt` as base
- ❌ Replace `{{variables}}` with actual values from `field_values`
- ❌ Add `rules` to prompt
- ❌ Add `intents` to prompt for AI awareness

**New Approach:**
```typescript
// Build system prompt from template (NEW SERVICE)
const systemPrompt = buildSystemPrompt(templateConfig);

// systemPrompt now contains:
// 1. Template systemPrompt with variables replaced
// 2. Rules formatted as numbered list
// 3. Intent definitions for AI awareness
// 4. Current conversation instructions
```

---

### Point 3: Intent Detection (NEW)
**Location:** Before OpenAI call (new logic)

**Current:** None - AI figures out intent on its own

**New:**
```typescript
// Match customer message to template intents (NEW SERVICE)
const matchedIntent = matchIntent(messageContent, templateConfig);

// If intent matched:
// - Log for analytics
// - Enhance prompt with specific intent instructions
// - Add intent name to message metadata
```

**Benefits:**
- Faster response (AI knows what to do)
- More consistent behavior
- Better analytics
- Can trigger specific workflows later

---

### Point 4: Context Loading
**Current Location:** `message.queue.ts:58-68`

**Current Code:**
```typescript
const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10);

const conversationHistory = messages?.map((msg) => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content || '',
})) || [];
```

**Changes Needed:**
- ✅ Logic is good - keep it!
- ❌ Need to format messages array properly for OpenAI
- ❌ Add system message at the beginning

**New Approach:**
```typescript
// Load messages (keep existing logic)
const messages = await loadMessages(conversationId);

// Build complete messages array (NEW SERVICE)
const messagesArray = buildMessagesArray(
  templateConfig,
  messages,
  messageContent
);

// messagesArray structure:
// [
//   { role: 'system', content: systemPrompt },
//   { role: 'user', content: 'previous message' },
//   { role: 'assistant', content: 'previous response' },
//   ...
//   { role: 'user', content: messageContent }
// ]
```

---

### Point 5: OpenAI Call
**Current Location:** `message.queue.ts:95-103`

**Current Code:**
```typescript
const completion = await openai.chat.completions.create({
    model: bot.ai_model || 'gpt-4o',
    temperature: bot.ai_temperature || 0.7,
    messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: messageContent },
    ],
});
```

**Changes Needed:**
- ✅ Keep model and temperature from bot config
- ❌ Replace messages construction with new service
- ❌ Enhance system message with matched intent

**New Approach:**
```typescript
// Enhance prompt with matched intent (if any)
if (matchedIntent) {
  messagesArray[0].content = enhancePromptWithIntent(
    messagesArray[0].content,
    matchedIntent
  );
}

// Call OpenAI (mostly unchanged)
const completion = await openai.chat.completions.create({
    model: bot.ai_model || 'gpt-4o',
    temperature: bot.ai_temperature || 0.7,
    messages: messagesArray,
});
```

---

### Point 6: Response Processing
**Current Location:** `message.queue.ts:108-139`

**Current Code:**
```typescript
const aiResponse = completion.choices[0]?.message?.content || 'Sorry...';

// Save to database
const { data: responseMessage } = await supabaseAdmin
    .from('messages')
    .insert({
        conversation_id: conversationId,
        direction: 'outbound',
        message_type: 'text',
        content: aiResponse,
        sent_by: 'bot',
    })
    .select()
    .single();

// Send via Bird
await birdService.sendMessage({
    to: customerPhone,
    content: { text: aiResponse },
    channelId: whatsappAccount.bird_channel_id,
});
```

**Changes Needed:**
- ✅ Keep save logic
- ❌ Add intent name to message metadata
- ❌ Add handoff flag to metadata
- ❌ Check handoff conditions before sending
- ✅ Keep Bird send logic

**New Approach:**
```typescript
const aiResponse = completion.choices[0]?.message?.content || 'Sorry...';

// Check handoff conditions (NEW)
const needsHandoff = checkHandoffConditions(
  aiResponse,
  messageContent,
  templateConfig
);

// Save with metadata
await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    message_type: 'text',
    content: aiResponse,
    sent_by: 'bot',
    metadata: {
      intent: matchedIntent?.name,
      needs_handoff: needsHandoff
    }
});

// Send via Bird
await birdService.sendMessage(...);

// Handle handoff if needed
if (needsHandoff) {
  await notifyHumanAgent(conversationId);
}
```

---

### Point 7: Handoff Detection (NEW)
**Location:** After OpenAI response (new logic)

**Current:** None - no handoff system

**New:**
```typescript
function checkHandoffConditions(
  botResponse: string,
  customerMessage: string,
  config: TemplateConfig
): boolean {
  // Check each handoff condition from template
  // Example conditions:
  // - "Customer is angry or frustrated"
  // - "Request outside standard booking"
  // - "Technical issue"

  // Simple keyword matching for Week 3
  // Can enhance with ML sentiment analysis later

  return matched;
}

async function notifyHumanAgent(conversationId: string) {
  // Update conversation status
  await supabase
    .from('conversations')
    .update({
      status: 'needs_handoff',
      metadata: { handoff_requested_at: new Date() }
    })
    .eq('id', conversationId);

  // TODO: Send notification (email, Slack, dashboard)
}
```

---

## Files to Create

### 1. Template Config Service
**File:** `src/services/template-config.service.ts`

**Responsibilities:**
- Load bot's template configuration from database
- Cache configurations for performance
- Extract and format variables for replacement
- Replace {{variable}} placeholders
- Clear cache when bot config changes

**Key Functions:**
- `loadTemplateConfig(botId)` - Main loader
- `extractVariables(fieldValues)` - Convert to string map
- `replaceVariables(text, variables)` - Replace {{placeholders}}
- `clearConfigCache(botId)` - Cache invalidation

---

### 2. Prompt Builder Service
**File:** `src/services/prompt-builder.service.ts`

**Responsibilities:**
- Build system prompt from template config
- Construct OpenAI messages array
- Match customer intents
- Enhance prompts with matched intents

**Key Functions:**
- `buildSystemPrompt(config)` - Create full system prompt
- `buildMessagesArray(config, history, current)` - Full messages array
- `matchIntent(message, config)` - Intent detection
- `enhancePromptWithIntent(prompt, intent)` - Add intent context

---

### 3. Message Processor (Modified)
**File:** `src/queues/message.queue.ts`

**Changes:**
- Import new services
- Load template config after loading bot
- Use template-based prompt builder
- Add intent matching
- Add handoff detection
- Keep backward compatibility for non-template bots

---

### 4. Metrics Service (Day 6)
**File:** `src/services/metrics.service.ts`

**Responsibilities:**
- Track message processing time
- Track template load time
- Track OpenAI response time
- Track intent match rates
- Track handoff frequency
- Provide metrics endpoint

---

## Backward Compatibility

### Non-Template Bots
Must still support old bots without template configuration:

```typescript
// In message processor
const templateConfig = await loadTemplateConfig(bot.id);

if (!templateConfig) {
  // Fallback to old behavior
  return await processGenericAI(messageId, conversationId, bot, messageContent);
}

// Continue with template-based processing...
```

**Old system checks:**
- If bot has no `config` field → use generic AI
- If bot has no `config.conversation_flow` → use generic AI
- If bot.bot_type !== 'template-based' → use generic AI

---

## Data Flow Diagram

### New Template-Based Flow

```
Customer Message
       ↓
[Webhook Handler]
       ↓
[BullMQ Queue]
       ↓
[Message Worker]
       ↓
Load Bot Record ─────────┐
       ↓                  │
Load Template Config ←────┘ (NEW - template-config.service.ts)
  • bot.config.conversation_flow
  • bot.config.field_values
       ↓
Build System Prompt ────────→ (NEW - prompt-builder.service.ts)
  • Replace {{variables}}
  • Add rules
  • Add intents
       ↓
Load Conversation History ───→ (EXISTING)
  • Last 10 messages
       ↓
Match Customer Intent ──────→ (NEW - prompt-builder.service.ts)
  • Check triggers
  • Find matching intent
       ↓
Build Messages Array ───────→ (NEW - prompt-builder.service.ts)
  • [system, ...history, user]
       ↓
Enhance with Intent ────────→ (NEW - if intent matched)
       ↓
[Call OpenAI]
       ↓
Check Handoff Conditions ───→ (NEW - message processor)
  • Anger detection
  • Bot limitation
       ↓
Save Response + Metadata ───→ (MODIFIED - add intent/handoff)
       ↓
[Send via Bird/Twilio]
       ↓
Handle Handoff ─────────────→ (NEW - if needed)
  • Update conversation
  • Notify human
       ↓
Update Context
       ↓
Done
```

---

## Testing Strategy

### Unit Tests
Each new service needs tests:
- `template-config.service.test.ts`
- `prompt-builder.service.test.ts`
- `message-processor.test.ts` (update existing)

### Integration Tests
- End-to-end message flow
- Template loading and caching
- Variable replacement
- Intent matching
- Handoff triggering

### Manual Tests (Day 5)
1. Basic greeting
2. Intent matching - book ride
3. Intent matching - get quote
4. Variable replacement
5. Rule following
6. Handoff - angry customer
7. Handoff - special request
8. Conversation context
9. Multiple customers
10. Edge cases

---

## Performance Considerations

### Caching Strategy
- **In-memory cache** (Day 2-3): Simple Map-based cache
- **Redis cache** (Day 6): Move to Redis for production
- **TTL:** 5 minutes (template configs change rarely)

### Database Queries
- ✅ Already loading bot with conversation (1 query)
- ✅ Already loading messages in batch (1 query)
- ❌ Need to ensure no N+1 queries

### OpenAI API
- Keep 10 message limit (balance context vs tokens)
- Monitor token usage
- Consider caching common responses later

---

## Error Handling

### Template Not Found
```typescript
const templateConfig = await loadTemplateConfig(botId);
if (!templateConfig) {
  logger.warn({ botId }, 'No template config, using generic AI');
  return await processGenericAI(...);
}
```

### OpenAI Failures
```typescript
try {
  const completion = await openai.chat.completions.create(...);
} catch (error) {
  logger.error({ error }, 'OpenAI API failed');
  // Send fallback message to customer
  await sendFallbackMessage(conversation);
  throw error;
}
```

### Bird/Twilio Send Failures
```typescript
// Already handled in existing code
// Message saved to DB even if send fails
```

---

## Success Metrics

By end of Day 4 integration, these should work:
- ✅ Template config loads successfully
- ✅ Variables replaced in prompts
- ✅ Intents matched correctly
- ✅ Rules included in prompts
- ✅ Handoff conditions detected
- ✅ Response sent via WhatsApp
- ✅ Metadata saved correctly

---

## Next Steps

### Day 2 (Tomorrow)
Create `template-config.service.ts` with:
- loadTemplateConfig function
- extractVariables function
- replaceVariables function
- In-memory caching
- Unit tests

### Day 3
Create `prompt-builder.service.ts` with:
- buildSystemPrompt function
- buildMessagesArray function
- matchIntent function
- enhancePromptWithIntent function
- Unit tests

### Day 4
Update `message.queue.ts` with:
- Import new services
- Load template config
- Build template-based prompts
- Match intents
- Check handoff conditions
- Integration tests

---

## Known Limitations (Week 3 Scope)

### What We're Building
✅ Template config loading
✅ Variable replacement
✅ Intent matching (keyword-based)
✅ Handoff detection (keyword-based)
✅ Conversation context (10 messages)

### What We're NOT Building (Future Work)
❌ ML-based intent classification
❌ Sentiment analysis for handoff
❌ Vector embeddings for context
❌ Integration with external systems (maps, calendar)
❌ Advanced caching (just basic for Week 3)
❌ Real-time notifications for handoff
❌ Template versioning and migration

These advanced features come in later weeks!

---

## Questions to Resolve

### Q1: How to handle multiple bots per WhatsApp account?
**Current:** Webhook assigns first active bot to conversation
**Consideration:** What if organization has multiple bots (FAQ + Booking)?
**Week 3 Answer:** Use first active bot, handle multi-bot routing in Week 5

### Q2: How to handle template config changes?
**Current:** Cached for 5 minutes
**Consideration:** If user updates bot config, responses use old config for 5 min
**Week 3 Answer:** Acceptable. Add cache clear endpoint for Week 4.

### Q3: How detailed should handoff detection be?
**Current Plan:** Simple keyword matching
**Consideration:** False positives/negatives?
**Week 3 Answer:** Start simple, improve with data. Better to over-handoff than under-handoff.

---

**End of Integration Plan**

**Status:** ✅ Ready for Day 2 Implementation

**Next File:** Create `src/services/template-config.service.ts`
