import { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
    // Health check endpoint
    fastify.get('/', async (request, reply) => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
        };
    });

    // Readiness check (checks dependencies)
    fastify.get('/ready', async (request, reply) => {
        try {
            // Check Supabase connection
            const { supabaseAdmin } = await import('../config/supabase.js');
            const { data, error } = await supabaseAdmin.from('organizations').select('count').limit(1);

            if (error) throw error;

            // Check Redis connection
            const redis = (await import('../config/redis.js')).default;
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
}
