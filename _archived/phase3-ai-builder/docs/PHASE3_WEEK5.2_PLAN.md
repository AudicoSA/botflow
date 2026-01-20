# Phase 3 Week 5.2: Integration Testing & End-to-End Flows

## Overview

Week 5.2 focuses on integration testing of the AI agent services, end-to-end workflow testing, and performance optimization. Building on Week 5.1's unit tests and security hardening, this phase ensures all components work together seamlessly.

## Goals

1. **Integration Tests** - Test service interactions and API endpoints
2. **E2E Workflow Tests** - Full conversation-to-deployment flows
3. **Performance Optimization** - Response time improvements
4. **Monitoring Setup** - Metrics and alerting

---

## Day 1: API Route Integration Tests

### 1.1 Chat Endpoint Tests

**File:** `src/tests/ai-agent/routes/chat.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, createAuthToken } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

describe('POST /api/bots/:botId/agent/chat', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await createTestServer();
    token = createAuthToken({ userId: 'test-user', orgId: 'test-org' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new session on first message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/chat',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'I want to track orders from Shopify' }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.sessionId).toBeDefined();
    expect(body.state).toBe('gathering');
  });

  it('should continue existing session', async () => {
    // First message
    const first = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/chat',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Create a booking bot' }
    });
    const { sessionId } = JSON.parse(first.payload);

    // Second message
    const second = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/chat',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Use Google Calendar', sessionId }
    });

    expect(second.statusCode).toBe(200);
    const body = JSON.parse(second.payload);
    expect(body.sessionId).toBe(sessionId);
  });

  it('should handle quick commands', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/chat',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'help' }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.message).toContain('help');
  });

  it('should reject invalid messages', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/chat',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: '' }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should rate limit excessive requests', async () => {
    const requests = Array(35).fill(null).map(() =>
      app.inject({
        method: 'POST',
        url: '/api/bots/bot-123/agent/chat',
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'test' }
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.statusCode === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### 1.2 Generate Endpoint Tests

**File:** `src/tests/ai-agent/routes/generate.test.ts`

```typescript
describe('POST /api/bots/:botId/agent/generate', () => {
  it('should generate workflow from description', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/generate',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        description: 'Create a workflow that tracks Shopify orders and sends WhatsApp updates',
        integrations: ['shopify'],
        vertical: 'ecommerce'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.workflow).toBeDefined();
    expect(body.workflow.nodes.length).toBeGreaterThan(0);
    expect(body.confidence).toBeGreaterThan(0.5);
  });

  it('should suggest templates when applicable', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/generate',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        description: 'Order tracking for my online store'
      }
    });

    const body = JSON.parse(response.payload);
    expect(body.suggestedTemplates).toBeDefined();
  });
});
```

### 1.3 Deploy Endpoint Tests

**File:** `src/tests/ai-agent/routes/deploy.test.ts`

```typescript
describe('POST /api/bots/:botId/agent/deploy', () => {
  it('should deploy workflow from session', async () => {
    // Create session with workflow
    const chat = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/chat',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Create order tracking bot' }
    });
    const { sessionId } = JSON.parse(chat.payload);

    // Deploy
    const response = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/deploy',
      headers: { authorization: `Bearer ${token}` },
      payload: { sessionId, activate: true }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.workflowId).toBeDefined();
  });

  it('should validate workflow before deployment', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bots/bot-123/agent/deploy',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        workflow: {
          bot_id: 'bot-123',
          version: '1.0.0',
          name: 'Invalid',
          nodes: [], // Empty workflow
          edges: []
        }
      }
    });

    expect(response.statusCode).toBe(400);
  });
});
```

---

## Day 2: Service Integration Tests

### 2.1 Conversation Engine + Context Manager

**File:** `src/tests/ai-agent/integration/conversation-context.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationEngine } from '../../services/ai-agent/conversation-engine.js';
import { ContextManager } from '../../services/ai-agent/context-manager.js';

