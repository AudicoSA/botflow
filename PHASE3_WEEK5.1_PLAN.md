# Phase 3 Week 5.1: Implementation Guide

**Status:** IN PROGRESS
**Created:** 2026-01-18
**Purpose:** Detailed implementation guide for Week 5 production deployment tasks

---

## Quick Reference - What Was Just Fixed

Before starting Week 5 implementation, these TypeScript build errors were resolved:

| File | Issue | Fix Applied |
|------|-------|-------------|
| `types/workflow.ts` | BlueprintNode missing `data` property | Added `data?: Record<string, any>` for React Flow compatibility |
| `routes/analytics-ws.ts` | WebSocket handler incorrect type | Changed to `socket: WebSocket` parameter, fixed ioredis subscription |
| `routes/marketplace.ts` | Type mismatch merging integrations | Changed to `any[]` for flexible merging |
| `routes/bot-builder.ts` | Missing await, incomplete schemas | Added await for async calls, updated OptimizeBodySchema |
| `services/bot-builder.service.ts` | Missing await on async functions | Added await for `getNodeLibrary()` and `validate()` |
| `services/ai-agent/pattern-learning.ts` | Missing Blueprint fields | Added `bot_id`, `version`, `variables`, `credentials` |
| `services/ai-agent/performance-cache.ts` | Invalid Promise chain | Wrapped RPC in async IIFE |
| `services/metrics.service.ts` | Non-existent `supabase.raw()` | Changed to fetch-then-increment pattern |
| Multiple services | Missing type casts for `response.json()` | Added explicit type casts |

**Build Status:** ✅ Passing
**Healthcheck:** ✅ Working (`/health` returns `{"status":"ok"}`)

---

## Week 5.1 Implementation Tasks

### Task 1: Unit Tests for AI Agent Services

**Priority:** HIGH
**Directory:** `botflow-backend/src/tests/ai-agent/`

#### 1.1 Create Test Setup File

**File:** `botflow-backend/src/tests/ai-agent/setup.ts`

```typescript
import { vi } from 'vitest';

// Mock Supabase
export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null })
};

vi.mock('../../config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase
}));

// Mock OpenAI
export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{}' } }]
      })
    }
  }
};

// Test fixtures
export const mockBlueprint = {
  bot_id: 'test-bot-123',
  version: '1.0.0',
  name: 'Test Workflow',
  description: 'Test description',
  nodes: [
    { id: 'trigger-1', type: 'trigger', data: { label: 'Message Received' } },
    { id: 'action-1', type: 'action', data: { label: 'Send Response' } }
  ],
  edges: [{ id: 'edge-1', source: 'trigger-1', target: 'action-1' }],
  variables: {},
  credentials: []
};

export const mockIntent = {
  action: 'create' as const,
  workflowType: 'order_tracking',
  entities: [],
  integrations: ['shopify'],
  requirements: [],
  confidence: 0.85,
  needsClarification: false,
  rawMessage: 'track orders from shopify'
};

export const mockContext = {
  sessionId: 'session-123',
  botId: 'bot-123',
  userId: 'user-123',
  organizationId: 'org-123',
  state: 'idle' as const,
  currentWorkflow: null,
  previousWorkflows: [],
  gatheredRequirements: [],
  pendingQuestions: [],
  userPreferences: {},
  availableIntegrations: [],
  history: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000)
};
```

#### 1.2 Error Recovery Service Tests

**File:** `botflow-backend/src/tests/ai-agent/error-recovery.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorRecoveryService } from '../../services/ai-agent/error-recovery.js';
import { mockBlueprint, mockSupabase } from './setup.js';

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;

  beforeEach(() => {
    service = new ErrorRecoveryService();
    vi.clearAllMocks();
  });

  describe('validateWorkflow', () => {
    it('should detect missing trigger node', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'action-1', type: 'action', data: { label: 'Send' } }]
      };

      const result = await service.validateWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_TRIGGER')).toBe(true);
    });

    it('should detect missing response node', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'trigger-1', type: 'trigger', data: { label: 'Start' } }],
        edges: []
      };

      const result = await service.validateWorkflow(workflow);

      expect(result.warnings.some(w => w.code === 'MISSING_RESPONSE')).toBe(true);
    });

    it('should detect orphan nodes', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'trigger', data: {} },
          { id: 'orphan-1', type: 'action', data: {} },
          { id: 'action-1', type: 'action', data: {} }
        ],
        edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }]
      };

      const result = await service.validateWorkflow(workflow);

      expect(result.warnings.some(w => w.code === 'ORPHAN_NODE')).toBe(true);
    });

    it('should pass valid workflow', async () => {
      const result = await service.validateWorkflow(mockBlueprint);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('autoFix', () => {
    it('should add missing trigger automatically', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'action-1', type: 'action', data: { label: 'Send' } }]
      };

      const result = await service.autoFix(workflow);

      expect(result.success).toBe(true);
      expect(result.fixed.nodes.some(n => n.type === 'trigger')).toBe(true);
      expect(result.appliedFixes).toContain(expect.stringMatching(/trigger/i));
    });

    it('should add missing response automatically', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'trigger-1', type: 'trigger', data: {} }],
        edges: []
      };

      const result = await service.autoFix(workflow);

      expect(result.fixed.nodes.some(n =>
        n.type === 'action' && n.data?.actionType === 'send_message'
      )).toBe(true);
    });

    it('should not auto-fix complex issues', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [] // Empty workflow - needs manual intervention
      };

      const result = await service.autoFix(workflow);

      expect(result.remainingIssues.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeError', () => {
    it('should provide suggestions for common errors', async () => {
      const error = new Error('Integration not configured');

      const analysis = await service.analyzeError(error, mockBlueprint);

      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });
  });
});
```

