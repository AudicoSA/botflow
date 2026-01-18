# Phase 3 Week 5: Production Deployment & Polish

**Status:** NOT STARTED
**Estimated Duration:** 5-7 Days
**Dependencies:** Week 4 (Intelligence Enhancement) Complete

---

## Overview

Week 5 focuses on preparing the AI-powered workflow builder for production deployment. This includes comprehensive testing, performance optimization, security hardening, monitoring setup, and documentation finalization. By the end of this week, the AI builder will be ready for beta testing with real users.

---

## Goals

1. **Comprehensive Testing** - Unit tests, integration tests, E2E tests with high coverage
2. **Performance Optimization** - Ensure sub-2-second response times
3. **Security Hardening** - Input validation, rate limiting, audit logging
4. **Monitoring & Alerting** - Metrics dashboards, error tracking, alerts
5. **Documentation** - API docs, user guide, deployment guide
6. **Deployment Preparation** - Environment configs, CI/CD, rollback plans

---

## Tasks

### Day 1-2: Comprehensive Testing

#### Task 5.1: Unit Tests for AI Agent Services

**Directory:** `botflow-backend/src/tests/ai-agent/`

Create comprehensive unit tests for all Week 4 services:

```typescript
// pattern-learning.test.ts
describe('PatternLearningService', () => {
  describe('recordSuccess', () => {
    it('should record a successful workflow deployment');
    it('should generate correct intent signature');
    it('should extract patterns from workflow');
  });

  describe('extractPatterns', () => {
    it('should return patterns above minimum usage threshold');
    it('should filter by workflow type');
    it('should cache results');
  });

  describe('suggestFromPatterns', () => {
    it('should rank patterns by relevance score');
    it('should include pattern reasoning');
    it('should limit results');
  });
});

// error-recovery.test.ts
describe('ErrorRecoveryService', () => {
  describe('validateWorkflow', () => {
    it('should detect missing trigger node');
    it('should detect missing response node');
    it('should detect orphan nodes');
    it('should detect circular dependencies');
    it('should detect missing configuration');
  });

  describe('autoFix', () => {
    it('should add missing trigger automatically');
    it('should add missing response automatically');
    it('should not auto-fix high-impact issues without confirmation');
  });
});

// version-manager.test.ts
describe('VersionManager', () => {
  describe('saveVersion', () => {
    it('should save workflow versions');
    it('should trim old versions when exceeding max');
    it('should generate changes summary');
  });

  describe('undo/redo', () => {
    it('should undo to previous version');
    it('should redo to next version');
    it('should return null when no history');
  });

  describe('diff', () => {
    it('should detect added nodes');
    it('should detect removed nodes');
    it('should detect modified nodes');
  });
});

// suggestion-engine.test.ts
describe('SuggestionEngine', () => {
  describe('generateSuggestions', () => {
    it('should return state-based suggestions');
    it('should include vertical-specific suggestions');
    it('should prioritize proven patterns');
  });

  describe('suggestIntegrations', () => {
    it('should recommend integrations based on workflow type');
    it('should filter out already-enabled integrations');
  });
});

// performance-cache.test.ts
describe('PerformanceCache', () => {
  describe('intent caching', () => {
    it('should cache intent parsing results');
    it('should return cached results on hit');
    it('should track hit/miss metrics');
  });

  describe('cleanup', () => {
    it('should remove expired entries');
    it('should respect max cache size');
  });
});
```

**Coverage Targets:**

- PatternLearningService: 85%+
- ErrorRecoveryService: 90%+
- VersionManager: 95%+
- SuggestionEngine: 85%+
- PerformanceCache: 90%+

#### Task 5.2: Integration Tests

**File:** `botflow-backend/src/tests/integration/ai-agent.integration.test.ts`

Test complete conversation flows:

