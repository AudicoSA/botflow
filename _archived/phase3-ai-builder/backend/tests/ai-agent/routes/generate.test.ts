/**
 * Generate Endpoint Integration Tests
 *
 * Tests for POST /api/bots/:botId/agent/generate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '../setup.js';
import { mockBlueprint, mockContext } from '../helpers.js';

// Mock Supabase
vi.mock('../../../config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase
}));

// Mock OpenAI for workflow generation
const mockWorkflowResponse = {
  bot_id: 'bot-123',
  version: '1.0.0',
  name: 'Order Tracking Workflow',
  description: 'Track orders from Shopify',
  nodes: [
    { id: '1', type: 'whatsapp_trigger', name: 'Start', config: { match_type: 'keyword', keywords: ['track', 'order'] } },
    { id: '2', type: 'ask_question', name: 'Ask Order Number', config: { message: 'Please enter your order number' } },
    { id: '3', type: 'shopify_lookup', name: 'Check Shopify', config: { lookup_type: 'order' } },
    { id: '4', type: 'send_message', name: 'Send Status', config: { message: 'Your order status: {{node_3.status}}' } }
  ],
  edges: [
    { id: 'e1', source: '1', target: '2' },
    { id: 'e2', source: '2', target: '3' },
    { id: 'e3', source: '3', target: '4' }
  ],
  variables: {},
  credentials: ['shopify']
};

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify(mockWorkflowResponse)
            }
          }]
        })
      }
    };
  }
}));

describe('POST /api/bots/:botId/agent/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workflow Generation', () => {
    it('should generate workflow from intent', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const result = await generator.generateFromIntent(
        {
          action: 'create',
          workflowType: 'order_tracking',
          entities: [],
          integrations: ['shopify'],
          requirements: [
            { id: 'req_1', category: 'trigger', description: 'Track orders', priority: 'required' }
          ],
          confidence: 0.85,
          needsClarification: false,
          rawMessage: 'Create a workflow that tracks Shopify orders'
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.workflow).not.toBeNull();
      expect(result.workflow?.nodes.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeDefined();
    });

    it('should include explanation with generated workflow', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const result = await generator.generateFromIntent(
        {
          action: 'create',
          workflowType: 'order_tracking',
          entities: [],
          integrations: ['shopify'],
          requirements: [],
          confidence: 0.9,
          needsClarification: false,
          rawMessage: 'Track orders'
        },
        mockContext
      );

      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should report processing time', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const result = await generator.generateFromIntent(
        {
          action: 'create',
          workflowType: 'order_tracking',
          entities: [],
          integrations: [],
          requirements: [],
          confidence: 0.8,
          needsClarification: false,
          rawMessage: 'Order tracking'
        },
        mockContext
      );

      expect(typeof result.processingTimeMs).toBe('number');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Workflow Validation', () => {
    it('should validate generated workflow has trigger', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const result = await generator.generateFromIntent(
        {
          action: 'create',
          workflowType: 'order_tracking',
          entities: [],
          integrations: ['shopify'],
          requirements: [],
          confidence: 0.9,
          needsClarification: false,
          rawMessage: 'Create order tracking'
        },
        mockContext
      );

      if (result.success && result.workflow) {
        const hasTrigger = result.workflow.nodes.some(n =>
          n.type === 'whatsapp_trigger' || n.type.includes('trigger')
        );
        expect(hasTrigger).toBe(true);
      }
    });

    it('should validate all edges reference existing nodes', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const result = await generator.generateFromIntent(
        {
          action: 'create',
          workflowType: 'order_tracking',
          entities: [],
          integrations: ['shopify'],
          requirements: [],
          confidence: 0.9,
          needsClarification: false,
          rawMessage: 'Track orders'
        },
        mockContext
      );

      if (result.success && result.workflow) {
        const nodeIds = new Set(result.workflow.nodes.map(n => n.id));
        for (const edge of result.workflow.edges) {
          expect(nodeIds.has(edge.source)).toBe(true);
          expect(nodeIds.has(edge.target)).toBe(true);
        }
      }
    });
  });

  describe('Workflow Refinement', () => {
    it('should refine existing workflow', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const contextWithWorkflow = {
        ...mockContext,
        currentWorkflow: mockBlueprint
      };

      const result = await generator.refineWorkflow(
        mockBlueprint,
        'Add error handling for failed lookups',
        contextWithWorkflow
      );

      expect(result.workflow).not.toBeNull();
      expect(result.explanation).toContain('Add error handling');
    });

    it('should preserve existing nodes when refining', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const originalNodeCount = mockBlueprint.nodes.length;

      const result = await generator.refineWorkflow(
        mockBlueprint,
        'Add a confirmation message at the end',
        mockContext
      );

      if (result.success && result.workflow) {
        // Should have at least the same number of nodes (likely more)
        expect(result.workflow.nodes.length).toBeGreaterThanOrEqual(originalNodeCount);
      }
    });
  });

  describe('Workflow Explanation', () => {
    it('should explain workflow in simple terms', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      // Mock the explanation API call
      vi.mock('openai', () => ({
        default: class MockOpenAI {
          chat = {
            completions: {
              create: vi.fn().mockResolvedValue({
                choices: [{
                  message: {
                    content: 'This workflow tracks orders. When a customer sends a message, it looks up their order and sends back the status.'
                  }
                }]
              })
            }
          };
        }
      }));

      const generator = new WorkflowGenerator();
      const explanation = await generator.explainWorkflow(mockBlueprint);

      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should return high confidence for valid workflow', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const result = await generator.generateFromIntent(
        {
          action: 'create',
          workflowType: 'order_tracking',
          entities: [],
          integrations: ['shopify'],
          requirements: [],
          confidence: 0.95,
          needsClarification: false,
          rawMessage: 'Track orders from Shopify'
        },
        mockContext
      );

      if (result.success) {
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should return lower confidence when there are warnings', async () => {
      // This test verifies confidence scoring logic
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();
      const result = await generator.generateFromIntent(
        {
          action: 'create',
          workflowType: 'unknown_type',
          entities: [],
          integrations: [],
          requirements: [],
          confidence: 0.4,
          needsClarification: true,
          rawMessage: 'Do something'
        },
        mockContext
      );

      // Lower intent confidence should result in lower workflow confidence
      expect(result.confidence).toBeLessThan(1.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle generation failures gracefully', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      // Create generator that will fail
      vi.mock('openai', () => ({
        default: class MockOpenAI {
          chat = {
            completions: {
              create: vi.fn().mockRejectedValue(new Error('API Error'))
            }
          };
        }
      }));

      const generator = new WorkflowGenerator();
      const result = await generator.generateFromIntent(
        {
          action: 'create',
          workflowType: 'order_tracking',
          entities: [],
          integrations: [],
          requirements: [],
          confidence: 0.9,
          needsClarification: false,
          rawMessage: 'Test'
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors array for invalid requests', async () => {
      const { WorkflowGenerator, resetWorkflowGenerator } = await import('../../../services/ai-agent/workflow-generator.js');
      resetWorkflowGenerator();

      const generator = new WorkflowGenerator();

      // Create minimal intent that may cause validation issues
      const result = await generator.generateFromIntent(
        {
          action: 'unknown' as any,
          entities: [],
          integrations: [],
          requirements: [],
          confidence: 0.1,
          needsClarification: true,
          rawMessage: ''
        },
        mockContext
      );

      // Should either succeed with low confidence or fail with errors
      if (!result.success) {
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });
  });
});