#### 1.3 Version Manager Tests

**File:** `botflow-backend/src/tests/ai-agent/version-manager.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VersionManager } from '../../services/ai-agent/version-manager.js';
import { mockBlueprint } from './setup.js';

describe('VersionManager', () => {
  let manager: VersionManager;

  beforeEach(() => {
    manager = new VersionManager();
  });

  describe('saveVersion', () => {
    it('should save workflow version', () => {
      manager.initialize('session-1');
      manager.saveVersion('session-1', mockBlueprint, 'Initial version');

      const history = manager.getHistory('session-1');
      expect(history.versions).toHaveLength(1);
    });

    it('should trim old versions when exceeding max', () => {
      manager.initialize('session-1');

      // Save more than max versions
      for (let i = 0; i < 25; i++) {
        manager.saveVersion('session-1', { ...mockBlueprint, name: `v${i}` }, `Version ${i}`);
      }

      const history = manager.getHistory('session-1');
      expect(history.versions.length).toBeLessThanOrEqual(20);
    });

    it('should generate changes summary', () => {
      manager.initialize('session-1');
      manager.saveVersion('session-1', mockBlueprint, 'v1');

      const modified = {
        ...mockBlueprint,
        nodes: [...mockBlueprint.nodes, { id: 'new-1', type: 'action', data: {} }]
      };
      manager.saveVersion('session-1', modified, 'v2');

      const history = manager.getHistory('session-1');
      expect(history.versions[1].changesSummary).toContain('added');
    });
  });

  describe('undo/redo', () => {
    it('should undo to previous version', () => {
      manager.initialize('session-1');
      manager.saveVersion('session-1', mockBlueprint, 'v1');
      manager.saveVersion('session-1', { ...mockBlueprint, name: 'Modified' }, 'v2');

      const undone = manager.undo('session-1');

      expect(undone?.name).toBe(mockBlueprint.name);
    });

    it('should redo to next version', () => {
      manager.initialize('session-1');
      manager.saveVersion('session-1', mockBlueprint, 'v1');
      manager.saveVersion('session-1', { ...mockBlueprint, name: 'Modified' }, 'v2');

      manager.undo('session-1');
      const redone = manager.redo('session-1');

      expect(redone?.name).toBe('Modified');
    });

    it('should return null when no history', () => {
      manager.initialize('session-1');

      const result = manager.undo('session-1');

      expect(result).toBeNull();
    });
  });

  describe('diff', () => {
    it('should detect added nodes', () => {
      const before = mockBlueprint;
      const after = {
        ...mockBlueprint,
        nodes: [...mockBlueprint.nodes, { id: 'new-1', type: 'action', data: {} }]
      };

      const diff = manager.diff(before, after);

      expect(diff.nodesAdded).toHaveLength(1);
      expect(diff.nodesAdded[0].id).toBe('new-1');
    });

    it('should detect removed nodes', () => {
      const before = mockBlueprint;
      const after = {
        ...mockBlueprint,
        nodes: mockBlueprint.nodes.slice(0, 1)
      };

      const diff = manager.diff(before, after);

      expect(diff.nodesRemoved.length).toBeGreaterThan(0);
    });

    it('should detect modified nodes', () => {
      const before = mockBlueprint;
      const after = {
        ...mockBlueprint,
        nodes: mockBlueprint.nodes.map(n =>
          n.id === 'trigger-1' ? { ...n, data: { ...n.data, modified: true } } : n
        )
      };

      const diff = manager.diff(before, after);

      expect(diff.nodesModified.length).toBeGreaterThan(0);
    });
  });
});
```

#### 1.4 Pattern Learning Tests

