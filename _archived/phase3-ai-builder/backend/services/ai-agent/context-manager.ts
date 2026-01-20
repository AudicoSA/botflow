/**
 * Context Manager Service (Phase 3 Week 1)
 *
 * Manages conversation sessions and context for the AI workflow builder.
 * Handles state transitions, message history, and gathered requirements.
 *
 * Responsibilities:
 * - Create and manage conversation sessions
 * - Track conversation state and transitions
 * - Store and retrieve conversation context
 * - Manage message history with sliding window
 * - Track gathered requirements and user preferences
 * - Handle session expiration and cleanup
 */

import { randomUUID } from 'crypto';
import {
  ConversationContext,
  ConversationState,
  ConversationMessage,
  GatheredRequirement,
  UserPreferences,
  AvailableIntegration,
  AgentQuestion,
  ParsedIntent
} from '../../types/ai-agent.js';
import { Blueprint } from '../../types/workflow.js';
import { CacheService, cacheService } from '../cache.service.js';

/**
 * Configuration for the Context Manager
 */
interface ContextManagerConfig {
  sessionTTLMs: number;           // Session time-to-live in milliseconds
  maxHistoryMessages: number;     // Maximum messages to keep in history
  maxWorkflowVersions: number;    // Maximum previous workflow versions to keep
  cleanupIntervalMs: number;      // Interval for session cleanup
}

const DEFAULT_CONFIG: ContextManagerConfig = {
  sessionTTLMs: 30 * 60 * 1000,  // 30 minutes
  maxHistoryMessages: 50,
  maxWorkflowVersions: 10,
  cleanupIntervalMs: 5 * 60 * 1000 // 5 minutes
};

/**
 * Valid state transitions
 */
const STATE_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  'idle': ['gathering', 'confirming', 'error'],
  'gathering': ['gathering', 'confirming', 'idle', 'error'],
  'confirming': ['refining', 'deploying', 'gathering', 'idle', 'error'],
  'refining': ['confirming', 'gathering', 'idle', 'error'],
  'deploying': ['complete', 'error', 'idle'],
  'complete': ['idle', 'gathering', 'refining'],
  'error': ['idle', 'gathering']
};

/**
 * Context Manager Service
 */
export class ContextManager {
  private sessions: Map<string, ConversationContext> = new Map();
  private config: ContextManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cache: CacheService | null = null;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();

