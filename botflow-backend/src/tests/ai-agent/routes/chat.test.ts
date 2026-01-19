/**
 * Chat Endpoint Integration Tests
 *
 * Tests for POST /api/bots/:botId/agent/chat
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { mockSupabase } from '../setup.js';
import { createMockBot, mockBlueprint, mockIntent, mockContext } from '../helpers.js';

// Mock Supabase before importing services
vi.mock('../../../config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase
}));

// Mock OpenAI
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                action: 'create',
                workflowType: 'order_tracking',
                entities: [{ type: 'service', value: 'Shopify', originalText: 'shopify', confidence: 0.9, startIndex: 12, endIndex: 19 }],
                integrations: ['shopify'],
                requirements: [{ id: 'req_1', category: 'trigger', description: 'Track orders', priority: 'required' }],
                confidence: 0.85,
                needsClarification: false
              })
            }
          }]
        })
      }
    };
  }
}));

describe('POST /api/bots/:botId/agent/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock bot response
    mockSupabase.single.mockResolvedValue({
      data: createMockBot(),
      error: null
    });
  });

  describe('Session Management', () => {
    it('should create a new session on first message', async () => {
      const { ConversationEngine, resetConversationEngine } = await import('../../../services/ai-agent/conversation-engine.js');
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetConversationEngine();
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      expect(session.sessionId).toBeDefined();
      expect(session.state).toBe('idle');
      expect(session.botId).toBe('bot-123');
      expect(session.userId).toBe('user-1');
    });

    it('should retrieve existing session by ID', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');
      const sessionId = session.sessionId;

      const retrieved = await contextManager.getSession(sessionId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.sessionId).toBe(sessionId);
      expect(retrieved?.botId).toBe('bot-123');
    });

    it('should return null for expired sessions', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager({ sessionTTLMs: 1 });
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const retrieved = await contextManager.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Message Processing', () => {
    it('should add user message to history', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.addMessage(session, 'user', 'I want to track orders');

      expect(session.history).toHaveLength(1);
      expect(session.history[0].role).toBe('user');
      expect(session.history[0].content).toBe('I want to track orders');
    });

    it('should trim history when it exceeds max messages', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager({ maxHistoryMessages: 5 });
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Add more messages than the limit
      for (let i = 0; i < 10; i++) {
        contextManager.addMessage(session, 'user', `Message ${i}`);
      }

      expect(session.history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Quick Commands', () => {
    it('should detect help command', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();

      expect(parser.quickDetect('help')).toEqual({
        action: 'help',
        confidence: 1.0,
        needsClarification: false
      });
      expect(parser.quickDetect('/help')).toEqual({
        action: 'help',
        confidence: 1.0,
        needsClarification: false
      });
    });

    it('should detect undo command', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();

      expect(parser.quickDetect('undo')).toEqual({
        action: 'undo',
        confidence: 1.0,
        needsClarification: false
      });
    });

    it('should detect deploy command', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();

      const result = parser.quickDetect('deploy');
      expect(result?.action).toBe('deploy');
      expect(result?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect reset/cancel commands', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();

      expect(parser.quickDetect('reset')?.action).toBe('delete');
      expect(parser.quickDetect('cancel')?.action).toBe('delete');
      expect(parser.quickDetect('start over')?.action).toBe('delete');
    });

    it('should return null for non-command messages', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();

      expect(parser.quickDetect('I want to track orders')).toBeNull();
    });
  });

  describe('Workflow Type Detection', () => {
    it('should detect order tracking intent', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();
      const result = parser.quickDetect('track order from my store');

      expect(result?.workflowType).toBe('order_tracking');
      expect(result?.action).toBe('create');
    });

    it('should detect booking intent', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();
      const result = parser.quickDetect('book appointment for my salon');

      expect(result?.workflowType).toBe('booking');
    });

    it('should detect FAQ intent', async () => {
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      resetIntentParser();

      const parser = new IntentParser();
      const result = parser.quickDetect('answer common questions about my business');

      expect(result?.workflowType).toBe('faq');
    });
  });

  describe('State Transitions', () => {
    it('should transition from idle to gathering', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      expect(session.state).toBe('idle');

      contextManager.transitionState(session, 'gathering');

      expect(session.state).toBe('gathering');
    });

    it('should throw error for invalid transitions', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // idle -> deploying is not valid
      expect(() => contextManager.transitionState(session, 'deploying')).toThrow();
    });

    it('should allow valid transition chain', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Valid chain: idle -> gathering -> confirming -> deploying -> complete
      contextManager.transitionState(session, 'gathering');
      expect(session.state).toBe('gathering');

      contextManager.transitionState(session, 'confirming');
      expect(session.state).toBe('confirming');

      contextManager.transitionState(session, 'deploying');
      expect(session.state).toBe('deploying');

      contextManager.transitionState(session, 'complete');
      expect(session.state).toBe('complete');
    });
  });

  describe('Requirement Gathering', () => {
    it('should store requirements', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.addRequirement(session, 'workflowType', 'order_tracking', 'explicit', 0.9);

      expect(session.gatheredRequirements).toHaveLength(1);
      expect(session.gatheredRequirements[0].key).toBe('workflowType');
      expect(session.gatheredRequirements[0].value).toBe('order_tracking');
    });

    it('should replace existing requirement with same key', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.addRequirement(session, 'integration', 'shopify', 'explicit', 0.8);
      contextManager.addRequirement(session, 'integration', 'woocommerce', 'explicit', 0.9);

      expect(session.gatheredRequirements).toHaveLength(1);
      expect(session.gatheredRequirements[0].value).toBe('woocommerce');
    });

    it('should retrieve requirement by key', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.addRequirement(session, 'workflowType', 'booking', 'inferred', 0.7);

      const value = contextManager.getRequirement(session, 'workflowType');
      expect(value).toBe('booking');
    });
  });

  describe('Workflow Management', () => {
    it('should store current workflow', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.updateWorkflow(session, mockBlueprint, false);

      expect(session.currentWorkflow).not.toBeNull();
      expect(session.currentWorkflow?.name).toBe(mockBlueprint.name);
    });

    it('should keep previous versions for undo', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // First workflow
      contextManager.updateWorkflow(session, { ...mockBlueprint, name: 'Version 1' }, false);

      // Second workflow (save version)
      contextManager.updateWorkflow(session, { ...mockBlueprint, name: 'Version 2' }, true);

      expect(session.previousWorkflows).toHaveLength(1);
      expect(session.previousWorkflows[0].name).toBe('Version 1');
    });

    it('should undo to previous workflow', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Create workflow history
      contextManager.updateWorkflow(session, { ...mockBlueprint, name: 'Version 1' }, false);
      contextManager.updateWorkflow(session, { ...mockBlueprint, name: 'Version 2' }, true);
      contextManager.updateWorkflow(session, { ...mockBlueprint, name: 'Version 3' }, true);

      expect(session.currentWorkflow?.name).toBe('Version 3');

      // Undo
      contextManager.undoWorkflow(session);
      expect(session.currentWorkflow?.name).toBe('Version 2');

      // Undo again
      contextManager.undoWorkflow(session);
      expect(session.currentWorkflow?.name).toBe('Version 1');
    });
  });

  describe('Session Stats', () => {
    it('should return session statistics', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();

      // Create multiple sessions
      await contextManager.createSession('user-1', 'bot-1', 'org-1');
      await contextManager.createSession('user-2', 'bot-2', 'org-1');

      const stats = contextManager.getStats();

      expect(stats.activeSessions).toBe(2);
      expect(stats.stateDistribution.idle).toBe(2);
    });
  });
});
