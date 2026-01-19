/**
 * Performance Cache Service (Phase 3 Week 4)
 *
 * Provides caching layer for AI agent operations to improve response times.
 * Caches intent parsing results, template matches, and pattern suggestions.
 *
 * Responsibilities:
 * - Cache intent parsing results
 * - Cache template matches
 * - Cache pattern suggestions
 * - Track cache hit/miss metrics
 * - Handle cache invalidation
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { CacheService, cacheService } from '../cache.service.js';
import { ParsedIntent, TemplateMatch } from '../../types/ai-agent.js';
import { WorkflowPattern } from './pattern-learning.js';

/**
 * Cache types
 */
export type CacheType = 'intent' | 'template_match' | 'pattern' | 'suggestion';

/**
 * Cache entry metadata
 */
export interface CacheMetadata {
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  cacheType: CacheType;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  byType: Record<CacheType, number>;
  hitRate: number;
  avgAge: number;
  memoryCacheSize: number;
  dbCacheSize: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  intentParseTime: { avg: number; p95: number; samples: number };
  templateMatchTime: { avg: number; p95: number; samples: number };
  patternLookupTime: { avg: number; p95: number; samples: number };
  cacheHitRate: number;
  cacheMissRate: number;
}

/**
 * Configuration for performance cache
 */
interface PerformanceCacheConfig {
  intentCacheTTLMs: number;
  templateMatchCacheTTLMs: number;
  patternCacheTTLMs: number;
  maxMemoryCacheSize: number;
  useDbCache: boolean;
  trackMetrics: boolean;
}

const DEFAULT_CONFIG: PerformanceCacheConfig = {
  intentCacheTTLMs: 5 * 60 * 1000,        // 5 minutes
  templateMatchCacheTTLMs: 10 * 60 * 1000, // 10 minutes
  patternCacheTTLMs: 15 * 60 * 1000,       // 15 minutes
  maxMemoryCacheSize: 1000,
  useDbCache: true,
  trackMetrics: true
};

/**
 * LRU Cache implementation for in-memory caching
 */
class LRUCache<T> {
  private cache: Map<string, { value: T; expiresAt: number }>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Performance Cache Service
 */
export class PerformanceCache {
  private config: PerformanceCacheConfig;
  private redisCache: CacheService | null = null;
  private intentCache: LRUCache<ParsedIntent>;
  private templateCache: LRUCache<TemplateMatch[]>;
  private patternCache: LRUCache<WorkflowPattern[]>;
  private suggestionCache: LRUCache<string[]>;

  // Metrics tracking
  private metrics = {
    intentHits: 0,
    intentMisses: 0,
    templateHits: 0,
    templateMisses: 0,
    patternHits: 0,
    patternMisses: 0,
    intentTimes: [] as number[],
    templateTimes: [] as number[],
    patternTimes: [] as number[]
  };

  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<PerformanceCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize memory caches
    const cacheSize = Math.floor(this.config.maxMemoryCacheSize / 4);
    this.intentCache = new LRUCache(cacheSize);
    this.templateCache = new LRUCache(cacheSize);
    this.patternCache = new LRUCache(cacheSize);
    this.suggestionCache = new LRUCache(cacheSize);

    // Try to use Redis
    try {
      this.redisCache = cacheService;
    } catch {
      console.log('Performance Cache: Using memory-only caching');
    }

    // Start cleanup interval
    this.startCleanup();
  }

  // ============================================================================
  // Intent Caching
  // ============================================================================

  /**
   * Cache an intent parsing result
   */
  cacheIntent(message: string, intent: ParsedIntent): void {
    const key = this.generateIntentKey(message);
    this.intentCache.set(key, intent, this.config.intentCacheTTLMs);

    if (this.redisCache) {
      this.redisCache.set(
        `perf:intent:${key}`,
        intent,
        Math.ceil(this.config.intentCacheTTLMs / 1000)
      ).catch(() => {});
    }

    if (this.config.useDbCache) {
      this.saveToDbCache(key, intent, 'intent').catch(() => {});
    }
  }

  /**
   * Get cached intent parsing result
   */
  async getCachedIntent(message: string): Promise<ParsedIntent | null> {
    const key = this.generateIntentKey(message);

    // Try memory cache first
    const memoryResult = this.intentCache.get(key);
    if (memoryResult) {
      this.metrics.intentHits++;
      return memoryResult;
    }

    // Try Redis cache
    if (this.redisCache) {
      const redisResult = await this.redisCache.get<ParsedIntent>(`perf:intent:${key}`);
      if (redisResult) {
        // Backfill memory cache
        this.intentCache.set(key, redisResult, this.config.intentCacheTTLMs);
        this.metrics.intentHits++;
        return redisResult;
      }
    }

    // Try DB cache
    if (this.config.useDbCache) {
      const dbResult = await this.getFromDbCache<ParsedIntent>(key);
      if (dbResult) {
        // Backfill memory cache
        this.intentCache.set(key, dbResult, this.config.intentCacheTTLMs);
        this.metrics.intentHits++;
        return dbResult;
      }
    }

    this.metrics.intentMisses++;
    return null;
  }

