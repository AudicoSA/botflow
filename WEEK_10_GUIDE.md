# Week 10 Guide: n8n Workflow Templates & Platform Polish

**Created:** 2026-01-11
**Status:** Ready to start
**Previous Week:** [WEEK_9_COMPLETE.md](./WEEK_9_COMPLETE.md) ✅
**Duration:** 5-7 days (estimated)

---

## Executive Summary

Week 10 focuses on **production readiness** by building actual n8n workflow templates for all 30 marketplace integrations, polishing template quality, implementing security enhancements, and preparing the platform for beta launch.

### Goals:
1. ✅ Build 30 functional n8n workflow templates
2. ✅ Implement credential encryption
3. ✅ Add integration health monitoring
4. ✅ Standardize template conversation tones
5. ✅ Add South African localization
6. ✅ End-to-end testing with all integrations
7. ✅ Performance optimization
8. ✅ Complete documentation

---

## What We Have (Post-Week 9)

### ✅ Complete:
- 20 vertical templates (100%)
- 32 integrations seeded (2 direct + 30 marketplace)
- Integration marketplace backend (10 API endpoints)
- Integration marketplace frontend UI
- Google Calendar OAuth 2.0 integration
- Paystack payment integration
- 400+ apps accessible via n8n

### 🚧 Needs Work:
- n8n workflow templates (currently just JSONB placeholders)
- Credential encryption (currently plain JSONB)
- Integration health monitoring
- OAuth state management improvements
- Template tone consistency
- South African localization
- End-to-end testing
- Performance benchmarks

---

## Week 10 Schedule

### **Days 1-3: n8n Workflow Templates**
Build 30 actual workflow templates for marketplace integrations

### **Days 4-5: Security & Monitoring**
Implement encryption, health checks, and analytics

### **Days 6-7: Polish & Testing**
Template refinement, testing, and documentation

---

## Day 1-3: Build n8n Workflow Templates

### Goal:
Create 30 functional n8n workflows that can be instantiated when users enable integrations.

### Priority Integrations (Build First):

#### **Tier 1: Most Used (10 workflows)**
1. **HubSpot CRM** - Create contact on new WhatsApp conversation
2. **Slack** - Send notification on new booking
3. **Gmail** - Send email confirmation after booking
4. **Shopify** - Sync product inventory, answer stock questions
5. **Google Sheets** - Log all conversations to spreadsheet
6. **PayFast** - Alternative SA payment gateway
7. **Yoco** - POS payment integration
8. **Mailchimp** - Add contacts to email list
9. **Zapier Webhooks** - Generic webhook trigger
10. **Airtable** - Flexible database sync

#### **Tier 2: Industry-Specific (10 workflows)**
11. **OpenTable** - Restaurant reservation sync
12. **Mindbody** - Gym class booking sync
13. **DocuSign** - Send documents for signature
14. **Zoom** - Create meeting for consultations
15. **WooCommerce** - E-commerce order sync
16. **Microsoft Outlook Calendar** - Alternative to Google Calendar
17. **Calendly** - Booking link generation
18. **Salesforce** - Enterprise CRM sync
19. **Twilio SMS** - SMS notifications
20. **Telegram** - Alternative messaging

#### **Tier 3: Nice-to-Have (10 workflows)**
21. **Pipedrive** - Sales pipeline tracking
22. **Zoho CRM** - Affordable CRM option
23. **Wix Stores** - Small business e-commerce
24. **Cal.com** - Open-source scheduling
25. **Square** - Global payment processing
26. **Ozow** - SA instant EFT
27. **Google Analytics** - Track conversation metrics
28. **Mixpanel** - Product analytics
29. **Google Meet** - Video call creation
30. **Make (Integromat)** - Visual automation

### n8n Workflow Structure:

Each workflow should follow this pattern:

