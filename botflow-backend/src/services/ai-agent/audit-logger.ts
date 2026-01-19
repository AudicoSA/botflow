/**
 * Audit Logging Service (Phase 3 Week 5)
 *
 * Tracks all significant actions in the AI agent for security and debugging.
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  | 'chat'
  | 'generate'
  | 'refine'
  | 'deploy'
  | 'undo'
  | 'redo'
  | 'session_create'
  | 'session_delete'
  | 'error';

export type AuditResource = 'session' | 'workflow' | 'template';

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  organizationId: string;
  botId?: string;
  sessionId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
}

export interface AuditQueryOptions {
  userId?: string;
  organizationId?: string;
  botId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Audit Logger Class
// ============================================================================

export class AuditLogger {
  private buffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.startFlushInterval();
  }

  /**
   * Log an audit entry
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // Add to buffer
    this.buffer.push(fullEntry);

    // Log to console for immediate visibility
    if (!entry.success) {
      logger.warn({ audit: fullEntry }, 'Audit log: action failed');
    } else {
      logger.debug({ audit: fullEntry }, 'Audit log: action succeeded');
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }

  /**
   * Log a chat message
   */
  async logChat(params: {
    userId: string;
    organizationId: string;
    botId: string;
    sessionId: string;
    message: string;
    responseTime: number;
    success: boolean;
    error?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      sessionId: params.sessionId,
      action: 'chat',
      resource: 'session',
      resourceId: params.sessionId,
      details: {
        messageLength: params.message.length,
        // Don't log actual message content for privacy
        hasMessage: true
      },
      durationMs: params.responseTime,
      success: params.success,
      errorMessage: params.error,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });
  }

  /**
   * Log workflow generation
   */
  async logGenerate(params: {
    userId: string;
    organizationId: string;
    botId: string;
    sessionId?: string;
    workflowId?: string;
    nodeCount: number;
    responseTime: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      sessionId: params.sessionId,
      action: 'generate',
      resource: 'workflow',
      resourceId: params.workflowId,
      details: {
        nodeCount: params.nodeCount
      },
      durationMs: params.responseTime,
      success: params.success,
      errorMessage: params.error
    });
  }

  /**
   * Log workflow deployment
   */
  async logDeploy(params: {
    userId: string;
    organizationId: string;
    botId: string;
    workflowId: string;
    version: string;
    nodeCount: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      action: 'deploy',
      resource: 'workflow',
      resourceId: params.workflowId,
      details: {
        version: params.version,
        nodeCount: params.nodeCount
      },
      success: params.success,
      errorMessage: params.error
    });
  }

  /**
   * Log session creation
   */
  async logSessionCreate(params: {
    userId: string;
    organizationId: string;
    botId: string;
    sessionId: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      sessionId: params.sessionId,
      action: 'session_create',
      resource: 'session',
      resourceId: params.sessionId,
      details: {},
      success: true
    });
  }

  /**
   * Log error
   */
  async logError(params: {
    userId: string;
    organizationId: string;
    botId?: string;
    sessionId?: string;
    error: Error;
    context?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      organizationId: params.organizationId,
      botId: params.botId,
      sessionId: params.sessionId,
      action: 'error',
      resource: 'session',
      details: {
        errorName: params.error.name,
        errorStack: params.error.stack?.slice(0, 500),
        ...params.context
      },
      success: false,
      errorMessage: params.error.message
    });
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions): Promise<AuditLogEntry[]> {
    let query = supabaseAdmin
      .from('ai_agent_audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }
    if (options.botId) {
      query = query.eq('bot_id', options.botId);
    }
    if (options.action) {
      query = query.eq('action', options.action);
    }
    if (options.resource) {
      query = query.eq('resource', options.resource);
    }
    if (options.from) {
      query = query.gte('timestamp', options.from.toISOString());
    }
    if (options.to) {
      query = query.lte('timestamp', options.to.toISOString());
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to query audit logs');
      return [];
    }

    return (data || []).map(row => ({
      timestamp: new Date(row.timestamp),
      userId: row.user_id,
      organizationId: row.organization_id,
      botId: row.bot_id,
      sessionId: row.session_id,
      action: row.action as AuditAction,
      resource: row.resource as AuditResource,
      resourceId: row.resource_id,
      details: row.details || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      durationMs: row.duration_ms,
      success: row.success,
      errorMessage: row.error_message
    }));
  }

  /**
   * Get audit summary for an organization
   */
  async getSummary(organizationId: string, days: number = 7): Promise<{
    totalActions: number;
    actionCounts: Record<AuditAction, number>;
    errorRate: number;
    avgResponseTime: number;
  }> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await this.query({
      organizationId,
      from,
      limit: 10000
    });

    const actionCounts = {} as Record<AuditAction, number>;
    let totalDuration = 0;
    let durationCount = 0;
    let errorCount = 0;

    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      if (log.durationMs) {
        totalDuration += log.durationMs;
        durationCount++;
      }
      if (!log.success) {
        errorCount++;
      }
    }

    return {
      totalActions: logs.length,
      actionCounts,
      errorRate: logs.length > 0 ? errorCount / logs.length : 0,
      avgResponseTime: durationCount > 0 ? totalDuration / durationCount : 0
    };
  }

  /**
   * Flush buffer to database
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const rows = entries.map(entry => ({
        timestamp: entry.timestamp.toISOString(),
        user_id: entry.userId,
        organization_id: entry.organizationId,
        bot_id: entry.botId,
        session_id: entry.sessionId,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resourceId,
        details: entry.details,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        duration_ms: entry.durationMs,
        success: entry.success,
        error_message: entry.errorMessage
      }));

      const { error } = await supabaseAdmin
        .from('ai_agent_audit_logs')
        .insert(rows);

      if (error) {
        logger.error({ error, count: rows.length }, 'Failed to flush audit logs');
        // Put entries back in buffer on failure
        this.buffer = [...entries, ...this.buffer];
      }
    } catch (error) {
      logger.error({ error }, 'Error flushing audit logs');
      this.buffer = [...entries, ...this.buffer];
    }
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        logger.error({ err }, 'Periodic flush failed');
      });
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop and flush remaining entries
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let instance: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!instance) {
    instance = new AuditLogger();
  }
  return instance;
}

export default AuditLogger;