```typescript
describe('AI Agent Integration', () => {
  describe('Order Tracking Flow', () => {
    it('should create order tracking workflow through conversation', async () => {
      // 1. Start conversation
      const response1 = await agent.chat('I want to track orders');
      expect(response1.state).toBe('gathering');
      expect(response1.questions).toContain(/platform|store/i);

      // 2. Answer platform question
      const response2 = await agent.chat('Shopify', response1.sessionId);
      expect(response2.workflow).toBeDefined();
      expect(response2.workflow.nodes).toContainType('integration');

      // 3. Deploy
      const response3 = await agent.chat('deploy', response2.sessionId);
      expect(response3.state).toBe('complete');
    });
  });

  describe('Template Selection Flow', () => {
    it('should suggest and instantiate templates', async () => {
      const response1 = await agent.chat('appointment booking');
      expect(response1.message).toContain(/template/i);

      const response2 = await agent.chat('use template', response1.sessionId);
      expect(response2.workflow).toBeDefined();
    });
  });

  describe('Error Recovery Flow', () => {
    it('should auto-fix and report issues', async () => {
      // Create workflow with missing trigger
      const workflow = { nodes: [], edges: [] };
      const result = await errorRecovery.autoFix(workflow);

      expect(result.appliedFixes).toContain(/trigger/i);
      expect(result.fixed.nodes).toContainType('trigger');
    });
  });

  describe('Pattern Learning Flow', () => {
    it('should learn from successful deployments', async () => {
      // Record multiple successful deployments
      await patternLearning.recordSuccess(entry1);
      await patternLearning.recordSuccess(entry2);
      await patternLearning.recordSuccess(entry3);

      // Verify patterns are extracted
      const patterns = await patternLearning.extractPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });
});
```

#### Task 5.3: End-to-End Tests

**File:** `botflow-website/cypress/e2e/ai-builder.cy.ts`

```typescript
describe('AI Builder E2E', () => {
  beforeEach(() => {
    cy.login();
    cy.createBot('Test Bot');
    cy.visit('/dashboard/bots/test-bot/ai-builder');
  });

  it('creates a workflow through conversation', () => {
    // Type message
    cy.get('[data-testid="chat-input"]').type('I want to track orders from Shopify');
    cy.get('[data-testid="send-button"]').click();

    // Wait for response
    cy.get('[data-testid="assistant-message"]', { timeout: 10000 }).should('be.visible');

    // Verify workflow preview appears
    cy.get('[data-testid="workflow-preview"]').should('be.visible');

    // Click deploy
    cy.get('[data-testid="deploy-button"]').click();

    // Verify success
    cy.get('[data-testid="success-message"]').should('contain', 'deployed');
  });

  it('uses quick suggestions', () => {
    cy.get('[data-testid="suggestion-chip"]').first().click();
    cy.get('[data-testid="assistant-message"]').should('be.visible');
  });

  it('handles undo/redo', () => {
    // Create workflow
    cy.get('[data-testid="chat-input"]').type('Create order tracking');
    cy.get('[data-testid="send-button"]').click();
    cy.get('[data-testid="workflow-preview"]').should('be.visible');

    // Modify
    cy.get('[data-testid="chat-input"]').type('Add email notification');
    cy.get('[data-testid="send-button"]').click();

    // Undo
    cy.get('[data-testid="chat-input"]').type('undo');
    cy.get('[data-testid="send-button"]').click();

    // Verify undo worked
    cy.get('[data-testid="assistant-message"]').should('contain', /undo|reverted/i);
  });

  it('shows template suggestions', () => {
    cy.get('[data-testid="chat-input"]').type('booking');
    cy.get('[data-testid="send-button"]').click();

    cy.get('[data-testid="template-suggestion"]').should('be.visible');
  });
});
```

---

### Day 3: Performance Optimization

#### Task 5.4: Response Time Optimization

**Performance Targets:**

| Operation | Target | Current | Status |
|-----------|--------|---------|--------|
| Chat response | <2s | TBD | ⬜ |
| Workflow generation | <5s | TBD | ⬜ |
| Template search | <500ms | TBD | ⬜ |
| Intent parsing | <1s | TBD | ⬜ |
| Pattern lookup | <500ms | TBD | ⬜ |

**Optimization Strategies:**

1. **Intent Parser Caching**

   ```typescript
   // Use quick detection before GPT
   const quickResult = intentParser.quickDetect(message);
   if (quickResult.confidence > 0.9) {
     return quickResult; // Skip GPT call
   }
   ```

2. **Template Pre-indexing**

   ```typescript
   // Pre-compute keyword indexes on startup
   await templateMatcher.buildKeywordIndex();
   ```

3. **Parallel Processing**

   ```typescript
   // Run independent operations in parallel
   const [intent, templates, patterns] = await Promise.all([
     intentParser.parse(message),
     templateMatcher.findMatches(message),
     patternLearning.suggestFromPatterns(message)
   ]);
   ```

