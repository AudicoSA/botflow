/**
 * Query Optimizer Utilities
 * Phase 2 Week 6 Day 1: Database query optimization and performance tracking
 */

import { logger } from '../config/logger.js';

/**
 * Track query execution time and log slow queries
 *
 * @param name - Query name for logging
 * @param queryFn - Async function that executes the query
 * @param slowThreshold - Threshold in ms to consider a query slow (default: 100ms)
 * @returns Query result
 */
export async function trackQuery<T>(
  name: string,
  queryFn: () => Promise<T>,
  slowThreshold: number = 100
): Promise<T> {
  const start = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - start;

    // Log slow queries for optimization
    if (duration > slowThreshold) {
      logger.warn({
        query: name,
        duration,
        threshold: slowThreshold
      }, 'Slow query detected - consider optimization');
    } else {
      logger.debug({
        query: name,
        duration
      }, 'Query executed successfully');
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error({
      error,
      query: name,
      duration
    }, 'Query failed');
    throw error;
  }
}

/**
 * Query performance metrics collector
 * Tracks query statistics for monitoring and optimization
 */
class QueryMetrics {
  private metrics: Map<string, {
    count: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
    avgDuration: number;
  }> = new Map();

  /**
   * Record a query execution
   */
  record(queryName: string, duration: number): void {
    const existing = this.metrics.get(queryName);

    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.avgDuration = existing.totalDuration / existing.count;
    } else {
      this.metrics.set(queryName, {
        count: 1,
        totalDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        avgDuration: duration
      });
    }
  }

  /**
   * Get metrics for a specific query
   */
  getQueryMetrics(queryName: string) {
    return this.metrics.get(queryName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return Array.from(this.metrics.entries()).map(([name, stats]) => ({
      query: name,
      ...stats
    }));
  }

  /**
   * Get slowest queries
   */
  getSlowestQueries(limit: number = 10) {
    return this.getAllMetrics()
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Log metrics summary
   */
  logSummary(): void {
    const slowQueries = this.getSlowestQueries(5);
    logger.info({
      totalQueries: this.metrics.size,
      slowestQueries: slowQueries
    }, 'Query performance summary');
  }
}

export const queryMetrics = new QueryMetrics();

/**
 * Track query with metrics collection
 */
export async function trackQueryWithMetrics<T>(
  name: string,
  queryFn: () => Promise<T>,
  slowThreshold: number = 100
): Promise<T> {
  const start = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - start;

    // Record metrics
    queryMetrics.record(name, duration);

    // Log slow queries
    if (duration > slowThreshold) {
      logger.warn({
        query: name,
        duration,
        threshold: slowThreshold,
        stats: queryMetrics.getQueryMetrics(name)
      }, 'Slow query detected');
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    queryMetrics.record(name, duration);
    logger.error({
      error,
      query: name,
      duration
    }, 'Query failed');
    throw error;
  }
}

/**
 * Common query optimization patterns
 */
export const QueryPatterns = {
  /**
   * Select only needed columns instead of SELECT *
   *
   * BAD:  SELECT * FROM conversations
   * GOOD: SELECT id, customer_phone, status, created_at FROM conversations
   */
  selectSpecificColumns: true,

  /**
   * Use LIMIT for large result sets
   *
   * BAD:  SELECT * FROM messages
   * GOOD: SELECT * FROM messages LIMIT 100
   */
  useLimitForLargeResults: true,

  /**
   * Use indexes for WHERE clauses
   *
   * BAD:  WHERE created_at > '2024-01-01' (no index)
   * GOOD: WHERE created_at > '2024-01-01' (with index on created_at)
   */
  useIndexedColumns: true,

  /**
   * Avoid N+1 queries - use JOINs or batch queries
   *
   * BAD:  for (conversation of conversations) { fetch messages }
   * GOOD: SELECT * FROM messages WHERE conversation_id IN (...)
   */
  avoidNPlusOneQueries: true,

  /**
   * Use partial indexes for frequently filtered data
   *
   * CREATE INDEX idx_active_conversations
   * ON conversations(organization_id, created_at)
   * WHERE status = 'active';
   */
  usePartialIndexes: true
};

/**
 * Query optimization helpers
 */
export const QueryHelpers = {
  /**
   * Build optimized conversation list query
   * Only selects necessary columns for list view
   */
  optimizedConversationList: (orgId: string, limit: number = 20) => ({
    select: 'id, customer_phone, status, created_at, updated_at, bot_id',
    filter: { organization_id: orgId },
    order: { column: 'created_at', ascending: false },
    limit
  }),

  /**
   * Build optimized message list query
   * Only selects necessary columns for chat view
   */
  optimizedMessageList: (conversationId: string, limit: number = 50) => ({
    select: 'id, content, direction, status, created_at, metadata',
    filter: { conversation_id: conversationId },
    order: { column: 'created_at', ascending: true },
    limit
  }),

  /**
   * Build optimized analytics query
   * Uses indexed columns for fast aggregation
   */
  optimizedAnalyticsQuery: (orgId: string, startDate: Date, endDate: Date) => ({
    select: 'organization_id, started_at, resolution_status, COUNT(*) as count',
    filter: {
      organization_id: orgId,
      started_at: { gte: startDate, lte: endDate }
    },
    groupBy: ['organization_id', 'started_at', 'resolution_status']
  })
};

/**
 * Log query metrics on interval (for monitoring)
 */
export function startQueryMetricsLogger(intervalMs: number = 60000): NodeJS.Timeout {
  return setInterval(() => {
    queryMetrics.logSummary();
  }, intervalMs);
}

/**
 * Database query best practices
 */
export const QueryBestPractices = {
  // 1. Use specific SELECT columns
  selectColumns: [
    'id',
    'created_at',
    'updated_at',
    // Only include columns you need
  ],

  // 2. Use indexed WHERE clauses
  indexedFilters: {
    organization_id: 'uuid',
    created_at: 'timestamp',
    status: 'text'
  },

  // 3. Use LIMIT for pagination
  pagination: {
    limit: 20,
    offset: 0
  },

  // 4. Use ORDER BY on indexed columns
  orderBy: {
    column: 'created_at',
    ascending: false // DESC uses index efficiently
  },

  // 5. Avoid SELECT COUNT(*) on large tables
  // Use approximate counts or cached values instead
  useApproximateCount: true
};