    // Try to use cache service for Redis-backed sessions
    try {
      this.cache = cacheService;
    } catch {
      // Cache not available, use in-memory only
      console.log('Context Manager: Using in-memory session storage');
    }
  }

  /**
   * Create a new conversation session
   *
   * @param userId - User ID
   * @param botId - Bot ID
   * @param organizationId - Organization ID
   * @param preferences - Optional user preferences
   * @returns New conversation context
   */
  async createSession(
    userId: string,
    botId: string,
    organizationId: string,
    preferences?: Partial<UserPreferences>
  ): Promise<ConversationContext> {
    const sessionId = randomUUID();
    const now = new Date();

    const context: ConversationContext = {
      sessionId,
      botId,
      userId,
      organizationId,
      state: 'idle',
      currentWorkflow: null,
      previousWorkflows: [],
      gatheredRequirements: [],
      pendingQuestions: [],
      userPreferences: {
        language: 'en',
        technicalLevel: 'beginner',
        ...preferences
      },
      availableIntegrations: [],
      history: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.config.sessionTTLMs)
    };

    // Load available integrations for the organization
    context.availableIntegrations = await this.loadAvailableIntegrations(organizationId, botId);

    await this.saveSession(context);
    return context;
  }

  /**
   * Get an existing session by ID
   *
   * @param sessionId - Session ID
   * @returns Conversation context or null if not found/expired
   */
  async getSession(sessionId: string): Promise<ConversationContext | null> {
    // Try memory first
    let context = this.sessions.get(sessionId);

    // Try Redis if not in memory
    if (!context && this.cache) {
      const cached = await this.cache.get<ConversationContext>(`ai_session:${sessionId}`);
      if (cached) {
        context = this.deserializeContext(cached);
        this.sessions.set(sessionId, context);
      }
    }

    if (!context) return null;

    // Check expiration
    if (new Date() > new Date(context.expiresAt)) {
      await this.deleteSession(sessionId);
      return null;
    }

    return context;
  }

  /**
   * Get or create a session
   */
  async getOrCreateSession(
    sessionId: string | undefined,
    userId: string,
    botId: string,
    organizationId: string
  ): Promise<ConversationContext> {
    if (sessionId) {
      const existing = await this.getSession(sessionId);
      if (existing) return existing;
    }
    return this.createSession(userId, botId, organizationId);
  }

  /**
   * Update session context
   *
   * @param context - Updated context
   */
  async updateSession(context: ConversationContext): Promise<void> {
    context.updatedAt = new Date();
    context.expiresAt = new Date(Date.now() + this.config.sessionTTLMs);
    await this.saveSession(context);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    if (this.cache) {
      await this.cache.delete(`ai_session:${sessionId}`);
    }
  }

  /**
   * Add a message to the conversation history
   *
   * @param context - Conversation context
   * @param role - Message role
   * @param content - Message content
   * @param metadata - Optional metadata
   * @returns Updated context
   */
  addMessage(
    context: ConversationContext,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: ConversationMessage['metadata']
  ): ConversationContext {
    const message: ConversationMessage = {
      id: randomUUID(),
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    context.history.push(message);

    // Trim history if needed
    if (context.history.length > this.config.maxHistoryMessages) {
      // Keep first message (welcome) and last N messages
      const firstMessage = context.history[0];
      const recentMessages = context.history.slice(-this.config.maxHistoryMessages + 1);
      context.history = [firstMessage, ...recentMessages];
    }

    return context;
  }

  /**
   * Transition to a new state
   *
   * @param context - Conversation context
   * @param newState - Target state
   * @returns Updated context
   * @throws Error if transition is invalid
   */
  transitionState(
    context: ConversationContext,
    newState: ConversationState
  ): ConversationContext {
    const validTransitions = STATE_TRANSITIONS[context.state];

    if (!validTransitions.includes(newState)) {
      throw new Error(
        `Invalid state transition: ${context.state} -> ${newState}. ` +
        `Valid transitions: ${validTransitions.join(', ')}`
      );
    }

    context.state = newState;
    return context;
  }

  /**
   * Add a gathered requirement
   *
   * @param context - Conversation context
   * @param key - Requirement key
   * @param value - Requirement value
   * @param source - Source (explicit/inferred)
   * @param confidence - Confidence level
   * @returns Updated context
   */
  addRequirement(
    context: ConversationContext,
    key: string,
    value: any,
    source: 'explicit' | 'inferred' = 'explicit',
    confidence: number = 1.0
  ): ConversationContext {
    // Remove existing requirement with same key
    context.gatheredRequirements = context.gatheredRequirements.filter(r => r.key !== key);

    context.gatheredRequirements.push({
      key,
      value,
      source,
      confidence,
      timestamp: new Date()
    });

    return context;
  }

  /**
   * Get a gathered requirement by key
   */
  getRequirement(context: ConversationContext, key: string): any {
    const req = context.gatheredRequirements.find(r => r.key === key);
    return req?.value;
  }

  /**
   * Set pending questions
   */
  setPendingQuestions(
    context: ConversationContext,
    questions: AgentQuestion[]
  ): ConversationContext {
    context.pendingQuestions = questions;
    return context;
  }

  /**
   * Clear pending questions
   */
  clearPendingQuestions(context: ConversationContext): ConversationContext {
    context.pendingQuestions = [];
    return context;
  }

  /**
   * Update the current workflow
   *
   * @param context - Conversation context
   * @param workflow - New workflow
   * @param saveVersion - Whether to save current as previous version
   * @returns Updated context
   */
  updateWorkflow(
    context: ConversationContext,
    workflow: Blueprint | null,
    saveVersion: boolean = true
  ): ConversationContext {
    // Save current workflow as previous version (for undo)
    if (saveVersion && context.currentWorkflow) {
      context.previousWorkflows.push(context.currentWorkflow);

      // Trim versions if needed
      if (context.previousWorkflows.length > this.config.maxWorkflowVersions) {
        context.previousWorkflows = context.previousWorkflows.slice(
          -this.config.maxWorkflowVersions
        );
      }
    }

    context.currentWorkflow = workflow;
    return context;
  }

  /**
   * Undo to previous workflow version
   *
   * @param context - Conversation context
   * @returns Updated context with previous workflow, or unchanged if no history
   */
  undoWorkflow(context: ConversationContext): ConversationContext {
    const previousWorkflow = context.previousWorkflows.pop();

    if (previousWorkflow) {
      context.currentWorkflow = previousWorkflow;
    }

    return context;
  }

  /**
   * Update user preferences
   */
  updatePreferences(
    context: ConversationContext,
    preferences: Partial<UserPreferences>
  ): ConversationContext {
    context.userPreferences = {
      ...context.userPreferences,
      ...preferences
    };
    return context;
  }

  /**
   * Get relevant conversation history for AI context
   * Returns the most recent messages up to a token limit
   */
  getRelevantHistory(
    context: ConversationContext,
    maxMessages: number = 10
  ): ConversationMessage[] {
    return context.history.slice(-maxMessages);
  }

  /**
   * Get session info for API response
   */
  getSessionInfo(context: ConversationContext): {
    sessionId: string;
    botId: string;
    state: ConversationState;
    messageCount: number;
    currentWorkflow: Blueprint | null;
    createdAt: Date;
    expiresAt: Date;
  } {
    return {
      sessionId: context.sessionId,
      botId: context.botId,
      state: context.state,
      messageCount: context.history.length,
      currentWorkflow: context.currentWorkflow,
      createdAt: context.createdAt,
      expiresAt: context.expiresAt
    };
  }

  /**
   * Load available integrations for the organization/bot
   */
  private async loadAvailableIntegrations(
    organizationId: string,
    botId: string
  ): Promise<AvailableIntegration[]> {
    // In a full implementation, this would query the database
    // For now, return a static list of common integrations
    return [
      { slug: 'payfast', name: 'PayFast', category: 'payment', isEnabled: false, hasCredentials: false },
      { slug: 'paystack', name: 'Paystack', category: 'payment', isEnabled: false, hasCredentials: false },
      { slug: 'yoco', name: 'Yoco', category: 'payment', isEnabled: false, hasCredentials: false },
      { slug: 'shopify', name: 'Shopify', category: 'ecommerce', isEnabled: false, hasCredentials: false },
      { slug: 'woocommerce', name: 'WooCommerce', category: 'ecommerce', isEnabled: false, hasCredentials: false },
      { slug: 'google-calendar', name: 'Google Calendar', category: 'calendar', isEnabled: false, hasCredentials: false },
      { slug: 'ical-sync', name: 'iCal Sync', category: 'calendar', isEnabled: false, hasCredentials: false },
      { slug: 'courier-guy', name: 'The Courier Guy', category: 'shipping', isEnabled: false, hasCredentials: false },
      { slug: 'shiplogic', name: 'ShipLogic', category: 'shipping', isEnabled: false, hasCredentials: false },
      { slug: 'clickatell', name: 'Clickatell', category: 'sms', isEnabled: false, hasCredentials: false }
    ];
  }

  /**
   * Save session to memory and optionally Redis
   */
  private async saveSession(context: ConversationContext): Promise<void> {
    this.sessions.set(context.sessionId, context);

    if (this.cache) {
      const ttlSeconds = Math.ceil(this.config.sessionTTLMs / 1000);
      await this.cache.set(
        `ai_session:${context.sessionId}`,
        this.serializeContext(context),
        ttlSeconds
      );
    }
  }

  /**
   * Serialize context for storage
   */
  private serializeContext(context: ConversationContext): any {
    return {
      ...context,
      createdAt: context.createdAt.toISOString(),
      updatedAt: context.updatedAt.toISOString(),
      expiresAt: context.expiresAt.toISOString(),
      history: context.history.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString()
      })),
      gatheredRequirements: context.gatheredRequirements.map(r => ({
        ...r,
        timestamp: r.timestamp.toISOString()
      }))
    };
  }

  /**
   * Deserialize context from storage
   */
  private deserializeContext(data: any): ConversationContext {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      expiresAt: new Date(data.expiresAt),
      history: data.history.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      })),
      gatheredRequirements: data.gatheredRequirements.map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp)
      }))
    };
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();

    for (const [sessionId, context] of this.sessions) {
      if (now > context.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Stop the cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get statistics about active sessions
   */
  getStats(): {
    activeSessions: number;
    totalMessages: number;
    stateDistribution: Record<ConversationState, number>;
  } {
    let totalMessages = 0;
    const stateDistribution: Record<ConversationState, number> = {
      'idle': 0,
      'gathering': 0,
      'confirming': 0,
      'refining': 0,
      'deploying': 0,
      'complete': 0,
      'error': 0
    };

    for (const context of this.sessions.values()) {
      totalMessages += context.history.length;
      stateDistribution[context.state]++;
    }

    return {
      activeSessions: this.sessions.size,
      totalMessages,
      stateDistribution
    };
  }
}

// Singleton instance
let instance: ContextManager | null = null;

/**
 * Get the ContextManager singleton
 */
export function getContextManager(): ContextManager {
  if (!instance) {
    instance = new ContextManager();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetContextManager(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}