```json
{
  "name": "BotFlow → HubSpot CRM",
  "nodes": [
    {
      "id": "webhook-trigger",
      "name": "WhatsApp Message",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "botflow-hubspot-{{bot_id}}",
        "responseMode": "onReceived"
      }
    },
    {
      "id": "extract-data",
      "name": "Extract Customer Data",
      "type": "n8n-nodes-base.function",
      "position": [450, 300],
      "parameters": {
        "functionCode": "// Extract customer info from WhatsApp message\nconst phone = items[0].json.from;\nconst name = items[0].json.contact_name;\nconst message = items[0].json.body;\n\nreturn [{\n  json: {\n    phone,\n    name,\n    message,\n    source: 'WhatsApp Bot'\n  }\n}];"
      }
    },
    {
      "id": "hubspot-create-contact",
      "name": "Create/Update HubSpot Contact",
      "type": "n8n-nodes-base.hubspot",
      "position": [650, 300],
      "parameters": {
        "resource": "contact",
        "operation": "upsert",
        "email": "={{$json.phone}}@whatsapp.botflow.co.za",
        "additionalFields": {
          "phone": "={{$json.phone}}",
          "firstname": "={{$json.name}}",
          "lifecyclestage": "lead",
          "hs_lead_source": "WhatsApp Bot"
        }
      },
      "credentials": {
        "hubspotApi": {
          "id": "{{credentials.hubspot_api_key}}",
          "name": "HubSpot API"
        }
      }
    }
  ],
  "connections": {
    "webhook-trigger": {
      "main": [
        [
          {
            "node": "extract-data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "extract-data": {
      "main": [
        [
          {
            "node": "hubspot-create-contact",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "timezone": "Africa/Johannesburg",
    "saveExecutionProgress": true,
    "saveManualExecutions": true
  }
}
```

### Implementation Steps:

**1. Create workflow template files:**
```bash
botflow-backend/src/data/n8n-workflows/
├── hubspot-crm.json
├── slack-notifications.json
├── gmail-confirmations.json
├── shopify-inventory.json
├── google-sheets-logging.json
└── ... (25 more)
```

**2. Update integrations-seed-data.ts:**
- Import workflow JSON files
- Add to `n8n_workflow_template` field for each integration

**3. Create n8n workflow service:**
```typescript
// botflow-backend/src/services/n8n-workflow.service.ts
export class N8nWorkflowService {
  async createWorkflow(template: N8nWorkflow, botId: string, credentials: any): Promise<string>
  async deleteWorkflow(workflowId: string): Promise<void>
  async activateWorkflow(workflowId: string): Promise<void>
  async deactivateWorkflow(workflowId: string): Promise<void>
  async getWorkflowExecutions(workflowId: string): Promise<Execution[]>
}
```

**4. Update marketplace service:**
- When user enables integration, create n8n workflow
- Store workflow ID in `bot_integrations.n8n_workflow_id`
- Configure webhook URLs dynamically

### Testing Each Workflow:
1. Create workflow in n8n manually
2. Test with sample data
3. Export as JSON
4. Add to seed data
5. Test instantiation via API

---

## Day 4-5: Security & Monitoring

### 1. Credential Encryption

**Problem:** Credentials stored in plain JSONB
**Solution:** Add AES-256 encryption layer

**Implementation:**

```typescript
// botflow-backend/src/services/encryption.service.ts
import crypto from 'crypto';
import { env } from '../config/env.js';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor() {
    // Derive 32-byte key from JWT_SECRET
    this.key = crypto.scryptSync(env.JWT_SECRET, 'botflow-salt', 32);
  }

  encrypt(data: Record<string, any>): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const text = JSON.stringify(data);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
    });
  }

  decrypt(encryptedData: string): Record<string, any> {
    const { iv, encrypted, authTag } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

export const encryptionService = new EncryptionService();
```

**Usage:**
```typescript
// When storing credentials
const encryptedCredentials = encryptionService.encrypt(credentials);
await supabase.from('bot_integrations').insert({
  credentials: encryptedCredentials,
  // ...
});

// When reading credentials
const { data } = await supabase.from('bot_integrations').select('*').single();
const decryptedCredentials = encryptionService.decrypt(data.credentials);
```

**Update:**
- `integration-marketplace.service.ts` - encrypt/decrypt credentials
- Add migration to encrypt existing credentials

---

