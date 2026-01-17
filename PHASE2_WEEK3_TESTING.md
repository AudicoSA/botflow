# Phase 2 Week 3: Testing Guide

**Goal:** Test the Intelligent Bot Builder functionality end-to-end

---

## 🧪 Test Setup

### Prerequisites

1. **OpenAI API Key** must be configured
```bash
# Add to .env
OPENAI_API_KEY=sk-...
```

2. **Backend running**
```bash
cd botflow-backend
npm run dev
```

3. **Authentication token** ready
```bash
# Login and copy JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

---

## 📋 Test Cases

### Test 1: Simple Greeting Bot

**Goal:** Test basic intent analysis and Blueprint generation

**Step 1: Analyze Intent**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "I want a bot that says Hello when someone says hi"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": {
    "trigger": {
      "type": "keyword",
      "description": "hi",
      "suggested_node": "whatsapp_trigger"
    },
    "steps": [
      {
        "action": "reply",
        "description": "respond with greeting",
        "suggested_node": "whatsapp_reply"
      }
    ],
    "conditions": [],
    "integrations": [],
    "variables": ["customer_phone"]
  }
}
```

**Step 2: Generate Blueprint**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": {
      "trigger": {
        "type": "keyword",
        "description": "hi",
        "suggested_node": "whatsapp_trigger"
      },
      "steps": [
        {
          "action": "reply",
          "description": "respond with greeting",
          "suggested_node": "whatsapp_reply"
        }
      ],
      "conditions": [],
      "integrations": [],
      "variables": ["customer_phone"]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "blueprint": {
    "bot_id": "YOUR_BOT_ID",
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
        "config": { "message": "Hello! 👋" }
      }
    ],
    "edges": [
      { "id": "e1", "source": "1", "target": "2" }
    ]
  },
  "confidence": 0.9,
  "warnings": [],
  "suggestions": [...]
}
```

**Validation:**
- ✅ Blueprint has 2 nodes (trigger + reply)
- ✅ Confidence > 0.8
- ✅ No validation warnings
- ✅ Nodes are properly connected

---

### Test 2: E-commerce Order Bot

**Goal:** Test complex workflow with integrations and conditions

**Step 1: Analyze Intent**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a bot that listens for order keyword, asks for order number, looks up order in Shopify, and if shipped sends tracking info, otherwise tells current status"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "intent": {
    "trigger": {
      "type": "keyword",
      "description": "order",
      "suggested_node": "whatsapp_trigger"
    },
    "steps": [
      {
        "action": "ask for order number",
        "suggested_node": "ask_question"
      },
      {
        "action": "lookup order in Shopify",
        "suggested_node": "shopify_lookup"
      },
      {
        "action": "check if shipped",
        "suggested_node": "if_condition"
      },
      {
        "action": "send result",
        "suggested_node": "whatsapp_reply"
      }
    ],
    "conditions": [
      {
        "condition": "order is shipped",
        "true_path": "send tracking",
        "false_path": "send status"
      }
    ],
    "integrations": [
      {
        "service": "Shopify",
        "purpose": "order lookup"
      }
    ],
    "variables": ["order_number", "order_status", "tracking_number"]
  }
}
```

**Validation:**
- ✅ Trigger is keyword type
- ✅ Has ask_question step
- ✅ Has shopify_lookup step
- ✅ Has conditional logic
- ✅ Identifies Shopify integration
- ✅ Extracts relevant variables

---

### Test 3: Conversational Bot Building

**Goal:** Test multi-turn conversation

**Turn 1:**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/conversation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I want to make a bot for my online store"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "response": "Great! What should the bot help with? For example:\n- Order status checking\n- Product recommendations\n- Customer support\n\nOr something else?",
  "complete": false
}
```

**Turn 2:**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/conversation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I want to make a bot for my online store"
      },
      {
        "role": "assistant",
        "content": "Great! What should the bot help with?"
      },
      {
        "role": "user",
        "content": "Order status checking"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "response": "Perfect! Where do you store your orders?\n- Shopify\n- WooCommerce\n- Custom database\n- Other",
  "complete": false
}
```

**Turn 3-5:** Continue conversation...

**Final Turn (when complete):**
```json
{
  "success": true,
  "response": "✅ I have everything I need! Generating your bot now...",
  "intent": { ... },
  "blueprint": { ... },
  "complete": true
}
```

