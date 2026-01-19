/**
 * Rate Limiting Middleware (Phase 3 Week 5)
 *
 * Configures rate limits for AI agent endpoints to prevent abuse.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../config/redis.js';

// ============================================================================
// Rate Limit Configuration
// ============================================================================

export interface RateLimitConfig {
  max: number;           // Maximum requests
  timeWindow: number;    // Time window in milliseconds
  keyPrefix?: string;    // Redis key prefix
}

export const AI_AGENT_RATE_LIMITS = {
  chat: {
    max: 30,
    timeWindow: 60 * 1000,  // 30 per minute
    keyPrefix: 'rl:chat'
  },
  generate: {
    max: 10,
    timeWindow: 60 * 1000,  // 10 per minute
    keyPrefix: 'rl:generate'
  },
  deploy: {
    max: 5,
    timeWindow: 60 * 1000,  // 5 per minute
    keyPrefix: 'rl:deploy'
  },
  session: {
    max: 100,
    timeWindow: 60 * 1000,  // 100 per minute
    keyPrefix: 'rl:session'
  }
} as const;

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter {
  private useRedis: boolean;
  private memoryStore: Map<string, { count: number; resetAt: number }>;

  constructor() {
    this.useRedis = !!redis;
    this.memoryStore = new Map();

    // Cleanup memory store periodically
    if (!this.useRedis) {
      setInterval(() => this.cleanupMemoryStore(), 60 * 1000);
    }
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const fullKey = `${config.keyPrefix || 'rl'}:${key}`;

    if (this.useRedis) {
      return this.checkLimitRedis(fullKey, config);
    }
    return this.checkLimitMemory(fullKey, config);
  }

  /**
   * Redis-based rate limiting
   */
  private async checkLimitRedis(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    if (!redis) {
      return { allowed: true, remaining: config.max, resetAt: new Date() };
    }

    const now = Date.now();
    const windowStart = now - config.timeWindow;

    // Use sorted set for sliding window
    const multi = redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Count requests in window
    multi.zcard(key);

    // Set expiry
    multi.expire(key, Math.ceil(config.timeWindow / 1000));

    const results = await multi.exec();
    const count = (results?.[2]?.[1] as number) || 0;

    const remaining = Math.max(0, config.max - count);
    const resetAt = new Date(now + config.timeWindow);

    return {
      allowed: count <= config.max,
      remaining,
      resetAt
    };
  }

  /**
   * Memory-based rate limiting (fallback)
   */
  private checkLimitMemory(
    key: string,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetAt: Date } {
    const now = Date.now();
    const entry = this.memoryStore.get(key);

    if (!entry || now > entry.resetAt) {
      // New window
      this.memoryStore.set(key, {
        count: 1,
        resetAt: now + config.timeWindow
      });
      return {
        allowed: true,
        remaining: config.max - 1,
        resetAt: new Date(now + config.timeWindow)
      };
    }

    // Increment count
    entry.count++;
    const allowed = entry.count <= config.max;
    const remaining = Math.max(0, config.max - entry.count);

    return {
      allowed,
      remaining,
      resetAt: new Date(entry.resetAt)
    };
  }

  /**
   * Cleanup expired entries from memory store
   */
  private cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now > entry.resetAt) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Get rate limit key from request
   */
  static getKeyFromRequest(request: FastifyRequest): string {
    // Prefer user ID, fall back to IP
    const user = request.user as { userId?: string; id?: string } | undefined;
    return user?.userId || user?.id || request.ip || 'anonymous';
  }
}

// ============================================================================
// Fastify Hook Factory
// ============================================================================

/**
 * Create a rate limit hook for a specific endpoint type
 */
export function createRateLimitHook(config: RateLimitConfig) {
  const limiter = new RateLimiter();

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = RateLimiter.getKeyFromRequest(request);
    const result = await limiter.checkLimit(key, config);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', config.max);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      reply.status(429).send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again after ${result.resetAt.toISOString()}`,
        retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
      });
      return reply;
    }
  };
}

// ============================================================================
// Plugin Registration
// ============================================================================

/**
 * Register rate limiting for AI agent routes
 */
export async function registerRateLimiting(fastify: FastifyInstance): Promise<void> {
  // Add hooks for different endpoint types
  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.routerPath || request.url;

    // Determine rate limit config based on path
    let config: RateLimitConfig | null = null;

    if (path.includes('/agent/chat')) {
      config = AI_AGENT_RATE_LIMITS.chat;
    } else if (path.includes('/agent/generate')) {
      config = AI_AGENT_RATE_LIMITS.generate;
    } else if (path.includes('/agent/deploy')) {
      config = AI_AGENT_RATE_LIMITS.deploy;
    } else if (path.includes('/agent/session')) {
      config = AI_AGENT_RATE_LIMITS.session;
    }

    if (config) {
      const hook = createRateLimitHook(config);
      await hook(request, reply);
    }
  });
}

// ============================================================================
// Exports
// ============================================================================

export default RateLimiter;
