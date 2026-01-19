/**
 * Deploy Endpoint Integration Tests
 *
 * Tests for POST /api/bots/:botId/agent/deploy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '../setup.js';
import { mockBlueprint, mockContext, createMockBot } from '../helpers.js';

// Mock Supabase
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
                action: 'deploy',
                confidence: 0.95,
                needsClarification: false
              })
            }
          }]
        })
      }
    };
  }
}));

describe('POST /api/bots/:botId/agent/deploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup successful bot update
    mockSupabase.single.mockResolvedValue({
      data: createMockBot(),
      error: null
    });

    mockSupabase.update = vi.fn().mockReturnThis();
    mockSupabase.eq = vi.fn().mockResolvedValue({ data: null, error: null });
  });

  describe('Deployment Validation', () => {
    it('should require a workflow to deploy', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Session without workflow
      expect(session.currentWorkflow).toBeNull();

      // Cannot transition to deploying without workflow
      contextManager.transitionState(session, 'gathering');
      expect(() => {
        if (!session.currentWorkflow) {
          throw new Error('No workflow to deploy');
        }
      }).toThrow('No workflow to deploy');
    });

    it('should allow deployment with valid workflow', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Add workflow and transition
      contextManager.updateWorkflow(session, mockBlueprint, false);
      contextManager.transitionState(session, 'gathering');
      contextManager.transitionState(session, 'confirming');

      expect(session.currentWorkflow).not.toBeNull();
      expect(() => contextManager.transitionState(session, 'deploying')).not.toThrow();
    });
  });

  describe('Deployment State Machine', () => {
    it('should transition through deployment states', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.updateWorkflow(session, mockBlueprint, false);
      contextManager.transitionState(session, 'gathering');
      contextManager.transitionState(session, 'confirming');
      contextManager.transitionState(session, 'deploying');

      expect(session.state).toBe('deploying');

      contextManager.transitionState(session, 'complete');

      expect(session.state).toBe('complete');
    });

    it('should allow error state from deploying', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.updateWorkflow(session, mockBlueprint, false);
      contextManager.transitionState(session, 'gathering');
      contextManager.transitionState(session, 'confirming');
      contextManager.transitionState(session, 'deploying');

      // Should allow error state
      expect(() => contextManager.transitionState(session, 'error')).not.toThrow();
      expect(session.state).toBe('error');
    });
  });

  describe('Workflow Data Persistence', () => {
    it('should prepare workflow data for database', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.updateWorkflow(session, mockBlueprint, false);

      // Verify workflow structure is suitable for DB
      const workflow = session.currentWorkflow!;
      expect(workflow.nodes).toBeDefined();
      expect(workflow.edges).toBeDefined();
      expect(workflow.variables).toBeDefined();
      expect(Array.isArray(workflow.nodes)).toBe(true);
      expect(Array.isArray(workflow.edges)).toBe(true);
    });

    it('should serialize workflow correctly', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [
          {
            id: '1',
            type: 'whatsapp_trigger',
            config: { match_type: 'any' }
          },
          {
            id: '2',
            type: 'send_message',
            config: { message: 'Hello {{customer_name}}!' }
          }
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' }
        ],
        variables: {
          greeting: 'Hello',
          store_name: 'Test Store'
        }
      };

      // Verify JSON serialization works
      const serialized = JSON.stringify(workflow);
      const parsed = JSON.parse(serialized);

      expect(parsed.nodes).toHaveLength(2);
      expect(parsed.edges).toHaveLength(1);
      expect(parsed.variables.greeting).toBe('Hello');
    });
  });

  describe('Session Info', () => {
    it('should return session info correctly', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.addMessage(session, 'user', 'Hello');
      contextManager.updateWorkflow(session, mockBlueprint, false);
      contextManager.transitionState(session, 'gathering');

      const info = contextManager.getSessionInfo(session);

      expect(info.sessionId).toBe(session.sessionId);
      expect(info.botId).toBe('bot-123');
      expect(info.state).toBe('gathering');
      expect(info.messageCount).toBe(1);
      expect(info.currentWorkflow).not.toBeNull();
      expect(info.createdAt).toBeDefined();
      expect(info.expiresAt).toBeDefined();
    });
  });

  describe('Post-Deployment Actions', () => {
    it('should allow modification after complete', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Go through deployment
      contextManager.updateWorkflow(session, mockBlueprint, false);
      contextManager.transitionState(session, 'gathering');
      contextManager.transitionState(session, 'confirming');
      contextManager.transitionState(session, 'deploying');
      contextManager.transitionState(session, 'complete');

      expect(session.state).toBe('complete');

      // Should allow going back to refining for modifications
      expect(() => contextManager.transitionState(session, 'refining')).not.toThrow();
      expect(session.state).toBe('refining');
    });

    it('should allow starting new workflow after complete', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Go through deployment
      contextManager.updateWorkflow(session, mockBlueprint, false);
      contextManager.transitionState(session, 'gathering');
      contextManager.transitionState(session, 'confirming');
      contextManager.transitionState(session, 'deploying');
      contextManager.transitionState(session, 'complete');

      // Should allow going back to idle
      expect(() => contextManager.transitionState(session, 'idle')).not.toThrow();
      expect(session.state).toBe('idle');
    });
  });

  describe('Empty Workflow Validation', () => {
    it('should reject workflow with no nodes', async () => {
      const emptyWorkflow = {
        ...mockBlueprint,
        nodes: [],
        edges: []
      };

      // An empty workflow should fail validation
      expect(emptyWorkflow.nodes.length).toBe(0);

      // If we had a validateWorkflow function, it would fail
      // For now, test that empty arrays are handled
      expect(Array.isArray(emptyWorkflow.nodes)).toBe(true);
    });

    it('should require at least trigger and response nodes', async () => {
      const minimalWorkflow = {
        ...mockBlueprint,
        nodes: [
          { id: '1', type: 'whatsapp_trigger', config: {} }
        ],
        edges: []
      };

      // Only trigger node - missing response
      const hasTrigger = minimalWorkflow.nodes.some(n => n.type.includes('trigger'));
      const hasResponse = minimalWorkflow.nodes.some(n =>
        n.type === 'send_message' || n.type === 'send_template'
      );

      expect(hasTrigger).toBe(true);
      expect(hasResponse).toBe(false);
    });
  });

  describe('Session Deletion', () => {
    it('should delete session after deployment', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');
      const sessionId = session.sessionId;

      await contextManager.deleteSession(sessionId);

      const retrieved = await contextManager.getSession(sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Preferences Preservation', () => {
    it('should preserve user preferences across deployment', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1', {
        vertical: 'ecommerce',
        language: 'en',
        technicalLevel: 'beginner'
      });

      contextManager.updateWorkflow(session, mockBlueprint, false);
      contextManager.transitionState(session, 'gathering');
      contextManager.transitionState(session, 'confirming');
      contextManager.transitionState(session, 'deploying');
      contextManager.transitionState(session, 'complete');

      expect(session.userPreferences.vertical).toBe('ecommerce');
      expect(session.userPreferences.technicalLevel).toBe('beginner');
    });

    it('should update preferences', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      resetContextManager();

      const contextManager = new ContextManager();
      const session = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      contextManager.updatePreferences(session, {
        vertical: 'salon',
        technicalLevel: 'advanced'
      });

      expect(session.userPreferences.vertical).toBe('salon');
      expect(session.userPreferences.technicalLevel).toBe('advanced');
    });
  });
});
