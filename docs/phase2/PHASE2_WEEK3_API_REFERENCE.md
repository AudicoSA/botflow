# Phase 2 Week 3: API Reference

Quick reference for Bot Builder API endpoints.

---

## 🔗 Base URL

```
http://localhost:3001/api/bots/:botId/builder
```

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 📋 Endpoints

### 1. Analyze Intent

**Endpoint:** `POST /api/bots/:botId/builder/analyze`

**Description:** Analyze user intent from natural language description

**Request:**
```json
{
  "description": "I want a bot that asks for order number and looks it up in Shopify"
}
```

**Response:**
```json
{
  "success": true,
  "intent": {
    "trigger": {
      "type": "keyword",
      "description": "order",
      "suggested_node": "whatsapp_trigger",
      "config_hints": { "keyword": "order" }
    },
    "steps": [
      {
        "action": "ask for order number",
        "description": "prompt customer for their order number",
        "suggested_node": "ask_question",
        "config_hints": {
          "question": "Please provide your order number",
          "variable_name": "order_number"
        }
      },
      {
        "action": "lookup order in Shopify",
        "description": "retrieve order details from Shopify API",
        "suggested_node": "shopify_lookup",
        "config_hints": {}
      }
    ],
    "conditions": [
      {
        "condition": "order is shipped",
        "true_path": "send tracking info",
        "false_path": "send current status"
      }
    ],
    "integrations": [
      {
        "service": "Shopify",
        "purpose": "order lookup and status retrieval"
      }
    ],
    "variables": ["order_number", "order_status", "tracking_number"]
  }
}
```

**Validation:**
- `description`: 10-5,000 characters
- `botId`: Valid UUID
- Requires bot ownership

**Response Time:** ~2.5s

---

### 2. Generate Blueprint

**Endpoint:** `POST /api/bots/:botId/builder/generate`

**Description:** Generate Blueprint JSON from intent analysis

**Request:**
```json
{
  "intent": {
    "trigger": { "type": "keyword", "description": "hi", "suggested_node": "whatsapp_trigger" },
    "steps": [
      { "action": "reply", "description": "respond", "suggested_node": "whatsapp_reply" }
    ],
    "conditions": [],
    "integrations": [],
    "variables": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "blueprint": {
    "bot_id": "123e4567-e89b-12d3-a456-426614174000",
    "version": "1.0.0",
    "name": "Greeting Bot",
    "description": "Bot that responds to greetings",
    "nodes": [
      {
        "id": "1",
        "type": "whatsapp_trigger",
        "name": "Listen for Hi",
        "config": {
          "keyword": "hi",
          "match_type": "exact"
        }
      },
      {
        "id": "2",
        "type": "whatsapp_reply",
        "name": "Send Greeting",
        "config": {
          "message": "Hello! 👋 How can I help you today?",
          "recipient": "{{customer_phone}}"
        }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "1",
        "target": "2"
      }
    ],
    "variables": {
      "customer_phone": "string",
      "customer_message": "string"
    },
    "credentials": []
  },
  "confidence": 0.92,
  "warnings": [],
  "suggestions": [
    "1. [User Experience] Consider adding a follow-up question to guide the conversation",
    "2. [Personalization] Use customer name if available in context"
  ]
}
```

**Validation:**
- Valid intent structure
- Bot ownership
- All node types must exist in library

**Response Time:** ~4s

---

### 3. Conversational Builder

**Endpoint:** `POST /api/bots/:botId/builder/conversation`

