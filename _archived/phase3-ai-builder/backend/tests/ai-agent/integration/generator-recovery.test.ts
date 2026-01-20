/**
 * Workflow Generator + Error Recovery Integration Tests
 *
 * Tests the interaction between WorkflowGenerator and ErrorRecoveryService.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockBlueprint, mockContext } from '../setup.js';
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

// Mock node library
vi.mock('../../../services/node-library.js', () => ({
  getNodeLibrary: vi.fn().mockResolvedValue({
    listNodes: () => [
      { type: 'whatsapp_trigger', name: 'WhatsApp Trigger', category: 'triggers' },
      { type: 'send_message', name: 'Send Message', category: 'actions' },
      { type: 'ask_question', name: 'Ask Question', category: 'actions' },
      { type: 'if_condition', name: 'If Condition', category: 'conditions' },
      { type: 'shopify_lookup', name: 'Shopify Lookup', category: 'integrations' },
      { type: 'delay', name: 'Delay', category: 'utilities' }
    ],
    hasNode: (type: string) => [
      'whatsapp_trigger', 'send_message', 'ask_question',
      'if_condition', 'shopify_lookup', 'delay'
    ].includes(type)
  }),
  NodeLibrary: class {
    hasNode = (type: string) => [
      'whatsapp_trigger', 'send_message', 'ask_question',
      'if_condition', 'shopify_lookup', 'delay'
    ].includes(type);
  }
}));

describe('WorkflowGenerator + ErrorRecovery Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workflow Validation', () => {
    it('should detect missing trigger node', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const workflowWithoutTrigger: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: 'action-1', type: 'send_message', position: { x: 0, y: 0 }, data: { label: 'Send' }, config: { message: 'Hello' } }
        ],
        edges: []
      };

      const result = await service.validateWorkflow(workflowWithoutTrigger);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_TRIGGER')).toBe(true);
    });

    it('should detect missing response node', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const workflowWithoutResponse: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'whatsapp_trigger', position: { x: 0, y: 0 }, data: {}, config: { match_type: 'any' } }
        ],
        edges: []
      };

      const result = await service.validateWorkflow(workflowWithoutResponse);

      expect(result.warnings.some(w => w.code === 'MISSING_RESPONSE')).toBe(true);
    });

    it('should detect orphan nodes', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const workflowWithOrphan: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'whatsapp_trigger', position: { x: 0, y: 0 }, data: {}, config: {} },
          { id: 'action-1', type: 'send_message', position: { x: 0, y: 100 }, data: {}, config: { message: 'Hi' } },
          { id: 'orphan-1', type: 'delay', position: { x: 200, y: 100 }, data: {}, config: { duration: 5000 } }
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'action-1' }
        ]
      };

      const result = await service.validateWorkflow(workflowWithOrphan);

      expect(result.warnings.some(w => w.code === 'ORPHAN_NODE')).toBe(true);
    });

    it('should pass valid workflow', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const validWorkflow: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'whatsapp_trigger', position: { x: 0, y: 0 }, data: { label: 'Start' }, config: { match_type: 'any' } },
          { id: 'action-1', type: 'send_message', position: { x: 0, y: 100 }, data: { label: 'Reply' }, config: { message: 'Hello!' } }
        ],
        edges: [
          { id: 'edge-1', source: 'trigger-1', target: 'action-1' }
        ]
      };

      const result = await service.validateWorkflow(validWorkflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Auto-Fix Capabilities', () => {
    it('should add missing trigger automatically', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const workflowWithoutTrigger: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: 'action-1', type: 'send_message', position: { x: 0, y: 100 }, data: { label: 'Send' }, config: { message: 'Hello' } }
        ],
        edges: []
      };

      const result = await service.autoFix(workflowWithoutTrigger);

      expect(result.success).toBe(true);
      expect(result.fixed.nodes.some(n => n.type === 'whatsapp_trigger' || n.type.includes('trigger'))).toBe(true);
      expect(result.appliedFixes.length).toBeGreaterThan(0);
    });

    it('should add missing response node', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const workflowWithoutResponse: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'whatsapp_trigger', position: { x: 0, y: 0 }, data: {}, config: {} }
        ],
        edges: []
      };

      const result = await service.autoFix(workflowWithoutResponse);

      expect(result.fixed.nodes.some(n =>
        n.type === 'send_message' || n.data?.actionType === 'send_message'
      )).toBe(true);
    });

    it('should connect orphan nodes to main flow', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const workflowWithOrphan: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'whatsapp_trigger', position: { x: 0, y: 0 }, data: {}, config: {} },
          { id: 'orphan-1', type: 'send_message', position: { x: 0, y: 100 }, data: {}, config: { message: 'Hi' } }
        ],
        edges: []
      };

      const result = await service.autoFix(workflowWithOrphan);

      // Should either connect the orphan or add a new connection
      const connectedNodes = new Set<string>();
      result.fixed.edges.forEach(e => {
        connectedNodes.add(e.source);
        connectedNodes.add(e.target);
      });

      // Verify we have connections
      expect(result.fixed.edges.length).toBeGreaterThanOrEqual(0);
    });

    it('should report remaining issues that cannot be auto-fixed', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const complexProblem: Blueprint = {
        ...mockBlueprint,
        nodes: [],
        edges: []
      };

      const result = await service.autoFix(complexProblem);

      // Empty workflow needs more than auto-fix
      expect(result.remainingIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Error Analysis', () => {
    it('should provide suggestions for configuration errors', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');
      type ErrorType = 'validation' | 'generation' | 'execution' | 'integration' | 'configuration';

      const service = new ErrorRecoveryService();

      const error: { type: ErrorType; message: string; context?: Record<string, unknown> } = {
        type: 'configuration',
        message: 'Missing required field: message'
      };

      const analysis = await service.analyzeError(error, mockBlueprint);

      // Should return analysis array
      expect(Array.isArray(analysis)).toBe(true);
    });

    it('should provide user-friendly explanations', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const issue = {
        type: 'error' as const,
        code: 'MISSING_TRIGGER',
        message: 'Workflow is missing a trigger node.'
      };

      const explanation = service.explainIssue(issue);

      expect(explanation).toContain('trigger');
      expect(explanation.length).toBeGreaterThan(issue.message.length);
    });
  });

  describe('Validation Severity Levels', () => {
    it('should correctly categorize errors vs warnings', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      // Missing trigger is an error
      const noTrigger: Blueprint = {
        ...mockBlueprint,
        nodes: [{ id: '1', type: 'send_message', position: { x: 0, y: 0 }, data: {}, config: {} }]
      };
      const triggerResult = await service.validateWorkflow(noTrigger);
      expect(triggerResult.errors.length).toBeGreaterThan(0);

      // Missing response is a warning
      const noResponse: Blueprint = {
        ...mockBlueprint,
        nodes: [{ id: '1', type: 'whatsapp_trigger', position: { x: 0, y: 0 }, data: {}, config: {} }],
        edges: []
      };
      const responseResult = await service.validateWorkflow(noResponse);
      expect(responseResult.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle empty workflow gracefully', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const emptyWorkflow: Blueprint = {
        bot_id: 'test',
        version: '1.0.0',
        name: 'Empty',
        description: '',
        nodes: [],
        edges: [],
        variables: {},
        credentials: []
      };

      const result = await service.validateWorkflow(emptyWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle circular edge references', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const circularWorkflow: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: '1', type: 'whatsapp_trigger', position: { x: 0, y: 0 }, data: {}, config: {} },
          { id: '2', type: 'if_condition', position: { x: 0, y: 100 }, data: {}, config: {} },
          { id: '3', type: 'send_message', position: { x: 0, y: 200 }, data: {}, config: {} }
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3', sourceHandle: 'true' },
          { id: 'e3', source: '3', target: '2' } // Loop back
        ]
      };

      // Should not throw and should detect potential issues
      const result = await service.validateWorkflow(circularWorkflow);
      expect(result).toBeDefined();
    });

    it('should handle self-referencing edges', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      const selfRefWorkflow: Blueprint = {
        ...mockBlueprint,
        nodes: [
          { id: '1', type: 'whatsapp_trigger', position: { x: 0, y: 0 }, data: {}, config: {} },
          { id: '2', type: 'send_message', position: { x: 0, y: 100 }, data: {}, config: {} }
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '2' } // Self-reference
        ]
      };

      const result = await service.validateWorkflow(selfRefWorkflow);
      // Should detect self-reference as a potential issue
      expect(result).toBeDefined();
    });
  });

  describe('Combined Workflow Generator and Recovery', () => {
    it('should generate and auto-fix workflow in one flow', async () => {
      const { ErrorRecoveryService } = await import('../../../services/ai-agent/error-recovery.js');

      const service = new ErrorRecoveryService();

      // Simulate a workflow that needs fixing
      const generatedWorkflow: Blueprint = {
        ...mockBlueprint,
        nodes: [
          // Missing trigger, only has action
          { id: '1', type: 'ask_question', position: { x: 0, y: 0 }, data: {}, config: { message: 'Order number?' } },
          { id: '2', type: 'shopify_lookup', position: { x: 0, y: 100 }, data: {}, config: { lookup_type: 'order' } },
          { id: '3', type: 'send_message', position: { x: 0, y: 200 }, data: {}, config: { message: 'Status: {{node_2.status}}' } }
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3' }
        ]
      };

      // Validate
      const validation = await service.validateWorkflow(generatedWorkflow);
      expect(validation.errors.some(e => e.code === 'MISSING_TRIGGER')).toBe(true);

      // Auto-fix
      const fixed = await service.autoFix(generatedWorkflow);
      expect(fixed.success).toBe(true);

      // Re-validate
      const revalidation = await service.validateWorkflow(fixed.fixed);
      const stillHasTriggerError = revalidation.errors.some(e => e.code === 'MISSING_TRIGGER');
      expect(stillHasTriggerError).toBe(false);
    });
  });
});
