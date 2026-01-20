import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceCache, resetPerformanceCache } from '../../services/ai-agent/performance-cache.js';
import { mockIntent } from './setup.js';

describe('PerformanceCache', () => {
  let cache: PerformanceCache;

  beforeEach(() => {
    cache = new PerformanceCache({
      intentCacheTTLMs: 60000,
      templateMatchCacheTTLMs: 60000,
      patternCacheTTLMs: 60000,
      maxMemoryCacheSize: 100,
      useDbCache: false,
      trackMetrics: true
    });
  });

  afterEach(() => {
    cache.stop();
    resetPerformanceCache();
  });

  describe('intent caching', () => {
    it('should cache intent parsing results', async () => {
      const message = 'track my order';

      cache.cacheIntent(message, mockIntent);
      const cached = await cache.getCachedIntent(message);

      expect(cached).toEqual(mockIntent);
    });

    it('should return cached results on hit', async () => {
      const message = 'track my order';
      cache.cacheIntent(message, mockIntent);

      const result1 = await cache.getCachedIntent(message);
      const result2 = await cache.getCachedIntent(message);

      expect(result1).toEqual(result2);
    });

    it('should track metrics', async () => {
      const message = 'track order';

      // Miss
      await cache.getCachedIntent(message);
      // Cache it
      cache.cacheIntent(message, mockIntent);
      // Hit
      await cache.getCachedIntent(message);

      const metrics = cache.getMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(0);
    });

    it('should return null for expired entries', async () => {
      const shortTtlCache = new PerformanceCache({
        intentCacheTTLMs: 1, // 1ms TTL
        templateMatchCacheTTLMs: 1,
        patternCacheTTLMs: 1,
        maxMemoryCacheSize: 100,
        useDbCache: false,
        trackMetrics: false
      });

      shortTtlCache.cacheIntent('test', mockIntent);
      await new Promise(r => setTimeout(r, 20)); // Wait for expiry

      const result = await shortTtlCache.getCachedIntent('test');
      expect(result).toBeNull();

      shortTtlCache.stop();
    });
  });

  describe('template caching', () => {
    it('should cache template matches', async () => {
      const templates = [{
        slug: 'order-tracking',
        score: 0.9,
        matchedPhrases: ['order', 'tracking'],
        missingIntegrations: [],
        reasoning: 'Test match',
        template: {} as any
      }];

      cache.cacheTemplateMatches('order tracking', templates as any);
      const cached = await cache.getCachedMatches('order tracking');

      expect(cached).toEqual(templates);
    });
  });

  describe('pattern caching', () => {
    it('should cache patterns', async () => {
      const patterns = [{ id: 'p1', intentSignature: 'sig1', usageCount: 10 } as any];

      cache.cachePatterns('test-key', patterns);
      const cached = await cache.getCachedPatterns('test-key');

      expect(cached).toEqual(patterns);
    });
  });

  describe('suggestion caching', () => {
    it('should cache suggestions', () => {
      const suggestions = ['Track orders', 'Book appointment'];

      cache.cacheSuggestions('context-key', suggestions);
      const cached = cache.getCachedSuggestions('context-key');

      expect(cached).toEqual(suggestions);
    });
  });

  describe('clearAll', () => {
    it('should clear all caches', async () => {
      cache.cacheIntent('test', mockIntent);
      cache.cacheTemplateMatches('query', []);

      await cache.clearAll();

      expect(await cache.getCachedIntent('test')).toBeNull();
      expect(await cache.getCachedMatches('query')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return stats object', async () => {
      const stats = await cache.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('memoryCacheSize');
    });
  });

  describe('getMetrics', () => {
    it('should return performance metrics', () => {
      cache.recordTiming('intent', 100);
      cache.recordTiming('intent', 150);

      const metrics = cache.getMetrics();

      expect(metrics).toHaveProperty('intentParseTime');
      expect(metrics.intentParseTime.samples).toBe(2);
      expect(metrics.intentParseTime.avg).toBeGreaterThan(0);
    });
  });
});
