import { describe, it, expect, beforeEach } from 'vitest';
import { VersionManager } from '../../services/ai-agent/version-manager.js';
import { mockBlueprint, mockContext } from './setup.js';
import type { ConversationContext } from '../../types/ai-agent.js';

describe('VersionManager', () => {
  let manager: VersionManager;
  let context: ConversationContext;

  beforeEach(() => {
    manager = new VersionManager();
    // Create a fresh context for each test
    context = { ...mockContext };
  });

  describe('saveVersion', () => {
    it('should save workflow version', () => {
      manager.initializeVersioning(context);
      manager.saveVersion(context, mockBlueprint, 'Initial version');

      const history = manager.getHistory(context);
      expect(history).toHaveLength(1);
    });

    it('should trim old versions when exceeding max', () => {
      manager.initializeVersioning(context);

      // Save more than max versions
      for (let i = 0; i < 25; i++) {
        manager.saveVersion(context, { ...mockBlueprint, name: `v${i}` }, `Version ${i}`);
      }

      const history = manager.getHistory(context);
      expect(history.length).toBeLessThanOrEqual(20);
    });

    it('should generate changes summary', () => {
      manager.initializeVersioning(context);
      manager.saveVersion(context, mockBlueprint, 'v1');

      const modified = {
        ...mockBlueprint,
        nodes: [...mockBlueprint.nodes, { id: 'new-1', type: 'action' as const, position: { x: 0, y: 0 }, data: {} }]
      };
      manager.saveVersion(context, modified, 'v2');

      const history = manager.getHistory(context);
      expect(history[1].changesSummary).toContain('Added');
    });
  });

  describe('undo/redo', () => {
    it('should undo to previous version', () => {
      manager.initializeVersioning(context);
      manager.saveVersion(context, mockBlueprint, 'v1');
      manager.saveVersion(context, { ...mockBlueprint, name: 'Modified' }, 'v2');

      const undone = manager.undo(context);

      expect(undone?.name).toBe(mockBlueprint.name);
    });

    it('should redo to next version', () => {
      manager.initializeVersioning(context);
      manager.saveVersion(context, mockBlueprint, 'v1');
      manager.saveVersion(context, { ...mockBlueprint, name: 'Modified' }, 'v2');

      manager.undo(context);
      const redone = manager.redo(context);

      expect(redone?.name).toBe('Modified');
    });

    it('should return null when no history', () => {
      manager.initializeVersioning(context);

      const result = manager.undo(context);

      expect(result).toBeNull();
    });
  });

  describe('diff', () => {
    it('should detect added nodes', () => {
      const before = mockBlueprint;
      const after = {
        ...mockBlueprint,
        nodes: [...mockBlueprint.nodes, { id: 'new-1', type: 'action' as const, position: { x: 0, y: 0 }, data: {} }]
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

  describe('canUndo/canRedo', () => {
    it('should return false for canUndo when no history', () => {
      manager.initializeVersioning(context);
      expect(manager.canUndo(context)).toBe(false);
    });

    it('should return true for canUndo when there is history', () => {
      manager.initializeVersioning(context);
      manager.saveVersion(context, mockBlueprint, 'v1');
      manager.saveVersion(context, { ...mockBlueprint, name: 'v2' }, 'v2');
      expect(manager.canUndo(context)).toBe(true);
    });

    it('should return false for canRedo when at latest', () => {
      manager.initializeVersioning(context);
      manager.saveVersion(context, mockBlueprint, 'v1');
      expect(manager.canRedo(context)).toBe(false);
    });

    it('should return true for canRedo after undo', () => {
      manager.initializeVersioning(context);
      manager.saveVersion(context, mockBlueprint, 'v1');
      manager.saveVersion(context, { ...mockBlueprint, name: 'v2' }, 'v2');
      manager.undo(context);
      expect(manager.canRedo(context)).toBe(true);
    });
  });
});
