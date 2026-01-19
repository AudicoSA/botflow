import { describe, it, expect, beforeEach } from 'vitest';
import { SuggestionEngine, resetSuggestionEngine } from '../../services/ai-agent/suggestion-engine.js';
import { mockContext, mockBlueprint } from './setup.js';

describe('SuggestionEngine', () => {
  let engine: SuggestionEngine;

  beforeEach(() => {
    resetSuggestionEngine();
    engine = new SuggestionEngine();
  });

  describe('generateSuggestions', () => {
    it('should return state-based suggestions for idle state', async () => {
      const suggestions = await engine.generateSuggestions({ ...mockContext, state: 'idle' });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s =>
        s.toLowerCase().includes('order') ||
        s.toLowerCase().includes('book') ||
        s.toLowerCase().includes('track')
      )).toBe(true);
    });

    it('should return different suggestions for gathering state', async () => {
      const idleSuggestions = await engine.generateSuggestions({ ...mockContext, state: 'idle' });
      const gatheringSuggestions = await engine.generateSuggestions({ ...mockContext, state: 'gathering' });

      expect(gatheringSuggestions).not.toEqual(idleSuggestions);
    });

    it('should include vertical-specific suggestions', async () => {
      const context = {
        ...mockContext,
        state: 'idle' as const,
        userPreferences: { vertical: 'ecommerce' }
      };

      const suggestions = await engine.generateSuggestions(context);

      expect(suggestions.some(s =>
        s.toLowerCase().includes('order') ||
        s.toLowerCase().includes('track') ||
        s.toLowerCase().includes('refund')
      )).toBe(true);
    });

    it('should include deploy suggestion when workflow ready', async () => {
      const context = {
        ...mockContext,
        state: 'confirming' as const,
        currentWorkflow: mockBlueprint
      };

      const suggestions = await engine.generateSuggestions(context);

      expect(suggestions.some(s => s.toLowerCase().includes('deploy'))).toBe(true);
    });
  });

  describe('suggestIntegrations', () => {
    it('should recommend integrations based on workflow type', () => {
      const context = {
        ...mockContext,
        availableIntegrations: [
          { slug: 'shopify', name: 'Shopify', isEnabled: false, hasCredentials: false },
          { slug: 'woocommerce', name: 'WooCommerce', isEnabled: false, hasCredentials: false }
        ],
        gatheredRequirements: [{
          key: 'workflowType',
          value: 'order_tracking',
          source: 'user' as const,
          confidence: 1,
          timestamp: new Date()
        }]
      };

      const integrations = engine.suggestIntegrations(context as any);

      expect(integrations.some(i => i.integration.slug === 'shopify')).toBe(true);
    });

    it('should filter out already-enabled integrations', () => {
      const context = {
        ...mockContext,
        availableIntegrations: [
          { slug: 'shopify', name: 'Shopify', isEnabled: true, hasCredentials: true },
          { slug: 'woocommerce', name: 'WooCommerce', isEnabled: false, hasCredentials: false }
        ],
        gatheredRequirements: [{
          key: 'workflowType',
          value: 'order_tracking',
          source: 'user' as const,
          confidence: 1,
          timestamp: new Date()
        }]
      };

      const integrations = engine.suggestIntegrations(context as any);

      expect(integrations.every(i => i.integration.slug !== 'shopify')).toBe(true);
    });
  });

  describe('suggestNextSteps', () => {
    it('should suggest adding response for workflow with only trigger', () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [{ id: 'trigger-1', type: 'trigger' as const, position: { x: 0, y: 0 }, data: {} }]
      };

      const steps = engine.suggestNextSteps(workflow);

      expect(steps.some(s =>
        s.toLowerCase().includes('response') ||
        s.toLowerCase().includes('reply')
      )).toBe(true);
    });

    it('should suggest deployment for complete workflow', () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'trigger' as const, position: { x: 0, y: 0 }, data: {} },
          { id: 'action-1', type: 'action' as const, position: { x: 0, y: 100 }, data: { actionType: 'send_message' } },
          { id: 'action-2', type: 'action' as const, position: { x: 0, y: 200 }, data: { actionType: 'ai_response' } }
        ]
      };

      const steps = engine.suggestNextSteps(workflow);

      expect(steps.some(s => s.toLowerCase().includes('deploy'))).toBe(true);
    });
  });

  describe('generateImprovements', () => {
    it('should suggest error handling for workflows with integrations', () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'trigger' as const, position: { x: 0, y: 0 }, data: {} },
          { id: 'int-1', type: 'integration' as const, position: { x: 0, y: 100 }, data: { integration: 'shopify' } }
        ],
        edges: [{ id: 'e1', source: 'trigger-1', target: 'int-1' }]
      };

      const improvements = engine.generateImprovements(workflow);

      expect(improvements.some(i => i.type === 'reliability')).toBe(true);
    });

    it('should suggest payment confirmation for payment workflows', () => {
      const workflow = {
        ...mockBlueprint,
        nodes: [
          { id: 'trigger-1', type: 'trigger' as const, position: { x: 0, y: 0 }, data: {} },
          { id: 'int-1', type: 'integration' as const, position: { x: 0, y: 100 }, data: { integration: 'payfast' } }
        ],
        edges: [{ id: 'e1', source: 'trigger-1', target: 'int-1' }]
      };

      const improvements = engine.generateImprovements(workflow);

      expect(improvements.some(i =>
        i.title.toLowerCase().includes('confirmation') ||
        i.type === 'user_experience'
      )).toBe(true);
    });
  });
});
