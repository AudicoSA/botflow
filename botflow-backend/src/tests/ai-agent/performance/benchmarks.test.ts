/**
 * Performance Benchmark Tests
 *
 * Tests response times and performance metrics for AI agent services.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockBlueprint, mockContext, mockIntent } from '../setup.js';
import type { ParsedIntent, WorkflowTemplate } from '../../../types/ai-agent.js';

// Mock dependencies
vi.mock('../../../config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase
}));

vi.mock('../../../config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Fast mock for OpenAI (simulating cached responses)
let openaiCallDelay = 50; // ms
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, openaiCallDelay));
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  action: 'create',
                  workflowType: 'order_tracking',
                  entities: [],
                  integrations: ['shopify'],
                  requirements: [],
                  confidence: 0.85,
                  needsClarification: false
                })
              }
            }]
          };
        })
      }
    };
  }
}));

// Mock templates
const mockTemplates: WorkflowTemplate[] = Array.from({ length: 20 }, (_, i) => ({
  id: `template-${i}`,
  slug: `template-${i}`,
  name: `Template ${i}`,
  category: i % 2 === 0 ? 'ecommerce' : 'booking',
  description: `Test template ${i}`,
  triggerPhrases: ['test', `keyword${i}`],
  requiredIntegrations: i % 3 === 0 ? ['shopify'] : [],
  blueprint: mockBlueprint,
  variables: [],
  configurableFields: [],
  popularityScore: 50 + i,
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date()
}));

vi.mock('../../../services/ai-agent/template-library.js', () => ({
  getTemplateLibrary: vi.fn().mockReturnValue({
    getTemplates: vi.fn().mockResolvedValue({
      items: mockTemplates,
      total: mockTemplates.length,
      page: 1,
      pageSize: 100
    }),
    getBySlug: vi.fn().mockImplementation((slug: string) => {
      return Promise.resolve(mockTemplates.find(t => t.slug === slug) || null);
    })
  }),
  TemplateLibraryService: class {
    getTemplates = vi.fn().mockResolvedValue({
      items: mockTemplates,
      total: mockTemplates.length,
      page: 1,
      pageSize: 100
    });
    getBySlug = vi.fn().mockImplementation((slug: string) => {
      return Promise.resolve(mockTemplates.find(t => t.slug === slug) || null);
    });
  }
}));

vi.mock('../../../services/node-library.js', () => ({
  getNodeLibrary: vi.fn().mockResolvedValue({
    listNodes: () => [
      { type: 'whatsapp_trigger', name: 'WhatsApp Trigger', category: 'triggers' },
      { type: 'send_message', name: 'Send Message', category: 'actions' },
      { type: 'shopify_lookup', name: 'Shopify Lookup', category: 'integrations' }
    ],
    hasNode: () => true
  }),
  NodeLibrary: class {
    hasNode = () => true;
  }
}));

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openaiCallDelay = 50; // Reset to fast response
  });

  describe('Intent Parsing Performance', () => {
    it('should detect quick commands within 10ms', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();
      const commands = ['help', 'undo', 'deploy', 'reset'];

      for (const command of commands) {
        const start = performance.now();
        const result = parser.quickDetect(command);
        const duration = performance.now() - start;

        expect(result).not.toBeNull();
        expect(duration).toBeLessThan(10); // Quick detect should be instant
      }
    });

    it('should detect workflow type patterns within 20ms', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();
      const patterns = [
        'track order from my store',
        'book appointment for salon',
        'answer common questions',
        'process payment for customer'
      ];

      for (const pattern of patterns) {
        const start = performance.now();
        parser.quickDetect(pattern);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(20);
      }
    });
  });

  describe('Template Matching Performance', () => {
    it('should match templates within 100ms', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();
      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [],
        integrations: ['shopify'],
        requirements: [],
        confidence: 0.85,
        needsClarification: false,
        rawMessage: 'track orders'
      };

      const start = performance.now();
      await matcher.findMatches(intent, ['shopify'], undefined, 5);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle bulk template matching efficiently', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();
      const intents: ParsedIntent[] = Array.from({ length: 10 }, (_, i) => ({
        action: 'create',
        workflowType: i % 2 === 0 ? 'order_tracking' : 'booking',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.8,
        needsClarification: false,
        rawMessage: `test message ${i}`
      }));

      const start = performance.now();
      await Promise.all(intents.map(intent => matcher.findMatches(intent, [], undefined, 5)));
      const duration = performance.now() - start;

      // 10 parallel matches should complete within 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Context Manager Performance', () => {
    it('should create sessions quickly', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();

      const start = performance.now();
      await contextManager.createSession('user-1', 'bot-123', 'org-1');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should handle multiple concurrent sessions', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();

      const start = performance.now();
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          contextManager.createSession(`user-${i}`, `bot-${i}`, 'org-1')
        )
      );
      const duration = performance.now() - start;

      // 20 concurrent session creations should be fast
      expect(duration).toBeLessThan(200);
    });

    it('should retrieve sessions quickly', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      const start = performance.now();
      await contextManager.getSession(session.sessionId);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should add messages efficiently', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        contextManager.addMessage(session, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Workflow Validation Performance', () => {
    it('should validate workflows quickly', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const start = performance.now();
      await service.validateWorkflow(mockBlueprint);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should auto-fix workflows within reasonable time', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const brokenWorkflow = {
        ...mockBlueprint,
        nodes: [
          { id: '1', type: 'send_message', position: { x: 0, y: 0 }, data: {}, config: {} }
        ],
        edges: []
      };

      const start = performance.now();
      await service.autoFix(brokenWorkflow);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Template Customization Performance', () => {
    it('should customize templates quickly', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const start = performance.now();
      await matcher.customizeTemplate(mockTemplates[0], {
        variableValues: { test: 'value' },
        fieldConfig: {}
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should validate customizations quickly', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        matcher.validateCustomization(mockTemplates[0], {
          variableValues: { test: `value-${i}` },
          fieldConfig: {}
        });
      }
      const duration = performance.now() - start;

      // 100 validations should be fast
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    it('should handle large message histories efficiently', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager({ maxHistoryMessages: 100 });
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Add many messages
      for (let i = 0; i < 200; i++) {
        contextManager.addMessage(session, 'user', `Message ${i} with some content`);
      }

      // History should be trimmed
      expect(session.history.length).toBeLessThanOrEqual(100);
    });

    it('should limit workflow version history', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager({ maxWorkflowVersions: 5 });
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Add many workflow versions
      for (let i = 0; i < 20; i++) {
        contextManager.updateWorkflow(session, { ...mockBlueprint, name: `V${i}` }, i > 0);
      }

      // Should be limited
      expect(session.previousWorkflows.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent context updates', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const sessions = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          contextManager.createSession(`user-${i}`, `bot-${i}`, 'org-1')
        )
      );

      const start = performance.now();
      await Promise.all(sessions.map(async (session) => {
        contextManager.addMessage(session, 'user', 'Test');
        contextManager.addRequirement(session, 'test', 'value', 'explicit', 1.0);
        contextManager.transitionState(session, 'gathering');
        await contextManager.updateSession(session);
      }));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent template matches', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intents: ParsedIntent[] = Array.from({ length: 20 }, (_, i) => ({
        action: 'create',
        workflowType: 'order_tracking',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.8,
        needsClarification: false,
        rawMessage: `message ${i}`
      }));

      const start = performance.now();
      await Promise.all(intents.map(intent => matcher.findMatches(intent, [], undefined, 5)));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Throughput Tests', () => {
    it('should process many quick detects per second', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        parser.quickDetect('track orders');
      }
      const duration = performance.now() - start;

      const throughput = iterations / (duration / 1000);

      // Should be able to do at least 5000 quick detects per second
      expect(throughput).toBeGreaterThan(5000);
    });

    it('should efficiently serialize and deserialize sessions', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Add content
      for (let i = 0; i < 50; i++) {
        contextManager.addMessage(session, 'user', `Message ${i}`);
      }
      contextManager.updateWorkflow(session, mockBlueprint, false);

      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await contextManager.updateSession(session);
      }
      const duration = performance.now() - start;

      // 100 session saves should be fast
      expect(duration).toBeLessThan(500);
    });
  });
});
