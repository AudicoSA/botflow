import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

// Redis is optional - only needed for message queue (BullMQ)
// Bot creation works fine without it
let redis: Redis | null = null;

// Only initialize if Redis config is provided
if (env.REDIS_HOST && env.REDIS_PORT) {
    try {
        redis = new Redis({
            host: env.REDIS_HOST,
            port: parseInt(env.REDIS_PORT),
            password: env.REDIS_PASSWORD,
            maxRetriesPerRequest: null,
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn('⚠️ Redis unavailable - message queue disabled');
                    return null;
                }
                return Math.min(times * 50, 2000);
            },
            lazyConnect: true,
        });

        redis.on('connect', () => {
            logger.info('✅ Redis connected');
        });

        redis.on('error', (error) => {
            logger.warn({ error }, '⚠️ Redis error - message queue may be unavailable');
        });

        // Try to connect
        redis.connect().catch(() => {
            logger.warn('⚠️ Redis connection failed - running without message queue');
            redis = null;
        });
    } catch (error) {
        logger.warn({ error }, '⚠️ Redis initialization failed - running without message queue');
        redis = null;
    }
} else {
    logger.info('ℹ️ Redis not configured - running without message queue (this is fine for now)');
}

export default redis;
