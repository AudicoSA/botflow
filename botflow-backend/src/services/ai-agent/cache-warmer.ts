/**
 * Cache Warmer Service (Phase 3 Week 5.2)
 *
 * Pre-populates caches with common patterns for faster responses.
 * Warms up intent parsing cache, template matching cache, and node library.
 */

import { logger } from '../../config/logger.js';
import { getPerformanceCache, PerformanceCache } from './performance-cache.js';
import { getTemplateLibrary, TemplateLibraryService } from './template-library.js';
import { getIntentParser, IntentParser } from './intent-parser.js';
import type { ParsedIntent, WorkflowTemplate, TemplateMatch } from '../../types/ai-agent.js';

/**
 * Common intent patterns to pre-warm
 */
const COMMON_INTENT_PATTERNS = [
  // Quick commands
  'help',
  'undo',
  'deploy',
  'reset',
  'cancel',
  'start over',

  // Order tracking
  'track order',
  'order tracking',
  'where is my order',
  'check order status',
  'track orders from shopify',
  'track orders from woocommerce',

  // Booking
  'book appointment',
  'schedule appointment',
  'booking',
  'reserve',
  'make a reservation',
  'book haircut',
  'salon booking',

  // FAQ
  'answer questions',
  'faq bot',
  'help desk',
  'customer support',
  'answer common questions',

  // Payment
  'process payment',
  'payment link',
  'send invoice',
  'checkout',

  // Notifications
  'send reminder',
  'notification',
  'alert',
  'confirmation message',

  // South African specific
  'load shedding',
  'payfast',
  'yoco',
  'takealot',
  'courier guy'
];

/**
 * Cache warmer configuration
 */
interface CacheWarmerConfig {
  warmIntents: boolean;
  warmTemplates: boolean;
  warmNodeLibrary: boolean;
  maxTemplates: number;
  concurrency: number;
}

const DEFAULT_CONFIG: CacheWarmerConfig = {
  warmIntents: true,
  warmTemplates: true,
  warmNodeLibrary: true,
  maxTemplates: 50,
  concurrency: 5
};

/**
 * Warm-up result statistics
 */
interface WarmUpResult {
  success: boolean;
  intentsCached: number;
  templatesCached: number;
  errors: string[];
  durationMs: number;
}

/**
 * Cache Warmer Service
 */
export class CacheWarmer {
  private cache: PerformanceCache;
  private templateLibrary: TemplateLibraryService;
  private intentParser: IntentParser;
  private config: CacheWarmerConfig;
  private lastWarmUp: Date | null = null;
  private isWarming = false;

  constructor(config: Partial<CacheWarmerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = getPerformanceCache();
    this.templateLibrary = getTemplateLibrary();
    this.intentParser = getIntentParser();
  }