### 2. Integration Health Monitoring

**Goal:** Monitor all enabled integrations and detect issues proactively

**Implementation:**

```typescript
// botflow-backend/src/services/integration-health.service.ts
export class IntegrationHealthService {
  async checkHealth(botIntegrationId: string): Promise<HealthStatus> {
    const botIntegration = await integrationMarketplaceService.getBotIntegration(botIntegrationId);

    // Test 1: Credentials valid?
    const credentialsValid = await this.validateCredentials(botIntegration);

    // Test 2: n8n workflow active?
    const workflowActive = await this.checkN8nWorkflow(botIntegration.n8n_workflow_id);

    // Test 3: Recent successful sync?
    const recentSync = await this.checkRecentSync(botIntegrationId);

    return {
      status: credentialsValid && workflowActive && recentSync ? 'healthy' : 'unhealthy',
      checks: {
        credentials: credentialsValid,
        workflow: workflowActive,
        recent_sync: recentSync,
      },
      last_checked_at: new Date().toISOString(),
    };
  }

  async runHealthChecks(): Promise<void> {
    // Get all active integrations
    const { data: integrations } = await supabase
      .from('bot_integrations')
      .select('id')
      .eq('status', 'active');

    for (const integration of integrations || []) {
      const health = await this.checkHealth(integration.id);

      if (health.status === 'unhealthy') {
        // Send alert to user
        // Update integration status
      }
    }
  }
}
```

**Add cron job:**
```typescript
// botflow-backend/src/services/scheduler.service.ts
// Run health checks every hour
schedule('0 * * * *', async () => {
  await integrationHealthService.runHealthChecks();
});
```

**Add API endpoint:**
```typescript
// GET /api/marketplace/bot-integrations/:id/health
fastify.get('/bot-integrations/:id/health', async (request, reply) => {
  const health = await integrationHealthService.checkHealth(id);
  return reply.send(health);
});
```

---

### 3. Integration Analytics Dashboard

**Goal:** Track integration usage and ROI

**Database:**
```sql
-- Add to integration_logs table
ALTER TABLE integration_logs
ADD COLUMN event_metadata JSONB DEFAULT '{}';

-- Track specific metrics
-- event_metadata can contain:
-- { "revenue": 500, "items_synced": 10, "api_calls": 5 }
```

**Service:**
```typescript
// botflow-backend/src/services/integration-analytics.service.ts
export class IntegrationAnalyticsService {
  async getIntegrationMetrics(botId: string, dateRange: DateRange): Promise<Metrics> {
    const logs = await supabase
      .from('integration_logs')
      .select('*')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    return {
      total_events: logs.length,
      success_rate: logs.filter(l => l.status === 'success').length / logs.length,
      avg_duration_ms: logs.reduce((sum, l) => sum + l.duration_ms, 0) / logs.length,
      by_integration: groupByIntegration(logs),
      revenue_attributed: logs.reduce((sum, l) => sum + (l.event_metadata?.revenue || 0), 0),
    };
  }
}
```

**Frontend Component:**
```tsx
// botflow-website/app/dashboard/analytics/integrations/page.tsx
export default function IntegrationAnalytics() {
  // Show charts:
  // - Integration usage over time
  // - Success rate by integration
  // - Revenue attributed to integrations
  // - Most used integrations
  // - Integration health status
}
```

---

## Day 6-7: Template Quality & Polish

### 1. Standardize Conversation Tones

**Goal:** Consistent voice across all templates while maintaining vertical-specific personality

**Template Tone Guidelines:**
- **Taxi:** Professional, efficient, safety-focused
- **Medical:** Professional, empathetic, reassuring
- **Real Estate:** Friendly, consultative, enthusiastic
- **E-commerce:** Helpful, product-focused, conversion-oriented
- **Restaurant:** Warm, hospitable, food-focused
- **Salon:** Personal, pampering, beauty-focused
- **Gym:** Motivating, energetic, health-focused
- **Retail:** Helpful, knowledgeable, service-oriented
- **Hotel:** Warm, hospitable, guest-focused
- **Airbnb:** Friendly, informative, guest-experience-focused