**File:** `botflow-backend/src/tests/ai-agent/pattern-learning.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternLearningService } from '../../services/ai-agent/pattern-learning.js';
import { mockBlueprint, mockIntent, mockSupabase } from './setup.js';

describe('PatternLearningService', () => {
  let service: PatternLearningService;

  beforeEach(() => {
    service = new PatternLearningService();
    vi.clearAllMocks();
  });

  describe('recordSuccess', () => {
    it('should record a successful workflow deployment', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: { id: '1' }, error: null });

      await service.recordSuccess({
        workflowId: 'wf-1',
        botId: 'bot-1',
        organizationId: 'org-1',
        intent: mockIntent,
        workflow: mockBlueprint,
        responseTimeMs: 1500
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_success_logs');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should generate correct intent signature', () => {
      const signature = service.generateIntentSignature(mockIntent);

      expect(signature).toContain('create');
      expect(signature).toContain('order_tracking');
    });

    it('should extract patterns from workflow', () => {
      const patterns = service.extractWorkflowPatterns(mockBlueprint);

      expect(patterns.nodeTypes).toContain('trigger');
      expect(patterns.nodeTypes).toContain('action');
    });
  });

  describe('extractPatterns', () => {
    it('should return patterns above minimum usage threshold', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          { intent_signature: 'sig1', usage_count: 5, workflow_type: 'order_tracking' },
          { intent_signature: 'sig2', usage_count: 1, workflow_type: 'booking' }
        ],
        error: null
      });

      const patterns = await service.extractPatterns({ minUsage: 2 });

      expect(patterns.every(p => p.usageCount >= 2)).toBe(true);
    });

    it('should filter by workflow type', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          { intent_signature: 'sig1', usage_count: 5, workflow_type: 'order_tracking' }
        ],
        error: null
      });

      const patterns = await service.extractPatterns({ workflowType: 'order_tracking' });

      expect(patterns.every(p => p.workflowType === 'order_tracking')).toBe(true);
    });
  });

  describe('suggestFromPatterns', () => {
    it('should rank patterns by relevance score', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          { intent_signature: 'order:create', usage_count: 10, workflow_type: 'order_tracking' },
          { intent_signature: 'booking:create', usage_count: 5, workflow_type: 'booking' }
        ],
        error: null
      });

      const suggestions = await service.suggestFromPatterns(mockIntent);

      expect(suggestions[0].relevanceScore).toBeGreaterThanOrEqual(suggestions[1]?.relevanceScore || 0);
    });

    it('should include pattern reasoning', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ intent_signature: 'order:create', usage_count: 10, workflow_type: 'order_tracking' }],
        error: null
      });

      const suggestions = await service.suggestFromPatterns(mockIntent);

      expect(suggestions[0].reasoning).toBeDefined();
      expect(suggestions[0].reasoning.length).toBeGreaterThan(0);
    });

    it('should limit results', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: Array(20).fill({ intent_signature: 'sig', usage_count: 5 }),
        error: null
      });

      const suggestions = await service.suggestFromPatterns(mockIntent, { limit: 3 });

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });
});
```

#### 1.5 Suggestion Engine Tests

**File:** `botflow-backend/src/tests/ai-agent/suggestion-engine.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SuggestionEngine } from '../../services/ai-agent/suggestion-engine.js';
import { mockContext, mockBlueprint } from './setup.js';

describe('SuggestionEngine', () => {
  let engine: SuggestionEngine;

  beforeEach(() => {
    engine = new SuggestionEngine();
  });

  describe('generateSuggestions', () => {
    it('should return state-based suggestions for idle state', () => {
      const suggestions = engine.generateSuggestions({ ...mockContext, state: 'idle' });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('order') || s.includes('booking'))).toBe(true);
    });

    it('should return different suggestions for gathering state', () => {
      const suggestions = engine.generateSuggestions({ ...mockContext, state: 'gathering' });

      expect(suggestions).not.toEqual(
        engine.generateSuggestions({ ...mockContext, state: 'idle' })
      );
    });

    it('should include vertical-specific suggestions', () => {
      const context = {
        ...mockContext,
        userPreferences: { vertical: 'ecommerce' }
      };

      const suggestions = engine.generateSuggestions(context);

      expect(suggestions.some(s =>
        s.toLowerCase().includes('order') ||
        s.toLowerCase().includes('product') ||
        s.toLowerCase().includes('cart')
      )).toBe(true);
    });

    it('should include deploy suggestion when workflow ready', () => {
      const context = {
        ...mockContext,
        state: 'confirming' as const,
        currentWorkflow: mockBlueprint
      };

      const suggestions = engine.generateSuggestions(context);

      expect(suggestions.some(s => s.toLowerCase().includes('deploy'))).toBe(true);
    });
  });

  describe('suggestIntegrations', () => {
    it('should recommend integrations based on workflow type', () => {
      const integrations = engine.suggestIntegrations('order_tracking', []);

      expect(integrations).toContain('shopify');
    });

    it('should filter out already-enabled integrations', () => {
      const enabled = ['shopify'];
      const integrations = engine.suggestIntegrations('order_tracking', enabled);

      expect(integrations).not.toContain('shopify');
    });
  });

  describe('suggestNextSteps', () => {
    it('should suggest adding nodes for incomplete workflow', () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'trigger-1', type: 'trigger', data: {} }]
      };

      const steps = engine.suggestNextSteps(workflow);

      expect(steps.some(s => s.includes('action') || s.includes('response'))).toBe(true);
    });
  });
});
```