  // ============================================================================
  // Template Match Caching
  // ============================================================================

  /**
   * Cache template matches
   */
  cacheTemplateMatches(key: string, matches: TemplateMatch[]): void {
    this.templateCache.set(key, matches, this.config.templateMatchCacheTTLMs);

    if (this.redisCache) {
      this.redisCache.set(
        `perf:template:${key}`,
        matches,
        Math.ceil(this.config.templateMatchCacheTTLMs / 1000)
      ).catch(() => {});
    }
  }

  /**
   * Get cached template matches
   */
  async getCachedMatches(key: string): Promise<TemplateMatch[] | null> {
    // Try memory cache first
    const memoryResult = this.templateCache.get(key);
    if (memoryResult) {
      this.metrics.templateHits++;
      return memoryResult;
    }

    // Try Redis cache
    if (this.redisCache) {
      const redisResult = await this.redisCache.get<TemplateMatch[]>(`perf:template:${key}`);
      if (redisResult) {
        this.templateCache.set(key, redisResult, this.config.templateMatchCacheTTLMs);
        this.metrics.templateHits++;
        return redisResult;
      }
    }

    this.metrics.templateMisses++;
    return null;
  }

  // ============================================================================
  // Pattern Caching
  // ============================================================================

  /**
   * Cache pattern suggestions
   */
  cachePatterns(key: string, patterns: WorkflowPattern[]): void {
    this.patternCache.set(key, patterns, this.config.patternCacheTTLMs);

    if (this.redisCache) {
      this.redisCache.set(
        `perf:pattern:${key}`,
        patterns,
        Math.ceil(this.config.patternCacheTTLMs / 1000)
      ).catch(() => {});
    }
  }

  /**
   * Get cached patterns
   */
  async getCachedPatterns(key: string): Promise<WorkflowPattern[] | null> {
    const memoryResult = this.patternCache.get(key);
    if (memoryResult) {
      this.metrics.patternHits++;
      return memoryResult;
    }

    if (this.redisCache) {
      const redisResult = await this.redisCache.get<WorkflowPattern[]>(`perf:pattern:${key}`);
      if (redisResult) {
        this.patternCache.set(key, redisResult, this.config.patternCacheTTLMs);
        this.metrics.patternHits++;
        return redisResult;
      }
    }

    this.metrics.patternMisses++;
    return null;
  }

  // ============================================================================
  // Suggestion Caching
  // ============================================================================

  /**
   * Cache suggestions
   */
  cacheSuggestions(key: string, suggestions: string[]): void {
    this.suggestionCache.set(key, suggestions, this.config.intentCacheTTLMs);
  }

  /**
   * Get cached suggestions
   */
  getCachedSuggestions(key: string): string[] | null {
    return this.suggestionCache.get(key);
  }

  // ============================================================================
  // Metrics & Stats
  // ============================================================================

  /**
   * Record a timing measurement
   */
  recordTiming(type: 'intent' | 'template' | 'pattern', timeMs: number): void {
    if (!this.config.trackMetrics) return;

    const times = type === 'intent' ? this.metrics.intentTimes :
                  type === 'template' ? this.metrics.templateTimes :
                  this.metrics.patternTimes;

    times.push(timeMs);

    // Keep only last 100 samples
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const calcStats = (times: number[]) => {
      if (times.length === 0) {
        return { avg: 0, p95: 0, samples: 0 };
      }

      const sorted = [...times].sort((a, b) => a - b);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95Index = Math.floor(times.length * 0.95);
      const p95 = sorted[p95Index] || sorted[sorted.length - 1];

      return { avg: Math.round(avg), p95: Math.round(p95), samples: times.length };
    };

    const totalHits = this.metrics.intentHits + this.metrics.templateHits + this.metrics.patternHits;
    const totalMisses = this.metrics.intentMisses + this.metrics.templateMisses + this.metrics.patternMisses;
    const total = totalHits + totalMisses;

    return {
      intentParseTime: calcStats(this.metrics.intentTimes),
      templateMatchTime: calcStats(this.metrics.templateTimes),
      patternLookupTime: calcStats(this.metrics.patternTimes),
      cacheHitRate: total > 0 ? totalHits / total : 0,
      cacheMissRate: total > 0 ? totalMisses / total : 0
    };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    let dbCacheSize = 0;

    if (this.config.useDbCache) {
      try {
        const { count } = await supabaseAdmin
          .from('ai_agent_cache')
          .select('*', { count: 'exact', head: true });
        dbCacheSize = count || 0;
      } catch {
        // Ignore
      }
    }

    const memoryCacheSize =
      this.intentCache.size() +
      this.templateCache.size() +
      this.patternCache.size() +
      this.suggestionCache.size();

    return {
      totalEntries: memoryCacheSize + dbCacheSize,
      byType: {
        intent: this.intentCache.size(),
        template_match: this.templateCache.size(),
        pattern: this.patternCache.size(),
        suggestion: this.suggestionCache.size()
      },
      hitRate: this.getMetrics().cacheHitRate,
      avgAge: 0, // Would need to track entry ages
      memoryCacheSize,
      dbCacheSize
    };
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    this.intentCache.clear();
    this.templateCache.clear();
    this.patternCache.clear();
    this.suggestionCache.clear();

    // Clear Redis
    if (this.redisCache) {
      // Note: Would need pattern-based delete
    }

    // Clear DB cache
    if (this.config.useDbCache) {
      await this.clearDbCache();
    }

    // Reset metrics
    this.resetMetrics();
  }

