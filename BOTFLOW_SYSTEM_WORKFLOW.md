# BotFlow – System Workflow & Architecture Blueprint

## 1. Core Design Principles

### 1.1 Opinionated by Default
BotFlow is **not** a general automation tool.

It is:
- WhatsApp-first
- Conversation-driven
- Template-based
- AI-assisted but deterministic in execution

Users **configure behavior**, they do **not build flows**.

---

### 1.2 Two Tiers of Automation
| Tier | Who | How |
|----|----|----|
| Standard | 90% of clients | Templates + Rules Engine |
| Premium | Power users | n8n / custom workflows (paid) |

---

## 2. High-Level System Architecture

WhatsApp (Cloud API)  
↓  
Webhook Ingest Service  
↓  
Conversation Orchestrator  
↓  
Intent Engine  
↓  
Rule Engine  
↓  
Action Executor  
↓  
WhatsApp Send API / External Systems

---

## 3. WhatsApp Connection Flow (Client Onboarding)

### 3.1 Official Connection (Required)
- Meta Embedded Signup
- Store WABA ID, Phone Number ID, scoped tokens
- Per-tenant isolation

No QR-based WhatsApp Web pairing.

---

## 4. Agent Creation Flow

### Step 1: Choose Agent Template
Examples:
- Lead Qualification
- Customer Support
- Bookings
- E-commerce FAQ

---

### Step 2: Configure Parameters
- Business name
- Hours
- FAQ content
- CRM webhook
- Escalation rules

---

### Step 3: AI Customization (Optional)
User describes behavior → AI proposes intents, rules, questions → user approves.

---

## 5. Runtime Message Flow

### 5.1 Ingress
Incoming WhatsApp webhook → normalize → route to tenant + agent.

---

### 5.2 Conversation State
- Intent
- Slots
- Stage
- Escalation flags

---

## 6. Intent Engine

- Classify message
- Confidence scoring
- Fallback handling

---

## 7. Rule Engine

Rules are deterministic, versioned, template-owned.

Example:
```json
{
  "when": { "intent": "pricing_inquiry", "confidence_gte": 0.8 },
  "then": ["reply_with_pricing", "ask_qualifying_question"]
}
```

---

## 8. Action Executor

Supported actions:
- Send message
- Ask question
- Save data
- Trigger webhook
- Escalate
- Call n8n (premium)

---

## 9. Slot Filling

- Structured questions
- Validation
- Persistent memory

---

## 10. Escalation

Triggers:
- Human request
- Negative sentiment
- Low confidence loops

---

## 11. Premium Automation (n8n)

- Triggered events only
- BotFlow remains source of truth
- Billed separately

---

## 12. Observability

- Logs
- Replay
- Version rollback

---

## 13. Security

- Tenant isolation
- Encryption
- Rate limits
- POPIA/GDPR support

---

## 14. Explicit Non-Goals

- User-built workflows
- Arbitrary scripting
- Device-based WhatsApp

---

## 15. Why This Works

- Simple UX
- Predictable behavior
- Scalable SaaS
- Clear upsell path

---

## 16. Guiding Principle

BotFlow should feel like configuring a smart employee — not programming one.