  /**
   * Perform full cache warm-up
   */
  async warmUp(): Promise<WarmUpResult> {
    if (this.isWarming) {
      return {
        success: false,
        intentsCached: 0,
        templatesCached: 0,
        errors: ['Warm-up already in progress'],
        durationMs: 0
      };
    }

    this.isWarming = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let intentsCached = 0;
    let templatesCached = 0;

    try {
      logger.info('Starting cache warm-up');

      // Warm up in parallel
      const tasks: Promise<void>[] = [];

      if (this.config.warmTemplates) {
        tasks.push(
          this.warmTemplates()
            .then(count => { templatesCached = count; })
            .catch(err => { errors.push(`Templates: ${err.message}`); })
        );
      }

      if (this.config.warmIntents) {
        tasks.push(
          this.warmIntents()
            .then(count => { intentsCached = count; })
            .catch(err => { errors.push(`Intents: ${err.message}`); })
        );
      }

      await Promise.all(tasks);

      this.lastWarmUp = new Date();
      const durationMs = Date.now() - startTime;

      logger.info({
        intentsCached,
        templatesCached,
        errors: errors.length,
        durationMs
      }, 'Cache warm-up completed');

      return {
        success: errors.length === 0,
        intentsCached,
        templatesCached,
        errors,
        durationMs
      };
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm up popular templates
   */
  private async warmTemplates(): Promise<number> {
    let cached = 0;

    try {
      // Get popular templates
      const { items: templates } = await this.templateLibrary.getTemplates({
        limit: this.config.maxTemplates,
        isPublic: true
      });

      // Sort by popularity
      const sortedTemplates = templates.sort((a, b) =>
        b.popularityScore - a.popularityScore
      );

      // Cache template data by category
      const byCategory = new Map<string, WorkflowTemplate[]>();
      for (const template of sortedTemplates) {
        const existing = byCategory.get(template.category) || [];
        existing.push(template);
        byCategory.set(template.category, existing);
      }

      // Cache category mappings - convert templates to TemplateMatch format
      for (const [category, categoryTemplates] of byCategory) {
        const templateMatches: TemplateMatch[] = categoryTemplates.map(template => ({
          template,
          score: 1.0, // Perfect score for exact category match
          matchedPhrases: [category],
          missingIntegrations: [],
          reasoning: `Cached template for category: ${category}`
        }));
        this.cache.cacheTemplateMatches(category, templateMatches);
        cached += categoryTemplates.length;
      }

      logger.debug({ templatesCached: cached }, 'Templates warmed');
    } catch (error) {
      logger.error({ error }, 'Failed to warm templates');
      throw error;
    }

    return cached;
  }

  /**
   * Warm up common intent patterns
   */
  private async warmIntents(): Promise<number> {
    let cached = 0;

    // Process in batches to avoid overwhelming the API
    const batches = this.chunk(COMMON_INTENT_PATTERNS, this.config.concurrency);

    for (const batch of batches) {
      await Promise.all(batch.map(async (pattern) => {
        try {
          // Use quick detect first (no API call)
          const quickResult = this.intentParser.quickDetect(pattern);

          if (quickResult) {
            // Cache quick detect results
            this.cache.cacheIntent(pattern, quickResult as ParsedIntent);
            cached++;
          }
        } catch (error) {
          logger.warn({ error, pattern }, 'Failed to warm intent pattern');
        }
      }));
    }

    logger.debug({ intentsCached: cached }, 'Intents warmed');
    return cached;
  }

  /**
   * Get cache warm-up status (synchronous, returns cached stats)
   */
  getStatus(): {
    isWarming: boolean;
    lastWarmUp: Date | null;
    cacheStats: { size: number; hitRate: number; hits: number; misses: number };
  } {
    // Return synchronous status - for async stats use getStatusAsync
    return {
      isWarming: this.isWarming,
      lastWarmUp: this.lastWarmUp,
      cacheStats: { size: 0, hitRate: 0, hits: 0, misses: 0 } // Placeholder until async call
    };
  }

  /**
   * Get cache warm-up status with full async stats
   */
  async getStatusAsync(): Promise<{
    isWarming: boolean;
    lastWarmUp: Date | null;
    cacheStats: Awaited<ReturnType<PerformanceCache['getStats']>>;
  }> {
    return {
      isWarming: this.isWarming,
      lastWarmUp: this.lastWarmUp,
      cacheStats: await this.cache.getStats()
    };
  }

  /**
   * Schedule periodic cache warm-up
   */
  schedulePeriodicWarmUp(intervalMinutes: number = 30): NodeJS.Timeout {
    return setInterval(() => {
      this.warmUp().catch(err => {
        logger.error({ error: err }, 'Periodic cache warm-up failed');
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Clear and re-warm cache
   */
  async refresh(): Promise<WarmUpResult> {
    await this.cache.clearAll();
    return this.warmUp();
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Singleton instance
let instance: CacheWarmer | null = null;

/**
 * Get the CacheWarmer singleton
 */
export function getCacheWarmer(): CacheWarmer {
  if (!instance) {
    instance = new CacheWarmer();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetCacheWarmer(): void {
  instance = null;
}
