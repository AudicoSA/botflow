/**
 * End-to-End Conversation Flow Tests
 *
 * Tests complete conversation flows from initial request to workflow deployment.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockBlueprint, mockContext } from '../setup.js';
import type { ConversationContext, ParsedIntent } from '../../../types/ai-agent.js';
import type { Blueprint } from '../../../types/workflow.js';

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

// Track conversation turn number for different responses
let turnNumber = 0;

// Mock OpenAI with turn-aware responses
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockImplementation(async ({ messages }) => {
          turnNumber++;
          const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';

          // Generate different responses based on conversation context
          if (lastUserMessage.includes('track order') || lastUserMessage.includes('shopify')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    action: 'create',
                    workflowType: 'order_tracking',
                    entities: [{ type: 'service', value: 'Shopify', originalText: 'shopify', confidence: 0.9, startIndex: 0, endIndex: 7 }],
                    integrations: ['shopify'],
                    requirements: [{ id: 'req_1', category: 'trigger', description: 'Track orders', priority: 'required' }],
                    confidence: 0.85,
                    needsClarification: false
                  })
                }
              }]
            };
          }

          if (lastUserMessage.includes('order number')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    action: 'modify',
                    entities: [{ type: 'data', value: 'order_number', originalText: 'order number', confidence: 0.95, startIndex: 0, endIndex: 12 }],
                    integrations: [],
                    requirements: [{ id: 'req_2', category: 'data', description: 'Use order number for lookup', priority: 'required' }],
                    confidence: 0.9,
                    needsClarification: false
                  })
                }
              }]
            };
          }

          if (lastUserMessage.toLowerCase().includes('yes') || lastUserMessage.toLowerCase().includes('deploy')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    action: 'deploy',
                    confidence: 0.95,
                    needsClarification: false
                  })
                }
              }]
            };
          }

          // For workflow generation
          if (messages.some((m: any) => m.content?.includes('Blueprint') || m.content?.includes('Generate'))) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    bot_id: 'bot-123',
                    version: '1.0.0',
                    name: 'Order Tracking',
                    description: 'Track orders from Shopify',
                    nodes: [
                      { id: '1', type: 'whatsapp_trigger', config: { match_type: 'keyword', keywords: ['track', 'order'] } },
                      { id: '2', type: 'ask_question', config: { message: 'Please enter your order number' } },
                      { id: '3', type: 'shopify_lookup', config: { lookup_type: 'order' } },
                      { id: '4', type: 'send_message', config: { message: 'Your order status: {{node_3.status}}' } }
                    ],
                    edges: [
                      { id: 'e1', source: '1', target: '2' },
                      { id: 'e2', source: '2', target: '3' },
                      { id: 'e3', source: '3', target: '4' }
                    ],
                    variables: {},
                    credentials: ['shopify']
                  })
                }
              }]
            };
          }

          // Default response
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  action: 'unknown',
                  entities: [],
                  integrations: [],
                  requirements: [],
                  confidence: 0.5,
                  needsClarification: true
                })
              }
            }]
          };
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
      { type: 'ask_question', name: 'Ask Question', category: 'actions' },
      { type: 'shopify_lookup', name: 'Shopify Lookup', category: 'integrations' }
    ],
    hasNode: (type: string) => ['whatsapp_trigger', 'send_message', 'ask_question', 'shopify_lookup'].includes(type)
  }),
  NodeLibrary: class {
    hasNode = (type: string) => ['whatsapp_trigger', 'send_message', 'ask_question', 'shopify_lookup'].includes(type);
  }
}));

// Mock template matcher
vi.mock('../../../services/ai-agent/template-matcher.js', () => ({
  getTemplateMatcher: vi.fn().mockReturnValue({
    findMatches: vi.fn().mockResolvedValue([]),
    findBestMatch: vi.fn().mockResolvedValue(null)
  }),
  TemplateMatcherService: class {
    findMatches = vi.fn().mockResolvedValue([]);
    findBestMatch = vi.fn().mockResolvedValue(null);
  }
}));

describe('E2E: Complete Conversation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    turnNumber = 0;
  });

  describe('Order Tracking Bot Creation Flow', () => {
    it('should complete full order tracking bot creation', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');

      resetContextManager();
      resetIntentParser();
      resetWorkflowGenerator();

      const contextManager = new ContextManager();
      const intentParser = new IntentParser();
      const workflowGenerator = new WorkflowGenerator();

      // Step 1: Create session and initial request
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');
      contextManager.addMessage(ctx, 'user', 'I want to track orders from Shopify');
      contextManager.transitionState(ctx, 'gathering');

      expect(ctx.state).toBe('gathering');

      // Step 2: Parse intent
      const intent = await intentParser.parse('I want to track orders from Shopify', ctx);

      expect(intent.workflowType).toBe('order_tracking');
      expect(intent.integrations).toContain('shopify');
      expect(intent.confidence).toBeGreaterThan(0.7);

      // Step 3: Store requirements
      if (intent.workflowType) {
        contextManager.addRequirement(ctx, 'workflowType', intent.workflowType, 'inferred', intent.confidence);
      }
      if (intent.integrations.length > 0) {
        contextManager.addRequirement(ctx, 'integrations', intent.integrations, 'inferred', intent.confidence);
      }

      expect(ctx.gatheredRequirements.length).toBeGreaterThan(0);

      // Step 4: Generate workflow
      const result = await workflowGenerator.generateFromIntent(intent, ctx);

      expect(result.success).toBe(true);
      expect(result.workflow).not.toBeNull();
      expect(result.workflow?.nodes.length).toBeGreaterThan(0);

      // Step 5: Store workflow and transition to confirming
      if (result.workflow) {
        contextManager.updateWorkflow(ctx, result.workflow, false);
        contextManager.transitionState(ctx, 'confirming');
      }

      expect(ctx.state).toBe('confirming');
      expect(ctx.currentWorkflow).not.toBeNull();

      // Step 6: User confirms
      contextManager.addMessage(ctx, 'assistant', 'Here is your workflow. Ready to deploy?');
      contextManager.addMessage(ctx, 'user', 'Yes, deploy it');

      // Step 7: Deploy
      contextManager.transitionState(ctx, 'deploying');
      expect(ctx.state).toBe('deploying');

      // Step 8: Complete
      contextManager.transitionState(ctx, 'complete');
      expect(ctx.state).toBe('complete');

      // Verify final state
      expect(ctx.currentWorkflow?.nodes.length).toBeGreaterThan(0);
      expect(ctx.history.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Workflow Refinement Flow', () => {
    it('should handle undo during refinement', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Setup initial workflow
      const v1: Blueprint = { ...mockBlueprint, name: 'Version 1' };
      contextManager.updateWorkflow(ctx, v1, false);
      contextManager.transitionState(ctx, 'gathering');
      contextManager.transitionState(ctx, 'confirming');

      // User requests modification
      contextManager.transitionState(ctx, 'refining');

      // Create modified version
      const v2: Blueprint = { ...mockBlueprint, name: 'Version 2', nodes: [...mockBlueprint.nodes, { id: 'new', type: 'delay' }] };
      contextManager.updateWorkflow(ctx, v2, true);

      expect(ctx.currentWorkflow?.name).toBe('Version 2');
      expect(ctx.previousWorkflows).toHaveLength(1);

      // User says undo
      contextManager.undoWorkflow(ctx);

      expect(ctx.currentWorkflow?.name).toBe('Version 1');
      expect(ctx.previousWorkflows).toHaveLength(0);
    });

    it('should handle multiple refinements', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Initial workflow
      contextManager.updateWorkflow(ctx, { ...mockBlueprint, name: 'V1' }, false);
      contextManager.transitionState(ctx, 'gathering');
      contextManager.transitionState(ctx, 'confirming');

      // Multiple refinements
      for (let i = 2; i <= 5; i++) {
        contextManager.transitionState(ctx, 'refining');
        contextManager.updateWorkflow(ctx, { ...mockBlueprint, name: `V${i}` }, true);
        contextManager.transitionState(ctx, 'confirming');
      }

      expect(ctx.currentWorkflow?.name).toBe('V5');
      expect(ctx.previousWorkflows.length).toBe(4);

      // Undo all the way back
      for (let i = 4; i >= 1; i--) {
        contextManager.undoWorkflow(ctx);
        expect(ctx.currentWorkflow?.name).toBe(`V${i}`);
      }
    });
  });

  describe('Error Recovery Flow', () => {
    it('should recover from error state', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Simulate error during workflow creation
      contextManager.transitionState(ctx, 'gathering');
      contextManager.transitionState(ctx, 'error');

      expect(ctx.state).toBe('error');

      // User wants to start over
      contextManager.transitionState(ctx, 'idle');

      expect(ctx.state).toBe('idle');

      // Can continue building
      contextManager.transitionState(ctx, 'gathering');

      expect(ctx.state).toBe('gathering');
    });

    it('should preserve context after error recovery', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1', {
        vertical: 'ecommerce'
      });

      // Add some context before error
      contextManager.addMessage(ctx, 'user', 'Track orders');
      contextManager.addRequirement(ctx, 'workflowType', 'order_tracking', 'inferred', 0.8);
      contextManager.transitionState(ctx, 'gathering');
      contextManager.transitionState(ctx, 'error');

      // User recovers
      contextManager.transitionState(ctx, 'gathering');

      // Preferences should be preserved
      expect(ctx.userPreferences.vertical).toBe('ecommerce');

      // Message history should be preserved
      expect(ctx.history.length).toBeGreaterThan(0);

      // Requirements should be preserved
      expect(ctx.gatheredRequirements.some(r => r.key === 'workflowType')).toBe(true);
    });
  });

  describe('Session Persistence Flow', () => {
    it('should persist and retrieve session across updates', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetContextManager();

      const contextManager = new ContextManager();

      // Create and modify session
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');
      const sessionId = ctx.sessionId;

      contextManager.addMessage(ctx, 'user', 'Hello');
      contextManager.addRequirement(ctx, 'test', 'value', 'explicit', 1.0);
      contextManager.transitionState(ctx, 'gathering');
      await contextManager.updateSession(ctx);

      // Retrieve session
      const retrieved = await contextManager.getSession(sessionId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.sessionId).toBe(sessionId);
      expect(retrieved?.state).toBe('gathering');
      expect(retrieved?.history).toHaveLength(1);
      expect(retrieved?.gatheredRequirements).toHaveLength(1);
    });
  });

  describe('Conversation Flow with Template Matching', () => {
    it('should handle template acceptance flow', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetContextManager();

      const contextManager = new ContextManager();
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Simulate template being suggested
      contextManager.addRequirement(ctx, 'suggestedTemplate', {
        matches: [{ template: { slug: 'order-tracking', name: 'Order Tracking' }, score: 0.8 }],
        selectedIndex: null
      }, 'inferred', 0.8);

      contextManager.transitionState(ctx, 'gathering');

      // User accepts template
      contextManager.addMessage(ctx, 'user', 'Use this template');

      // System instantiates template (simulated)
      const templateWorkflow: Blueprint = {
        ...mockBlueprint,
        name: 'Order Tracking (from template)'
      };
      contextManager.updateWorkflow(ctx, templateWorkflow, false);
      contextManager.transitionState(ctx, 'confirming');

      // Remove template suggestion
      ctx.gatheredRequirements = ctx.gatheredRequirements.filter(r => r.key !== 'suggestedTemplate');

      expect(ctx.state).toBe('confirming');
      expect(ctx.currentWorkflow?.name).toContain('template');
      expect(ctx.gatheredRequirements.some(r => r.key === 'suggestedTemplate')).toBe(false);
    });
  });

  describe('Complete Happy Path', () => {
    it('should complete full conversation from start to deployed', async () => {
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');
      const { IntentParser, resetIntentParser } = await import('../../../services/ai-agent/intent-parser.js');
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');

      resetContextManager();
      resetIntentParser();
      resetWorkflowGenerator();

      const contextManager = new ContextManager();
      const intentParser = new IntentParser();
      const workflowGenerator = new WorkflowGenerator();

      // Turn 1: User initiates
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');
      contextManager.addMessage(ctx, 'user', 'I want to track orders from Shopify');

      const intent1 = await intentParser.parse('I want to track orders from Shopify', ctx);
      contextManager.addRequirement(ctx, 'workflowType', intent1.workflowType, 'inferred', intent1.confidence);
      contextManager.addRequirement(ctx, 'integrations', intent1.integrations, 'inferred', intent1.confidence);
      contextManager.transitionState(ctx, 'gathering');

      // Turn 2: System asks clarifying question
      contextManager.addMessage(ctx, 'assistant', 'How should customers identify their orders - by order number or email?');

      // Turn 3: User answers
      contextManager.addMessage(ctx, 'user', 'By order number');
      const intent2 = await intentParser.parse('By order number', ctx);
      contextManager.addRequirement(ctx, 'lookup_method', 'order_number', 'explicit', 0.95);

      // Turn 4: Generate workflow
      const result = await workflowGenerator.generateFromIntent(intent1, ctx);
      expect(result.success).toBe(true);

      if (result.workflow) {
        contextManager.updateWorkflow(ctx, result.workflow, false);
        contextManager.transitionState(ctx, 'confirming');
      }

      contextManager.addMessage(ctx, 'assistant', 'I\'ve created your workflow. Does this look good?');

      // Turn 5: User confirms
      contextManager.addMessage(ctx, 'user', 'Yes, deploy it');

      // Turn 6: Deploy
      contextManager.transitionState(ctx, 'deploying');
      contextManager.transitionState(ctx, 'complete');

      contextManager.addMessage(ctx, 'assistant', 'Your bot is now live!');

      // Final assertions
      expect(ctx.state).toBe('complete');
      expect(ctx.currentWorkflow).not.toBeNull();
      expect(ctx.history.length).toBeGreaterThanOrEqual(5);
      expect(ctx.gatheredRequirements.length).toBeGreaterThanOrEqual(2);
    });
  });
});
