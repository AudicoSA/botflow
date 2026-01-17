/**
 * Security Configuration
 * Phase 2 Week 6 Day 6: Rate limiting, headers, and security hardening
 */

import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { redis } from './redis.js';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Configure rate limiting
 */
export async function configureRateLimit(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    max: 100, // 100 requests per timeWindow
    timeWindow: '1 minute',
    cache: 10000, // Keep 10k rate limit entries in memory
    allowList: ['127.0.0.1', '::1'], // Localhost bypasses rate limit
    redis: redis, // Use Redis for distributed rate limiting
    skipOnError: false, // Don't skip rate limiting on Redis errors

    // Use real IP from headers (for Railway/Vercel)
    keyGenerator: (request) => {
      return request.headers['x-forwarded-for'] as string ||
             request.headers['x-real-ip'] as string ||
             request.ip;
    },

    // Custom error response
    errorResponseBuilder: (request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.after / 1000)} seconds.`,
        retryAfter: Math.ceil(context.after / 1000)
      };
    },

    // Hook for logging rate limit hits
    onExceeding: (request) => {
      logger.warn({
        ip: request.ip,
        url: request.url,
        method: request.method
      }, 'Rate limit approaching');
    },

    onExceeded: (request) => {
      logger.error({
        ip: request.ip,
        url: request.url,
        method: request.method
      }, 'Rate limit exceeded');
    }
  });

  logger.info('✅ Rate limiting configured (100 req/min per IP)');
}

/**
 * Configure stricter rate limits for specific endpoints
 */
export function configureStrictRateLimits(fastify: FastifyInstance) {
  // Authentication endpoints - very strict
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/auth/')) {
      const key = `auth_ratelimit:${request.ip}`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, 60); // 1 minute window
      }

      if (count > 5) {
        reply.code(429).send({
          error: 'Too many authentication attempts. Please wait 1 minute.'
        });
        return;
      }
    }

    // Webhook endpoints - medium strict
    if (request.url.startsWith('/webhooks/')) {
      const key = `webhook_ratelimit:${request.ip}`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, 60);
      }

      if (count > 50) {
        reply.code(429).send({
          error: 'Webhook rate limit exceeded'
        });
        return;
      }
    }
  });

  logger.info('✅ Strict rate limits configured for auth and webhooks');
}

/**
 * Configure security headers with Helmet
 */
export async function configureSecurityHeaders(fastify: FastifyInstance) {
  await fastify.register(helmet, {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", env.FRONTEND_URL],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },

    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Allow embedding
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },

    // Frame Options
    frameguard: { action: 'deny' },

    // Hide Powered By
    hidePoweredBy: true,

    // HSTS - Force HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // IE No Open
    ieNoOpen: true,

    // No Sniff
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },

    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // XSS Filter
    xssFilter: true
  });

  logger.info('✅ Security headers configured with Helmet');
}

/**
 * Configure CORS with strict settings
 */
export async function configureCORS(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Allowed origins
      const allowedOrigins = [
        env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        /^https:\/\/.*\.vercel\.app$/, // Vercel preview deployments
        /^https:\/\/.*\.railway\.app$/, // Railway deployments
      ];

      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        } else {
          return allowed.test(origin);
        }
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn({ origin }, 'CORS request blocked - origin not allowed');
        callback(new Error('CORS not allowed'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400 // 24 hours
  });

  logger.info('✅ CORS configured with strict origin checking');
}

/**
 * Add custom security middleware
 */
export function configureCustomSecurity(fastify: FastifyInstance) {
  // Add request ID to all requests
  fastify.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id'] ||
                      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    reply.header('X-Request-ID', requestId);
    request.id = requestId;
  });

  // Log all requests
  fastify.addHook('onRequest', async (request) => {
    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    }, 'Incoming request');
  });

  // Validate Content-Type for POST/PUT/PATCH
  fastify.addHook('preHandler', async (request, reply) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers['content-type'];

      if (!contentType || !contentType.includes('application/json')) {
        reply.code(415).send({
          error: 'Unsupported Media Type',
          message: 'Content-Type must be application/json'
        });
        return;
      }
    }
  });

  // Prevent parameter pollution
  fastify.addHook('preHandler', async (request, reply) => {
    const queryParams = request.query as Record<string, any>;

    for (const key in queryParams) {
      if (Array.isArray(queryParams[key])) {
        // If parameter is duplicated, reject request
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Duplicate query parameters not allowed'
        });
        return;
      }
    }
  });

  // Add security headers to all responses
  fastify.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  });

  logger.info('✅ Custom security middleware configured');
}

/**
 * Configure all security features
 */
export async function configureSecurity(fastify: FastifyInstance) {
  await configureRateLimit(fastify);
  await configureSecurityHeaders(fastify);
  await configureCORS(fastify);
  configureStrictRateLimits(fastify);
  configureCustomSecurity(fastify);

  logger.info('🔒 All security features configured');
}
