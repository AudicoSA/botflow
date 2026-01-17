/**
 * Input Validation and Sanitization Utilities
 * Phase 2 Week 6 Day 6: Security hardening
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Email validation
  email: z.string().email('Invalid email address'),

  // Phone number validation (international format)
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),

  // South African phone number
  phoneZA: z.string().regex(/^\+27[0-9]{9}$/, 'Invalid South African phone number'),

  // URL validation
  url: z.string().url('Invalid URL'),

  // Strong password (min 8 chars, uppercase, lowercase, number, special char)
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  // Organization name
  organizationName: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_&.]+$/, 'Organization name contains invalid characters'),

  // Bot name
  botName: z.string()
    .min(1, 'Bot name is required')
    .max(100, 'Bot name must be less than 100 characters'),

  // Bot type
  botType: z.enum(['booking', 'faq', 'order_tracking', 'custom'], {
    errorMap: () => ({ message: 'Invalid bot type' })
  }),

  // AI model
  aiModel: z.enum(['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'], {
    errorMap: () => ({ message: 'Invalid AI model' })
  }),

  // Temperature (0-2)
  temperature: z.number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature must be at most 2'),

  // Pagination
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    { message: 'Start date must be before end date' }
  ),

  // File upload
  fileUpload: z.object({
    filename: z.string()
      .min(1, 'Filename is required')
      .max(255, 'Filename too long')
      .regex(/^[a-zA-Z0-9\-_. ]+$/, 'Invalid filename characters'),
    mimetype: z.enum([
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ], { errorMap: () => ({ message: 'Invalid file type' }) }),
    size: z.number()
      .max(10 * 1024 * 1024, 'File size must be less than 10MB')
  })
};

/**
 * Sanitization functions
 */
