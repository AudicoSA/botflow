import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PatternLearningService, resetPatternLearningService } from '../../services/ai-agent/pattern-learning.js';
import { mockBlueprint, mockIntent } from './setup.js';

describe('PatternLearningService', () => {
  let service: PatternLearningService;

  beforeEach(() => {
    service = new PatternLearningService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetPatternLearningService();
  });

  describe('generateIntentSignature', () => {
    it('should generate correct intent signature', () => {
      const signature = service.generateIntentSignature(mockIntent);

      expect(signature).toContain('order_tracking');
      expect(signature).toContain('shopify');
    });

    it('should handle empty integrations', () => {
      const intentNoIntegrations = { ...mockIntent, integrations: [], requirements: [] };
      const signature = service.generateIntentSignature(intentNoIntegrations);

      expect(signature).toContain('order_tracking');
    });
  });

  describe('extractPatternFromWorkflow', () => {
    it('should extract node types from workflow', () => {
      const pattern = service.extractPatternFromWorkflow(
        mockBlueprint,
        mockIntent,
        'track orders from shopify'
      );

      expect(pattern.nodeTypes).toContain('trigger');
      expect(pattern.nodeTypes).toContain('action');
    });

    it('should include workflow type from intent', () => {
      const pattern = service.extractPatternFromWorkflow(
        mockBlueprint,
        mockIntent,
        'track orders from shopify'
      );

      expect(pattern.workflowType).toBe('order_tracking');
    });

    it('should include original message', () => {
      const message = 'I want to track orders from shopify';
      const pattern = service.extractPatternFromWorkflow(
        mockBlueprint,
        mockIntent,
        message
      );

      expect(pattern.originalMessage).toBe(message);
    });
  });

  describe('suggestFromPatterns', () => {
    it('should return suggestions sorted by relevance', async () => {
      // This test may fail if database is not available
      // In that case, it should return an empty array gracefully
      const suggestions = await service.suggestFromPatterns(mockIntent, { limit: 3 });

      // Should not throw and should return an array
      expect(Array.isArray(suggestions)).toBe(true);

      // If there are multiple suggestions, they should be sorted
      if (suggestions.length > 1) {
        expect(suggestions[0].relevanceScore).toBeGreaterThanOrEqual(suggestions[1].relevanceScore);
      }
    });

    it('should respect limit parameter', async () => {
      const suggestions = await service.suggestFromPatterns(mockIntent, { limit: 2 });

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getPatternStats', () => {
    it('should return analytics object with expected properties', async () => {
      const stats = await service.getPatternStats();

      expect(stats).toHaveProperty('totalPatterns');
      expect(stats).toHaveProperty('totalSuccessLogs');
      expect(stats).toHaveProperty('avgSuccessRate');
      expect(stats).toHaveProperty('topPatterns');
      expect(stats).toHaveProperty('patternsByType');
      expect(stats).toHaveProperty('recentPatterns');
    });

    it('should return valid number values', async () => {
      const stats = await service.getPatternStats();

      expect(typeof stats.totalPatterns).toBe('number');
      expect(typeof stats.avgSuccessRate).toBe('number');
      expect(stats.avgSuccessRate).toBeGreaterThanOrEqual(0);
      expect(stats.avgSuccessRate).toBeLessThanOrEqual(100);
    });
  });
});