#### 1.6 Performance Cache Tests

**File:** `botflow-backend/src/tests/ai-agent/performance-cache.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceCache, getPerformanceCache } from '../../services/ai-agent/performance-cache.js';
import { mockIntent } from './setup.js';

describe('PerformanceCache', () => {
  let cache: PerformanceCache;

  beforeEach(() => {
    cache = new PerformanceCache({ useRedis: false, useDbCache: false });
  });

  afterEach(() => {
    cache.clearAll();
  });

  describe('intent caching', () => {
    it('should cache intent parsing results', async () => {
      const message = 'track my order';

      await cache.cacheIntent(message, mockIntent);
      const cached = await cache.getIntent(message);

      expect(cached).toEqual(mockIntent);
    });

    it('should return cached results on hit', async () => {
      const message = 'track my order';
      await cache.cacheIntent(message, mockIntent);

      const result1 = await cache.getIntent(message);
      const result2 = await cache.getIntent(message);

      expect(result1).toEqual(result2);
    });

    it('should track hit/miss metrics', async () => {
      const message = 'track order';

      // Miss
      await cache.getIntent(message);
      // Cache it
      await cache.cacheIntent(message, mockIntent);
      // Hit
      await cache.getIntent(message);

      const stats = cache.getStats();
      expect(stats.intentCache.hits).toBe(1);
      expect(stats.intentCache.misses).toBe(1);
    });

    it('should return null for expired entries', async () => {
      const shortTtlCache = new PerformanceCache({
        useRedis: false,
        useDbCache: false,
        intentTtlMs: 1 // 1ms TTL
      });

      await shortTtlCache.cacheIntent('test', mockIntent);
      await new Promise(r => setTimeout(r, 10)); // Wait for expiry

      const result = await shortTtlCache.getIntent('test');
      expect(result).toBeNull();
    });
  });

  describe('template caching', () => {
    it('should cache template matches', async () => {
      const templates = [{ slug: 'order-tracking', score: 0.9 }];

      await cache.cacheTemplateMatches('order tracking', templates);
      const cached = await cache.getTemplateMatches('order tracking');

      expect(cached).toEqual(templates);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const shortCache = new PerformanceCache({
        useRedis: false,
        useDbCache: false,
        intentTtlMs: 1
      });

      await shortCache.cacheIntent('test1', mockIntent);
      await shortCache.cacheIntent('test2', mockIntent);

      await new Promise(r => setTimeout(r, 10));
      shortCache.cleanup();

      expect(await shortCache.getIntent('test1')).toBeNull();
      expect(await shortCache.getIntent('test2')).toBeNull();
    });

    it('should respect max cache size', async () => {
      const smallCache = new PerformanceCache({
        useRedis: false,
        useDbCache: false,
        maxSize: 2
      });

      await smallCache.cacheIntent('msg1', mockIntent);
      await smallCache.cacheIntent('msg2', mockIntent);
      await smallCache.cacheIntent('msg3', mockIntent); // Should evict oldest

      const stats = smallCache.getStats();
      expect(stats.intentCache.size).toBeLessThanOrEqual(2);
    });
  });

  describe('clearAll', () => {
    it('should clear all caches', async () => {
      await cache.cacheIntent('test', mockIntent);
      await cache.cacheTemplateMatches('query', []);

      cache.clearAll();

      expect(await cache.getIntent('test')).toBeNull();
      expect(await cache.getTemplateMatches('query')).toBeNull();
    });
  });
});
```

---

### Task 2: Input Validation Service

**Priority:** HIGH
**File:** `botflow-backend/src/services/ai-agent/input-validator.ts`