4. **Response Streaming**

   ```typescript
   // Stream long responses
   fastify.post('/chat/stream', async (request, reply) => {
     reply.raw.setHeader('Content-Type', 'text/event-stream');

     for await (const chunk of conversationEngine.processStream(message)) {
       reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
     }
   });
   ```

#### Task 5.5: Database Query Optimization

**Add indexes for common queries:**

```sql
-- Frequently queried fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_success_logs_composite
  ON workflow_success_logs(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_composite
  ON workflow_error_logs(organization_id, error_type, created_at DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_success_logs_active_recent
  ON workflow_success_logs(created_at DESC)
  WHERE is_active = true AND created_at > NOW() - INTERVAL '30 days';
```

**Optimize materialized view refresh:**

```sql
-- Add trigger to refresh patterns view asynchronously
CREATE OR REPLACE FUNCTION queue_pattern_refresh()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('refresh_patterns', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### Day 4: Security Hardening

#### Task 5.6: Input Validation

**File:** `botflow-backend/src/services/ai-agent/input-validator.ts`

```typescript
import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long')
    .transform(s => s.trim()),
  sessionId: z.string().uuid().optional()
});

export const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  nodes: z.array(nodeSchema).min(1).max(100),
  edges: z.array(edgeSchema).max(200)
});

export class InputValidator {
  validateChatMessage(input: unknown): ChatRequest {
    return chatMessageSchema.parse(input);
  }

