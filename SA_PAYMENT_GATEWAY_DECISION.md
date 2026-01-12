# South African Payment Gateway Decision
## Paystack Selected as Primary Integration

**Decision Date:** 2026-01-11
**Status:** ✅ APPROVED - Paystack (Stripe-owned)

---

## Executive Summary

After researching South African payment gateways, **Paystack** is selected as the primary payment integration for BotFlow. Paystack offers Stripe-grade API quality, full SA availability, international payment support, and competitive pricing.

---

## Research Findings

### Top SA Payment Gateways Evaluated

#### 1. **Paystack** (SELECTED ✅)
- **Owner:** Stripe (acquired 2020 for $200M+)
- **Availability:** Live in SA since May 2021
- **API Quality:** Excellent (Stripe-grade developer experience)
- **Pricing:** 2.9% + R1 per transaction (waived under R10)
- **International:** ✅ Yes (200+ countries)
- **Customers:** Burger King, UPS, MTN, Under Armour, Crocs
- **Security:** PCI-DSS Level 1, ISO 27001 certified
- **Payouts:** ZAR (South African Rand)

**Payment Methods:**
- Visa, Mastercard, American Express
- EFT (Electronic Funds Transfer)
- Masterpass
- Bank transfers
- Apple Pay
- Visa QR

**Developer Experience:**
- Well-documented REST API
- Webhooks for real-time events
- Test/sandbox environment
- SDKs available
- Similar integration to Stripe

#### 2. **PayFast**
- **Owner:** Network International (UAE-based)
- **Availability:** SA market leader (most established)
- **API Quality:** Good
- **Pricing:** 2.9% + R1.50 per transaction + R8.70 payout fee
- **International:** ❌ No
- **Best For:** Local-only businesses with many plugins

**Pros:**
- 70+ payment plugins (WooCommerce, Shopify, etc.)
- Zero monthly fees
- 18+ payment methods

**Cons:**
- No international payments
- Support issues (hard to reach person)
- Higher payout fees
- Recent merchant complaints about reliability

#### 3. **Yoco**
- **Owner:** Yoco (SA company)
- **Availability:** SA only (200,000+ businesses)
- **API Quality:** Good
- **Pricing:** 2.7-2.95% per transaction (volume-based)
- **International:** ❌ No
- **Best For:** In-person POS + card machines

**Pros:**
- Excellent customer support
- No monthly fees
- Great for physical stores
- Beautiful card machines

**Cons:**
- Primarily POS-focused (not API-first)
- No international payments
- Limited online-only features

#### 4. **Ozow**
- **Owner:** Ozow (SA company)
- **Availability:** SA only
- **API Quality:** Good
- **Pricing:** 1.5-2.5% (lowest fees, volume-based)
- **International:** ❌ No
- **Best For:** High-value EFT transactions

**Pros:**
- Lowest transaction fees
- Real-time EFT verification
- Irrevocable payments (no chargebacks)
- No fraud risk

**Cons:**
- EFT-only (no card payments)
- No international support
- Limited to bank transfers

#### 5. **PayGate**
- **Owner:** DPO Group
- **Availability:** SA & Africa
- **API Quality:** Good
- **Pricing:** R99/month + 3.5% (cards) / 1.5% (EFT)
- **International:** ✅ Yes
- **Best For:** Enterprise SaaS, subscriptions

**Pros:**
- PCI DSS Level 1 compliant
- Reliable enterprise solution
- Good for recurring billing

**Cons:**
- Monthly fee (R99)
- Higher transaction fees
- Less developer-friendly than Paystack

---

## Why Paystack Wins

### 1. **Strategic Alignment**
- Stripe-owned = world-class API design
- Already familiar with Stripe integration patterns
- Future-proof (Stripe expanding globally)

### 2. **Technical Excellence**
- Best developer experience (Stripe-grade docs)
- Modern REST API with webhooks
- Easy to integrate (similar to Stripe)
- Excellent error handling

### 3. **Business Advantages**
- International payments = bigger market
- No monthly fees = startup-friendly
- Competitive pricing (same as PayFast)
- Trusted by major brands