```typescript
/**
 * Input Validation Service (Phase 3 Week 5)
 *
 * Validates and sanitizes all inputs to AI agent endpoints.
 * Prevents prompt injection, XSS, and other security issues.
 */

import { z } from 'zod';
import type { Blueprint, BlueprintNode, BlueprintEdge } from '../../types/workflow.js';

// ============================================================================
// Zod Schemas
// ============================================================================

export const nodeSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  name: z.string().max(200).optional(),
  config: z.record(z.any()).optional(),
  data: z.record(z.any()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export const edgeSchema = z.object({
  id: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  target: z.string().min(1).max(100),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().max(100).optional()
});

export const blueprintSchema = z.object({
  bot_id: z.string().min(1).max(100),
  version: z.string().max(20),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  nodes: z.array(nodeSchema).min(0).max(100),
  edges: z.array(edgeSchema).max(200),
  variables: z.record(z.string()).default({}),
  credentials: z.array(z.object({
    service: z.string(),
    credential_id: z.string()
  })).default([])
});

export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long (max 5000 characters)')
    .transform(s => s.trim()),
  sessionId: z.string().uuid().optional()
});

export const generateRequestSchema = z.object({
  description: z.string()
    .min(10, 'Description too short')
    .max(2000, 'Description too long'),
  integrations: z.array(z.string()).max(10).optional(),
  template: z.string().max(100).optional(),
  vertical: z.string().max(50).optional()
});

export const refineRequestSchema = z.object({
  sessionId: z.string().uuid(),
  modifications: z.string()
    .min(1)
    .max(2000, 'Modification request too long')
});

export const deployRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  workflow: blueprintSchema.optional(),
  activate: z.boolean().default(true)
});

// ============================================================================
// Input Validator Class
// ============================================================================

export class InputValidator {
  // Dangerous patterns for prompt injection
  private static readonly PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(previous|all|above)\s+instructions/i,
    /system\s*:/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<<SYS>>/i,
    /<\|im_start\|>/i,
    /```\s*(system|assistant)/i,
    /you\s+are\s+now\s+(a|an)/i,
    /pretend\s+you\s+are/i,
    /act\s+as\s+(if|a|an)/i,
    /roleplay\s+as/i,
    /jailbreak/i,
    /DAN\s+mode/i
  ];

  // XSS patterns
  private static readonly XSS_PATTERNS = [
    /<script\b[^>]*>/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  /**
   * Validate chat message input
   */
  validateChatMessage(input: unknown): { message: string; sessionId?: string } {
    const result = chatMessageSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid chat message', result.error.issues);
    }

    // Additional security checks
    this.checkForPromptInjection(result.data.message);

    return result.data;
  }

  /**
   * Validate workflow generation request
   */
  validateGenerateRequest(input: unknown) {
    const result = generateRequestSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid generate request', result.error.issues);
    }

    this.checkForPromptInjection(result.data.description);

    return result.data;
  }

  /**
   * Validate workflow refinement request
   */
  validateRefineRequest(input: unknown) {
    const result = refineRequestSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid refine request', result.error.issues);
    }

    this.checkForPromptInjection(result.data.modifications);

    return result.data;
  }

  /**
   * Validate deploy request
   */
  validateDeployRequest(input: unknown) {
    const result = deployRequestSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid deploy request', result.error.issues);
    }
    return result.data;
  }

  /**
   * Validate a complete Blueprint
   */
  validateBlueprint(input: unknown): Blueprint {
    const result = blueprintSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid blueprint', result.error.issues);
    }
    return result.data as Blueprint;
  }

  /**
   * Sanitize message for use in AI prompts
   */
  sanitizeForPrompt(message: string): string {
    let sanitized = message;

    // Remove code blocks that might contain injection attempts
    sanitized = sanitized.replace(/```[\s\S]*?```/g, '[code block removed]');

    // Remove potential system-level instructions
    sanitized = sanitized.replace(/system\s*:/gi, '');
    sanitized = sanitized.replace(/\[INST\]/gi, '');
    sanitized = sanitized.replace(/\[\/INST\]/gi, '');
    sanitized = sanitized.replace(/<<SYS>>/gi, '');
    sanitized = sanitized.replace(/<\|im_start\|>/gi, '');

    // Limit length
    sanitized = sanitized.slice(0, 5000);

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Sanitize for HTML output (prevent XSS)
   */
  sanitizeForHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Check for prompt injection attempts
   */
  private checkForPromptInjection(text: string): void {
    for (const pattern of InputValidator.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        throw new SecurityError('Potential prompt injection detected');
      }
    }
  }

  /**
   * Check for XSS attempts
   */
  checkForXss(text: string): void {
    for (const pattern of InputValidator.XSS_PATTERNS) {
      if (pattern.test(text)) {
        throw new SecurityError('Potential XSS attempt detected');
      }
    }
  }

  /**
   * Validate session ID format
   */
  validateSessionId(sessionId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  /**
   * Validate bot ID format
   */
  validateBotId(botId: string): boolean {
    // UUID or custom ID format
    return /^[a-zA-Z0-9_-]{1,100}$/.test(botId);
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public issues: z.ZodIssue[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let instance: InputValidator | null = null;

export function getInputValidator(): InputValidator {
  if (!instance) {
    instance = new InputValidator();
  }
  return instance;
}

export default InputValidator;
```

---

### Task 3: Rate Limiting Middleware

**Priority:** HIGH
**File:** `botflow-backend/src/middleware/rate-limiter.ts`

```typescript
/**
 * Rate Limiting Middleware (Phase 3 Week 5)
 *
 * Configures rate limits for AI agent endpoints to prevent abuse.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../config/redis.js';

// ============================================================================
// Rate Limit Configuration
// ============================================================================

export interface RateLimitConfig {
  max: number;           // Maximum requests
  timeWindow: number;    // Time window in milliseconds
  keyPrefix?: string;    // Redis key prefix
}

export const AI_AGENT_RATE_LIMITS = {
  chat: {
    max: 30,
    timeWindow: 60 * 1000,  // 30 per minute
    keyPrefix: 'rl:chat'
  },
  generate: {
    max: 10,
    timeWindow: 60 * 1000,  // 10 per minute
    keyPrefix: 'rl:generate'
  },
  deploy: {
    max: 5,
    timeWindow: 60 * 1000,  // 5 per minute
    keyPrefix: 'rl:deploy'
  },
  session: {
    max: 100,
    timeWindow: 60 * 1000,  // 100 per minute
    keyPrefix: 'rl:session'
  }
} as const;

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter {
  private useRedis: boolean;
  private memoryStore: Map<string, { count: number; resetAt: number }>;

  constructor() {
    this.useRedis = !!redis;
    this.memoryStore = new Map();

    // Cleanup memory store periodically
    if (!this.useRedis) {
      setInterval(() => this.cleanupMemoryStore(), 60 * 1000);
    }
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const fullKey = `${config.keyPrefix || 'rl'}:${key}`;

    if (this.useRedis) {
      return this.checkLimitRedis(fullKey, config);
    }
    return this.checkLimitMemory(fullKey, config);
  }

  /**
   * Redis-based rate limiting
   */
  private async checkLimitRedis(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    if (!redis) {
      return { allowed: true, remaining: config.max, resetAt: new Date() };
    }

    const now = Date.now();
    const windowStart = now - config.timeWindow;

    // Use sorted set for sliding window
    const multi = redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Count requests in window
    multi.zcard(key);

    // Set expiry
    multi.expire(key, Math.ceil(config.timeWindow / 1000));

    const results = await multi.exec();
    const count = (results?.[2]?.[1] as number) || 0;

    const remaining = Math.max(0, config.max - count);
    const resetAt = new Date(now + config.timeWindow);

    return {
      allowed: count <= config.max,
      remaining,
      resetAt
    };
  }

  /**
   * Memory-based rate limiting (fallback)
   */
  private checkLimitMemory(
    key: string,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetAt: Date } {
    const now = Date.now();
    const entry = this.memoryStore.get(key);

    if (!entry || now > entry.resetAt) {
      // New window
      this.memoryStore.set(key, {
        count: 1,
        resetAt: now + config.timeWindow
      });
      return {
        allowed: true,
        remaining: config.max - 1,
        resetAt: new Date(now + config.timeWindow)
      };
    }

    // Increment count
    entry.count++;
    const allowed = entry.count <= config.max;
    const remaining = Math.max(0, config.max - entry.count);

    return {
      allowed,
      remaining,
      resetAt: new Date(entry.resetAt)
    };
  }

  /**
   * Cleanup expired entries from memory store
   */
  private cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now > entry.resetAt) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Get rate limit key from request
   */
  static getKeyFromRequest(request: FastifyRequest): string {
    // Prefer user ID, fall back to IP
    const user = request.user as { userId?: string; id?: string } | undefined;
    return user?.userId || user?.id || request.ip || 'anonymous';
  }
}

// ============================================================================
// Fastify Hook Factory
// ============================================================================

/**
 * Create a rate limit hook for a specific endpoint type
 */
export function createRateLimitHook(config: RateLimitConfig) {
  const limiter = new RateLimiter();

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = RateLimiter.getKeyFromRequest(request);
    const result = await limiter.checkLimit(key, config);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', config.max);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      reply.status(429).send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again after ${result.resetAt.toISOString()}`,
        retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
      });
      return reply;
    }
  };
}

