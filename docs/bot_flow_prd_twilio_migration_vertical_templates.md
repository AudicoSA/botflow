# Product Requirements Document (PRD)

## Product Name
**BotFlow** – WhatsApp AI Agent Platform

## Document Purpose
This PRD defines the next major phase of BotFlow: **migrating from Bird to Twilio as the core WhatsApp provider**, formalizing the **multi‑tenant SaaS architecture**, and launching **20 high‑impact vertical onboarding templates** that allow customers to go live in minutes.

This document is written to:
- Align product, engineering, and GTM decisions
- Act as a blueprint for execution
- Support internal agents (e.g. Ralph) in assisting with build, onboarding, and support

---

## 1. Product Vision

BotFlow enables businesses to deploy **production‑ready AI WhatsApp agents** without technical complexity.

**North Star:**
> A customer can sign up, connect WhatsApp, select a vertical template, and be live in under 10 minutes — with zero WhatsApp expertise.

---

## 2. Strategic Shift: Bird → Twilio

### Rationale
The platform is transitioning from Bird to Twilio to support:
- True multi‑tenant SaaS scaling
- Automatic WhatsApp number provisioning
- Clean billing isolation per customer
- Long‑term compliance with Meta WhatsApp policies

### Key Principles
- Twilio is *infrastructure*, not the product
- BotFlow owns the UX, onboarding, and agent logic
- Each customer is fully isolated

---

## 3. Target Customers

### Primary ICP
- SMBs (1–50 staff)
- Service‑based businesses
- High inbound WhatsApp usage
- Low tolerance for setup complexity

### Secondary ICP
- Agencies managing multiple clients
- SaaS platforms embedding WhatsApp AI

---

## 4. Top 20 Target Markets (Verticals)

These were selected based on:
- Repetitive conversations
- High WhatsApp adoption
- Clear ROI
- Simple onboarding data requirements

### Tier 1 (Launch‑Critical)
1. Taxi & Shuttle Services
2. Restaurants (Takeaway / Delivery)
3. Hair & Beauty Salons
4. Medical Clinics / Dentists
5. Real Estate Agents
6. E‑commerce Stores
7. Gyms & Fitness Studios

### Tier 2 (High Growth)
8. Hotels & Guesthouses
9. Property Management (Airbnb hosts)
10. Auto Repair & Mechanics
11. Law Firms (Intake only)
12. Accounting Firms
13. Cleaning Services
14. Home Services (Plumbing, Electrical)

### Tier 3 (Expansion)
15. Schools & Training Centers
16. Event Venues
17. Recruitment Agencies
18. Insurance Brokers
19. Travel Agencies
20. Local Retail Stores

---

## 5. Template‑First Product Strategy

Each vertical launches with:
- A pre‑configured AI agent
- Opinionated conversation flows
- Required tools pre‑selected
- Simple onboarding form

### Template Goals
- Remove decision fatigue
- Reduce onboarding to structured data entry
- Maximize first‑week activation

---

## 6. Example Template Breakdown

### Taxi / Shuttle Agent
**Primary Jobs**
- Book rides
- Quote prices
- Confirm pickup

**Required Inputs**
- Service area
- Vehicle types
- Pricing rules
- Operating hours

**Integrations**
- Maps / distance calculator
- Calendar
- Payment link (optional)

---

### Restaurant Order Agent
**Primary Jobs**
- Menu browsing
- Order placement
- Pickup / delivery selection

**Required Inputs**
- Menu items
- Prices
- Hours

**Integrations**
- POS (later)
- Payment links

---

## 7. Twilio‑Based Architecture

### Account Model
- One **Twilio master account** (BotFlow)
- One **Twilio subaccount per customer**

### Benefits
- Billing isolation
- Message usage tracking
- Clean shutdown if customer churns

---

## 8. WhatsApp Onboarding Flow (Official)

1. User clicks **Connect WhatsApp**
2. BotFlow creates Twilio subaccount
3. User completes Meta Embedded Signup
4. Phone number registered
5. WhatsApp sender approved
6. Agent activated

**Goal:** no manual support required

---

## 9. Pricing Model (Draft)

### SaaS Fee (BotFlow)
- Starter
- Pro
- Agency

### Variable Costs
- WhatsApp conversation fees (passed through)
- Optional SMS / Voice

---

## 10. Role of Ralph (Internal AI Agent)

Ralph is an **internal operator agent** used by:
- Founders
- Support
- Power users

### Ralph Responsibilities
- Generate new vertical templates
- Validate onboarding data
- Assist customers during setup
- Explain WhatsApp limits & pricing
- Debug failed onboarding

---

## 11. User Experience Principles

- WhatsApp‑first language
- No WhatsApp jargon exposed to users
- Clear success states
- Honest error messages

---

## 12. Success Metrics

### Activation
- Time to first live conversation
- % users live within 24h

### Retention
- Messages per week
- Active agents per account

### Revenue
- ARPU
- Cost vs WhatsApp usage

---

## 13. Non‑Goals

- Bulk message blasting
- Unofficial WhatsApp APIs
- Grey‑hat automation

---

## 14. Risks & Mitigations

**Risk:** WhatsApp onboarding friction
- Mitigation: strong UX + Ralph guidance

**Risk:** Cost confusion
- Mitigation: upfront pricing transparency

---

## 15. Roadmap (High Level)

### Phase 1
- Twilio migration
- 7 Tier‑1 templates

### Phase 2
- 20 total templates
- Agency features

### Phase 3
- Template marketplace
- White‑label

---

## 16. Open Questions

- Payment orchestration timing
- Voice integration
- Multi‑language templates

---

## 17. Appendix

- Existing templates: /dashboard/bots/create
- Marketing site: botflow‑r9q3.vercel.app

---

**End of PRD**

