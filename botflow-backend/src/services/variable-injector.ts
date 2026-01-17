/**
 * Variable Injector Service (Phase 2 Week 2 Day 4)
 *
 * Handles secure variable and credential injection into workflows.
 *
 * Responsibilities:
 * - Replace {{variable}} tokens with actual values
 * - Inject credentials securely
 * - Prevent code injection attacks
 * - Handle nested variables (e.g., {{product.price}})
 * - Support environment variables
 */

import { N8nWorkflow, WorkflowVariables, InjectionContext } from '../types/workflow.js';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class VariableInjector {
  private static readonly VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';

  /**
   * Inject variables and credentials into an n8n workflow
   */
  async inject(workflow: N8nWorkflow, context: InjectionContext): Promise<N8nWorkflow> {
    // Clone workflow to avoid mutation
    const injected = JSON.parse(JSON.stringify(workflow));

    // Recursively replace variables in all node parameters
    for (const node of injected.nodes) {
      node.parameters = await this.replaceVariables(node.parameters, context);

      // Handle credentials separately
      if (node.credentials) {
        node.credentials = await this.injectCredentials(node.credentials, context);
      }
    }

    return injected;
  }

  /**
   * Recursively replace variables in any object/array
   */
  private async replaceVariables(obj: any, context: InjectionContext): Promise<any> {
    if (typeof obj === 'string') {
      return await this.replaceTokens(obj, context);
    }

    if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => this.replaceVariables(item, context)));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = await this.replaceVariables(value, context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Replace {{tokens}} in a string
   */
  private async replaceTokens(text: string, context: InjectionContext): Promise<string> {
    let result = text;

    // Find all {{variable}} tokens
    const matches = text.matchAll(VariableInjector.VARIABLE_PATTERN);

    for (const match of matches) {
      const fullMatch = match[0]; // {{variable}}
      const variablePath = match[1].trim(); // variable

      // Resolve variable value
      const value = await this.resolveVariable(variablePath, context);

      if (value !== undefined) {
        // Replace token with value
        result = result.replace(fullMatch, String(value));
      } else {
        console.warn(`Variable not found: ${variablePath}`);
        // Leave token as-is if variable not found
      }
    }

    return result;
  }

  /**
   * Resolve a variable path (supports nested paths like "product.price")
   */
  private async resolveVariable(path: string, context: InjectionContext): Promise<any> {
    // Security: Validate variable path
    if (!this.isValidVariablePath(path)) {
      throw new Error(`Invalid variable path: ${path}`);
    }

    const parts = path.split('.');
    const category = parts[0]; // "bot", "user", "conversation", "custom", "credentials", "env"

    // Handle different variable categories
    switch (category) {
      case 'bot':
        return this.getNestedValue(context.variables.bot, parts.slice(1));

      case 'user':
        return this.getNestedValue(context.variables.user, parts.slice(1));

      case 'conversation':
        return this.getNestedValue(context.variables.conversation, parts.slice(1));

      case 'custom':
        return this.getNestedValue(context.variables.custom, parts.slice(1));

      case 'credentials':
        // Credentials are handled separately for security
        return await this.resolveCredential(parts[1], context);

      case 'env':
        // Environment variables
        return process.env[parts[1]];

      default:
        // Try to find in any category
        for (const vars of Object.values(context.variables)) {
          const value = this.getNestedValue(vars, parts);
          if (value !== undefined) {
            return value;
          }
        }
        return undefined;
    }
  }

  /**
   * Get nested value from object using path array
   */
  private getNestedValue(obj: any, path: string[]): any {
    let current = obj;

    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Validate variable path (prevent injection attacks)
   */
  private isValidVariablePath(path: string): boolean {
    // Only allow alphanumeric, underscore, dot, and hyphen
    const validPattern = /^[a-zA-Z0-9_.-]+$/;

    if (!validPattern.test(path)) {
      return false;
    }

    // Prevent path traversal
    if (path.includes('..') || path.includes('__')) {
      return false;
    }

    // Prevent dangerous keywords
    const dangerousKeywords = ['constructor', 'prototype', '__proto__', 'eval', 'function'];
    for (const keyword of dangerousKeywords) {
      if (path.toLowerCase().includes(keyword)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Resolve a credential reference
   */
  private async resolveCredential(credentialName: string, context: InjectionContext): Promise<string> {
    const credential = context.credentials.get(credentialName);

    if (!credential) {
      throw new Error(`Credential not found: ${credentialName}`);
    }

    // Credentials are stored encrypted, so we'd decrypt them here
    // For now, return a placeholder
    return `__CREDENTIAL_${credentialName}__`;
  }

  /**
   * Inject credentials into node credentials object
   */
  private async injectCredentials(credentials: Record<string, any>, context: InjectionContext): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'object' && value !== null) {
        // Credential object: { id: "{{credentials.shopify}}", name: "Shopify API" }
        if (value.id && typeof value.id === 'string' && value.id.startsWith('{{credentials.')) {
          const credentialName = value.id.match(/\{\{credentials\.([^}]+)\}\}/)?.[1];
          if (credentialName) {
            const credential = context.credentials.get(credentialName);
            if (credential) {
              result[key] = {
                ...value,
                id: credential.id // Use actual credential ID from database
              };
            } else {
              throw new Error(`Credential not found: ${credentialName}`);
            }
          }
        } else {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Encrypt credentials for database storage
   */
  async encryptCredentials(data: Record<string, any>, password: string): Promise<string> {
    const iv = randomBytes(16);
    const key = (await scryptAsync(password, 'salt', 32)) as Buffer;
    const cipher = createCipheriv(VariableInjector.ENCRYPTION_ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Decrypt credentials from database
   */
  async decryptCredentials(encrypted: string, password: string): Promise<Record<string, any>> {
    const [ivBase64, authTagBase64, encryptedBase64] = encrypted.split(':');

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encryptedData = Buffer.from(encryptedBase64, 'base64');

    const key = (await scryptAsync(password, 'salt', 32)) as Buffer;
    const decipher = createDecipheriv(VariableInjector.ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate that a value doesn't contain injection attempts
   */
  isSecureValue(value: any): boolean {
    if (typeof value !== 'string') {
      return true; // Non-strings are safe
    }

    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /\.\.\//, // Path traversal
      /\$\{/, // Template literal injection
      /`[^`]*`/, // Backticks
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        return false;
      }
    }

    return true;
  }
}

// Singleton instance
let instance: VariableInjector | null = null;

/**
 * Get the singleton VariableInjector instance
 */
export function getVariableInjector(): VariableInjector {
  if (!instance) {
    instance = new VariableInjector();
  }
  return instance;
}