// ============================================================================
// Plugin Registration
// ============================================================================

/**
 * Register rate limiting for AI agent routes
 */
export async function registerRateLimiting(fastify: FastifyInstance): Promise<void> {
  // Add hooks for different endpoint types
  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.routerPath || request.url;

    // Determine rate limit config based on path
    let config: RateLimitConfig | null = null;

    if (path.includes('/agent/chat')) {
      config = AI_AGENT_RATE_LIMITS.chat;
    } else if (path.includes('/agent/generate')) {
      config = AI_AGENT_RATE_LIMITS.generate;
    } else if (path.includes('/agent/deploy')) {
      config = AI_AGENT_RATE_LIMITS.deploy;
    } else if (path.includes('/agent/session')) {
      config = AI_AGENT_RATE_LIMITS.session;
    }

    if (config) {
      const hook = createRateLimitHook(config);
      await hook(request, reply);
    }
  });
}

// ============================================================================
// Exports
// ============================================================================

export default RateLimiter;
```

---

### Task 4: Audit Logging Service

**Priority:** MEDIUM
**File:** `botflow-backend/src/services/ai-agent/audit-logger.ts`

```typescript
/**
 * Audit Logging Service (Phase 3 Week 5)
 *
 * Tracks all significant actions in the AI agent for security and debugging.
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  | 'chat'
  | 'generate'
  | 'refine'
  | 'deploy'
  | 'undo'
  | 'redo'
  | 'session_create'
  | 'session_delete'
  | 'error';

export type AuditResource = 'session' | 'workflow' | 'template';

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  organizationId: string;
  botId?: string;
  sessionId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
}

export interface AuditQueryOptions {
  userId?: string;
  organizationId?: string;
  botId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Audit Logger Class
// ============================================================================

export class AuditLogger {
  private buffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.startFlushInterval();
  }

  /**
   * Log an audit entry
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // Add to buffer
    this.buffer.push(fullEntry);

    // Log to console for immediate visibility
    if (!entry.success) {
      logger.warn({ audit: fullEntry }, 'Audit log: action failed');
    } else {
      logger.debug({ audit: fullEntry }, 'Audit log: action succeeded');
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }

  /**
   * Log a chat message
   */
  async logChat(params: {
    userId: string;
    organizationId: string;
    botId: string;
    sessionId: string;
    message: string;
    responseTime: number;
    success: boolean;
    error?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      sessionId: params.sessionId,
      action: 'chat',
      resource: 'session',
      resourceId: params.sessionId,
      details: {
        messageLength: params.message.length,
        // Don't log actual message content for privacy
        hasMessage: true
      },
      durationMs: params.responseTime,
      success: params.success,
      errorMessage: params.error,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });
  }

  /**
   * Log workflow generation
   */
  async logGenerate(params: {
    userId: string;
    organizationId: string;
    botId: string;
    sessionId?: string;
    workflowId?: string;
    nodeCount: number;
    responseTime: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      sessionId: params.sessionId,
      action: 'generate',
      resource: 'workflow',
      resourceId: params.workflowId,
      details: {
        nodeCount: params.nodeCount
      },
      durationMs: params.responseTime,
      success: params.success,
      errorMessage: params.error
    });
  }

  /**
   * Log workflow deployment
   */
  async logDeploy(params: {
    userId: string;
    organizationId: string;
    botId: string;
    workflowId: string;
    version: string;
    nodeCount: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      action: 'deploy',
      resource: 'workflow',
      resourceId: params.workflowId,
      details: {
        version: params.version,
        nodeCount: params.nodeCount
      },
      success: params.success,
      errorMessage: params.error
    });
  }

  /**
   * Log session creation
   */
  async logSessionCreate(params: {
    userId: string;
    organizationId: string;
    botId: string;
    sessionId: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      sessionId: params.sessionId,
      action: 'session_create',
      resource: 'session',
      resourceId: params.sessionId,
      details: {},
      success: true
    });
  }

  /**
   * Log error
   */
  async logError(params: {
    userId: string;
    organizationId: string;
    botId?: string;
    sessionId?: string;
    error: Error;
    context?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      sessionId: params.sessionId,
      action: 'error',
      resource: 'session',
      details: {
        errorName: params.error.name,
        errorStack: params.error.stack?.slice(0, 500),
        ...params.context
      },
      success: false,
      errorMessage: params.error.message
    });
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions): Promise<AuditLogEntry[]> {
    let query = supabaseAdmin
      .from('ai_agent_audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }
    if (options.botId) {
      query = query.eq('bot_id', options.botId);
    }
    if (options.action) {
      query = query.eq('action', options.action);
    }
    if (options.resource) {
      query = query.eq('resource', options.resource);
    }
    if (options.from) {
      query = query.gte('timestamp', options.from.toISOString());
    }
    if (options.to) {
      query = query.lte('timestamp', options.to.toISOString());
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to query audit logs');
      return [];
    }

    return (data || []).map(row => ({
      timestamp: new Date(row.timestamp),
      userId: row.user_id,
      organizationId: row.organization_id,
      botId: row.bot_id,
      sessionId: row.session_id,
      action: row.action as AuditAction,
      resource: row.resource as AuditResource,
      resourceId: row.resource_id,
      details: row.details || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      durationMs: row.duration_ms,
      success: row.success,
      errorMessage: row.error_message
    }));
  }

  /**
   * Get audit summary for an organization
   */
  async getSummary(organizationId: string, days: number = 7): Promise<{
    totalActions: number;
    actionCounts: Record<AuditAction, number>;
    errorRate: number;
    avgResponseTime: number;
  }> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await this.query({
      organizationId,
      from,
      limit: 10000
    });

    const actionCounts = {} as Record<AuditAction, number>;
    let totalDuration = 0;
    let durationCount = 0;
    let errorCount = 0;

    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      if (log.durationMs) {
        totalDuration += log.durationMs;
        durationCount++;
      }
      if (!log.success) {
        errorCount++;
      }
    }

    return {
      totalActions: logs.length,
      actionCounts,
      errorRate: logs.length > 0 ? errorCount / logs.length : 0,
      avgResponseTime: durationCount > 0 ? totalDuration / durationCount : 0
    };
  }

  /**
   * Flush buffer to database
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const rows = entries.map(entry => ({
        timestamp: entry.timestamp.toISOString(),
        user_id: entry.userId,
        organization_id: entry.organizationId,
        bot_id: entry.botId,
        session_id: entry.sessionId,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resourceId,
        details: entry.details,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        duration_ms: entry.durationMs,
        success: entry.success,
        error_message: entry.errorMessage
      }));

      const { error } = await supabaseAdmin
        .from('ai_agent_audit_logs')
        .insert(rows);

      if (error) {
        logger.error({ error, count: rows.length }, 'Failed to flush audit logs');
        // Put entries back in buffer on failure
        this.buffer = [...entries, ...this.buffer];
      }
    } catch (error) {
      logger.error({ error }, 'Error flushing audit logs');
      this.buffer = [...entries, ...this.buffer];
    }
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        logger.error({ err }, 'Periodic flush failed');
      });
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop and flush remaining entries
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let instance: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!instance) {
    instance = new AuditLogger();
  }
  return instance;
}

export default AuditLogger;
```

---

### Task 5: Database Migration for Audit Logs

**File:** `botflow-backend/src/migrations/005_audit_logs.sql`

```sql
-- Phase 3 Week 5: Audit Logs Migration
-- Creates table for AI agent audit logging

-- ============================================================================
-- Audit Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_agent_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User context
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bot_id TEXT REFERENCES bots(id) ON DELETE SET NULL,
  session_id UUID,

  -- Action details
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',

  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  duration_ms INTEGER,

  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_timestamp
  ON ai_agent_audit_logs(organization_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp
  ON ai_agent_audit_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON ai_agent_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_bot
  ON ai_agent_audit_logs(bot_id) WHERE bot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_errors
  ON ai_agent_audit_logs(organization_id, timestamp DESC)
  WHERE success = false;

-- Partial index for recent logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent
  ON ai_agent_audit_logs(timestamp DESC)
  WHERE timestamp > NOW() - INTERVAL '7 days';

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE ai_agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their organization's logs
CREATE POLICY "Users can view own org audit logs"
  ON ai_agent_audit_logs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Only service role can insert
CREATE POLICY "Service can insert audit logs"
  ON ai_agent_audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Cleanup Function
-- ============================================================================

-- Automatically delete logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_agent_audit_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE ai_agent_audit_logs IS 'Audit trail for AI agent actions';
COMMENT ON COLUMN ai_agent_audit_logs.action IS 'Action type: chat, generate, deploy, etc.';
COMMENT ON COLUMN ai_agent_audit_logs.resource IS 'Resource type: session, workflow, template';
COMMENT ON COLUMN ai_agent_audit_logs.details IS 'Additional action-specific details (no PII)';
```

---

### Task 6: API Documentation

**File:** `botflow-backend/docs/ai-agent-api.md`

```markdown
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
```

---

## Summary Checklist

### Files to Create

| File | Priority | Description |
|------|----------|-------------|
| `src/tests/ai-agent/setup.ts` | HIGH | Test setup and mocks |
| `src/tests/ai-agent/error-recovery.test.ts` | HIGH | Error recovery tests |
| `src/tests/ai-agent/version-manager.test.ts` | HIGH | Version manager tests |
| `src/tests/ai-agent/pattern-learning.test.ts` | HIGH | Pattern learning tests |
| `src/tests/ai-agent/suggestion-engine.test.ts` | HIGH | Suggestion engine tests |
| `src/tests/ai-agent/performance-cache.test.ts` | HIGH | Cache tests |
| `src/services/ai-agent/input-validator.ts` | HIGH | Input validation |
| `src/middleware/rate-limiter.ts` | HIGH | Rate limiting |
| `src/services/ai-agent/audit-logger.ts` | MEDIUM | Audit logging |
| `src/migrations/005_audit_logs.sql` | MEDIUM | DB migration |
| `docs/ai-agent-api.md` | MEDIUM | API documentation |

### Commands to Run After Implementation

```bash
# Install dependencies (if needed)
cd botflow-backend
npm install @fastify/rate-limit prom-client --save

# Run tests
npm run test

# Build
npm run build

# Start dev server
npm run dev
```

---

**Next:** After completing Week 5.1, proceed to Week 5.2 for metrics collection, Sentry integration, and CI/CD pipeline setup.