export const Sanitize = {
  /**
   * Sanitize HTML to prevent XSS
   */
  html: (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: []
    });
  },

  /**
   * Sanitize string - remove control characters
   */
  string: (input: string): string => {
    return input.replace(/[\x00-\x1F\x7F]/g, '');
  },

  /**
   * Sanitize filename - remove path traversal attempts
   */
  filename: (input: string): string => {
    return input
      .replace(/\.\./g, '') // Remove ..
      .replace(/[<>:"|?*]/g, '') // Remove invalid filename chars
      .replace(/^\.+/, '') // Remove leading dots
      .trim();
  },

  /**
   * Sanitize SQL input (basic - use parameterized queries instead!)
   */
  sql: (input: string): string => {
    return input
      .replace(/['";\\]/g, '') // Remove SQL injection chars
      .replace(/--/g, '') // Remove SQL comments
      .trim();
  },

  /**
   * Sanitize phone number - keep only digits and +
   */
  phone: (input: string): string => {
    return input.replace(/[^\d+]/g, '');
  },

  /**
   * Sanitize email
   */
  email: (input: string): string => {
    return input.toLowerCase().trim();
  },

  /**
   * Escape regex special characters
   */
  regex: (input: string): string => {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
};

/**
 * Validation error formatter
 */
export function formatValidationError(error: z.ZodError) {
  return {
    error: 'Validation Error',
    details: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
  };
}

/**
 * Validate and sanitize bot configuration
 */
export const validateBotConfig = z.object({
  name: ValidationSchemas.botName,
  type: ValidationSchemas.botType,
  whatsapp_account_id: ValidationSchemas.uuid,
  configuration: z.object({
    systemPrompt: z.string()
      .min(10, 'System prompt must be at least 10 characters')
      .max(5000, 'System prompt must be less than 5000 characters')
      .transform(Sanitize.html), // Remove HTML
    welcomeMessage: z.string()
      .max(1000, 'Welcome message must be less than 1000 characters')
      .optional()
      .transform(val => val ? Sanitize.html(val) : undefined),
    model: ValidationSchemas.aiModel.default('gpt-4o'),
    temperature: ValidationSchemas.temperature.default(0.7),
    maxTokens: z.number()
      .int()
      .min(100)
      .max(4000)
      .default(1000)
  })
});

/**
 * Validate and sanitize conversation creation
 */
export const validateConversation = z.object({
  customer_phone: ValidationSchemas.phoneZA,
  bot_id: ValidationSchemas.uuid,
  metadata: z.record(z.any()).optional()
});

/**
 * Validate and sanitize message creation
 */
export const validateMessage = z.object({
  conversation_id: ValidationSchemas.uuid,
  content: z.string()
    .min(1, 'Message content is required')
    .max(4096, 'Message content too long')
    .transform(Sanitize.string), // Remove control characters
  direction: z.enum(['inbound', 'outbound']),
  metadata: z.record(z.any()).optional()
});

/**
 * Validate and sanitize knowledge base article
 */
export const validateKnowledgeArticle = z.object({
  bot_id: ValidationSchemas.uuid,
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title too long')
    .transform(Sanitize.html),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content too long')
    .optional(),
  file_path: z.string()
    .max(500, 'File path too long')
    .optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Validate webhook signature (HMAC)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Rate limit key generator - safely extract IP
 */
export function getRateLimitKey(request: any): string {
  // Trust proxy headers (Railway/Vercel)
  const ip = request.headers['x-forwarded-for']?.split(',')[0].trim() ||
             request.headers['x-real-ip'] ||
             request.ip ||
             'unknown';

  return `ratelimit:${Sanitize.string(ip)}`;
}

/**
 * Validate JWT token payload
 */
export const validateJWTPayload = z.object({
  userId: ValidationSchemas.uuid,
  organizationId: ValidationSchemas.uuid,
  email: ValidationSchemas.email,
  iat: z.number().int().positive(),
  exp: z.number().int().positive()
}).refine(
  (data) => data.exp > data.iat,
  { message: 'Token expiration must be after issued time' }
);

/**
 * Security best practices
 */
export const SecurityBestPractices = {
  // Always use parameterized queries
  useParameterizedQueries: true,

  // Always validate input
  validateAllInput: true,

  // Always sanitize output
  sanitizeOutput: true,

  // Use HTTPS only
  httpsOnly: true,

  // Implement rate limiting
  rateLimiting: true,

  // Use strong passwords
  strongPasswords: true,

  // Enable CORS properly
  corsConfiguration: true,

  // Add security headers
  securityHeaders: true,

  // Log security events
  logSecurityEvents: true,

  // Regular security audits
  securityAudits: true
};

/**
 * Common attack patterns to detect
 */
export const AttackPatterns = {
  // SQL Injection patterns
  sqlInjection: /(\bor\b|\band\b|union|select|insert|update|delete|drop|;|--|\/\*|\*\/)/i,

  // XSS patterns
  xss: /<script|javascript:|onerror=|onload=/i,

  // Path traversal
  pathTraversal: /\.\.[\/\\]/,

  // Command injection
  commandInjection: /[;&|`$()]/,

  // LDAP injection
  ldapInjection: /[*)(|&=]/
};

/**
 * Detect potential attacks in input
 */
export function detectAttack(input: string): string | null {
  for (const [attackType, pattern] of Object.entries(AttackPatterns)) {
    if (pattern.test(input)) {
      return attackType;
    }
  }
  return null;
}

/**
 * Validate and sanitize user input with attack detection
 */
export function validateInput(input: string, schema: z.ZodSchema): {
  valid: boolean;
  data?: any;
  error?: string;
  attack?: string;
} {
  // Check for attacks
  const attack = detectAttack(input);
  if (attack) {
    return {
      valid: false,
      error: 'Invalid input detected',
      attack
    };
  }

  // Validate with schema
  const result = schema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      data: result.data
    };
  } else {
    return {
      valid: false,
      error: formatValidationError(result.error).details[0]?.message
    };
  }
}
