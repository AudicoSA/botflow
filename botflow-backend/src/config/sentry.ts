/**
 * Sentry Configuration
 * Phase 2 Week 6 Day 3: Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry() {
  // Skip Sentry in development if DSN not set
  if (!env.SENTRY_DSN) {
    logger.info('Sentry DSN not configured - skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,

    // Performance monitoring sample rates
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: 0.1, // Profile 10% of transactions

    // Integrations
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({
        app: undefined // Will be set by Fastify
      })
    ],

    // Before sending to Sentry, we can modify the event
    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly enabled
      if (env.NODE_ENV === 'development' && !env.SENTRY_SEND_IN_DEV) {
        return null;
      }

      // Filter out sensitive data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      'Non-Error exception captured',
      'Non-Error promise rejection captured',
      // Add more error patterns to ignore
    ],

    // Set user context (we'll update this per request)
    beforeBreadcrumb(breadcrumb) {
      // Filter sensitive breadcrumbs
      if (breadcrumb.category === 'http') {
        delete breadcrumb.data?.authorization;
      }
      return breadcrumb;
    }
  });

  logger.info('✅ Sentry initialized', {
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0
  });
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, organizationId?: string) {
  Sentry.setUser({
    id: userId,
    ...(organizationId && { organization_id: organizationId })
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry
 */
export function setSentryContext(key: string, value: any) {
  Sentry.setContext(key, value);
}

/**
 * Track custom transaction (for performance monitoring)
 */
export function startSentryTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op
  });
}

/**
 * Track slow query and send to Sentry
 */
export function trackSlowQuery(queryName: string, duration: number, threshold: number = 100) {
  if (duration > threshold) {
    Sentry.captureMessage(`Slow query: ${queryName} (${duration}ms)`, {
      level: 'warning',
      tags: {
        query: queryName,
        duration,
        threshold
      }
    });
  }
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined
  });
}

/**
 * Capture message with level
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  Sentry.captureMessage(message, {
    level,
    contexts: context ? { custom: context } : undefined
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>, level: Sentry.SeverityLevel = 'info') {
  Sentry.addBreadcrumb({
    message,
    data,
    level
  });
}

export { Sentry };
