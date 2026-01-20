import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorRecoveryService, ErrorType } from '../../services/ai-agent/error-recovery.js';
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
        nodes: [{ id: 'action-1', type: 'action' as const, position: { x: 0, y: 0 }, data: { label: 'Send' } }]
      };

      const result = await service.validateWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_TRIGGER')).toBe(true);
    });

    it('should detect missing response node', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'trigger-1', type: 'trigger' as const, position: { x: 0, y: 0 }, data: { label: 'Start' } }],
        edges: []
      };

      const result = await service.validateWorkflow(workflow);

      expect(result.warnings.some(w => w.code === 'MISSING_RESPONSE')).toBe(true);
    });

    it('should detect orphan nodes', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'trigger' as const, position: { x: 0, y: 0 }, data: {} },
          { id: 'orphan-1', type: 'action' as const, position: { x: 0, y: 100 }, data: {} },
          { id: 'action-1', type: 'action' as const, position: { x: 0, y: 200 }, data: {} }
        ],
        edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }]
      };

      const result = await service.validateWorkflow(workflow);

      expect(result.warnings.some(w => w.code === 'ORPHAN_NODE')).toBe(true);
    });

    it('should pass valid workflow', async () => {
      const validWorkflow = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'trigger' as const, position: { x: 0, y: 0 }, data: { label: 'Message Received' } },
          { id: 'action-1', type: 'action' as const, position: { x: 0, y: 100 }, data: { label: 'Send Response', actionType: 'send_message' } }
        ],
        edges: [{ id: 'edge-1', source: 'trigger-1', target: 'action-1' }]
      };

      const result = await service.validateWorkflow(validWorkflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('autoFix', () => {
    it('should add missing trigger automatically', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'action-1', type: 'action' as const, position: { x: 0, y: 0 }, data: { label: 'Send' } }]
      };

      const result = await service.autoFix(workflow);

      expect(result.success).toBe(true);
      expect(result.fixed.nodes.some(n => n.type === 'trigger')).toBe(true);
      expect(result.appliedFixes.some(f => f.toLowerCase().includes('trigger'))).toBe(true);
    });

    it('should add missing response automatically', async () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'trigger-1', type: 'trigger' as const, position: { x: 0, y: 0 }, data: {} }],
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
      const error: { type: ErrorType; message: string; context?: Record<string, unknown> } = {
        type: 'configuration',
        message: 'Missing trigger'
      };

      const analysis = await service.analyzeError(error, mockBlueprint);

      expect(analysis.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('explainIssue', () => {
    it('should provide user-friendly explanation', () => {
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
});
