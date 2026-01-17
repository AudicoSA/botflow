/**
 * Multi-Layer Caching Service
 * Phase 2 Week 6 Day 2: Redis-based caching for performance optimization
 *
 * Cache Layers:
 * - HOT: 1-5 minutes (active conversations, real-time data)
 * - WARM: 15-60 minutes (bot configs, knowledge base)
 * - COLD: 1-24 hours (analytics, historical data)
 */

import { redis } from '../config/redis.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  HOT: 300,        // 5 minutes - Active conversations, real-time metrics
  WARM: 3600,      // 1 hour - Bot configurations, knowledge base
  COLD: 86400,     // 24 hours - Analytics aggregates, historical data
  VERY_HOT: 60,    // 1 minute - Live dashboard data
  VERY_COLD: 604800 // 7 days - Static content, templates
} as const;

/**
 * Cache key prefixes for organization
 */
export const CacheKeys = {
  BOT_CONFIG: 'bot:config',
  BOT_LIST: 'bot:list',
  CONVERSATION: 'conversation',
  CONVERSATION_LIST: 'conversation:list',
  MESSAGES: 'messages',
  KNOWLEDGE_ARTICLE: 'knowledge:article',
  KNOWLEDGE_STATS: 'knowledge:stats',
  ANALYTICS_REALTIME: 'analytics:realtime',
  ANALYTICS_HISTORICAL: 'analytics:historical',
  ORG_SETTINGS: 'org:settings',
  USER_SESSION: 'user:session',
  TEMPLATE: 'template',
  WORKFLOW: 'workflow'
} as const;

/**
 * Multi-layer caching service
 */
export class CacheService {
  /**
   * Get from cache or fetch from database
   *
   * @param key - Cache key
   * @param fetchFn - Function to fetch data if cache miss
   * @param ttl - Time to live in seconds
   * @returns Cached or fresh data
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CacheTTL.WARM
  ): Promise<T> {
    try {
      // Try cache first
      const cached = await redis.get(key);
      if (cached) {
        logger.debug({ key }, 'Cache hit');
        return JSON.parse(cached);
      }

      // Cache miss - fetch from database
      logger.debug({ key }, 'Cache miss - fetching from database');
      const data = await fetchFn();

      // Store in cache (don't await to avoid blocking)
      this.set(key, data, ttl).catch(error => {
        logger.error({ error, key }, 'Failed to cache data');
      });

      return data;
    } catch (error) {
      logger.error({ error, key }, 'Cache error - falling back to database');
      return fetchFn();
    }
  }

  /**
   * Set cache value
   */
  async set<T>(key: string, value: T, ttl: number = CacheTTL.WARM): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      logger.debug({ key, ttl }, 'Cached data');
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  /**
   * Delete cache value
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
      logger.debug({ key }, 'Cache key deleted');
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
    }
  }

  /**
   * Invalidate cache by pattern
   *
   * @param pattern - Redis key pattern (e.g., 'bot:*' or 'conversation:123:*')
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      if (pattern.includes('*')) {
        // Pattern-based invalidation
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          logger.info({ pattern, count: keys.length }, 'Invalidated cache keys');
        } else {
          logger.debug({ pattern }, 'No cache keys to invalidate');
        }
      } else {
        // Single key invalidation
        await redis.del(pattern);
        logger.debug({ key: pattern }, 'Invalidated cache key');
      }
    } catch (error) {
      logger.error({ error, pattern }, 'Cache invalidation error');
    }
  }

  /**
   * Batch invalidation for multiple patterns
   */
  async invalidateMany(patterns: string[]): Promise<void> {
    await Promise.all(patterns.map(pattern => this.invalidate(pattern)));
  }

  // ============================================================================
  // BOT CACHING
  // ============================================================================

  /**
   * Get bot configuration with caching
   */
  async getBotConfig(botId: string) {
    return this.getOrSet(
      `${CacheKeys.BOT_CONFIG}:${botId}`,
      async () => {
        const { data } = await supabaseAdmin
          .from('bots')
          .select('*')
          .eq('id', botId)
          .single();
        return data;
      },
      CacheTTL.WARM // 1 hour
    );
  }

  /**
   * Get bot list for organization
   */
  async getBotList(organizationId: string) {
    return this.getOrSet(
      `${CacheKeys.BOT_LIST}:${organizationId}`,
      async () => {
        const { data } = await supabaseAdmin
          .from('bots')
          .select('id, name, type, is_active, created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
        return data;
      },
      CacheTTL.WARM
    );
  }

  /**
   * Invalidate bot cache when updated
   */
  async invalidateBotCache(botId: string, organizationId?: string) {
    const patterns = [
      `${CacheKeys.BOT_CONFIG}:${botId}`,
      `${CacheKeys.WORKFLOW}:${botId}:*`
    ];

    if (organizationId) {
      patterns.push(`${CacheKeys.BOT_LIST}:${organizationId}`);
    }

    await this.invalidateMany(patterns);
  }

  // ============================================================================
  // CONVERSATION CACHING
  // ============================================================================

  /**
   * Get conversation with caching
   */
  async getConversation(conversationId: string) {
    return this.getOrSet(
      `${CacheKeys.CONVERSATION}:${conversationId}`,
      async () => {
        const { data } = await supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();
        return data;
      },
      CacheTTL.HOT // 5 minutes
    );
  }

  /**
   * Get conversation list for organization
   */
  async getConversationList(organizationId: string, limit: number = 20) {
    return this.getOrSet(
      `${CacheKeys.CONVERSATION_LIST}:${organizationId}:${limit}`,
      async () => {
        const { data } = await supabaseAdmin
          .from('conversations')
          .select('id, customer_phone, status, created_at, bot_id')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit);
        return data;
      },
      CacheTTL.HOT // 5 minutes
    );
  }

