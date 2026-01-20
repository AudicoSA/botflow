# Phase 3 Week 5.4: Production Hardening & AI Builder Polish

## Overview

Week 5.4 focuses on production-readiness: final UI polish for the AI Builder, comprehensive error recovery, performance optimizations, and deployment preparation. This week completes Phase 3 Week 5 with a fully functional, production-ready AI workflow builder.

## Goals

1. **UI/UX Polish** - Final visual refinements and accessibility improvements
2. **Performance Optimization** - Lazy loading, caching, and render optimizations
3. **Production Hardening** - Security, rate limiting, and error recovery
4. **Documentation & Deployment** - API docs, deployment guides, and monitoring setup

---

## Day 1: AI Builder UI Polish

### 1.1 Integrate New Components into AI Builder Page

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/page.tsx`

**Tasks:**
- Import and wrap with `AIBuilderErrorBoundary`
- Add `ConnectionStatus` component to header
- Pass `error` and `onRetry` props to `ChatPanel`
- Add proper loading states during initialization

```tsx
import { AIBuilderErrorBoundary } from './ErrorBoundary';
import { ConnectionStatus } from './ConnectionStatus';

export default function AIBuilderPage({ params }: { params: { id: string } }) {
  const { messages, workflow, state, isLoading, error, sendMessage, reset } = useAIAgent({
    botId: params.id,
    onWorkflowGenerated: (wf) => console.log('Workflow generated', wf),
    onDeployed: () => console.log('Deployed!'),
  });

  return (
    <AIBuilderErrorBoundary onReset={reset}>
      <div className="flex h-screen">
        {/* Header with connection status */}
        <header className="absolute top-0 right-0 p-4">
          <ConnectionStatus />
        </header>

        {/* Chat Panel */}
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSendMessage={sendMessage}
          onRetry={() => sendMessage(messages[messages.length - 1]?.content || '')}
          // ... other props
        />

        {/* Workflow Preview */}
        {workflow && <WorkflowPreview workflow={workflow} />}
      </div>
    </AIBuilderErrorBoundary>
  );
}
```

### 1.2 Workflow State Indicator

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/StateIndicator.tsx`

Create a visual indicator showing the current conversation state:

```tsx
'use client';

import { ConversationState } from '@/app/hooks/useAIAgent';
import { Circle, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const stateConfig: Record<ConversationState, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { label: 'Ready', color: 'text-gray-500', icon: <Circle className="w-3 h-3" /> },
  gathering: { label: 'Gathering Info', color: 'text-blue-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  confirming: { label: 'Confirming', color: 'text-amber-500', icon: <AlertCircle className="w-3 h-3" /> },
  refining: { label: 'Refining', color: 'text-purple-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  deploying: { label: 'Deploying', color: 'text-indigo-500', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  complete: { label: 'Complete', color: 'text-green-500', icon: <CheckCircle className="w-3 h-3" /> },
};

interface StateIndicatorProps {
  state: ConversationState;
}

export function StateIndicator({ state }: StateIndicatorProps) {
  const config = stateConfig[state];

  return (
    <div className={`flex items-center gap-1.5 text-sm ${config.color}`}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}
```

### 1.3 Keyboard Shortcuts

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/useKeyboardShortcuts.ts`

```tsx
import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onUndo?: () => void;
  onReset?: () => void;
  onDeploy?: () => void;
  onHelp?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const { onUndo, onReset, onDeploy, onHelp, enabled = true } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Ctrl/Cmd + Z = Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      onUndo?.();
    }

    // Ctrl/Cmd + Shift + R = Reset
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      onReset?.();
    }

    // Ctrl/Cmd + Enter = Deploy
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onDeploy?.();
    }

    // F1 or ? = Help
    if (e.key === 'F1' || (e.shiftKey && e.key === '?')) {
      e.preventDefault();
      onHelp?.();
    }
  }, [enabled, onUndo, onReset, onDeploy, onHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

### 1.4 Accessibility Improvements

**Tasks:**
- Add proper ARIA labels to all interactive elements
- Ensure focus management for modal dialogs
- Add screen reader announcements for state changes
- Ensure proper color contrast ratios

```tsx
// Example: Add live region for state announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {`Current state: ${stateConfig[state].label}`}
</div>
```

---

## Day 2: Performance Optimizations

### 2.1 Lazy Load Workflow Preview

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/page.tsx`

```tsx
import dynamic from 'next/dynamic';

// Lazy load the heavy React Flow component
const WorkflowPreview = dynamic(
  () => import('./WorkflowPreview').then(mod => mod.WorkflowPreview),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    ),
    ssr: false // React Flow doesn't support SSR
  }
);
```

### 2.2 Message List Virtualization

For large conversation histories, implement virtual scrolling:

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/VirtualizedMessageList.tsx`

```tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { Message } from '@/app/hooks/useAIAgent';
import { MessageBubble } from './MessageBubble';

interface VirtualizedMessageListProps {
  messages: Message[];
  onExecuteAction: (action: any) => Promise<void>;
}

export function VirtualizedMessageList({ messages, onExecuteAction }: VirtualizedMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  // Simple virtualization - only render visible messages + buffer
  const visibleMessages = messages.slice(
    Math.max(0, visibleRange.start - 5),
    Math.min(messages.length, visibleRange.end + 5)
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = 100; // Approximate message height
      const visibleCount = Math.ceil(container.clientHeight / itemHeight);

      const start = Math.floor(scrollTop / itemHeight);
      const end = start + visibleCount;

      setVisibleRange({ start, end });
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
      <div style={{ paddingTop: visibleRange.start * 100 }}>
        {visibleMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onExecuteAction={onExecuteAction}
          />
        ))}
      </div>
    </div>
  );
}
```

### 2.3 Debounce and Throttle Utilities

**File:** `botflow-website/app/utils/timing.ts`

```typescript
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
```

### 2.4 Optimize Re-renders

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/MessageBubble.tsx`

```tsx
import { memo } from 'react';

// Memoize to prevent unnecessary re-renders
export const MessageBubble = memo(function MessageBubble({
  message,
  onExecuteAction
}: MessageBubbleProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if message content changed
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content;
});
```

---

## Day 3: Backend Security Hardening

### 3.1 Input Validation Middleware

**File:** `botflow-backend/src/middleware/ai-agent-validation.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(5000, 'Message too long')
    .refine(val => !containsMaliciousPatterns(val), 'Invalid message content'),
  sessionId: z.string().uuid().optional()
});

function containsMaliciousPatterns(text: string): boolean {
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /data:text\/html/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(text));
}

export async function validateChatMessage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = chatMessageSchema.parse(request.body);
    request.body = body;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.errors[0].message,
        details: error.errors
      });
    }
    throw error;
  }
}
```

### 3.2 Rate Limiting Per User

**File:** `botflow-backend/src/middleware/ai-agent-rate-limit.ts`

```typescript
import { FastifyInstance } from 'fastify';

export async function registerAIAgentRateLimit(fastify: FastifyInstance) {
  // Per-user rate limiting for AI agent endpoints
  await fastify.register(import('@fastify/rate-limit'), {
    max: 30, // 30 requests
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Use user ID from JWT for rate limiting
      const user = (request as any).user;
      return user?.id || request.ip;
    },
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'You are sending messages too quickly. Please wait a moment.',
      retryAfter: context.after
    }),
    // Only apply to AI agent routes
    skipOnError: true,
    onExceeding: (request) => {
      fastify.log.warn({ userId: (request as any).user?.id }, 'Rate limit approaching');
    },
    onExceeded: (request) => {
      fastify.log.warn({ userId: (request as any).user?.id }, 'Rate limit exceeded');
    }
  });
}
```

### 3.3 Session Security

**File:** `botflow-backend/src/services/ai-agent/session-security.ts`

```typescript
import crypto from 'crypto';

