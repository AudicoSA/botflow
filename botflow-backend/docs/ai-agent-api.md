# AI Agent API Documentation

## Overview

The AI Agent API enables natural language workflow building for WhatsApp bots. Users describe what they want, and the agent generates, refines, and deploys workflows automatically.

## Base URL

```
Production: https://api.botflow.co.za/api/bots/:botId/agent
Development: http://localhost:3001/api/bots/:botId/agent
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /chat | 30 requests | 1 minute |
| POST /generate | 10 requests | 1 minute |
| POST /deploy | 5 requests | 1 minute |
| GET /session | 100 requests | 1 minute |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset timestamp (ISO 8601)

---

## Endpoints

### POST /chat

Send a message to continue the conversation with the AI agent.

**Request Body:**
```json
{
  "message": "I want to track orders from my Shopify store",
  "sessionId": "uuid-optional"
}
```

**Response:**
```json
{
  "message": "I can help you create an order tracking workflow for Shopify...",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "gathering",
  "workflow": null,
  "actions": [
    { "type": "preview", "label": "Preview Workflow", "disabled": true }
  ],
  "suggestions": [
    "Track by order number",
    "Track by email",
    "Show order status"
  ],
  "questions": [
    {
      "id": "q1",
      "text": "How should customers look up their orders?",
      "type": "choice",
      "options": ["Order number", "Email address", "Phone number"]
    }
  ]
}
```

**States:**
- `idle` - Waiting for user input
- `gathering` - Collecting requirements
- `confirming` - Workflow ready for review
- `refining` - User requested changes
- `deploying` - Workflow being deployed
- `complete` - Workflow is live
- `error` - An error occurred

---

### POST /generate

Generate a workflow directly from a description (skips conversation).

**Request Body:**
```json
{
  "description": "Create a workflow that tracks Shopify orders by order number and sends status updates",
  "integrations": ["shopify"],
  "vertical": "ecommerce"
}
```

**Response:**
```json
{
  "workflow": {
    "bot_id": "bot-123",
    "version": "1.0.0",
    "name": "Order Tracking",
    "nodes": [...],
    "edges": [...],
    "variables": {},
    "credentials": []
  },
  "confidence": 0.85,
  "explanation": "I created a workflow that...",
  "warnings": [],
  "suggestedTemplates": [
    { "slug": "order-tracking-shopify", "score": 0.92 }
  ]
}
```

---

### POST /refine

Request modifications to the current workflow.

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "modifications": "Add a step to send an email notification when status changes"
}
```

**Response:**
```json
{
  "workflow": { ... },
  "changes": [
    {
      "type": "add_node",
      "description": "Added email notification node",
      "data": { ... }
    }
  ],
  "explanation": "I added an email notification step that triggers when..."
}
```

---

### POST /deploy

Deploy the workflow from the current session.

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "activate": true
}
```

**Response:**
```json
{
  "success": true,
  "workflowId": "wf-123",
  "webhookUrl": "https://api.botflow.co.za/webhooks/bot-123/wf-123",
  "status": "active",
  "message": "Workflow deployed successfully!"
}
```

---

### GET /session

Get current session information.

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "botId": "bot-123",
  "state": "confirming",
  "messageCount": 5,
  "currentWorkflow": { ... },
  "createdAt": "2026-01-18T10:00:00Z",
  "expiresAt": "2026-01-18T10:30:00Z"
}
```

---

### DELETE /session/:sessionId

Delete a session and its history.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

---

### GET /explain

Get a natural language explanation of the current workflow.

**Response:**
```json
{
  "explanation": "This workflow does the following:\n1. Triggers when a WhatsApp message is received...",
  "nodeDescriptions": [
    { "id": "trigger-1", "description": "Listens for incoming WhatsApp messages" }
  ]
}
```

---

### GET /stats

Get usage statistics for the AI agent.

**Response:**
```json
{
  "totalSessions": 150,
  "totalWorkflows": 45,
  "avgResponseTime": 1.2,
  "topTemplates": [
    { "slug": "order-tracking", "uses": 25 }
  ],
  "successRate": 0.92
}
```

---

## Quick Commands

Users can type these commands in chat:

| Command | Action |
|---------|--------|
| `deploy` | Deploy current workflow |
| `undo` | Undo last change |
| `redo` | Redo undone change |
| `reset` | Start over |
| `help` | Show help |
| `show alternatives` | See other options |

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `SESSION_NOT_FOUND` | 404 | Session expired or doesn't exist |
| `RATE_LIMITED` | 429 | Too many requests |
| `GENERATION_FAILED` | 500 | Failed to generate workflow |
| `DEPLOY_FAILED` | 500 | Failed to deploy workflow |

**Error Response Format:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Message cannot be empty",
  "details": [
    { "field": "message", "message": "Required" }
  ]
}
```

---

## Webhook Events

When workflows are deployed, they create webhooks that receive WhatsApp messages:

```
POST /webhooks/:botId/:workflowId
```

The workflow processes the message and sends responses via the configured WhatsApp provider.

---

## South African Context

The AI agent is optimized for South African businesses and understands:

- Local payment gateways (PayFast, Yoco, iKhokha, Paystack)
- South African shipping providers (The Courier Guy, ShipLogic)
- Load shedding considerations
- Local terminology and currency (ZAR)
- SA medical aid schemes
- POPIA compliance requirements

---

## Examples

### Order Tracking Bot

```bash
# Start conversation
curl -X POST http://localhost:3001/api/bots/bot-123/agent/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "I want customers to track their Shopify orders"}'

# Answer clarifying question
curl -X POST http://localhost:3001/api/bots/bot-123/agent/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "uuid", "message": "They should use their order number"}'

# Deploy when ready
curl -X POST http://localhost:3001/api/bots/bot-123/agent/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "uuid", "activate": true}'
```

### Booking Bot

```bash
curl -X POST http://localhost:3001/api/bots/bot-123/agent/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a salon appointment booking bot that lets customers choose services, pick a time slot, and get confirmation",
    "vertical": "salon"
  }'
```

---

## SDK Usage (TypeScript)

```typescript
import { BotFlowAgent } from '@botflow/sdk';

const agent = new BotFlowAgent({
  apiKey: process.env.BOTFLOW_API_KEY,
  botId: 'bot-123'
});

// Start a conversation
const session = await agent.chat('I want to track orders from Shopify');

// Continue the conversation
const response = await agent.chat('Use order number for lookup', {
  sessionId: session.sessionId
});

// Deploy when ready
const deployment = await agent.deploy({
  sessionId: session.sessionId,
  activate: true
});

console.log('Webhook URL:', deployment.webhookUrl);
```
