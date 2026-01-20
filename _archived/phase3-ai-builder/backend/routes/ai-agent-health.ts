/**
 * AI Agent Health Routes (Phase 3 Week 5.2)
 *
 * Provides health check and metrics endpoints for the AI agent services.
 */

import { FastifyInstance } from 'fastify';
import { getPerformanceCache } from '../services/ai-agent/performance-cache.js';
import { getAgentMetrics, AgentMetrics } from '../services/ai-agent/metrics-collector.js';
import { getContextManager } from '../services/ai-agent/context-manager.js';
import { getCacheWarmer } from '../services/ai-agent/cache-warmer.js';

/**
 * Health status levels
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check response
 */
interface HealthCheckResponse {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  version: string;
  services: {
    cache: {
      status: HealthStatus;
      hitRate: number;
      size: number;
    };
    contextManager: {
      status: HealthStatus;
      activeSessions: number;
      stateDistribution: Record<string, number>;
    };
    metrics: {
      status: HealthStatus;
      successRate: number;
      avgResponseTime: number;
      p95ResponseTime: number;
      errorCount: number;
    };
  };
  warnings: string[];
  errors: string[];
}

/**
 * Detailed metrics response
 */
interface DetailedMetricsResponse {
  performance: {
    intentParsing: {
      avg: number;
      p50: number;
      p95: number;
    };
    generation: {
      avg: number;
      p50: number;
      p95: number;
    };
    deployment: {
      avg: number;
    };
  };
  usage: {
    totalRequests: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    totalEntries: number;
    memoryCacheSize: number;
    dbCacheSize: number;
  };
  sessions: {
    active: number;
    totalMessages: number;
    stateDistribution: Record<string, number>;
  };
  errors: {
    recent: Array<{
      type: string;
      message: string;
      timestamp: string;
    }>;
    byType: Record<string, number>;
  };
  timestamp: string;
}

/**
 * Register AI Agent health routes
 */
