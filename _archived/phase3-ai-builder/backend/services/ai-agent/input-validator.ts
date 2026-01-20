/**
 * Input Validation Service (Phase 3 Week 5)
 *
 * Validates and sanitizes all inputs to AI agent endpoints.
 * Prevents prompt injection, XSS, and other security issues.
 */

import { z } from 'zod';
import type { Blueprint, BlueprintNode, BlueprintEdge } from '../../types/workflow.js';

// ============================================================================
// Zod Schemas
// ============================================================================

export const nodeSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  name: z.string().max(200).optional(),
  config: z.record(z.any()).optional(),
  data: z.record(z.any()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export const edgeSchema = z.object({
  id: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  target: z.string().min(1).max(100),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().max(100).optional()
});

export const blueprintSchema = z.object({
  bot_id: z.string().min(1).max(100),
  version: z.string().max(20),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  nodes: z.array(nodeSchema).min(0).max(100),
  edges: z.array(edgeSchema).max(200),
  variables: z.record(z.string()).default({}),
  credentials: z.array(z.object({
    service: z.string(),
    credential_id: z.string()
  })).default([])
});

export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long (max 5000 characters)')
    .transform(s => s.trim()),
  sessionId: z.string().uuid().optional()
});

export const generateRequestSchema = z.object({
  description: z.string()
    .min(10, 'Description too short')
    .max(2000, 'Description too long'),
  integrations: z.array(z.string()).max(10).optional(),
  template: z.string().max(100).optional(),
  vertical: z.string().max(50).optional()
});

export const refineRequestSchema = z.object({
  sessionId: z.string().uuid(),
  modifications: z.string()
    .min(1)
    .max(2000, 'Modification request too long')
});

export const deployRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  workflow: blueprintSchema.optional(),
  activate: z.boolean().default(true)
});

// ============================================================================
// Input Validator Class
// ============================================================================

export class InputValidator {
  // Dangerous patterns for prompt injection
  private static readonly PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(previous|all|above)\s+instructions/i,
    /system\s*:/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<<SYS>>/i,
    /<\|im_start\|>/i,
    /```\s*(system|assistant)/i,
    /you\s+are\s+now\s+(a|an)/i,
    /pretend\s+you\s+are/i,
    /act\s+as\s+(if|a|an)/i,
    /roleplay\s+as/i,
    /jailbreak/i,
    /DAN\s+mode/i
  ];

  // XSS patterns
  private static readonly XSS_PATTERNS = [
    /<script\b[^>]*>/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  /**
   * Validate chat message input
   */
  validateChatMessage(input: unknown): { message: string; sessionId?: string } {
    const result = chatMessageSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid chat message', result.error.issues);
    }

    // Additional security checks
    this.checkForPromptInjection(result.data.message);

    return {
      message: result.data.message,
      sessionId: result.data.sessionId
    };
  }

  /**
   * Validate workflow generation request
   */
  validateGenerateRequest(input: unknown) {
    const result = generateRequestSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid generate request', result.error.issues);
    }

    this.checkForPromptInjection(result.data.description);

    return result.data;
  }

  /**
   * Validate workflow refinement request
   */
  validateRefineRequest(input: unknown) {
    const result = refineRequestSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid refine request', result.error.issues);
    }

    this.checkForPromptInjection(result.data.modifications);

    return result.data;
  }

  /**
   * Validate deploy request
   */
  validateDeployRequest(input: unknown) {
    const result = deployRequestSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid deploy request', result.error.issues);
    }
    return result.data;
  }

  /**
   * Validate a complete Blueprint
   */
  validateBlueprint(input: unknown): Blueprint {
    const result = blueprintSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid blueprint', result.error.issues);
    }
    return result.data as Blueprint;
  }

  /**
   * Sanitize message for use in AI prompts
   */
  sanitizeForPrompt(message: string): string {
    let sanitized = message;

    // Remove code blocks that might contain injection attempts
    sanitized = sanitized.replace(/```[\s\S]*?```/g, '[code block removed]');

    // Remove potential system-level instructions
    sanitized = sanitized.replace(/system\s*:/gi, '');
    sanitized = sanitized.replace(/\[INST\]/gi, '');
    sanitized = sanitized.replace(/\[\/INST\]/gi, '');
    sanitized = sanitized.replace(/<<SYS>>/gi, '');
    sanitized = sanitized.replace(/<\|im_start\|>/gi, '');

    // Limit length
    sanitized = sanitized.slice(0, 5000);

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Sanitize for HTML output (prevent XSS)
   */
  sanitizeForHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Check for prompt injection attempts
   */
  private checkForPromptInjection(text: string): void {
    for (const pattern of InputValidator.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        throw new SecurityError('Potential prompt injection detected');
      }
    }
  }

  /**
   * Check for XSS attempts
   */
  checkForXss(text: string): void {
    for (const pattern of InputValidator.XSS_PATTERNS) {
      if (pattern.test(text)) {
        throw new SecurityError('Potential XSS attempt detected');
      }
    }
  }

  /**
   * Validate session ID format
   */
  validateSessionId(sessionId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  /**
   * Validate bot ID format
   */
  validateBotId(botId: string): boolean {
    // UUID or custom ID format
    return /^[a-zA-Z0-9_-]{1,100}$/.test(botId);
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public issues: z.ZodIssue[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let instance: InputValidator | null = null;

export function getInputValidator(): InputValidator {
  if (!instance) {
    instance = new InputValidator();
  }
  return instance;
}

export default InputValidator;