**Description:** Multi-turn conversational bot building

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "I want to make a bot for my store" },
    { "role": "assistant", "content": "What should the bot help with?" },
    { "role": "user", "content": "Order tracking" }
  ]
}
```

**Response (not complete):**
```json
{
  "success": true,
  "response": "Perfect! Where do you store your orders?\n- Shopify\n- WooCommerce\n- Custom database\n- Other",
  "complete": false
}
```

**Response (complete):**
```json
{
  "success": true,
  "response": "✅ I have everything I need! Generating your bot now...",
  "intent": { /* intent analysis */ },
  "blueprint": { /* complete blueprint */ },
  "complete": true
}
```

**Validation:**
- 1-20 messages
- Alternating user/assistant roles
- Bot ownership

**Response Time:** ~2.5s per turn

---

### 4. Optimize Blueprint

**Endpoint:** `POST /api/bots/:botId/builder/optimize`

**Description:** Get optimization suggestions for a Blueprint

**Request:**
```json
{
  "blueprint": {
    "bot_id": "123e4567-e89b-12d3-a456-426614174000",
    "version": "1.0.0",
    "name": "Order Bot",
    "nodes": [
      { "id": "1", "type": "whatsapp_trigger", "config": {} },
      { "id": "2", "type": "shopify_lookup", "config": {} },
      { "id": "3", "type": "whatsapp_reply", "config": {} }
    ],
    "edges": [
      { "id": "e1", "source": "1", "target": "2" },
      { "id": "e2", "source": "2", "target": "3" }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    "1. [Error Handling] Add try-catch for Shopify API call - Current issue: Node 2 has no error handling - Improvement: Wrap in try_catch node - Impact: Prevents bot crash if Shopify is down",
    "2. [User Experience] Add loading message - Current issue: No feedback during API call - Improvement: Send 'Looking up your order...' before Shopify call - Impact: Better UX",
    "3. [Security] Add input validation - Current issue: No validation on user input - Improvement: Validate order number format - Impact: Prevents invalid API calls"
  ]
}
```

**Validation:**
- Valid Blueprint structure
- Bot ownership

**Response Time:** ~2s

---

### 5. Recommend Nodes

**Endpoint:** `POST /api/bots/:botId/builder/recommend`

**Description:** Get node recommendations for an action

**Request:**
```json
{
  "action": "send payment link",
  "context": {
    "previousNodes": ["ask_question"],
    "integrations": ["paystack"]
  }
}
```

**Response:**
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
    },
    {
      "node_type": "http_request",
      "confidence": 0.65,
      "reasoning": "Action matches http_request pattern"
    }
  ]
}
```

**Validation:**
- Action: 3-500 characters
- Bot ownership

**Response Time:** <0.1s (no API call)

---

## 🔑 Authentication

All endpoints require JWT authentication:

```bash
# Get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token
curl -X POST http://localhost:3001/api/bots/BOT_ID/builder/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"..."}'
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Description must be between 10 and 5000 characters"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Bot not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to analyze intent",
  "message": "OpenAI API error: ..."
}
```

---

## 🧪 Testing Examples

### Example 1: Complete Flow

```bash
# Step 1: Analyze intent
INTENT=$(curl -X POST http://localhost:3001/api/bots/$BOT_ID/builder/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Bot that greets customers"}' | jq '.intent')

# Step 2: Generate Blueprint
BLUEPRINT=$(curl -X POST http://localhost:3001/api/bots/$BOT_ID/builder/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"intent\":$INTENT}" | jq '.blueprint')

# Step 3: Optimize Blueprint
SUGGESTIONS=$(curl -X POST http://localhost:3001/api/bots/$BOT_ID/builder/optimize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"blueprint\":$BLUEPRINT}")

echo "Blueprint generated with confidence: $(echo $BLUEPRINT | jq -r '.confidence')"
echo "Suggestions: $SUGGESTIONS"
```

### Example 2: Conversational Flow

```bash
# Turn 1
RESPONSE1=$(curl -X POST http://localhost:3001/api/bots/$BOT_ID/builder/conversation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"I want a bot for order tracking"}]}')

# Turn 2
RESPONSE2=$(curl -X POST http://localhost:3001/api/bots/$BOT_ID/builder/conversation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[
    {\"role\":\"user\",\"content\":\"I want a bot for order tracking\"},
    {\"role\":\"assistant\",\"content\":\"$(echo $RESPONSE1 | jq -r '.response')\"},
    {\"role\":\"user\",\"content\":\"Shopify\"}
  ]}")

# Continue until complete=true
```

---

## 📊 Rate Limits

- **10 requests per hour** per user per bot
- **Concurrent requests:** 1 at a time per bot
- **Max description length:** 5,000 characters
- **Max conversation turns:** 20

---

## 💰 Cost Tracking

Each request costs approximately:
- **Analyze:** $0.010
- **Generate:** $0.018
- **Optimize:** $0.008
- **Conversation:** $0.008 per turn
- **Recommend:** $0 (no API call)

**Total per bot creation:** ~$0.036

---

## 🔗 Related Documentation

- [PHASE2_WEEK3_COMPLETE.md](./PHASE2_WEEK3_COMPLETE.md) - Full feature overview
- [PHASE2_WEEK3_TESTING.md](./PHASE2_WEEK3_TESTING.md) - Testing guide
- [bot-builder.service.ts](./botflow-backend/src/services/bot-builder.service.ts) - Implementation

---

**Quick Reference Version:** 1.0
**Last Updated:** 2026-01-16