export async function aiAgentHealthRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/agent/health
   * Quick health check endpoint
   */
  fastify.get('/health', async (request, reply) => {
    const cache = getPerformanceCache();
    const metrics = getAgentMetrics();
    const contextManager = getContextManager();

    const stats = metrics.getStats();
    const cacheStats = await cache.getStats();
    const sessionStats = contextManager.getStats();

    const warnings: string[] = [];
    const errors: string[] = [];

    // Determine cache health
    let cacheStatus: HealthStatus = 'healthy';
    if (cacheStats.hitRate < 0.5 && cacheStats.totalEntries > 0) {
      cacheStatus = 'degraded';
      warnings.push('Cache hit rate below 50%');
    }

    // Determine context manager health
    let contextStatus: HealthStatus = 'healthy';
    if (sessionStats.stateDistribution.error > sessionStats.activeSessions * 0.2) {
      contextStatus = 'degraded';
      warnings.push('High error state count in sessions');
    }

    // Determine metrics health
    let metricsStatus: HealthStatus = 'healthy';
    if (stats.successRate < 0.9 && stats.totalRequests > 10) {
      metricsStatus = 'degraded';
      warnings.push('Success rate below 90%');
    }
    if (stats.p95GenerationTime > 5000) {
      metricsStatus = 'degraded';
      warnings.push('P95 generation time above 5 seconds');
    }
    if (stats.errorCount > 100) {
      errors.push('High error count detected');
    }

    // Overall status
    let status: HealthStatus = 'healthy';
    if (warnings.length > 0) {
      status = 'degraded';
    }
    if (errors.length > 0) {
      status = 'unhealthy';
    }

    const response: HealthCheckResponse = {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '3.5.2', // Phase 3 Week 5.2
      services: {
        cache: {
          status: cacheStatus,
          hitRate: cacheStats.hitRate,
          size: cacheStats.totalEntries
        },
        contextManager: {
          status: contextStatus,
          activeSessions: sessionStats.activeSessions,
          stateDistribution: sessionStats.stateDistribution
        },
        metrics: {
          status: metricsStatus,
          successRate: stats.successRate,
          avgResponseTime: stats.avgGenerationTime,
          p95ResponseTime: stats.p95GenerationTime,
          errorCount: stats.errorCount
        }
      },
      warnings,
      errors
    };

    // Return appropriate status code
    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    return reply.code(statusCode).send(response);
  });

  /**
   * GET /api/agent/metrics
   * Detailed metrics endpoint
   */
  fastify.get('/metrics', async (request, reply) => {
    const metrics = getAgentMetrics();
    const cache = getPerformanceCache();
    const contextManager = getContextManager();

    const stats = metrics.getStats();
    const cacheStats = await cache.getStats();
    const sessionStats = contextManager.getStats();

    const response: DetailedMetricsResponse = {
      performance: {
        intentParsing: {
          avg: stats.avgIntentParseTime,
          p50: stats.p50IntentParseTime,
          p95: stats.p95IntentParseTime
        },
        generation: {
          avg: stats.avgGenerationTime,
          p50: stats.p50GenerationTime,
          p95: stats.p95GenerationTime
        },
        deployment: {
          avg: stats.avgDeploymentTime
        }
      },
      usage: {
        totalRequests: stats.totalRequests,
        successCount: stats.successCount,
        errorCount: stats.errorCount,
        successRate: stats.successRate,
        errorRate: stats.errorRate
      },
      cache: {
        hitRate: cacheStats.hitRate,
        totalEntries: cacheStats.totalEntries,
        memoryCacheSize: cacheStats.memoryCacheSize,
        dbCacheSize: cacheStats.dbCacheSize
      },
      sessions: {
        active: sessionStats.activeSessions,
        totalMessages: sessionStats.totalMessages,
        stateDistribution: sessionStats.stateDistribution
      },
      errors: {
        recent: stats.recentErrors.map(e => ({
          type: e.type,
          message: e.message,
          timestamp: e.timestamp.toISOString()
        })),
        byType: metrics.getErrorsByType()
      },
      timestamp: new Date().toISOString()
    };

    return reply.send(response);
  });

  /**
   * GET /api/agent/metrics/prometheus
   * Prometheus-formatted metrics
   */
  fastify.get('/metrics/prometheus', async (request, reply) => {
    const metrics = getAgentMetrics();
    const prometheusMetrics = metrics.exportPrometheusMetrics();

    return reply
      .header('Content-Type', 'text/plain; charset=utf-8')
      .send(prometheusMetrics);
  });

  /**
   * POST /api/agent/cache/warmup
   * Trigger cache warm-up manually
   */
  fastify.post('/cache/warmup', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const cacheWarmer = getCacheWarmer();
    const status = cacheWarmer.getStatus();

    if (status.isWarming) {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'Cache warm-up already in progress'
      });
    }

    // Start warm-up asynchronously
    const resultPromise = cacheWarmer.warmUp();

    // Return immediately with accepted status
    return reply.code(202).send({
      message: 'Cache warm-up started',
      status: 'pending'
    });
  });

  /**
   * GET /api/agent/cache/status
   * Get cache warm-up status
   */
  fastify.get('/cache/status', async (request, reply) => {
    const cacheWarmer = getCacheWarmer();
    const status = await cacheWarmer.getStatusAsync();

    return reply.send({
      isWarming: status.isWarming,
      lastWarmUp: status.lastWarmUp?.toISOString() || null,
      cache: {
        totalEntries: status.cacheStats.totalEntries,
        hitRate: status.cacheStats.hitRate,
        memoryCacheSize: status.cacheStats.memoryCacheSize,
        dbCacheSize: status.cacheStats.dbCacheSize
      }
    });
  });

  /**
   * DELETE /api/agent/cache
   * Clear cache (admin only)
   */
  fastify.delete('/cache', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const cache = getPerformanceCache();
    await cache.clearAll();

    return reply.send({
      message: 'Cache cleared successfully'
    });
  });

  /**
   * POST /api/agent/metrics/reset
   * Reset metrics (admin only)
   */
  fastify.post('/metrics/reset', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const metrics = getAgentMetrics();
    metrics.reset();

    return reply.send({
      message: 'Metrics reset successfully'
    });
  });

  /**
   * GET /api/agent/ready
   * Kubernetes readiness probe
   */
  fastify.get('/ready', async (request, reply) => {
    const metrics = getAgentMetrics();
    const stats = metrics.getStats();

    // Check if we have high error rate
    if (stats.totalRequests > 10 && stats.errorRate > 0.5) {
      return reply.code(503).send({
        ready: false,
        reason: 'High error rate'
      });
    }

    return reply.send({
      ready: true
    });
  });

  /**
   * GET /api/agent/live
   * Kubernetes liveness probe
   */
  fastify.get('/live', async (request, reply) => {
    return reply.send({
      alive: true,
      uptime: process.uptime()
    });
  });
}

export default aiAgentHealthRoutes;