describe('ConversationEngine + ContextManager Integration', () => {
  let engine: ConversationEngine;
  let contextManager: ContextManager;

  beforeEach(() => {
    engine = new ConversationEngine();
    contextManager = new ContextManager();
  });

  it('should maintain context across conversation turns', async () => {
    const sessionId = 'test-session';
    const botId = 'bot-123';

    // First turn
    const ctx1 = await contextManager.getOrCreate(sessionId, botId, 'user-1', 'org-1');
    const res1 = await engine.processMessage('I want to track orders', ctx1);

    // Second turn
    const ctx2 = await contextManager.get(sessionId);
    expect(ctx2?.state).toBe('gathering');

    const res2 = await engine.processMessage('From my Shopify store', ctx2!);
    expect(res2.workflow || ctx2?.currentWorkflow).toBeDefined();
  });

  it('should handle session expiration', async () => {
    const sessionId = 'expired-session';
    const botId = 'bot-123';

    // Create and immediately expire
    const ctx = await contextManager.getOrCreate(sessionId, botId, 'user-1', 'org-1');
    ctx.expiresAt = new Date(Date.now() - 1000);
    await contextManager.save(ctx);

    // Should create new session
    const newCtx = await contextManager.getOrCreate(sessionId, botId, 'user-1', 'org-1');
    expect(newCtx.state).toBe('idle');
  });
});
```

### 2.2 Intent Parser + Template Matcher

**File:** `src/tests/ai-agent/integration/intent-template.test.ts`

```typescript
describe('IntentParser + TemplateMatcher Integration', () => {
  it('should match templates from parsed intent', async () => {
    const intentParser = new IntentParser();
    const templateMatcher = new TemplateMatcher();

    const intent = await intentParser.parse('I want to track orders from Shopify');
    const matches = await templateMatcher.matchTemplates(intent);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].template.category).toBe('ecommerce');
  });

  it('should identify missing integrations', async () => {
    const intent = await intentParser.parse('Book appointments with calendar sync');
    const matches = await templateMatcher.matchTemplates(intent);

    const hasCalendarIntegration = matches.some(m =>
      m.template.requiredIntegrations?.includes('google-calendar')
    );
    expect(hasCalendarIntegration).toBe(true);
  });
});
```

### 2.3 Workflow Generator + Error Recovery

**File:** `src/tests/ai-agent/integration/generator-recovery.test.ts`

```typescript
describe('WorkflowGenerator + ErrorRecovery Integration', () => {
  it('should auto-fix generated workflows', async () => {
    const generator = new WorkflowGenerator();
    const errorRecovery = new ErrorRecoveryService();

    // Generate workflow
    const result = await generator.generate({
      action: 'create',
      workflowType: 'order_tracking',
      integrations: ['shopify'],
      entities: [],
      requirements: [],
      confidence: 0.9,
      needsClarification: false,
      rawMessage: 'track orders'
    });

    // Validate and fix
    const validation = await errorRecovery.validateWorkflow(result.blueprint);

    if (!validation.valid) {
      const fixed = await errorRecovery.autoFix(result.blueprint);
      expect(fixed.success).toBe(true);
    }
  });
});
```

---

## Day 3: End-to-End Flow Tests

### 3.1 Complete Conversation Flow

**File:** `src/tests/ai-agent/e2e/conversation-flow.test.ts`

```typescript
describe('E2E: Complete Conversation Flow', () => {
  it('should complete order tracking bot creation', async () => {
    const engine = new ConversationEngine();
    const contextManager = new ContextManager();

    const sessionId = crypto.randomUUID();
    let ctx = await contextManager.getOrCreate(sessionId, 'bot-1', 'user-1', 'org-1');

    // Step 1: Initial request
    let res = await engine.processMessage('I want to track orders from Shopify', ctx);
    expect(res.state).toBe('gathering');

    // Step 2: Answer clarifying question
    ctx = await contextManager.get(sessionId)!;
    res = await engine.processMessage('Customers should use their order number', ctx);

    // Step 3: Confirm
    ctx = await contextManager.get(sessionId)!;
    res = await engine.processMessage('Yes, that looks good', ctx);
    expect(res.state).toBe('confirming');

    // Step 4: Deploy
    ctx = await contextManager.get(sessionId)!;
    res = await engine.processMessage('deploy', ctx);
    expect(res.state).toBe('complete');
    expect(res.workflow).toBeDefined();
  });

  it('should handle undo/redo during refinement', async () => {
    const engine = new ConversationEngine();
    const versionManager = new VersionManager();
    // ... test undo/redo flow
  });
});
```

### 3.2 Template Instantiation Flow

**File:** `src/tests/ai-agent/e2e/template-flow.test.ts`

```typescript
describe('E2E: Template-Based Workflow Creation', () => {
  it('should create workflow from template with customization', async () => {
    const templateLibrary = new TemplateLibrary();
    const templateMatcher = new TemplateMatcher();
    const generator = new WorkflowGenerator();

    // Match template
    const intent = await intentParser.parse('Create a salon booking system');
    const matches = await templateMatcher.matchTemplates(intent);
    expect(matches.length).toBeGreaterThan(0);

    // Get template
    const template = await templateLibrary.getBySlug(matches[0].slug);
    expect(template).toBeDefined();

    // Instantiate with customization
    const workflow = await templateMatcher.instantiateTemplate(
      matches[0].slug,
      {
        businessName: 'Test Salon',
        services: ['Haircut', 'Color', 'Styling']
      }
    );

    expect(workflow.nodes.length).toBeGreaterThan(2);
    expect(workflow.name).toContain('Salon');
  });
});
```

---

## Day 4: Performance Optimization

### 4.1 Response Time Benchmarks

**File:** `src/tests/ai-agent/performance/benchmarks.test.ts`

```typescript
describe('Performance Benchmarks', () => {
  it('should parse intent within 200ms (cached)', async () => {
    const cache = new PerformanceCache();
    const parser = new IntentParser();

    // Warm up cache
    await parser.parse('track orders');

    const start = performance.now();
    await parser.parse('track orders');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
  });

  it('should match templates within 100ms', async () => {
    const matcher = new TemplateMatcher();
    const intent = mockIntent;

    const start = performance.now();
    await matcher.matchTemplates(intent);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should generate workflow within 3s', async () => {
    const generator = new WorkflowGenerator();

    const start = performance.now();
    await generator.generate(mockIntent);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(3000);
  });
});
```

### 4.2 Cache Optimization

**File:** `src/services/ai-agent/cache-warmer.ts`

```typescript
/**
 * Cache Warmer Service
 * Pre-populates caches with common patterns for faster responses
 */