interface SessionSecurityConfig {
  maxAge: number; // Max session age in ms
  maxMessages: number; // Max messages per session
  maxWorkflowVersions: number; // Max workflow versions to keep
}

const DEFAULT_CONFIG: SessionSecurityConfig = {
  maxAge: 30 * 60 * 1000, // 30 minutes
  maxMessages: 100,
  maxWorkflowVersions: 10
};

export class SessionSecurity {
  private config: SessionSecurityConfig;

  constructor(config: Partial<SessionSecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generateSecureSessionId(): string {
    return crypto.randomUUID();
  }

  validateSessionId(sessionId: string): boolean {
    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  isSessionExpired(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() > this.config.maxAge;
  }

  isMessageLimitReached(messageCount: number): boolean {
    return messageCount >= this.config.maxMessages;
  }

  sanitizeUserInput(input: string): string {
    // Remove potential XSS vectors while preserving legitimate content
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '')
      .trim();
  }
}

export const sessionSecurity = new SessionSecurity();
```

### 3.4 Audit Logging

**File:** `botflow-backend/src/services/ai-agent/audit-logger.ts`

```typescript
import { logger } from '../../config/logger.js';

interface AuditEvent {
  type: 'session_created' | 'workflow_generated' | 'workflow_deployed' | 'session_deleted' | 'error';
  userId: string;
  organizationId: string;
  botId: string;
  sessionId?: string;
  workflowId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 10000;

  log(event: Omit<AuditEvent, 'timestamp'>) {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(auditEvent);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to structured logger
    logger.info({ audit: auditEvent }, `AI Agent audit: ${event.type}`);
  }

  getRecentEvents(userId?: string, limit = 100): AuditEvent[] {
    let filtered = this.events;

    if (userId) {
      filtered = filtered.filter(e => e.userId === userId);
    }

    return filtered.slice(-limit);
  }

  getStats() {
    const byType = this.events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.events.length,
      byType,
      oldestEvent: this.events[0]?.timestamp,
      newestEvent: this.events[this.events.length - 1]?.timestamp
    };
  }
}

export const auditLogger = new AuditLogger();
```

---

## Day 4: Error Recovery & Resilience

### 4.1 Circuit Breaker for OpenAI Calls

**File:** `botflow-backend/src/services/ai-agent/circuit-breaker.ts`

```typescript
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 3,
      timeout: config.timeout || 30000, // 30 seconds
    };
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        this.state = 'half-open';
      } else if (fallback) {
        return fallback();
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback && this.state === 'open') {
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

export const openAICircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 60000
});
```

### 4.2 Graceful Degradation

**File:** `botflow-backend/src/services/ai-agent/fallback-responses.ts`

```typescript
import { ParsedIntent } from '../../types/ai-agent.js';

export const fallbackResponses = {
  serviceUnavailable: {
    message: "I'm having trouble connecting to our AI service right now. Please try again in a moment, or describe your workflow needs and I'll process them as soon as I can.",
    suggestions: ['Try again', 'Describe workflow manually', 'View templates']
  },

  rateLimited: {
    message: "You're sending messages quite quickly! Please wait a moment before sending another message. This helps ensure quality responses for everyone.",
    suggestions: ['Wait and retry']
  },

  invalidInput: {
    message: "I didn't quite understand that. Could you please rephrase your request? For example, you could say 'Create an order tracking workflow for Shopify'.",
    suggestions: ['Track orders', 'Book appointments', 'Answer FAQs', 'Help']
  },

  sessionExpired: {
    message: "Your session has expired. Let's start fresh! What would you like to build?",
    suggestions: ['Track orders', 'Book appointments', 'Answer FAQs']
  }
};

export function generateFallbackIntent(): ParsedIntent {
  return {
    action: 'clarify',
    workflowType: 'unknown',
    entities: [],
    integrations: [],
    requirements: [],
    confidence: 0,
    needsClarification: true,
    clarificationQuestions: [
      'What type of workflow would you like to create?',
      'What should the bot do when a customer sends a message?'
    ],
    rawMessage: ''
  };
}
```

### 4.3 Retry Queue for Failed Operations

**File:** `botflow-backend/src/services/ai-agent/retry-queue.ts`

```typescript
interface RetryableOperation {
  id: string;
  type: 'intent_parse' | 'workflow_generate' | 'deploy';
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  nextRetryAt: Date;
}