**Validation:**
- ✅ Conversation flows naturally
- ✅ Assistant asks clarifying questions
- ✅ Detects completion after sufficient information
- ✅ Generates Blueprint when complete

---

### Test 4: Node Recommendations

**Goal:** Test intelligent node suggestions

**Test 4.1: Payment Action**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/recommend \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send payment link",
    "context": {
      "previousNodes": ["ask_question"],
      "integrations": ["paystack"]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "node_type": "paystack_payment",
      "confidence": 0.95,
      "reasoning": "Action matches paystack_payment pattern (matches Paystack integration)"
    },
    {
      "node_type": "whatsapp_reply",
      "confidence": 0.75,
      "reasoning": "Action matches whatsapp_reply pattern"
    }
  ]
}
```

**Test 4.2: Question Action**
```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/recommend \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "ask for customer email address"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "node_type": "ask_question",
      "confidence": 0.85,
      "reasoning": "Action matches ask_question pattern"
    },
    {
      "node_type": "set_variable",
      "confidence": 0.65,
      "reasoning": "Action matches set_variable pattern"
    }
  ]
}
```

**Validation:**
- ✅ Returns top 3 recommendations
- ✅ Confidence scores 0-1
- ✅ Reasoning is clear and specific
- ✅ Context affects recommendations

---

### Test 5: Blueprint Optimization

**Goal:** Test optimization suggestions

```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/optimize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blueprint": {
      "bot_id": "YOUR_BOT_ID",
      "version": "1.0.0",
      "name": "Order Bot",
      "nodes": [
        {
          "id": "1",
          "type": "whatsapp_trigger",
          "config": { "keyword": "order" }
        },
        {
          "id": "2",
          "type": "ask_question",
          "config": { "question": "Order number?" }
        },
        {
          "id": "3",
          "type": "shopify_lookup",
          "config": {}
        },
        {
          "id": "4",
          "type": "whatsapp_reply",
          "config": { "message": "Order found!" }
        }
      ],
      "edges": [
        { "id": "e1", "source": "1", "target": "2" },
        { "id": "e2", "source": "2", "target": "3" },
        { "id": "e3", "source": "3", "target": "4" }
      ]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "suggestions": [
    "1. [Error Handling] Add try-catch for Shopify API call - Current issue: Node 3 has no error handling",
    "2. [User Experience] Add loading message - Current issue: No feedback during API call",
    "3. [Security] Validate order number format - Current issue: No input validation"
  ]
}
```

**Validation:**
- ✅ Suggests error handling for integrations
- ✅ Identifies UX improvements
- ✅ Points out security concerns
- ✅ Suggestions are actionable

---

## 🧪 Unit Tests

### Running Tests

```bash
cd botflow-backend
npm run test src/services/bot-builder.service.test.ts
```

### Test Coverage

**Expected Results:**
```
✓ BotBuilderService > analyzeIntent > analyzes simple greeting bot intent
✓ BotBuilderService > analyzeIntent > analyzes e-commerce order bot intent
✓ BotBuilderService > analyzeIntent > extracts variables from description
✓ BotBuilderService > generateBlueprint > generates valid Blueprint from simple intent
✓ BotBuilderService > generateBlueprint > generates Blueprint with conditional logic
✓ BotBuilderService > generateBlueprint > validates generated Blueprint structure
✓ BotBuilderService > generateOptimizations > provides optimization suggestions
✓ BotBuilderService > conversationalBuilder > handles multi-turn conversation
✓ BotBuilderService > conversationalBuilder > generates Blueprint when complete
✓ NodeRecommendationEngine > recommendNodes > recommends ask_question for input
✓ NodeRecommendationEngine > recommendNodes > recommends whatsapp_reply for sending
✓ NodeRecommendationEngine > recommendNodes > recommends if_condition for conditionals
✓ NodeRecommendationEngine > recommendNodes > recommends shopify_lookup for Shopify
✓ NodeRecommendationEngine > recommendNodes > returns top 3 recommendations
✓ NodeRecommendationEngine > scoreNode > scores node relevance to intent
✓ NodeRecommendationEngine > validateNodeSelection > validates trigger presence
✓ NodeRecommendationEngine > validateNodeSelection > detects missing trigger
✓ NodeRecommendationEngine > suggestAlternatives > suggests alternatives