  sanitizeForPrompt(message: string): string {
    // Remove potential prompt injection attempts
    return message
      .replace(/```/g, '')
      .replace(/system:/gi, '')
      .replace(/\[INST\]/gi, '')
      .slice(0, 5000);
  }
}
```

#### Task 5.7: Rate Limiting

**File:** `botflow-backend/src/middleware/rate-limiter.ts`

```typescript
import rateLimit from '@fastify/rate-limit';

export const aiAgentRateLimits = {
  chat: {
    max: 30,          // 30 messages
    timeWindow: 60000 // per minute
  },
  generate: {
    max: 10,          // 10 generations
    timeWindow: 60000 // per minute
  },
  deploy: {
    max: 5,           // 5 deployments
    timeWindow: 60000 // per minute
  }
};

// Apply to routes
fastify.register(rateLimit, {
  global: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

fastify.post('/chat', {
  config: { rateLimit: aiAgentRateLimits.chat }
}, chatHandler);
```

#### Task 5.8: Audit Logging

**File:** `botflow-backend/src/services/ai-agent/audit-logger.ts`

```typescript
export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  organizationId: string;
  action: 'chat' | 'generate' | 'deploy' | 'delete';
  resource: 'session' | 'workflow';
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}

export class AuditLogger {
  async log(entry: AuditLogEntry): Promise<void> {
    await supabaseAdmin.from('audit_logs').insert({
      ...entry,
      timestamp: entry.timestamp.toISOString()
    });
  }

  async getAuditTrail(
    organizationId: string,
    options?: { limit?: number; from?: Date }
  ): Promise<AuditLogEntry[]> {
    // Query audit logs
  }
}
```

---

### Day 5: Monitoring & Alerting

#### Task 5.9: Metrics Dashboard

**Metrics to track:**

1. **Performance Metrics**
   - Chat response time (p50, p95, p99)
   - Workflow generation time
   - Template match time
   - Cache hit rate

2. **Usage Metrics**
   - Active sessions
   - Messages per hour
   - Workflows deployed per day
   - Templates used

3. **Error Metrics**
   - Error rate by type
   - Auto-fix success rate
   - Failed deployments

4. **Business Metrics**
   - Workflow success rate
   - User satisfaction (ratings)
   - Feature adoption

**File:** `botflow-backend/src/services/ai-agent/metrics-collector.ts`

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  chatResponseTime: new Histogram({
    name: 'ai_agent_chat_response_seconds',
    help: 'Chat response time in seconds',
    labelNames: ['state', 'success'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  workflowsDeployed: new Counter({
    name: 'ai_agent_workflows_deployed_total',
    help: 'Total workflows deployed',
    labelNames: ['template', 'vertical']
  }),

  activeSessions: new Gauge({
    name: 'ai_agent_active_sessions',
    help: 'Number of active AI agent sessions'
  }),

  errorRate: new Counter({
    name: 'ai_agent_errors_total',
    help: 'Total errors by type',
    labelNames: ['error_type', 'error_code']
  }),

  cacheHitRate: new Gauge({
    name: 'ai_agent_cache_hit_rate',
    help: 'Cache hit rate percentage',
    labelNames: ['cache_type']
  })
};
```

#### Task 5.10: Error Tracking & Alerts

**Sentry Integration:**

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true })
  ]
});

// Custom error context
export function captureAIAgentError(
  error: Error,
  context: {
    sessionId?: string;
    botId?: string;
    message?: string;
    workflow?: Blueprint;
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag('service', 'ai-agent');
    scope.setContext('ai_agent', context);
    Sentry.captureException(error);
  });
}
```

**Alert Rules:**

| Condition | Severity | Action |
|-----------|----------|--------|
| Error rate > 5% | Warning | Slack notification |
| Error rate > 10% | Critical | Page on-call |
| P95 response time > 5s | Warning | Slack notification |
| P95 response time > 10s | Critical | Page on-call |
| 0 successful deployments in 1h | Warning | Investigate |

---

### Day 6: Documentation

#### Task 5.11: API Documentation

**File:** `botflow-backend/docs/ai-agent-api.md`

```markdown
# AI Agent API Documentation

## Overview
The AI Agent API allows you to build WhatsApp workflows through natural language conversation.

## Authentication
All endpoints require a valid JWT token in the Authorization header.

## Endpoints

### POST /api/bots/:botId/agent/chat
Send a message to the AI agent.

**Request:**
- `message` (string, required): The user's message
- `sessionId` (string, optional): Continue existing session

**Response:**
- `message` (string): Agent's response
- `sessionId` (string): Session ID for continuation
- `state` (string): Current conversation state
- `workflow` (object, optional): Generated workflow
- `actions` (array): Available actions
- `suggestions` (array): Quick reply suggestions

**Example:**
```json
{
  "message": "I want to track orders from Shopify"
}
```

### POST /api/bots/:botId/agent/generate
Generate a workflow directly from description.

### POST /api/bots/:botId/agent/deploy
Deploy the workflow from the current session.

### GET /api/bots/:botId/agent/session
Get current session information.

### DELETE /api/bots/:botId/agent/session/:sessionId
Delete a session.

## Error Codes
| Code | Description |
|------|-------------|
| 400 | Invalid request |
| 401 | Unauthorized |
| 404 | Session not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
```

#### Task 5.12: User Guide

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/guide/page.tsx`

Interactive guide covering:

1. **Getting Started**
   - What the AI Builder does
   - How to access it
   - Basic conversation flow

2. **Creating Workflows**
   - Describing what you want
   - Answering clarifying questions
   - Previewing the workflow
   - Deploying

3. **Using Templates**
   - Finding templates
   - Customizing templates
   - When to use templates vs. building from scratch

4. **Commands**
   - `deploy` - Deploy current workflow
   - `undo` - Undo last change
   - `redo` - Redo undone change
   - `reset` - Start over
   - `help` - Get help
   - `show alternatives` - See other options

5. **Tips & Tricks**
   - Be specific about integrations
   - Mention your business type
   - Use templates for common workflows

6. **Troubleshooting**
   - Common issues
   - Getting help

---

### Day 7: Deployment Preparation

#### Task 5.13: Environment Configuration

**Production Environment Variables:**

```bash
# AI Agent Configuration
AI_AGENT_SESSION_TTL_MS=1800000        # 30 minutes
AI_AGENT_MAX_HISTORY_MESSAGES=50
AI_AGENT_MAX_WORKFLOW_VERSIONS=20
AI_AGENT_PATTERN_REFRESH_INTERVAL_MS=900000  # 15 minutes

# Performance Cache
AI_AGENT_CACHE_INTENT_TTL_MS=300000    # 5 minutes
AI_AGENT_CACHE_TEMPLATE_TTL_MS=600000  # 10 minutes
AI_AGENT_CACHE_PATTERN_TTL_MS=900000   # 15 minutes
AI_AGENT_CACHE_MAX_SIZE=1000

# Rate Limits
AI_AGENT_RATE_LIMIT_CHAT=30
AI_AGENT_RATE_LIMIT_GENERATE=10
AI_AGENT_RATE_LIMIT_DEPLOY=5

# Feature Flags
AI_AGENT_ENABLE_PATTERN_LEARNING=true
AI_AGENT_ENABLE_AUTO_FIX=true
AI_AGENT_ENABLE_STREAMING=false
```

#### Task 5.14: Database Migrations

**Run migrations in order:**

```bash
# Run migrations
npx supabase db push

# Verify tables
npx supabase db diff
```

**Migration checklist:**

- [ ] 003_workflow_templates.sql
- [ ] 004_workflow_analytics.sql
- [ ] Create RLS policies
- [ ] Create indexes
- [ ] Verify materialized view

#### Task 5.15: CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
# .github/workflows/ai-agent-deploy.yml
name: AI Agent Deployment

on:
  push:
    branches: [main]
    paths:
      - 'botflow-backend/src/services/ai-agent/**'
      - 'botflow-backend/src/routes/ai-agent.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: railway/railway-deploy@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
```

#### Task 5.16: Rollback Plan

**Rollback Steps:**

1. **Immediate Rollback** (< 5 minutes)
   - Revert to previous Railway deployment
   - `railway rollback --deployment <previous-id>`

2. **Database Rollback** (if needed)
   - Migrations are additive, no rollback needed
   - If data issues: restore from backup

3. **Feature Flag Disable**
   - Set `AI_AGENT_ENABLED=false` in env
   - Routes return 503 Service Unavailable

**Rollback Triggers:**

- Error rate > 20%
- P95 response time > 30s
- Critical security vulnerability

---

## File Structure

```text
botflow-backend/src/
├── tests/
│   ├── ai-agent/
│   │   ├── pattern-learning.test.ts
│   │   ├── error-recovery.test.ts
│   │   ├── version-manager.test.ts
│   │   ├── suggestion-engine.test.ts
│   │   └── performance-cache.test.ts
│   └── integration/
│       └── ai-agent.integration.test.ts
├── services/ai-agent/
│   ├── input-validator.ts         # NEW
│   ├── audit-logger.ts            # NEW
│   └── metrics-collector.ts       # NEW
├── middleware/
│   └── rate-limiter.ts            # NEW
└── docs/
    └── ai-agent-api.md            # NEW

botflow-website/
├── app/dashboard/bots/[id]/ai-builder/
│   └── guide/
│       └── page.tsx               # NEW
└── cypress/e2e/
    └── ai-builder.cy.ts           # NEW
```

---

## Success Criteria

### Testing

- [ ] Unit test coverage >85% for all services
- [ ] Integration tests pass for all conversation flows
- [ ] E2E tests pass in CI/CD pipeline
- [ ] Load testing: 100 concurrent users sustained

### Performance

- [ ] Chat response P95 <2s
- [ ] Workflow generation P95 <5s
- [ ] Template search P95 <500ms
- [ ] Cache hit rate >60%

### Security

- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] No PII in logs

### Monitoring

- [ ] Metrics dashboard live
- [ ] Error tracking configured
- [ ] Alerts configured
- [ ] On-call runbook documented

### Documentation

- [ ] API documentation complete
- [ ] User guide published
- [ ] Deployment guide updated
- [ ] Runbook for on-call

---

## Dependencies

### NPM Packages (to add)

- `vitest` - Testing framework (installed)
- `@testing-library/react` - React testing (installed)
- `cypress` - E2E testing
- `@sentry/node` - Error tracking
- `prom-client` - Prometheus metrics
- `@fastify/rate-limit` - Rate limiting

### External Services

- Sentry - Error tracking
- Prometheus/Grafana - Metrics (or equivalent)
- Slack - Alerting

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Test flakiness | Use stable selectors, mock external APIs |
| Performance regression | Benchmark before/after, gradual rollout |
| Rate limit too aggressive | Start conservative, adjust based on usage |
| Monitoring blind spots | Add custom metrics for AI-specific operations |

---

## Definition of Done

Week 5 is complete when:

1. **Testing** - All tests pass with >85% coverage
2. **Performance** - Meets all response time targets
3. **Security** - Input validation, rate limiting, audit logging
4. **Monitoring** - Dashboard and alerts operational
5. **Documentation** - API docs and user guide published
6. **Deployment** - CI/CD pipeline verified, rollback tested

---

## Next Steps (Week 6)

After Week 5:

- Week 6: Beta testing with real users
- Collect feedback and iterate
- Bug fixes based on real usage
- Performance tuning based on production data
- Feature requests for Phase 4

---

**Week 5 Objective:** Prepare the AI-powered workflow builder for production with comprehensive testing, security hardening, monitoring, and documentation.
