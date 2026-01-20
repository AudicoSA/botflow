import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

// Redis is optional - only needed for message queue (BullMQ)
// Bot creation works fine without it
let redis: Redis | null = null;

// Check if Redis is configured (either via URL or individual settings)
const hasRedisConfig = env.REDIS_URL || (env.REDIS_HOST && env.REDIS_PORT);

if (hasRedisConfig) {
    try {
        if (env.REDIS_URL) {
            // Use REDIS_URL (recommended for Upstash and other cloud Redis)
            // Format: redis://default:password@host:port or rediss://... for TLS
            logger.info('Connecting to Redis via URL...');

            redis = new Redis(env.REDIS_URL, {
                maxRetriesPerRequest: null,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.warn('Redis unavailable - message queue disabled');
                        return null;
                    }
                    return Math.min(times * 50, 2000);
                },
                lazyConnect: true,
                // Enable TLS if URL starts with rediss://
                tls: env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
            });
        } else {
            // Use individual settings
            logger.info(`Connecting to Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}...`);

            redis = new Redis({
                host: env.REDIS_HOST,
                port: parseInt(env.REDIS_PORT!),
                password: env.REDIS_PASSWORD,
                maxRetriesPerRequest: null,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.warn('Redis unavailable - message queue disabled');
                        return null;
                    }
                    return Math.min(times * 50, 2000);
                },
                lazyConnect: true,
                // Enable TLS if REDIS_TLS is true
                tls: env.REDIS_TLS ? {} : undefined,
            });
        }

        redis.on('connect', () => {
            logger.info('Redis connected successfully');
        });

        redis.on('error', (error) => {
            logger.warn({ error: error.message }, 'Redis error - message queue may be unavailable');
        });

        redis.on('close', () => {
            logger.warn('Redis connection closed');
        });

        // Try to connect
        redis.connect().catch((err) => {
            logger.warn({ error: err.message }, 'Redis connection failed - running without message queue');
            redis = null;
        });
    } catch (error: any) {
        logger.warn({ error: error.message }, 'Redis initialization failed - running without message queue');
        redis = null;
    }
} else {
    logger.info('Redis not configured - running without message queue (AI responses will not be sent automatically)');
}

export default redis;
export { redis };