### 4. **Feature Completeness**
- Cards, EFT, bank transfers, Apple Pay
- Subscriptions API (recurring payments)
- Refunds and disputes
- Multiple currencies (ZAR primary)
- Real-time webhooks

### 5. **BotFlow Use Cases**
Perfect for our templates:
- **Gym:** Membership subscriptions
- **Salon:** Deposit collection
- **Taxi:** Instant ride payments
- **Ecommerce:** Full checkout experience
- **Hotel/Airbnb:** International guest bookings ✅
- **Restaurant:** Advance payments

---

## Integration Plan

### Phase 1: Direct Paystack Integration (Days 3-4)

**Files to Create:**
```
botflow-backend/src/services/paystack.service.ts
botflow-backend/src/routes/payments.ts
botflow-backend/src/types/payment.ts
```

**Key Methods:**
```typescript
class PaystackService {
  async initializeTransaction(params: TransactionParams): Promise<Transaction>
  async verifyTransaction(reference: string): Promise<Transaction>
  async chargeCard(params: ChargeParams): Promise<Charge>
  async createSubscription(params: SubscriptionParams): Promise<Subscription>
  async processRefund(transactionId: string): Promise<Refund>
  async handleWebhook(event: PaystackEvent): Promise<void>
  async listTransactions(filters?: TransactionFilters): Promise<Transaction[]>
}
```

**API Endpoints:**
```typescript
POST /api/payments/initialize      // Create payment link
GET  /api/payments/verify/:ref     // Verify payment status
POST /api/payments/charge          // Direct charge
POST /api/payments/subscription    // Create subscription
POST /api/payments/refund/:id      // Process refund
POST /webhooks/paystack            // Paystack webhook handler
GET  /api/payments                 // List transactions
```

### Phase 2: Multi-Gateway Support (Future)

Add secondary gateways via n8n:
- **PayFast** - For merchants who prefer local-only
- **Yoco** - For POS integration
- **Ozow** - For large EFT transactions

Users can choose primary gateway in bot settings:
```json
{
  "payment_provider": "paystack",
  "fallback_provider": "payfast",
  "payment_methods": ["card", "eft", "bank_transfer"]
}
```

---

## Database Schema

```sql
-- Update integrations table
ALTER TABLE integrations
ADD COLUMN payment_provider TEXT DEFAULT 'paystack',
ADD COLUMN supports_international BOOLEAN DEFAULT true;

-- Payments table (already designed in strategy doc)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  bot_id UUID REFERENCES bots(id),
  conversation_id UUID REFERENCES conversations(id),

  -- Payment provider
  provider TEXT DEFAULT 'paystack', -- paystack, payfast, yoco, ozow
  provider_transaction_id TEXT UNIQUE,
  provider_reference TEXT,

  -- Transaction details
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'ZAR',
  status TEXT NOT NULL, -- pending, success, failed, refunded
  payment_type TEXT, -- initialize, charge, subscription
  payment_method TEXT, -- card, eft, bank_transfer

  -- Customer details
  customer_email TEXT,
  customer_phone TEXT,

  -- Metadata
  description TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_organization ON payments(organization_id);
CREATE INDEX idx_payments_provider_ref ON payments(provider_transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_conversation ON payments(conversation_id);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  bot_id UUID REFERENCES bots(id),

  provider TEXT DEFAULT 'paystack',
  provider_subscription_id TEXT UNIQUE,
  provider_customer_code TEXT,

  plan_code TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  interval TEXT NOT NULL, -- daily, weekly, monthly, annually

  status TEXT DEFAULT 'active', -- active, cancelled, expired

  next_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

---

## Environment Variables

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_... # Test key
PAYSTACK_PUBLIC_KEY=pk_test_... # Test key
PAYSTACK_WEBHOOK_SECRET=whsec_... # Webhook signature

# Production
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
```

---

## Testing Strategy

### Test Cards (Paystack Sandbox)

```
# Successful transactions
Card: 4084 0840 8408 4081
CVV: 408
Expiry: 12/30
PIN: 0000

# Insufficient funds
Card: 5060 6666 6666 6666 6666
CVV: 123
Expiry: 12/30
```

