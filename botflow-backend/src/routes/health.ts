import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../config/supabase.js';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { cacheService } from '../services/cache.service.js';
import { queryMetrics } from '../utils/query-optimizer.js';

export default async function healthRoutes(fastify: FastifyInstance) {
    // Basic health check endpoint (fast, no dependencies)
    fastify.get('/', async (request, reply) => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
        };
    });

    // Comprehensive health check (checks all dependencies)
    fastify.get('/health', async (request, reply) => {
        const checks = {
            database: false,
            redis: false,
            memory: false,
            disk: false
        };

        const startTime = Date.now();

        // Check database connection
        try {
            const { error } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .limit(1);

            checks.database = !error;
        } catch (error) {
            logger.error({ error }, 'Database health check failed');
            checks.database = false;
        }

        // Check Redis connection
        try {
            await redis.ping();
            checks.redis = true;
        } catch (error) {
            logger.error({ error }, 'Redis health check failed');
            checks.redis = false;
        }

        // Check memory usage
        const memUsage = process.memoryUsage();
        checks.memory = memUsage.heapUsed < memUsage.heapTotal * 0.9; // Less than 90% used

        // Check disk usage (if available)
        checks.disk = true; // Placeholder - implement actual disk check if needed

        const allHealthy = Object.values(checks).every(v => v);
        const responseTime = Date.now() - startTime;

        const response = {
            status: allHealthy ? 'healthy' : 'unhealthy',
            checks,
            uptime: process.uptime(),
            responseTime: `${responseTime}ms`,
            memory: {
                heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
                rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
                external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
            },
            timestamp: new Date().toISOString()
        };

        return reply.status(allHealthy ? 200 : 503).send(response);
    });

    // Readiness check (checks dependencies - for K8s/Railway)
    fastify.get('/ready', async (request, reply) => {
        try {
            // Check Supabase connection
            const { error } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .limit(1);

            if (error) throw error;

            // Check Redis connection
            await redis.ping();

            return {
                status: 'ready',
                checks: {
                    database: 'ok',
                    redis: 'ok',
                },
            };
        } catch (error) {
            reply.status(503);
            return {
                status: 'not ready',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });

    // Liveness check (for K8s/Railway)
    fastify.get('/live', async (request, reply) => {
        return {
            status: 'alive',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    });

    // Performance metrics endpoint
    fastify.get('/metrics', async (request, reply) => {
        try {
            // Get query performance metrics
            const queryStats = queryMetrics.getSlowestQueries(10);

            // Get cache statistics
            const cacheStats = await cacheService.getCacheStats();

            // Get memory usage
            const memUsage = process.memoryUsage();

            return {
                queries: {
                    slowest: queryStats,
                    total: queryMetrics.getAllMetrics().length
                },
                cache: cacheStats,
                memory: {
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                    rss: Math.round(memUsage.rss / 1024 / 1024),
                    external: Math.round(memUsage.external / 1024 / 1024)
                },
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get metrics');
            return reply.status(500).send({
                error: 'Failed to retrieve metrics'
            });
        }
    });
}
