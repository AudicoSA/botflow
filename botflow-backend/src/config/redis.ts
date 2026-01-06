import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

// Make Redis optional for development
let redis: Redis | null = null;

try {
    redis = new Redis({
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT),
        password: env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
            // Stop retrying after 3 attempts
            if (times > 3) {
                logger.warn('Redis unavailable - message queue disabled');
                return null;
            }
            return Math.min(times * 50, 2000);
        },
        lazyConnect: true, // Don't connect immediately
    });

    redis.on('connect', () => {
        logger.info('✅ Redis connected');
    });

    redis.on('error', (error) => {
        // Suppress connection errors in development
        if (env.NODE_ENV === 'development') {
            logger.warn('⚠️ Redis not available - running without message queue');
        } else {
            logger.error({ error }, '❌ Redis connection error');
        }
    });

    // Try to connect
    redis.connect().catch(() => {
        logger.warn('⚠️ Redis connection failed - running without message queue');
        redis = null;
    });
} catch (error) {
    logger.warn('⚠️ Redis initialization failed - running without message queue');
    redis = null;
}

export default redis;
