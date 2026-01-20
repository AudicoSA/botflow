/**
 * Conversation Engine + Context Manager Integration Tests
 *
 * Tests the interaction between ConversationEngine and ContextManager services.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockBlueprint, mockIntent, mockContext } from '../setup.js';

// Mock dependencies
vi.mock('../../../config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase
}));

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
                entities: [{ type: 'service', value: 'Shopify', originalText: 'shopify', confidence: 0.9, startIndex: 0, endIndex: 7 }],
                integrations: ['shopify'],
                requirements: [],
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

// Mock node library
vi.mock('../../../services/node-library.js', () => ({
  getNodeLibrary: vi.fn().mockResolvedValue({
    listNodes: () => [
      { type: 'whatsapp_trigger', name: 'WhatsApp Trigger', category: 'triggers' },
      { type: 'send_message', name: 'Send Message', category: 'actions' },
      { type: 'shopify_lookup', name: 'Shopify Lookup', category: 'integrations' }
    ],
    hasNode: (type: string) => ['whatsapp_trigger', 'send_message', 'shopify_lookup'].includes(type)
  })
}));

describe('ConversationEngine + ContextManager Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Context Persistence Across Turns', () => {
    it('should maintain context across conversation turns', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const sessionId = 'test-session';
      const botId = 'bot-123';

      // First turn - create session
      const ctx1 = await contextManager.createSession('user-1', botId, 'org-1');
      contextManager.addMessage(ctx1, 'user', 'I want to track orders');
      contextManager.addRequirement(ctx1, 'workflowType', 'order_tracking', 'inferred', 0.8);
      contextManager.transitionState(ctx1, 'gathering');
      await contextManager.updateSession(ctx1);

      // Second turn - retrieve session
      const ctx2 = await contextManager.getSession(ctx1.sessionId);
      expect(ctx2).not.toBeNull();
      expect(ctx2?.state).toBe('gathering');
      expect(ctx2?.history).toHaveLength(1);
      expect(ctx2?.gatheredRequirements.some(r => r.key === 'workflowType')).toBe(true);

      // Add more context
      contextManager.addMessage(ctx2!, 'assistant', 'Which e-commerce platform do you use?');
      contextManager.addMessage(ctx2!, 'user', 'Shopify');
      contextManager.addRequirement(ctx2!, 'integration', 'shopify', 'explicit', 0.95);
      await contextManager.updateSession(ctx2!);

      // Third turn - verify all context is maintained
      const ctx3 = await contextManager.getSession(ctx1.sessionId);
      expect(ctx3?.history).toHaveLength(3);
      expect(ctx3?.gatheredRequirements).toHaveLength(2);
    });

    it('should handle session expiration correctly', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      // Create manager with very short TTL
      const contextManager = new ContextManager({ sessionTTLMs: 50 });
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Add some context
      contextManager.addMessage(ctx, 'user', 'Test message');
      contextManager.transitionState(ctx, 'gathering');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Session should be expired
      const expired = await contextManager.getSession(ctx.sessionId);
      expect(expired).toBeNull();
    });

    it('should extend session TTL on update', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager({ sessionTTLMs: 200 });
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');
      const originalExpiry = ctx.expiresAt.getTime();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update session
      await contextManager.updateSession(ctx);

      // Expiry should be extended
      expect(ctx.expiresAt.getTime()).toBeGreaterThan(originalExpiry);
    });
  });

  describe('Workflow Versioning', () => {
    it('should track workflow versions for undo', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Version 1
      const v1 = { ...mockBlueprint, name: 'Version 1', nodes: [...mockBlueprint.nodes] };
      contextManager.updateWorkflow(ctx, v1, false);

      // Version 2
      const v2 = { ...mockBlueprint, name: 'Version 2', nodes: [...mockBlueprint.nodes, { id: 'new', type: 'send_message' }] };
      contextManager.updateWorkflow(ctx, v2, true);

      // Version 3
      const v3 = { ...mockBlueprint, name: 'Version 3', nodes: [...v2.nodes, { id: 'newer', type: 'delay' }] };
      contextManager.updateWorkflow(ctx, v3, true);

      expect(ctx.previousWorkflows).toHaveLength(2);
      expect(ctx.currentWorkflow?.name).toBe('Version 3');

      // Undo to version 2
      contextManager.undoWorkflow(ctx);
      expect(ctx.currentWorkflow?.name).toBe('Version 2');

      // Undo to version 1
      contextManager.undoWorkflow(ctx);
      expect(ctx.currentWorkflow?.name).toBe('Version 1');
    });

    it('should limit workflow version history', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager({ maxWorkflowVersions: 3 });
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Create more versions than the limit
      for (let i = 0; i < 5; i++) {
        contextManager.updateWorkflow(ctx, { ...mockBlueprint, name: `Version ${i}` }, i > 0);
      }

      // Should only keep the last 3 versions
      expect(ctx.previousWorkflows.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Message History Management', () => {
    it('should maintain message chronological order', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.addMessage(ctx, 'user', 'First');
      await new Promise(resolve => setTimeout(resolve, 10));
      contextManager.addMessage(ctx, 'assistant', 'Second');
      await new Promise(resolve => setTimeout(resolve, 10));
      contextManager.addMessage(ctx, 'user', 'Third');

      expect(ctx.history[0].content).toBe('First');
      expect(ctx.history[1].content).toBe('Second');
      expect(ctx.history[2].content).toBe('Third');

      // Verify timestamps are in order
      for (let i = 1; i < ctx.history.length; i++) {
        expect(ctx.history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          ctx.history[i - 1].timestamp.getTime()
        );
      }
    });

    it('should get relevant history subset', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Add many messages
      for (let i = 0; i < 20; i++) {
        contextManager.addMessage(ctx, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`);
      }

      // Get last 5 messages
      const relevant = contextManager.getRelevantHistory(ctx, 5);

      expect(relevant).toHaveLength(5);
      expect(relevant[4].content).toBe('Message 19');
    });
  });

  describe('Integration with Requirements', () => {
    it('should track requirements with confidence scores', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Explicit requirement (high confidence)
      contextManager.addRequirement(ctx, 'integration', 'shopify', 'explicit', 0.95);

      // Inferred requirement (lower confidence)
      contextManager.addRequirement(ctx, 'workflowType', 'order_tracking', 'inferred', 0.7);

      const integrationReq = ctx.gatheredRequirements.find(r => r.key === 'integration');
      const typeReq = ctx.gatheredRequirements.find(r => r.key === 'workflowType');

      expect(integrationReq?.confidence).toBe(0.95);
      expect(integrationReq?.source).toBe('explicit');
      expect(typeReq?.confidence).toBe(0.7);
      expect(typeReq?.source).toBe('inferred');
    });

    it('should update requirement when same key is added', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Initial requirement
      contextManager.addRequirement(ctx, 'platform', 'shopify', 'inferred', 0.6);

      // Updated requirement with higher confidence
      contextManager.addRequirement(ctx, 'platform', 'woocommerce', 'explicit', 0.95);

      // Should only have one requirement with this key
      const platformReqs = ctx.gatheredRequirements.filter(r => r.key === 'platform');
      expect(platformReqs).toHaveLength(1);
      expect(platformReqs[0].value).toBe('woocommerce');
      expect(platformReqs[0].confidence).toBe(0.95);
    });
  });

  describe('Available Integrations', () => {
    it('should load available integrations for organization', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Should have default integrations loaded
      expect(ctx.availableIntegrations.length).toBeGreaterThan(0);

      // Check for common SA integrations
      const hasPayFast = ctx.availableIntegrations.some(i => i.slug === 'payfast');
      const hasShopify = ctx.availableIntegrations.some(i => i.slug === 'shopify');

      expect(hasPayFast).toBe(true);
      expect(hasShopify).toBe(true);
    });

    it('should distinguish enabled vs available integrations', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // By default, integrations are not enabled
      const enabledIntegrations = ctx.availableIntegrations.filter(i => i.isEnabled);
      expect(enabledIntegrations.length).toBe(0);
    });
  });

  describe('Pending Questions', () => {
    it('should manage pending questions', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      const questions = [
        { id: 'q1', text: 'Which platform?', type: 'choice' as const, options: ['Shopify', 'WooCommerce'], required: true },
        { id: 'q2', text: 'Store name?', type: 'open' as const, required: true }
      ];

      contextManager.setPendingQuestions(ctx, questions);

      expect(ctx.pendingQuestions).toHaveLength(2);
      expect(ctx.pendingQuestions[0].id).toBe('q1');

      contextManager.clearPendingQuestions(ctx);

      expect(ctx.pendingQuestions).toHaveLength(0);
    });
  });

  describe('User Preferences', () => {
    it('should create session with custom preferences', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1', {
        vertical: 'ecommerce',
        language: 'en',
        technicalLevel: 'advanced'
      });

      expect(ctx.userPreferences.vertical).toBe('ecommerce');
      expect(ctx.userPreferences.technicalLevel).toBe('advanced');
    });

    it('should update preferences during conversation', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Initially beginner
      expect(ctx.userPreferences.technicalLevel).toBe('beginner');

      // Update to advanced
      contextManager.updatePreferences(ctx, { technicalLevel: 'advanced' });

      expect(ctx.userPreferences.technicalLevel).toBe('advanced');
    });
  });
});