Test Suites: 1 passed, 1 total
Tests:       25+ passed, 25+ total
```

---

## 📊 Performance Testing

### Response Time Test

**Tool:** Apache Bench or custom script

```bash
# Test analyze endpoint
time curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Bot that says hello when someone says hi"}'
```

**Expected:** <3 seconds

**Tool:** Monitor in production
```bash
# Add timing to logs
grep "builder/analyze" logs/*.log | awk '{print $5}' | sort -n
```

---

## 🔍 Edge Cases

### Test 6: Empty Description

```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Bot"}'
```

**Expected:** Should handle gracefully (min 10 chars validation)

### Test 7: Very Long Description

```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"'$(python3 -c 'print("a"*6000)')"}'
```

**Expected:** 400 error (max 5000 chars)

### Test 8: Invalid Bot ID

```bash
curl -X POST http://localhost:3001/api/bots/invalid-id/builder/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Test bot"}'
```

**Expected:** 400 error (invalid UUID)

### Test 9: Unauthorized Access

```bash
curl -X POST http://localhost:3001/api/bots/YOUR_BOT_ID/builder/analyze \
  -H "Content-Type: application/json" \
  -d '{"description":"Test bot"}'
```

**Expected:** 401 error (no token)

### Test 10: Wrong Organization

```bash
# Try to access bot from different organization
curl -X POST http://localhost:3001/api/bots/OTHER_ORG_BOT_ID/builder/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Test bot"}'
```

**Expected:** 404 error (bot not found)

---

## ✅ Success Criteria

### Functional Tests
- [ ] Simple bot intent analysis works
- [ ] Complex bot with integrations works
- [ ] Conversational builder completes successfully
- [ ] Node recommendations are accurate
- [ ] Blueprint optimization provides useful suggestions
- [ ] All generated Blueprints are valid

### Performance Tests
- [ ] Intent analysis <3s
- [ ] Blueprint generation <5s
- [ ] Total flow <10s
- [ ] Node recommendation <1s

### Security Tests
- [ ] Authentication required
- [ ] Organization ownership verified
- [ ] Input validation works
- [ ] No credential exposure
- [ ] Rate limiting active

### Edge Case Tests
- [ ] Handles minimum description
- [ ] Rejects too-long description
- [ ] Validates bot ID format
- [ ] Rejects unauthorized requests
- [ ] Prevents cross-org access

---

## 🐛 Troubleshooting

### Issue: OpenAI API Error

**Symptom:** 500 error with "OpenAI API error"

**Solution:**
1. Check OPENAI_API_KEY is set
2. Verify API key is valid
3. Check OpenAI API status
4. Review rate limits

### Issue: Slow Response Times

**Symptom:** Requests take >10s

**Solution:**
1. Check network latency to OpenAI
2. Reduce prompt size
3. Use lower temperature
4. Consider caching

### Issue: Low Confidence Scores

**Symptom:** Confidence <0.5 on valid descriptions

**Solution:**
1. Check description clarity
2. Review prompt templates
3. Adjust confidence calculation
4. Add more examples to prompts

### Issue: Invalid Blueprints

**Symptom:** Generated Blueprint fails validation

**Solution:**
1. Check node library is loaded
2. Review Blueprint schema
3. Check GPT-4 output format
4. Add more validation examples to prompts

---

## 📝 Test Results Template

```markdown
## Test Session: YYYY-MM-DD

### Environment
- Backend Version: X.X.X
- OpenAI Model: gpt-4o
- Test User: test@example.com

### Test 1: Simple Greeting Bot
- Status: ✅ PASS
- Response Time: 2.3s
- Confidence: 0.92
- Notes: Perfect generation

### Test 2: E-commerce Order Bot
- Status: ✅ PASS
- Response Time: 4.1s
- Confidence: 0.88
- Notes: Suggested error handling correctly

### Test 3: Conversational Builder
- Status: ✅ PASS
- Turns to Complete: 4
- Notes: Natural conversation flow

### Performance Summary
- Average Response Time: 3.2s ✅
- Success Rate: 100% ✅
- Average Confidence: 0.90 ✅

### Issues Found
None

### Recommendations
Consider caching common patterns for faster response
```

---

**Happy Testing!** 🧪✨