**Implementation:**
1. Review all 20 templates
2. Update systemPrompt for consistency
3. Add tone guidelines to each template
4. Test with sample conversations

---

### 2. South African Localization

**Add SA-specific elements:**

1. **Currency:** Always use "R" for Rands (not ZAR)
2. **Time:** 24-hour format by default, SAST timezone
3. **Emergency Numbers:** 10177 (ambulance), 112 (emergency)
4. **Load Shedding:** Mention backup plans when relevant
5. **Local Terms:**
   - "Robot" (traffic light)
   - "Braai" (barbecue)
   - "Bakkie" (pickup truck)
   - "Eish" (expression of surprise)

**Update templates:**
```typescript
// Example for restaurant template
const saLocalization = {
  currency: {
    symbol: 'R',
    format: 'R{amount}',
  },
  emergency: {
    ambulance: '10177',
    police: '10111',
    general: '112',
  },
  localTerms: {
    barbecue: 'braai',
    trafficLight: 'robot',
  },
  powerIssues: {
    mention: true,
    message: 'Note: We have backup power during load shedding',
  },
};
```

---

### 3. Error Recovery Improvements

**Add fallback behaviors:**

```typescript
// In conversation flow
"error_recovery": {
  "on_ai_error": {
    "message": "I'm having a small technical hiccup. Let me try that again.",
    "max_retries": 3,
    "fallback": "handoff"
  },
  "on_integration_error": {
    "message": "I'm having trouble connecting to {integration_name}. Let me get a human to help.",
    "action": "handoff"
  },
  "on_validation_error": {
    "message": "I didn't quite understand that. Could you please rephrase?",
    "max_retries": 2,
    "fallback": "handoff"
  }
}
```

---

### 4. End-to-End Testing

**Testing Matrix:**

For each of the 20 templates, test:
1. ✅ Template instantiation
2. ✅ Basic conversation flow
3. ✅ Intent matching (all intents)
4. ✅ Handoff conditions (all conditions)
5. ✅ Integration triggers (if applicable)
6. ✅ Payment flow (if applicable)
7. ✅ Calendar booking (if applicable)
8. ✅ Error recovery
9. ✅ Multi-turn conversations
10. ✅ Edge cases

**Create test scenarios:**
```typescript
// botflow-backend/tests/e2e/templates.test.ts
describe('Template E2E Tests', () => {
  describe('Taxi Template', () => {
    it('should handle booking flow', async () => {
      // Send messages simulating customer
      // Verify AI responses
      // Check database state
      // Verify integrations triggered
    });
  });
  // ... repeat for all 20 templates
});
```

---

### 5. Performance Optimization

**Target Metrics:**
- API response time: < 200ms (p95)
- AI response time: < 2 seconds (p95)
- Integration trigger time: < 5 seconds (p95)
- Database query time: < 50ms (p95)

**Optimizations:**
1. Add Redis caching for template configs
2. Add database connection pooling
3. Optimize SQL queries (add indexes)
4. Add CDN for frontend assets
5. Enable gzip compression
6. Add rate limiting per bot

**Implementation:**
```typescript
// Add Redis cache
import Redis from 'ioredis';
const redis = new Redis(env.REDIS_URL);

// Cache template configs
async function getTemplateConfig(botId: string) {
  const cached = await redis.get(`template:${botId}`);
  if (cached) return JSON.parse(cached);

  const config = await loadFromDatabase(botId);
  await redis.setex(`template:${botId}`, 3600, JSON.stringify(config));
  return config;
}
```

---

## Deliverables

### By End of Week 10:

**Code:**
- ✅ 30 n8n workflow templates (JSON files)
- ✅ Encryption service (100+ lines)
- ✅ Health monitoring service (200+ lines)
- ✅ Analytics service (150+ lines)
- ✅ Updated marketplace service with encryption
- ✅ Performance optimizations

**Documentation:**
- ✅ n8n workflow documentation (how to create, test, deploy)
- ✅ Security documentation (encryption, best practices)
- ✅ Integration health monitoring guide
- ✅ Template quality standards
- ✅ SA localization guide
- ✅ Performance benchmarks
- ✅ Week 10 summary document