export class CacheWarmer {
  private cache: PerformanceCache;
  private templateLibrary: TemplateLibrary;

  async warmUp(): Promise<void> {
    // Pre-load popular templates
    const templates = await this.templateLibrary.getPopular(20);
    for (const template of templates) {
      this.cache.cacheTemplateMatches(template.category, [template]);
    }

    // Pre-compute common intent signatures
    const commonIntents = [
      'track orders',
      'book appointments',
      'answer questions',
      'process payments'
    ];

    for (const message of commonIntents) {
      const intent = await intentParser.parse(message);
      this.cache.cacheIntent(message, intent);
    }
  }
}
```

---

## Day 5: Monitoring & Metrics

### 5.1 Metrics Collection

**File:** `src/services/ai-agent/metrics-collector.ts`

```typescript
/**
 * AI Agent Metrics Collector
 * Tracks performance, usage, and error metrics
 */
export class AgentMetricsCollector {
  private metrics: {
    intentParseTime: number[];
    generationTime: number[];
    deploymentTime: number[];
    errorCount: number;
    successCount: number;
    cacheHitRate: number;
  };

  recordIntentParse(durationMs: number): void {
    this.metrics.intentParseTime.push(durationMs);
    this.trimOldMetrics();
  }

  recordGeneration(durationMs: number, success: boolean): void {
    this.metrics.generationTime.push(durationMs);
    if (success) this.metrics.successCount++;
    else this.metrics.errorCount++;
  }

  getStats(): AgentMetrics {
    return {
      avgIntentParseTime: this.average(this.metrics.intentParseTime),
      p95IntentParseTime: this.percentile(this.metrics.intentParseTime, 95),
      avgGenerationTime: this.average(this.metrics.generationTime),
      successRate: this.metrics.successCount /
        (this.metrics.successCount + this.metrics.errorCount),
      totalRequests: this.metrics.successCount + this.metrics.errorCount
    };
  }
}
```

### 5.2 Health Check Endpoint

**File:** `src/routes/ai-agent-health.ts`

```typescript
export async function aiAgentHealthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/agent/health', async (request, reply) => {
    const cache = getPerformanceCache();
    const metrics = getAgentMetrics();

    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      cache: await cache.getStats(),
      metrics: metrics.getStats(),
      lastError: metrics.getLastError()
    };

    // Check for issues
    if (health.metrics.successRate < 0.9) {
      health.status = 'degraded';
    }
    if (health.metrics.avgGenerationTime > 5000) {
      health.status = 'slow';
    }

    return health;
  });
}
```

---

## Deliverables Checklist

### Tests
- [x] `src/tests/ai-agent/routes/chat.test.ts` ✅
- [x] `src/tests/ai-agent/routes/generate.test.ts` ✅
- [x] `src/tests/ai-agent/routes/deploy.test.ts` ✅
- [x] `src/tests/ai-agent/integration/conversation-context.test.ts` ✅
- [x] `src/tests/ai-agent/integration/intent-template.test.ts` ✅
- [x] `src/tests/ai-agent/integration/generator-recovery.test.ts` ✅
- [x] `src/tests/ai-agent/e2e/conversation-flow.test.ts` ✅
- [x] `src/tests/ai-agent/e2e/template-flow.test.ts` ✅
- [x] `src/tests/ai-agent/performance/benchmarks.test.ts` ✅

### Services
- [x] `src/services/ai-agent/cache-warmer.ts` ✅
- [x] `src/services/ai-agent/metrics-collector.ts` ✅

### Routes
- [x] `src/routes/ai-agent-health.ts` ✅

### Documentation
- [ ] Update API documentation with health endpoint
- [ ] Performance tuning guide

---

## Success Criteria

1. **Test Coverage**: >80% coverage on AI agent services
2. **E2E Pass Rate**: All E2E flows complete successfully
3. **Response Times**:
   - Intent parsing: <200ms (cached)
   - Template matching: <100ms
   - Workflow generation: <3s
4. **Error Rate**: <5% in production
5. **Cache Hit Rate**: >70%

---

## Notes

- Run integration tests with: `npm run test:integration`
- Run E2E tests with: `npm run test:e2e`
- Run performance benchmarks with: `npm run test:perf`
- Monitor metrics at: `/api/agent/health`
