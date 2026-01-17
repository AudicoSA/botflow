# Phase 2 Week 6: Production Deployment & Performance Optimization

**Status:** Ready to Start 🚀
**Goal:** Deploy to production, optimize performance, and ensure scalability
**Duration:** 5-7 days
**Prerequisites:** ✅ Week 1-5 Complete

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture Review](#architecture-review)
3. [Database Optimization](#database-optimization)
4. [Caching Strategy](#caching-strategy)
5. [Performance Monitoring](#performance-monitoring)
6. [Load Testing](#load-testing)
7. [Production Deployment](#production-deployment)
8. [Security Hardening](#security-hardening)
9. [Disaster Recovery](#disaster-recovery)
10. [Day-by-Day Plan](#day-by-day-plan)

---

## Overview

### What We're Building

Week 6 focuses on production readiness, performance optimization, and scalability. We're taking BotFlow from development to a production-grade SaaS platform.

**From This (Development):**
```
Development Environment
├─ Local PostgreSQL
├─ Local Redis
├─ Debug logging
├─ No caching
└─ Single instance
```

**To This (Production):**
```
Production Environment
├─ Supabase PostgreSQL (HA)
├─ Redis Cloud (cluster)
├─ Structured logging (Sentry)
├─ Multi-layer caching
├─ Auto-scaling (Railway/Vercel)
├─ CDN (Cloudflare)
├─ Monitoring (Datadog/New Relic)
└─ Disaster recovery backups
```

### The Magic ✨

Users get:
1. **Lightning-fast performance** - Sub-100ms response times
2. **99.9% uptime** - High availability with auto-scaling
3. **Global reach** - CDN for worldwide users
4. **Real-time monitoring** - Instant alerts on issues
5. **Automatic backups** - Daily database snapshots
6. **Security** - Rate limiting, DDoS protection, encryption

---

## Architecture Review

### Current Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Architecture                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Cloudflare  │ ← CDN, DDoS protection, SSL
│      CDN      │
└───────┬───────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                  Vercel (Frontend)                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Next.js 15 (App Router)                               │  │
│  │  - Static pages cached at edge                         │  │
│  │  - API routes for client-side calls                    │  │
│  │  - Automatic image optimization                        │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│               Railway (Backend API)                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Fastify Server                                        │  │
│  │  - Auto-scaling (2-10 instances)                       │  │
│  │  - Load balancing                                      │  │
│  │  - WebSocket support                                   │  │
│  │  - BullMQ workers                                      │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────┬──────────────────┬───────────┘
             │                  │                  │
             ▼                  ▼                  ▼
    ┌────────────────┐  ┌──────────────┐  ┌─────────────┐
    │   Supabase     │  │ Redis Cloud  │  │  Sentry     │
    │  PostgreSQL    │  │   Cluster    │  │  Logging    │
    │  (HA Mode)     │  │              │  │             │
    └────────────────┘  └──────────────┘  └─────────────┘
```

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API Response Time (p50) | <100ms | ~200ms | 🔴 Needs optimization |
| API Response Time (p95) | <500ms | ~800ms | 🔴 Needs optimization |
| WebSocket Latency | <50ms | ~100ms | 🟡 Acceptable |
| Database Query Time | <50ms | ~150ms | 🔴 Needs optimization |
| Cache Hit Rate | >80% | 0% | 🔴 No caching yet |
| Uptime | 99.9% | - | 🟡 To be measured |
| Concurrent Users | 10,000+ | - | 🟡 To be tested |

---

## Database Optimization

### Day 1: Database Indexing & Query Optimization

#### 1. Add Missing Indexes

**File:** `botflow-backend/migrations/004_performance_indexes.sql`

```sql
-- Migration 004: Performance Optimization Indexes
-- Week 6 Day 1: Add indexes for frequently queried columns

-- Conversations table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_org_created
  ON conversations(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_status_org
  ON conversations(status, organization_id)
  WHERE status IN ('active', 'pending');

-- Messages table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_org_direction
  ON messages(organization_id, direction, created_at DESC);

-- Knowledge base
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_bot_status
  ON knowledge_base_articles(bot_id, status);

-- Composite index for analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conv_metrics_org_date
  ON conversation_metrics(organization_id, started_at DESC);

-- Partial index for active conversations only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_active
  ON conversations(organization_id, created_at DESC)
  WHERE status = 'active';
```

#### 2. Optimize Existing Queries

**Common Slow Query:**
```sql
-- BEFORE (slow - 200ms)
SELECT * FROM conversations
WHERE organization_id = $1
ORDER BY created_at DESC
LIMIT 20;

-- AFTER (fast - 15ms)
SELECT id, customer_phone, status, created_at
FROM conversations
WHERE organization_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

**Use Query Planner:**
```sql
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE organization_id = 'xxx'
ORDER BY created_at DESC
LIMIT 20;
```

#### 3. Add Database Connection Pooling

**File:** `botflow-backend/src/config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public'
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    // Connection pooling configuration
    global: {
      headers: {
        'x-connection-pool': 'true'
      }
    }
  }
);

// Separate client for real-time subscriptions
export const supabaseRealtime = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);
```

---

## Caching Strategy

### Day 2: Implement Multi-Layer Caching

#### 1. Redis Caching Layers

```typescript
/**
 * Cache Layer 1: Hot Data (1-5 minutes)
 * - Active conversations
 * - Real-time metrics
 * - User sessions
 */
const HOT_CACHE_TTL = 300; // 5 minutes

/**
 * Cache Layer 2: Warm Data (15-60 minutes)
 * - Bot configurations
 * - Knowledge base articles
 * - Template definitions
 */
const WARM_CACHE_TTL = 3600; // 1 hour

/**
 * Cache Layer 3: Cold Data (1-24 hours)
 * - Analytics aggregates
 * - Historical metrics
 * - Organization settings
 */
const COLD_CACHE_TTL = 86400; // 24 hours
```

#### 2. Caching Service

**File:** `botflow-backend/src/services/cache.service.ts`

```typescript
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

export class CacheService {
  /**
   * Get from cache with fallback to database
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    try {
      // Try cache first
      const cached = await redis.get(key);
      if (cached) {
        logger.debug({ key }, 'Cache hit');
        return JSON.parse(cached);
      }

      // Cache miss - fetch from database
      logger.debug({ key }, 'Cache miss');
      const data = await fetchFn();

      // Store in cache
      await redis.setex(key, ttl, JSON.stringify(data));

      return data;
    } catch (error) {
      logger.error({ error, key }, 'Cache error - falling back to database');
      return fetchFn();
    }
  }

  /**
   * Invalidate cache for a key or pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      if (pattern.includes('*')) {
        // Pattern-based invalidation
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          logger.info({ pattern, count: keys.length }, 'Invalidated cache keys');
        }
      } else {
        // Single key invalidation
        await redis.del(pattern);
        logger.debug({ key: pattern }, 'Invalidated cache key');
      }
    } catch (error) {
      logger.error({ error, pattern }, 'Cache invalidation error');
    }
  }

  /**
   * Cache bot configuration
   */
  async getBotConfig(botId: string) {
    return this.getOrSet(
      `bot:config:${botId}`,
      async () => {
        const { data } = await supabase
          .from('bots')
          .select('*')
          .eq('id', botId)
          .single();
        return data;
      },
      3600 // 1 hour
    );
  }

  /**
   * Invalidate bot cache when updated
   */
  async invalidateBotCache(botId: string) {
    await this.invalidate(`bot:*:${botId}`);
  }
}

export const cacheService = new CacheService();
```

#### 3. Query Result Caching

```typescript
// Before: Every request hits database
app.get('/api/bots/:id', async (req, res) => {
  const bot = await supabase
    .from('bots')
    .select('*')
    .eq('id', req.params.id)
    .single();

  return res.send(bot.data);
});

// After: Cached for 1 hour
app.get('/api/bots/:id', async (req, res) => {
  const bot = await cacheService.getBotConfig(req.params.id);
  return res.send(bot);
});
```

---

## Performance Monitoring

### Day 3: Set Up Monitoring & Observability

#### 1. Sentry Integration

**Install:**
```bash
npm install @sentry/node @sentry/profiling-node
```

**Configure:**
```typescript
// botflow-backend/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { env } from './env.js';

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0.1,
  integrations: [
    new ProfilingIntegration(),
  ],
});

export { Sentry };
```

#### 2. Custom Performance Tracking

```typescript
// Track slow queries
export async function trackQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - start;

    if (duration > 100) {
      logger.warn({ query: name, duration }, 'Slow query detected');
      Sentry.captureMessage(`Slow query: ${name} (${duration}ms)`, 'warning');
    }

    return result;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { query: name }
    });
    throw error;
  }
}

// Usage
const conversations = await trackQuery(
  'fetch_conversations',
  () => supabase.from('conversations').select('*')
);
```

#### 3. Health Check Endpoint

```typescript
// botflow-backend/src/routes/health.ts
fastify.get('/health', async (req, reply) => {
  const checks = {
    database: false,
    redis: false,
    memory: false
  };

  try {
    // Check database
    await supabase.from('organizations').select('id').limit(1);
    checks.database = true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
  }

  try {
    // Check Redis
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  checks.memory = memUsage.heapUsed < memUsage.heapTotal * 0.9;

  const allHealthy = Object.values(checks).every(v => v);

  return reply.status(allHealthy ? 200 : 503).send({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    uptime: process.uptime(),
    memory: memUsage
  });
});
```

---

## Load Testing

### Day 4: Load Testing & Stress Testing

#### 1. Install k6

```bash
# Windows
choco install k6

# Mac
brew install k6

# Linux
sudo apt-get install k6
```

#### 2. Load Test Script

**File:** `botflow-backend/load-tests/api-load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be below 1%
  },
};

const BASE_URL = 'https://api.botflow.co.za';

export default function () {
  // Test 1: Get conversations
  let res = http.get(`${BASE_URL}/api/conversations`, {
    headers: {
      'Authorization': 'Bearer YOUR_TEST_TOKEN'
    }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 2: Get analytics
  res = http.get(`${BASE_URL}/api/analytics/realtime`, {
    headers: {
      'Authorization': 'Bearer YOUR_TEST_TOKEN'
    }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

#### 3. Run Load Tests

```bash
# Run load test
k6 run botflow-backend/load-tests/api-load-test.js

# Run stress test (find breaking point)
k6 run --vus 500 --duration 30s botflow-backend/load-tests/api-load-test.js

# Run with cloud results
k6 cloud botflow-backend/load-tests/api-load-test.js
```

---

## Production Deployment

### Day 5: Deploy to Production

#### 1. Railway Deployment (Backend)

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Environment Variables:**
```
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://your-redis-cloud-url
SENTRY_DSN=https://your-sentry-dsn
```

#### 2. Vercel Deployment (Frontend)

**vercel.json:**
```json
{
  "buildCommand": "cd botflow-website && npm run build",
  "outputDirectory": "botflow-website/.next",
  "framework": "nextjs",
  "regions": ["jnb1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.botflow.co.za"
  }
}
```

#### 3. Database Migrations

```bash
# Run migrations on production database
psql $DATABASE_URL -f botflow-backend/migrations/001_pgvector_knowledge_base.sql
psql $DATABASE_URL -f botflow-backend/migrations/002_workflow_engine.sql
psql $DATABASE_URL -f botflow-backend/migrations/003_analytics_dashboard.sql
psql $DATABASE_URL -f botflow-backend/migrations/004_performance_indexes.sql
```

---

## Security Hardening

### Day 6: Security Best Practices

#### 1. Rate Limiting

```typescript
// Enhanced rate limiting
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  redis: redis,
  skipOnError: false,
  keyGenerator: (request) => {
    return request.headers['x-real-ip'] || request.ip;
  },
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.after / 1000)} seconds.`
    };
  }
});
```

#### 2. Helmet Security Headers

```bash
npm install @fastify/helmet
```

```typescript
import helmet from '@fastify/helmet';

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    }
  }
});
```

#### 3. Input Validation & Sanitization

```typescript
import { z } from 'zod';

const createBotSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['booking', 'faq', 'order_tracking']),
  configuration: z.object({
    systemPrompt: z.string().max(5000),
    temperature: z.number().min(0).max(2)
  })
});

// Validate and sanitize input
fastify.post('/api/bots', async (req, reply) => {
  try {
    const validatedData = createBotSchema.parse(req.body);
    // Use validatedData safely
  } catch (error) {
    return reply.status(400).send({ error: 'Invalid input' });
  }
});
```

---

## Disaster Recovery

### Day 7: Backups & Disaster Recovery

#### 1. Automated Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp ${BACKUP_FILE}.gz s3://botflow-backups/database/

# Keep only last 30 days
find /backups -name "backup_*.sql.gz" -mtime +30 -delete
```

#### 2. Redis Persistence

```
# redis.conf
save 900 1      # Save if 1 key changed in 15 minutes
save 300 10     # Save if 10 keys changed in 5 minutes
save 60 10000   # Save if 10000 keys changed in 1 minute

appendonly yes
appendfsync everysec
```

#### 3. Disaster Recovery Plan

```markdown
## Disaster Recovery Procedures

### Database Failure
1. Switch to read replica (automatic with Supabase HA)
2. Restore from latest backup if needed
3. Estimated RTO: 15 minutes
4. Estimated RPO: 1 hour

### Redis Failure
1. Application continues with degraded performance
2. Cache rebuilds automatically
3. No data loss (cache only)
4. Estimated RTO: 5 minutes

### Complete System Failure
1. Deploy from GitHub to new infrastructure
2. Restore database from S3 backup
3. Re-configure environment variables
4. Estimated RTO: 1 hour
5. Estimated RPO: 1 hour
```

---

## Day-by-Day Plan

### Day 1: Database Optimization ✅
- [ ] Add performance indexes
- [ ] Optimize slow queries
- [ ] Configure connection pooling
- [ ] Run EXPLAIN ANALYZE on critical queries
- [ ] Document query performance improvements

### Day 2: Caching Implementation ✅
- [ ] Create caching service
- [ ] Implement multi-layer caching
- [ ] Add cache invalidation logic
- [ ] Cache bot configurations
- [ ] Cache analytics data
- [ ] Measure cache hit rate

### Day 3: Monitoring & Observability ✅
- [ ] Set up Sentry
- [ ] Add performance tracking
- [ ] Create health check endpoint
- [ ] Set up alerting
- [ ] Create monitoring dashboard

### Day 4: Load Testing ✅
- [ ] Install k6
- [ ] Write load test scripts
- [ ] Run baseline tests
- [ ] Identify bottlenecks
- [ ] Optimize based on results
- [ ] Re-test after optimization

### Day 5: Production Deployment ✅
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Run database migrations
- [ ] Configure environment variables
- [ ] Set up CDN (Cloudflare)
- [ ] Test production endpoints

### Day 6: Security Hardening ✅
- [ ] Implement rate limiting
- [ ] Add Helmet security headers
- [ ] Enhance input validation
- [ ] Add CSRF protection
- [ ] Security audit
- [ ] Penetration testing

### Day 7: Disaster Recovery ✅
- [ ] Set up automated backups
- [ ] Configure Redis persistence
- [ ] Document recovery procedures
- [ ] Test backup restoration
- [ ] Create runbook
- [ ] Final testing and sign-off

---

## Success Criteria

### Performance
- [ ] API p50 response time < 100ms
- [ ] API p95 response time < 500ms
- [ ] Cache hit rate > 80%
- [ ] Database queries < 50ms
- [ ] WebSocket latency < 50ms

### Reliability
- [ ] 99.9% uptime target
- [ ] Automatic failover working
- [ ] Backups running daily
- [ ] Monitoring alerts configured
- [ ] Load tested up to 10,000 concurrent users

### Security
- [ ] Rate limiting active
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] No critical vulnerabilities
- [ ] Security audit passed

### Deployment
- [ ] CI/CD pipeline working
- [ ] Zero-downtime deployments
- [ ] Automatic rollbacks on failure
- [ ] Environment variables secured
- [ ] Monitoring integrated

---

## Quick Start (For New Chat)

```
I'm ready to start Phase 2 Week 6: Production Deployment & Optimization.

Context:
- Week 1 (RAG) ✅ COMPLETE
- Week 2 (Workflow Engine) ✅ COMPLETE
- Week 3 (Bot Builder) ✅ COMPLETE
- Week 4 (Visual Builder) ✅ COMPLETE
- Week 5 (Analytics Dashboard) ✅ COMPLETE

Goal: Deploy to production with optimal performance and security.

Read PHASE2_WEEK6_GUIDE.md and let's start with Day 1: Database optimization!
```

---

**Created:** 2026-01-17
**Status:** Ready to implement
**Prerequisites:** ✅ Week 1-5 complete
**Estimated Completion:** 5-7 days

---

> "From development to production - Week 6 makes BotFlow bulletproof!" 🚀🔒