### Test EFT
Paystack provides test bank credentials in sandbox mode.

---

## Pricing Analysis

### Cost Comparison (per R1000 transaction)

| Gateway | Transaction Fee | Payout Fee | Total Cost | International |
|---------|----------------|------------|------------|---------------|
| **Paystack** | R29 + R1 | R0 | **R30** | ✅ Yes |
| PayFast | R29 + R1.50 | R8.70 | **R39.20** | ❌ No |
| Yoco | R27-R29.50 | R0 | **R27-R29.50** | ❌ No |
| Ozow | R15-R25 | R0 | **R15-R25** | ❌ No (EFT only) |
| PayGate | R35 | R0 | **R35 + R99/mo** | ✅ Yes |

**Winner for BotFlow:** Paystack
- Competitive pricing (R30 per R1000)
- No payout fees
- International support
- Best API

---

## Migration Path for Future

If we need to support multiple gateways:

1. **Primary:** Paystack (direct integration)
2. **Secondary:** PayFast (via n8n)
3. **Tertiary:** Yoco (via n8n for POS)
4. **Specialized:** Ozow (via n8n for EFT)

Abstract payment service:
```typescript
interface PaymentProvider {
  initialize(params: PaymentParams): Promise<PaymentResponse>
  verify(reference: string): Promise<VerificationResponse>
  refund(id: string): Promise<RefundResponse>
}

class PaymentService {
  private providers: Map<string, PaymentProvider>

  async processPayment(provider: string, params: PaymentParams) {
    const handler = this.providers.get(provider)
    return handler.initialize(params)
  }
}
```

---

## Decision Rationale

### Why NOT the others?

**PayFast:**
- ❌ No international payments (limits growth)
- ❌ Higher total costs (payout fees)
- ❌ Recent reliability complaints
- ✅ Good for local-only businesses (can add via n8n later)

**Yoco:**
- ❌ No international payments
- ❌ POS-focused (not API-first)
- ✅ Best for physical retail (can add via n8n for POS integration)

**Ozow:**
- ❌ EFT only (no cards)
- ❌ No international
- ✅ Great for high-value EFT (can add via n8n for specific use cases)

**PayGate:**
- ❌ Monthly fee (R99)
- ❌ Higher transaction fees
- ❌ Less developer-friendly
- ✅ Good for enterprise (can add later for large clients)

---

## Next Steps

1. **Sign up for Paystack SA account**
   - Business verification (ID, proof of address, bank account)
   - Get API keys (test + live)
   - Configure webhooks

2. **Build integration (Days 3-4 of Week 9)**
   - Service class
   - API routes
   - Database schema
   - Webhook handling

3. **Test thoroughly**
   - Sandbox environment
   - Test cards
   - Webhook events
   - Error scenarios

4. **Deploy to production**
   - Switch to live keys
   - Monitor transactions
   - Support customers

---

## Resources

### Official Documentation
- [Paystack Home (ZA)](https://paystack.com/za)
- [Paystack Pricing](https://paystack.com/za/pricing)
- [Paystack API Docs](https://paystack.com/docs)
- [Paystack Webhooks](https://paystack.com/docs/payments/webhooks/)

### Research Sources
- [Stripe acquires Paystack](https://stripe.com/newsroom/news/paystack-joining-stripe)
- [Paystack expands to South Africa](https://techcrunch.com/2021/05/06/paystack-expands-to-south-africa-seven-months-after-stripe-acquisition/)
- [Best Payment Gateways SA 2026](https://sashares.co.za/payment-gateways/)
- [Paystack vs PayFast vs Yoco comparison](https://crazyclicks.co.za/best-payment-gateways-in-south-africa-yoco-vs-payfast-vs-paystack/)

---

## Approval

**Status:** ✅ APPROVED
**Primary Gateway:** Paystack
**Fallback Strategy:** Add PayFast/Yoco/Ozow via n8n in future
**Timeline:** Implement in Week 9, Days 3-4

**Competitive Advantage:**
> "BotFlow is the only WhatsApp automation platform in South Africa with Stripe-grade payment integration (via Paystack) supporting international transactions."

---

**Decision final. Ready to build! 🚀**