  /**
   * Clear caches of a specific type
   */
  async clearByType(type: CacheType): Promise<void> {
    switch (type) {
      case 'intent':
        this.intentCache.clear();
        break;
      case 'template_match':
        this.templateCache.clear();
        break;
      case 'pattern':
        this.patternCache.clear();
        break;
      case 'suggestion':
        this.suggestionCache.clear();
        break;
    }

    if (this.config.useDbCache) {
      try {
        await supabaseAdmin
          .from('ai_agent_cache')
          .delete()
          .eq('cache_type', type);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    // For now, just clear all - a more sophisticated implementation
    // would do pattern matching
    if (pattern.includes('intent')) {
      this.intentCache.clear();
    }
    if (pattern.includes('template')) {
      this.templateCache.clear();
    }
    if (pattern.includes('pattern')) {
      this.patternCache.clear();
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      intentHits: 0,
      intentMisses: 0,
      templateHits: 0,
      templateMisses: 0,
      patternHits: 0,
      patternMisses: 0,
      intentTimes: [],
      templateTimes: [],
      patternTimes: []
    };
  }

  /**
   * Stop the cache service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate a cache key for an intent message
   */
  private generateIntentKey(message: string): string {
    // Normalize the message
    const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ');

    // Create a simple hash (for production, use a proper hash function)
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return `intent_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Save to database cache
   */
  private async saveToDbCache(key: string, value: unknown, type: CacheType): Promise<void> {
    const ttlMs = type === 'intent' ? this.config.intentCacheTTLMs :
                  type === 'template_match' ? this.config.templateMatchCacheTTLMs :
                  this.config.patternCacheTTLMs;

    try {
      await supabaseAdmin
        .from('ai_agent_cache')
        .upsert({
          cache_key: key,
          cache_value: value,
          cache_type: type,
          expires_at: new Date(Date.now() + ttlMs).toISOString()
        }, {
          onConflict: 'cache_key'
        });
    } catch (err) {
      console.error('Failed to save to DB cache:', err);
    }
  }

  /**
   * Get from database cache
   */
  private async getFromDbCache<T>(key: string): Promise<T | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_agent_cache')
        .select('cache_value, hit_count')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) return null;

      // Update hit count
      await supabaseAdmin
        .from('ai_agent_cache')
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('cache_key', key);

      return data.cache_value as T;
    } catch {
      return null;
    }
  }

  /**
   * Clear database cache
   */
  private async clearDbCache(): Promise<void> {
    try {
      await supabaseAdmin.from('ai_agent_cache').delete().neq('cache_key', '');
    } catch {
      // Ignore
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      // Cleanup memory caches
      this.intentCache.cleanup();
      this.templateCache.cleanup();
      this.patternCache.cleanup();
      this.suggestionCache.cleanup();

      // Cleanup DB cache
      if (this.config.useDbCache) {
        void (async () => {
          try {
            await supabaseAdmin.rpc('cleanup_expired_cache');
          } catch {
            // Ignore cleanup errors
          }
        })();
      }
    }, 60 * 1000); // Every minute
  }
}

// Singleton instance
let instance: PerformanceCache | null = null;

/**
 * Get the PerformanceCache singleton
 */
export function getPerformanceCache(): PerformanceCache {
  if (!instance) {
    instance = new PerformanceCache();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetPerformanceCache(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}