class RetryQueue {
  private queue: Map<string, RetryableOperation> = new Map();
  private maxQueueSize = 1000;

  add(operation: Omit<RetryableOperation, 'id' | 'attempts' | 'createdAt' | 'nextRetryAt'>): string {
    if (this.queue.size >= this.maxQueueSize) {
      // Remove oldest items
      const oldest = [...this.queue.entries()]
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
        .slice(0, 100);
      oldest.forEach(([id]) => this.queue.delete(id));
    }

    const id = crypto.randomUUID();
    const now = new Date();

    this.queue.set(id, {
      ...operation,
      id,
      attempts: 0,
      createdAt: now,
      nextRetryAt: new Date(now.getTime() + 1000) // Retry after 1 second
    });

    return id;
  }

  async processNext<T>(executor: (payload: unknown) => Promise<T>): Promise<T | null> {
    const now = new Date();
    const ready = [...this.queue.values()]
      .filter(op => op.nextRetryAt <= now && op.attempts < op.maxAttempts)
      .sort((a, b) => a.nextRetryAt.getTime() - b.nextRetryAt.getTime())[0];

    if (!ready) return null;

    ready.attempts++;

    try {
      const result = await executor(ready.payload);
      this.queue.delete(ready.id);
      return result;
    } catch (error) {
      ready.lastError = error instanceof Error ? error.message : 'Unknown error';
      ready.nextRetryAt = new Date(now.getTime() + Math.pow(2, ready.attempts) * 1000);

      if (ready.attempts >= ready.maxAttempts) {
        this.queue.delete(ready.id);
      }

      throw error;
    }
  }

  getStatus() {
    return {
      queueSize: this.queue.size,
      pending: [...this.queue.values()].filter(op => op.attempts < op.maxAttempts).length,
      failed: [...this.queue.values()].filter(op => op.attempts >= op.maxAttempts).length
    };
  }
}

export const retryQueue = new RetryQueue();
```

---

## Day 5: Monitoring & Observability

### 5.1 Prometheus Metrics Enhancement

**File:** `botflow-backend/src/services/ai-agent/prometheus-metrics.ts`

```typescript
interface MetricData {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  labels?: string[];
  value?: number;
  buckets?: number[];
  observations?: number[];
}

class PrometheusMetrics {
  private metrics: Map<string, MetricData> = new Map();

  counter(name: string, help: string, labels?: string[]) {
    this.metrics.set(name, { name, type: 'counter', help, labels, value: 0 });
  }

  gauge(name: string, help: string, labels?: string[]) {
    this.metrics.set(name, { name, type: 'gauge', help, labels, value: 0 });
  }

  histogram(name: string, help: string, buckets: number[], labels?: string[]) {
    this.metrics.set(name, { name, type: 'histogram', help, labels, buckets, observations: [] });
  }

  inc(name: string, value = 1) {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'counter') {
      metric.value = (metric.value || 0) + value;
    }
  }

  set(name: string, value: number) {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'gauge') {
      metric.value = value;
    }
  }

  observe(name: string, value: number) {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'histogram') {
      metric.observations?.push(value);
    }
  }

  export(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === 'histogram' && metric.observations) {
        const sorted = [...metric.observations].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const count = sorted.length;

        for (const bucket of metric.buckets || []) {
          const le = sorted.filter(v => v <= bucket).length;
          lines.push(`${metric.name}_bucket{le="${bucket}"} ${le}`);
        }
        lines.push(`${metric.name}_bucket{le="+Inf"} ${count}`);
        lines.push(`${metric.name}_sum ${sum}`);
        lines.push(`${metric.name}_count ${count}`);
      } else {
        lines.push(`${metric.name} ${metric.value || 0}`);
      }
    }

    return lines.join('\n');
  }
}