  /**
   * Get messages for conversation
   */
  async getMessages(conversationId: string, limit: number = 50) {
    return this.getOrSet(
      `${CacheKeys.MESSAGES}:${conversationId}:${limit}`,
      async () => {
        const { data } = await supabaseAdmin
          .from('messages')
          .select('id, content, direction, status, created_at, metadata')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(limit);
        return data;
      },
      CacheTTL.HOT // 5 minutes
    );
  }

  /**
   * Invalidate conversation cache
   */
  async invalidateConversationCache(conversationId: string, organizationId?: string) {
    const patterns = [
      `${CacheKeys.CONVERSATION}:${conversationId}`,
      `${CacheKeys.MESSAGES}:${conversationId}:*`
    ];

    if (organizationId) {
      patterns.push(`${CacheKeys.CONVERSATION_LIST}:${organizationId}:*`);
    }

    await this.invalidateMany(patterns);
  }

  // ============================================================================
  // KNOWLEDGE BASE CACHING
  // ============================================================================

  /**
   * Get knowledge base article
   */
  async getKnowledgeArticle(articleId: string) {
    return this.getOrSet(
      `${CacheKeys.KNOWLEDGE_ARTICLE}:${articleId}`,
      async () => {
        const { data } = await supabaseAdmin
          .from('knowledge_base_articles')
          .select('*')
          .eq('id', articleId)
          .single();
        return data;
      },
      CacheTTL.WARM // 1 hour
    );
  }

  /**
   * Get knowledge base stats for bot
   */
  async getKnowledgeStats(botId: string) {
    return this.getOrSet(
      `${CacheKeys.KNOWLEDGE_STATS}:${botId}`,
      async () => {
        const { data } = await supabaseAdmin
          .rpc('get_knowledge_stats', { p_bot_id: botId });
        return data;
      },
      CacheTTL.WARM
    );
  }

  /**
   * Invalidate knowledge base cache
   */
  async invalidateKnowledgeCache(botId: string, articleId?: string) {
    const patterns = [
      `${CacheKeys.KNOWLEDGE_STATS}:${botId}`
    ];

    if (articleId) {
      patterns.push(`${CacheKeys.KNOWLEDGE_ARTICLE}:${articleId}`);
    } else {
      patterns.push(`${CacheKeys.KNOWLEDGE_ARTICLE}:*`);
    }

    await this.invalidateMany(patterns);
  }

  // ============================================================================
  // ANALYTICS CACHING
  // ============================================================================

  /**
   * Get real-time analytics (very hot cache - 1 minute)
   */
  async getRealtimeAnalytics(organizationId: string) {
    return this.getOrSet(
      `${CacheKeys.ANALYTICS_REALTIME}:${organizationId}`,
      async () => {
        // Fetch real-time metrics from database
        const { data } = await supabaseAdmin
          .from('conversation_metrics')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('started_at', { ascending: false });
        return data;
      },
      CacheTTL.VERY_HOT // 1 minute
    );
  }

  /**
   * Get historical analytics (cold cache - 24 hours)
   */
  async getHistoricalAnalytics(organizationId: string, startDate: Date, endDate: Date) {
    const cacheKey = `${CacheKeys.ANALYTICS_HISTORICAL}:${organizationId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    return this.getOrSet(
      cacheKey,
      async () => {
        const { data } = await supabaseAdmin
          .from('conversation_metrics')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('started_at', startDate.toISOString())
          .lte('started_at', endDate.toISOString())
          .order('started_at', { ascending: false });
        return data;
      },
      CacheTTL.COLD // 24 hours
    );
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateAnalyticsCache(organizationId: string) {
    await this.invalidateMany([
      `${CacheKeys.ANALYTICS_REALTIME}:${organizationId}`,
      `${CacheKeys.ANALYTICS_HISTORICAL}:${organizationId}:*`
    ]);
  }

  // ============================================================================
  // TEMPLATE CACHING
  // ============================================================================

  /**
   * Get template by ID (very cold cache - 7 days)
   */
  async getTemplate(templateId: string) {
    return this.getOrSet(
      `${CacheKeys.TEMPLATE}:${templateId}`,
      async () => {
        const { data } = await supabaseAdmin
          .from('bot_templates')
          .select('*')
          .eq('id', templateId)
          .single();
        return data;
      },
      CacheTTL.VERY_COLD // 7 days (templates rarely change)
    );
  }

  /**
   * Get all published templates
   */
  async getPublishedTemplates() {
    return this.getOrSet(
      `${CacheKeys.TEMPLATE}:published`,
      async () => {
        const { data } = await supabaseAdmin
          .from('bot_templates')
          .select('*')
          .eq('is_published', true)
          .order('tier', { ascending: true });
        return data;
      },
      CacheTTL.VERY_COLD // 7 days
    );
  }

  /**
   * Invalidate template cache
   */
  async invalidateTemplateCache(templateId?: string) {
    if (templateId) {
      await this.invalidate(`${CacheKeys.TEMPLATE}:${templateId}`);
    }
    await this.invalidate(`${CacheKeys.TEMPLATE}:published`);
  }

  // ============================================================================
  // CACHE STATISTICS
  // ============================================================================

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const info = await redis.info('stats');
      const keyspace = await redis.info('keyspace');

      return {
        info,
        keyspace,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get cache stats');
      return null;
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clearAll(): Promise<void> {
    try {
      await redis.flushdb();
      logger.warn('All cache cleared');
    } catch (error) {
      logger.error({ error }, 'Failed to clear cache');
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