**Testing:**
- ✅ 20 template E2E test suites
- ✅ Integration health checks working
- ✅ Performance benchmarks met
- ✅ Security audit passed

---

## Success Criteria

Week 10 is successful if:
1. ✅ All 30 n8n workflows functional and tested
2. ✅ Credentials encrypted (all existing + new)
3. ✅ Health monitoring running (hourly checks)
4. ✅ Analytics dashboard showing data
5. ✅ All 20 templates pass E2E tests
6. ✅ Performance targets met (p95 < 200ms API, < 2s AI)
7. ✅ SA localization applied to all templates
8. ✅ Zero critical bugs
9. ✅ Platform ready for beta testing

---

## Files to Create

### Backend:
```
botflow-backend/
├── src/
│   ├── data/
│   │   └── n8n-workflows/
│   │       ├── hubspot-crm.json
│   │       ├── slack-notifications.json
│   │       ├── gmail-confirmations.json
│   │       └── ... (27 more)
│   ├── services/
│   │   ├── n8n-workflow.service.ts
│   │   ├── encryption.service.ts
│   │   ├── integration-health.service.ts
│   │   └── integration-analytics.service.ts
│   └── routes/
│       └── analytics.ts (integration analytics)
└── tests/
    └── e2e/
        └── templates.test.ts
```

### Frontend:
```
botflow-website/
└── app/
    └── dashboard/
        └── analytics/
            └── integrations/
                └── page.tsx
```

### Documentation:
```
├── WEEK_10_SUMMARY.md
├── N8N_WORKFLOW_GUIDE.md
├── SECURITY_GUIDE.md
├── INTEGRATION_HEALTH_GUIDE.md
└── PERFORMANCE_BENCHMARKS.md
```

---

## Timeline

**Day 1:** Build Tier 1 workflows (10)
**Day 2:** Build Tier 2 workflows (10)
**Day 3:** Build Tier 3 workflows (10) + n8n service
**Day 4:** Encryption + Health monitoring
**Day 5:** Analytics dashboard + Performance optimization
**Day 6:** Template polish + SA localization
**Day 7:** E2E testing + Documentation

---

## Dependencies

**Required:**
- n8n instance running (Docker Compose)
- Redis for caching
- Supabase database access
- All Week 9 work complete

**Nice to Have:**
- Sentry for error tracking
- DataDog for performance monitoring
- Grafana for custom dashboards

---

## Risk Mitigation

**Risk 1:** n8n workflow complexity
**Mitigation:** Start with simple workflows, iterate

**Risk 2:** Encryption performance impact
**Mitigation:** Benchmark before/after, optimize if needed

**Risk 3:** Health checks overwhelming n8n
**Mitigation:** Rate limit checks, batch requests

**Risk 4:** E2E tests taking too long
**Mitigation:** Run in parallel, use test database

---

## Next Steps After Week 10

**Week 11: Ralph Integration**
- Build internal AI agent for support
- Template generation capability
- Debugging tools
- Support interface

**Week 12: Testing & QA**
- Load testing (50+ concurrent users)
- Security audit
- User acceptance testing
- Bug fixing sprint

**Week 13: Launch Preparation**
- Marketing assets
- Documentation finalization
- Support team training
- Public launch

---

## Quick Reference

**Start Here:**
1. Read this guide completely
2. Review Week 9 achievements
3. Set up n8n instance (if not done)
4. Start with Day 1 tasks
5. Update WEEK_SCHEDULE.md as you progress

**When Stuck:**
- Reference WEEK_9_COMPLETE.md
- Check n8n documentation
- Test workflows manually first
- Ask for clarification

**When Done:**
- Create WEEK_10_SUMMARY.md
- Update WEEK_SCHEDULE.md
- Celebrate! 🎉

---

**Status:** ✅ Ready to start
**Duration:** 5-7 days (estimated)
**Complexity:** High (n8n workflows + security)
**Priority:** Critical (needed for production)

**You've got this! Let's build world-class integrations! 🚀**