export const prometheusMetrics = new PrometheusMetrics();

// Initialize metrics
prometheusMetrics.counter('ai_agent_requests_total', 'Total AI agent requests');
prometheusMetrics.counter('ai_agent_errors_total', 'Total AI agent errors');
prometheusMetrics.gauge('ai_agent_active_sessions', 'Current active sessions');
prometheusMetrics.histogram('ai_agent_response_time_seconds', 'Response time in seconds', [0.1, 0.5, 1, 2, 5, 10]);
prometheusMetrics.histogram('ai_agent_generation_time_seconds', 'Workflow generation time', [1, 2, 5, 10, 30]);
```

### 5.2 Health Dashboard Data Endpoint

**File:** `botflow-backend/src/routes/ai-agent-dashboard.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { getAgentMetrics } from '../services/ai-agent/metrics-collector.js';
import { getPerformanceCache } from '../services/ai-agent/performance-cache.js';
import { getContextManager } from '../services/ai-agent/context-manager.js';

export async function aiAgentDashboardRoutes(fastify: FastifyInstance) {
  // Dashboard data endpoint
  fastify.get('/dashboard', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const metrics = getAgentMetrics();
    const cache = getPerformanceCache();
    const contextManager = getContextManager();

    const stats = metrics.getStats();
    const cacheStats = cache.getStats();
    const sessionStats = contextManager.getStats();

    return {
      overview: {
        totalRequests: stats.totalRequests,
        successRate: Math.round(stats.successRate * 100),
        avgResponseTime: Math.round(stats.avgGenerationTime),
        activeSessions: sessionStats.activeSessions
      },
      performance: {
        p50: Math.round(stats.p50GenerationTime),
        p95: Math.round(stats.p95GenerationTime),
        intentParsing: Math.round(stats.avgIntentParseTime),
        generation: Math.round(stats.avgGenerationTime),
        deployment: Math.round(stats.avgDeploymentTime)
      },
      cache: {
        hitRate: Math.round(cacheStats.hitRate * 100),
        size: cacheStats.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses
      },
      sessions: {
        active: sessionStats.activeSessions,
        byState: sessionStats.stateDistribution
      },
      errors: {
        total: stats.errorCount,
        recent: stats.recentErrors.slice(0, 5).map(e => ({
          type: e.type,
          message: e.message,
          time: e.timestamp.toISOString()
        }))
      },
      timestamp: new Date().toISOString()
    };
  });
}
```

---

## Day 6: Documentation & Deployment

### 6.1 API Documentation

**File:** `botflow-backend/docs/AI_AGENT_API.md`

```markdown
# AI Agent API Documentation

## Overview

The AI Agent API enables conversational workflow building for WhatsApp bots.

## Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

## Endpoints

### POST /api/bots/:botId/agent/chat

Send a message to the AI agent.

**Request:**
```json
{
  "message": "I want to track orders from Shopify",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "message": "I can help you create an order tracking workflow...",
  "sessionId": "uuid",
  "state": "gathering",
  "workflow": null,
  "actions": [],
  "suggestions": ["Shopify", "WooCommerce"]
}
```

### POST /api/bots/:botId/agent/generate

Generate a workflow directly from a description.

### POST /api/bots/:botId/agent/deploy

Deploy the current workflow.

### GET /api/bots/:botId/agent/session

Get session information.

### DELETE /api/bots/:botId/agent/session/:sessionId

Delete a session.

## Rate Limits

- 30 requests per minute per user
- 100 requests per minute per organization

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request body |
| 401 | Unauthorized |
| 404 | Bot or session not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
```

### 6.2 Deployment Checklist

**File:** `botflow-backend/docs/DEPLOYMENT_CHECKLIST.md`

```markdown
# AI Agent Deployment Checklist

## Pre-Deployment

- [ ] Run all tests: `npm run test:ai-agent`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Check for TypeScript errors: `npm run build`
- [ ] Review environment variables
- [ ] Check database migrations

## Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key
- `JWT_SECRET` - JWT signing secret
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

Optional:
- `AI_AGENT_MAX_SESSION_AGE` - Session timeout (default: 30min)
- `AI_AGENT_RATE_LIMIT` - Requests per minute (default: 30)
- `AI_AGENT_CACHE_TTL` - Cache TTL in seconds (default: 300)

## Post-Deployment

- [ ] Verify health endpoint: GET /api/agent/health
- [ ] Verify readiness probe: GET /api/agent/ready
- [ ] Monitor error rates
- [ ] Check Prometheus metrics
- [ ] Test chat flow manually

## Rollback Plan

1. Identify the issue via logs/metrics
2. Scale down new deployment
3. Scale up previous version
4. Notify team via Slack
```

---

## Day 7: Final Testing & Polish

### 7.1 Integration Test Script

**File:** `botflow-backend/scripts/test-ai-agent-integration.ts`

```typescript
/**
 * AI Agent Integration Test Script
 *
 * Run with: npx tsx scripts/test-ai-agent-integration.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_TOKEN;
const TEST_BOT_ID = process.env.TEST_BOT_ID;

async function runTests() {
  console.log('🧪 Starting AI Agent Integration Tests\n');

  const tests = [
    testHealthEndpoint,
    testChatFlow,
    testSessionManagement,
    testWorkflowGeneration,
    testErrorHandling
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

async function testHealthEndpoint() {
  const res = await fetch(`${API_URL}/api/agent/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
}

async function testChatFlow() {
  const res = await fetch(`${API_URL}/api/bots/${TEST_BOT_ID}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    },
    body: JSON.stringify({ message: 'Hello' })
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

  const data = await res.json();
  if (!data.sessionId) throw new Error('No session ID returned');
}

async function testSessionManagement() {
  // Create session
  const chatRes = await fetch(`${API_URL}/api/bots/${TEST_BOT_ID}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    },
    body: JSON.stringify({ message: 'Test' })
  });
  const { sessionId } = await chatRes.json();

  // Get session
  const getRes = await fetch(
    `${API_URL}/api/bots/${TEST_BOT_ID}/agent/session?sessionId=${sessionId}`,
    { headers: { 'Authorization': `Bearer ${TEST_TOKEN}` } }
  );
  if (!getRes.ok) throw new Error(`Get session failed: ${getRes.status}`);

  // Delete session
  const delRes = await fetch(
    `${API_URL}/api/bots/${TEST_BOT_ID}/agent/session/${sessionId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    }
  );
  if (!delRes.ok) throw new Error(`Delete session failed: ${delRes.status}`);
}

async function testWorkflowGeneration() {
  const res = await fetch(`${API_URL}/api/bots/${TEST_BOT_ID}/agent/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    },
    body: JSON.stringify({
      description: 'Create a simple FAQ bot',
      integrations: []
    })
  });
  if (!res.ok) throw new Error(`Generation failed: ${res.status}`);

  const data = await res.json();
  if (!data.workflow) throw new Error('No workflow returned');
}

async function testErrorHandling() {
  // Test empty message
  const res = await fetch(`${API_URL}/api/bots/${TEST_BOT_ID}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    },
    body: JSON.stringify({ message: '' })
  });

  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
}

runTests();
```

### 7.2 Final Checklist

- [ ] All frontend fixes integrated into AI Builder page
- [ ] New components (ErrorBoundary, ConnectionStatus, StateIndicator) working
- [ ] Performance optimizations (lazy loading, memoization) in place
- [ ] Security hardening (validation, rate limiting, circuit breaker) deployed
- [ ] Monitoring (Prometheus metrics, health endpoints) operational
- [ ] Documentation complete
- [ ] All tests passing
- [ ] Manual QA completed

---

## Deliverables Checklist

### UI/UX Polish
- [ ] Integrate ErrorBoundary and ConnectionStatus into AI Builder page
- [ ] Create StateIndicator component
- [ ] Implement keyboard shortcuts
- [ ] Add accessibility improvements (ARIA labels, focus management)

### Performance Optimizations
- [ ] Lazy load WorkflowPreview component
- [ ] Implement message list virtualization (optional)
- [ ] Add debounce/throttle utilities
- [ ] Memoize MessageBubble component

### Security Hardening
- [ ] Input validation middleware
- [ ] Per-user rate limiting
- [ ] Session security utilities
- [ ] Audit logging

### Error Recovery
- [ ] Circuit breaker for OpenAI calls
- [ ] Fallback responses
- [ ] Retry queue for failed operations

### Monitoring
- [ ] Enhanced Prometheus metrics
- [ ] Dashboard data endpoint
- [ ] Health checks verified

### Documentation
- [ ] API documentation
- [ ] Deployment checklist
- [ ] Integration test script

---

## Success Criteria

1. **UI Complete**: AI Builder looks polished and is accessible
2. **Performance**: Page load < 2s, message send < 100ms (before API)
3. **Security**: All inputs validated, rate limiting works
4. **Resilience**: Graceful degradation when OpenAI is slow/down
5. **Monitoring**: All metrics being collected
6. **Documentation**: API docs and deployment guide complete
7. **Tests**: All tests passing, manual QA approved

---

## Known Issues (Production Testing)

### Issue 1: Missing node-library.json in Production (FIXED)
**Status:** ✅ Fixed
**Error:** `ENOENT: no such file or directory, open '/app/dist/data/node-library.json'`
**Solution:** Added `scripts/copy-data.js` to copy data files from `src/data` to `dist/data` during build.

### Issue 2: Unknown Node Type - send_message (FIXED)
**Status:** ✅ Fixed
**Error:** "I need a bit more info: Unknown node type: send_message"
**Solution:** Added `send_message`, `ai_response`, `human_handoff`, `opencart_lookup`, `shiplogic_track`, `order_lookup` nodes to node-library.json. Also added alias support to NodeLibrary service.

### Issue 3: Request Timeout After Initial Response - CRITICAL
**Status:** 🔴 Open - HIGH PRIORITY
**Error:** "Request timed out. Please try again."
**Screenshot Evidence:** User provided catalog URL, then got timeout error
**Symptoms:**
- First message works (state changes to "Gathering")
- AI asks clarifying question ("Please provide: **Catalog URL**")
- User provides URL (www.audicoonline.co.za)
- TIMEOUT occurs - "Request timed out. Please try again."
- Retry also fails

**Root Cause Investigation Needed:**
1. Check backend logs for what happens after receiving the URL
2. Is OpenAI API call taking too long?
3. Is intent parsing failing and retrying multiple times?
4. Is workflow generation timing out?

**Files to investigate:**
- `botflow-backend/src/services/ai-agent/conversation-engine.ts` - Main processing logic
- `botflow-backend/src/services/ai-agent/intent-parser.ts` - May be slow/retrying
- `botflow-backend/src/services/ai-agent/workflow-generator.ts` - GPT calls for generation
- `botflow-backend/src/routes/ai-agent.ts` - API timeout settings

**Potential fixes:**
1. Increase API timeout from 30s to 60s for chat endpoint
2. Add progress indicators / streaming responses
3. Optimize intent parsing (reduce retries, simplify prompts)
4. Add caching for repeated operations
5. Profile backend to find bottleneck

### Issue 4: Frontend Error State Type Mismatch (FIXED)
**Status:** ✅ Fixed
**Error:** UI showed "Error" state but type wasn't recognized
**Solution:** Added `'error'` to `ConversationState` type in frontend.

### Issue 5: Frontend Crash - Cannot Read 'label' of Undefined (PARTIALLY FIXED)
**Status:** 🟡 Partial Fix Applied
**Error:** `Uncaught TypeError: Cannot read properties of undefined (reading 'label')`
**Fix Applied:** Added `getNodeLabel()` helper and null checks in WorkflowPreview.tsx
**Still needs testing:** Verify fix works after Vercel deployment

### Issue 6: Multiple 404 Errors
**Status:** 🔴 Open
**Errors:**
- `/dashboard/settings? rsc=18q47:1` - 404
- `botflow-production.u...93f3-9e99c7dbcla2:1` - 404
**Root Cause:** RSC (React Server Component) requests failing, possibly stale cache or deployment mismatch
**Action:** May resolve after other fixes, otherwise investigate Vercel deployment

---

## Comprehensive AI Builder Checklist

### Backend Investigation Required

- [ ] **Check Railway logs** during a failed request to see where it hangs
- [ ] **Profile OpenAI API calls** - measure response times for intent parsing and workflow generation
- [ ] **Test conversation-engine.ts locally** with the exact user input that causes timeout
- [ ] **Check Redis connection** - session state may be failing
- [ ] **Verify node-library.json loads correctly** in production (issue 1 was fixed but verify)
- [ ] **Test with simple prompts** vs complex prompts to isolate timeout cause

### Frontend Investigation Required

- [ ] **Verify WorkflowPreview fix deployed** to Vercel
- [ ] **Check CustomNodes.tsx** - all 4 node types (TriggerNode, ActionNode, ConditionNode, IntegrationNode) must handle missing data gracefully
- [ ] **Add error boundary** around WorkflowPreview component
- [ ] **Check useAIAgent hook** - verify state transitions are correct
- [ ] **Test ChatPanel** - ensure it handles error responses properly
- [ ] **Verify Blueprint type** in ai-agent.service.ts matches backend response

### API Contract Verification

- [ ] **Compare backend Blueprint response** with frontend Blueprint type
- [ ] **Check node structure**: Backend uses `config`, frontend expects `data.label`
- [ ] **Verify all required fields** are present in API responses
- [ ] **Test each endpoint manually** with curl/Postman:
  - `POST /api/bots/:botId/agent/chat`
  - `POST /api/bots/:botId/agent/generate`
  - `POST /api/bots/:botId/agent/refine`
  - `GET /api/bots/:botId/agent/session`

### Timeout Investigation

- [ ] **Current timeout**: 30 seconds in frontend `fetchWithTimeout`
- [ ] **Measure actual processing time** for a typical request
- [ ] **Identify bottleneck**:
  - Intent parsing (1-2 GPT calls)
  - Workflow generation (1 GPT call)
  - Template matching
  - Database operations
- [ ] **Consider streaming** for long operations
- [ ] **Add progress callback** to show user something is happening

### Testing Scenarios

1. **Simple prompt**: "Answer FAQs about my business"
2. **Medium prompt**: "Track orders from my Shopify store"
3. **Complex prompt**: "Receive WhatsApp messages, use AI to answer questions, connect to OpenCart for stock/recommendations, track orders via ShipLogic, handoff to human when needed"
4. **Follow-up messages**: Test the conversation flow after initial response
5. **URL input**: Test providing URLs when asked (this is where timeout occurs)

### Files to Review

**Backend:**
- `src/services/ai-agent/conversation-engine.ts` - Main orchestrator
- `src/services/ai-agent/intent-parser.ts` - GPT intent parsing
- `src/services/ai-agent/workflow-generator.ts` - GPT workflow generation
- `src/services/ai-agent/context-manager.ts` - Session/state management
- `src/routes/ai-agent.ts` - API endpoints
- `src/data/node-library.json` - Node definitions

**Frontend:**
- `app/dashboard/bots/[id]/ai-builder/page.tsx` - Main page
- `app/dashboard/bots/[id]/ai-builder/WorkflowPreview.tsx` - Workflow display
- `app/dashboard/bots/[id]/ai-builder/ChatPanel.tsx` - Chat interface
- `app/dashboard/bots/[id]/ai-builder/MessageBubble.tsx` - Message rendering
- `app/hooks/useAIAgent.ts` - State management hook
- `app/services/ai-agent.service.ts` - API client

---

## Notes

- Focus on stability over new features
- Test with real user scenarios
- Monitor logs during testing
- Document any issues found
- Prepare rollback plan before deployment
