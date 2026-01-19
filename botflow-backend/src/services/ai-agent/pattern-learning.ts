/**
 * Pattern Learning Service (Phase 3 Week 4)
 *
 * Tracks and learns from successful workflow deployments to improve
 * AI suggestions and workflow generation over time.
 *
 * Responsibilities:
 * - Record successful workflow deployments
 * - Extract patterns from historical data
 * - Suggest workflows based on learned patterns
 * - Calculate success rates and popularity
 * - Provide analytics on pattern usage
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { Blueprint, BlueprintNode } from '../../types/workflow.js';
import { ParsedIntent } from '../../types/ai-agent.js';
import { CacheService, cacheService } from '../cache.service.js';

/**
 * Represents a learned workflow pattern
 */
export interface WorkflowPattern {
  id: string;
  intentSignature: string;
  workflowType: string;
  nodeTypes: string[];
  nodeSequence: string[];
  integrations: string[];
  usageCount: number;
  avgRating: number;
  successRate: number;
  avgResponseTimeMs: number;
  lastUsed: Date;
  firstUsed: Date;
}

/**
 * Success log entry for recording deployments
 */
export interface SuccessLogEntry {
  workflowId: string;
  botId: string;
  organizationId: string;
  intentSignature: string;
  workflowType?: string;
  nodeTypes: string[];
  nodeSequence: string[];
  integrations: string[];
  originalMessage: string;
  source?: 'ai_agent' | 'template' | 'manual';
  templateId?: string;
}

/**
 * Metrics update for a workflow
 */
export interface MetricsUpdate {
  messagesHandled?: number;
  successfulCompletions?: number;
  errorCount?: number;
  avgResponseTimeMs?: number;
  userRating?: number;
}

/**
 * Pattern suggestion result
 */
export interface PatternSuggestion {
  pattern: WorkflowPattern;
  relevanceScore: number;
  reasoning: string;
  suggestedBlueprint?: Blueprint;
}

/**
 * Analytics data for patterns
 */
export interface PatternAnalytics {
  totalPatterns: number;
  totalSuccessLogs: number;
  avgSuccessRate: number;
  topPatterns: WorkflowPattern[];
  patternsByType: Record<string, number>;
  recentPatterns: WorkflowPattern[];
}

/**
 * Configuration for the Pattern Learning Service
 */
interface PatternLearningConfig {
  minUsageForPattern: number;
  cacheTimeoutMs: number;
  maxSuggestions: number;
  patternRefreshIntervalMs: number;
}

const DEFAULT_CONFIG: PatternLearningConfig = {
  minUsageForPattern: 2,
  cacheTimeoutMs: 5 * 60 * 1000, // 5 minutes
  maxSuggestions: 5,
  patternRefreshIntervalMs: 15 * 60 * 1000 // 15 minutes
};

/**
 * Pattern Learning Service
 */
export class PatternLearningService {
  private config: PatternLearningConfig;
  private cache: CacheService | null = null;
  private patternRefreshInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<PatternLearningConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    try {
      this.cache = cacheService;
    } catch {
      console.log('Pattern Learning: Using in-memory caching only');
    }

    // Start periodic pattern refresh
    this.startPatternRefresh();
  }

  /**
   * Record a successful workflow deployment
   */
  async recordSuccess(
    entry: SuccessLogEntry
  ): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('workflow_success_logs')
        .insert({
          workflow_id: entry.workflowId,
          bot_id: entry.botId,
          organization_id: entry.organizationId,
          intent_signature: entry.intentSignature,
          workflow_type: entry.workflowType || null,
          node_types: entry.nodeTypes,
          node_sequence: entry.nodeSequence,
          integrations_used: entry.integrations,
          node_count: entry.nodeTypes.length,
          original_message: entry.originalMessage,
          source: entry.source || 'ai_agent',
          template_id: entry.templateId || null
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to record success log:', error);
        return null;
      }

      // Invalidate pattern cache
      await this.invalidatePatternCache();

      return data?.id || null;
    } catch (err) {
      console.error('Error recording workflow success:', err);
      return null;
    }
  }

  /**
   * Update metrics for an existing success log
   */
  async updateMetrics(
    successLogId: string,
    metrics: MetricsUpdate
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (metrics.messagesHandled !== undefined) {
        updateData.messages_handled = metrics.messagesHandled;
      }
      if (metrics.successfulCompletions !== undefined) {
        updateData.successful_completions = metrics.successfulCompletions;
      }
      if (metrics.errorCount !== undefined) {
        updateData.error_count = metrics.errorCount;
      }
      if (metrics.avgResponseTimeMs !== undefined) {
        updateData.average_response_time_ms = metrics.avgResponseTimeMs;
      }
      if (metrics.userRating !== undefined) {
        updateData.user_rating = metrics.userRating;
      }

      const { error } = await supabaseAdmin
        .from('workflow_success_logs')
        .update(updateData)
        .eq('id', successLogId);

      if (error) {
        console.error('Failed to update metrics:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error updating metrics:', err);
      return false;
    }
  }

  /**
   * Extract learned patterns from the database
   */
  async extractPatterns(
    options?: {
      limit?: number;
      minUsage?: number;
      workflowType?: string;
    }
  ): Promise<WorkflowPattern[]> {
    const limit = options?.limit || 50;
    const minUsage = options?.minUsage || this.config.minUsageForPattern;

    // Try cache first
    const cacheKey = `patterns:${limit}:${minUsage}:${options?.workflowType || 'all'}`;
    if (this.cache) {
      const cached = await this.cache.get<WorkflowPattern[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Query the materialized view for patterns
      let query = supabaseAdmin
        .from('workflow_patterns')
        .select('*')
        .gte('usage_count', minUsage)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (options?.workflowType) {
        query = query.eq('workflow_type', options.workflowType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to extract patterns:', error);
        return [];
      }

      const patterns: WorkflowPattern[] = (data || []).map(row => ({
        id: `${row.intent_signature}-${row.workflow_type}`,
        intentSignature: row.intent_signature,
        workflowType: row.workflow_type,
        nodeTypes: row.node_types || [],
        nodeSequence: row.node_sequence || [],
        integrations: row.integrations_used || [],
        usageCount: row.usage_count,
        avgRating: row.avg_rating || 0,
        successRate: row.success_rate || 0,
        avgResponseTimeMs: row.avg_response_time_ms || 0,
        lastUsed: new Date(row.last_used),
        firstUsed: new Date(row.first_used)
      }));

      // Cache the results
      if (this.cache) {
        await this.cache.set(
          cacheKey,
          patterns,
          Math.ceil(this.config.cacheTimeoutMs / 1000)
        );
      }

      return patterns;
    } catch (err) {
      console.error('Error extracting patterns:', err);
      return [];
    }
  }

  /**
   * Suggest workflows based on learned patterns
   */
  async suggestFromPatterns(
    intent: ParsedIntent,
    options?: {
      limit?: number;
      includeBlueprints?: boolean;
    }
  ): Promise<PatternSuggestion[]> {
    const limit = options?.limit || this.config.maxSuggestions;

    try {
      // Generate intent signature for matching
      const intentSignature = this.generateIntentSignature(intent);

      // Get all patterns
      const patterns = await this.extractPatterns({ limit: 100 });

      // Score and rank patterns based on similarity to intent
      const scoredPatterns: PatternSuggestion[] = patterns.map(pattern => ({
        pattern,
        relevanceScore: this.calculatePatternRelevance(pattern, intent, intentSignature),
        reasoning: this.generateReasoningText(pattern, intent)
      }));

      // Sort by relevance and take top N
      const suggestions = scoredPatterns
        .filter(s => s.relevanceScore > 0.3)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      // Optionally generate blueprints for top suggestions
      if (options?.includeBlueprints) {
        for (const suggestion of suggestions) {
          suggestion.suggestedBlueprint = this.patternToBlueprint(suggestion.pattern);
        }
      }

      return suggestions;
    } catch (err) {
      console.error('Error suggesting from patterns:', err);
      return [];
    }
  }

  /**
   * Get pattern analytics
   */
  async getPatternStats(): Promise<PatternAnalytics> {
    try {
      // Get total counts
      const [patternsResult, logsResult] = await Promise.all([
        supabaseAdmin
          .from('workflow_patterns')
          .select('*', { count: 'exact', head: false }),
        supabaseAdmin
          .from('workflow_success_logs')
          .select('*', { count: 'exact', head: true })
      ]);

      const patterns = patternsResult.data || [];
      const totalPatterns = patterns.length;
      const totalSuccessLogs = logsResult.count || 0;

      // Calculate average success rate
      const avgSuccessRate = patterns.length > 0
        ? patterns.reduce((acc, p) => acc + (p.success_rate || 0), 0) / patterns.length
        : 0;

      // Get top patterns by usage
      const topPatterns = patterns
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 10)
        .map(row => this.rowToPattern(row));

      // Count patterns by type
      const patternsByType: Record<string, number> = {};
      for (const pattern of patterns) {
        const type = pattern.workflow_type || 'unknown';
        patternsByType[type] = (patternsByType[type] || 0) + 1;
      }

      // Get recent patterns
      const recentPatterns = patterns
        .sort((a, b) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
        .slice(0, 5)
        .map(row => this.rowToPattern(row));

      return {
        totalPatterns,
        totalSuccessLogs,
        avgSuccessRate,
        topPatterns,
        patternsByType,
        recentPatterns
      };
    } catch (err) {
      console.error('Error getting pattern stats:', err);
      return {
        totalPatterns: 0,
        totalSuccessLogs: 0,
        avgSuccessRate: 0,
        topPatterns: [],
        patternsByType: {},
        recentPatterns: []
      };
    }
  }

  /**
   * Find similar patterns based on a workflow
   */
  async findSimilarPatterns(
    workflow: Blueprint,
    limit: number = 5
  ): Promise<WorkflowPattern[]> {
    const nodeTypes = workflow.nodes.map(n => n.type);
    const integrations = this.extractIntegrationsFromWorkflow(workflow);

    const patterns = await this.extractPatterns({ limit: 100 });

    // Score patterns by similarity
    const scored = patterns.map(pattern => ({
      pattern,
      score: this.calculateSimilarity(nodeTypes, integrations, pattern)
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.pattern);
  }

  /**
   * Generate an intent signature for pattern matching
   */
  generateIntentSignature(intent: ParsedIntent): string {
    const parts = [
      intent.workflowType || 'unknown',
      ...intent.integrations.sort(),
      ...(intent.requirements || [])
        .filter(r => r.priority === 'required')
        .map(r => r.category)
        .sort()
    ];

    return parts.join(':').toLowerCase();
  }

  /**
   * Convert a workflow to an extractable pattern
   */
  extractPatternFromWorkflow(
    workflow: Blueprint,
    intent: ParsedIntent,
    originalMessage: string
  ): Omit<SuccessLogEntry, 'workflowId' | 'botId' | 'organizationId'> {
    const nodeTypes = workflow.nodes.map(n => n.type);
    const nodeSequence = this.extractNodeSequence(workflow);
    const integrations = this.extractIntegrationsFromWorkflow(workflow);

    return {
      intentSignature: this.generateIntentSignature(intent),
      workflowType: intent.workflowType,
      nodeTypes,
      nodeSequence,
      integrations,
      originalMessage
    };
  }

  /**
   * Refresh the patterns materialized view
   */
  async refreshPatterns(): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin.rpc('refresh_workflow_patterns');
      if (error) {
        console.error('Failed to refresh patterns:', error);
        return false;
      }
      await this.invalidatePatternCache();
      return true;
    } catch (err) {
      console.error('Error refreshing patterns:', err);
      return false;
    }
  }

  /**
   * Stop the service and cleanup
   */
  stop(): void {
    if (this.patternRefreshInterval) {
      clearInterval(this.patternRefreshInterval);
      this.patternRefreshInterval = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Calculate relevance score between a pattern and an intent
   */
  private calculatePatternRelevance(
    pattern: WorkflowPattern,
    intent: ParsedIntent,
    intentSignature: string
  ): number {
    let score = 0;
    const weights = {
      exactSignature: 0.4,
      workflowType: 0.25,
      integrations: 0.2,
      successRate: 0.1,
      recency: 0.05
    };

    // Exact signature match
    if (pattern.intentSignature === intentSignature) {
      score += weights.exactSignature;
    } else {
      // Partial signature match
      const patternParts = pattern.intentSignature.split(':');
      const intentParts = intentSignature.split(':');
      const matchingParts = patternParts.filter(p => intentParts.includes(p));
      score += weights.exactSignature * (matchingParts.length / Math.max(patternParts.length, intentParts.length));
    }

    // Workflow type match
    if (intent.workflowType && pattern.workflowType === intent.workflowType) {
      score += weights.workflowType;
    }

    // Integration overlap
    if (intent.integrations.length > 0 && pattern.integrations.length > 0) {
      const overlap = intent.integrations.filter(i => pattern.integrations.includes(i));
      score += weights.integrations * (overlap.length / Math.max(intent.integrations.length, pattern.integrations.length));
    }

    // Success rate bonus
    score += weights.successRate * (pattern.successRate / 100);

    // Recency bonus (decay over 30 days)
    const daysSinceUse = (Date.now() - pattern.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    score += weights.recency * Math.max(0, 1 - (daysSinceUse / 30));

    return Math.min(1, score);
  }

  /**
   * Calculate similarity between a workflow and a pattern
   */
  private calculateSimilarity(
    nodeTypes: string[],
    integrations: string[],
    pattern: WorkflowPattern
  ): number {
    let score = 0;

    // Node type overlap (Jaccard similarity)
    const nodeOverlap = nodeTypes.filter(n => pattern.nodeTypes.includes(n));
    const nodeUnion = new Set([...nodeTypes, ...pattern.nodeTypes]).size;
    score += 0.5 * (nodeOverlap.length / nodeUnion);

    // Integration overlap
    const intOverlap = integrations.filter(i => pattern.integrations.includes(i));
    const intUnion = new Set([...integrations, ...pattern.integrations]).size;
    if (intUnion > 0) {
      score += 0.3 * (intOverlap.length / intUnion);
    }

    // Success rate boost
    score += 0.2 * (pattern.successRate / 100);

    return score;
  }

  /**
   * Generate reasoning text for a pattern suggestion
   */
  private generateReasoningText(pattern: WorkflowPattern, intent: ParsedIntent): string {
    const parts: string[] = [];

    if (pattern.workflowType === intent.workflowType) {
      parts.push(`Matches your ${pattern.workflowType} workflow requirement`);
    }

    const sharedIntegrations = intent.integrations.filter(i => pattern.integrations.includes(i));
    if (sharedIntegrations.length > 0) {
      parts.push(`Uses ${sharedIntegrations.join(', ')}`);
    }

    parts.push(`Used ${pattern.usageCount} times with ${Math.round(pattern.successRate)}% success rate`);

    if (pattern.avgRating > 0) {
      parts.push(`Average rating: ${pattern.avgRating.toFixed(1)}/5`);
    }

    return parts.join('. ');
  }

  /**
   * Convert a pattern to a basic blueprint
   */
  private patternToBlueprint(pattern: WorkflowPattern): Blueprint {
    const nodes: BlueprintNode[] = pattern.nodeSequence.map((type, index) => ({
      id: `node-${index + 1}`,
      type: type as 'trigger' | 'action' | 'condition' | 'integration',
      position: { x: 200, y: 50 + index * 100 },
      data: {
        label: this.nodeTypeToLabel(type),
        nodeType: type
      }
    }));

    // Create edges connecting nodes in sequence
    const edges = nodes.slice(0, -1).map((node, index) => ({
      id: `edge-${index + 1}`,
      source: node.id,
      target: nodes[index + 1].id
    }));

    return {
      bot_id: '', // Will be set when deployed
      version: '1.0.0',
      name: `${pattern.workflowType || 'Custom'} Workflow`,
      description: `Generated from successful pattern (${pattern.usageCount} uses, ${Math.round(pattern.successRate)}% success)`,
      nodes,
      edges,
      variables: {},
      credentials: []
    };
  }

  /**
   * Extract node sequence from workflow (depth-first)
   */
  private extractNodeSequence(workflow: Blueprint): string[] {
    // Build adjacency list
    const adjacency: Record<string, string[]> = {};
    const incoming: Record<string, number> = {};

    for (const node of workflow.nodes) {
      adjacency[node.id] = [];
      incoming[node.id] = 0;
    }

    for (const edge of workflow.edges) {
      if (adjacency[edge.source]) {
        adjacency[edge.source].push(edge.target);
        incoming[edge.target] = (incoming[edge.target] || 0) + 1;
      }
    }

    // Find root nodes (no incoming edges)
    const roots = workflow.nodes.filter(n => incoming[n.id] === 0);

    // DFS to get sequence
    const sequence: string[] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = workflow.nodes.find(n => n.id === nodeId);
      if (node) {
        sequence.push(node.type);
      }

      for (const nextId of adjacency[nodeId] || []) {
        dfs(nextId);
      }
    };

    for (const root of roots) {
      dfs(root.id);
    }

    return sequence;
  }

  /**
   * Extract integrations from workflow nodes
   */
  private extractIntegrationsFromWorkflow(workflow: Blueprint): string[] {
    const integrations = new Set<string>();

    for (const node of workflow.nodes) {
      if (node.type === 'integration' && node.data?.integration) {
        integrations.add(node.data.integration as string);
      }
    }

    return Array.from(integrations);
  }

  /**
   * Convert node type to human-readable label
   */
  private nodeTypeToLabel(type: string): string {
    const labels: Record<string, string> = {
      trigger: 'Trigger',
      action: 'Action',
      condition: 'Condition',
      integration: 'Integration',
      message_received: 'Message Received',
      send_message: 'Send Message',
      ai_response: 'AI Response',
      database_query: 'Database Query',
      http_request: 'HTTP Request',
      set_variable: 'Set Variable',
      delay: 'Delay'
    };

    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Convert database row to WorkflowPattern
   */
  private rowToPattern(row: any): WorkflowPattern {
    return {
      id: `${row.intent_signature}-${row.workflow_type}`,
      intentSignature: row.intent_signature,
      workflowType: row.workflow_type,
      nodeTypes: row.node_types || [],
      nodeSequence: row.node_sequence || [],
      integrations: row.integrations_used || [],
      usageCount: row.usage_count || 0,
      avgRating: row.avg_rating || 0,
      successRate: row.success_rate || 0,
      avgResponseTimeMs: row.avg_response_time_ms || 0,
      lastUsed: new Date(row.last_used),
      firstUsed: new Date(row.first_used)
    };
  }

  /**
   * Invalidate cached patterns
   */
  private async invalidatePatternCache(): Promise<void> {
    if (this.cache) {
      // Clear all pattern-related cache keys
      // In practice, we'd use a cache prefix scan, but for now just let TTL expire
    }
  }

  /**
   * Start periodic pattern refresh
   */
  private startPatternRefresh(): void {
    if (this.patternRefreshInterval) return;

    this.patternRefreshInterval = setInterval(
      () => this.refreshPatterns(),
      this.config.patternRefreshIntervalMs
    );
  }
}

// Singleton instance
let instance: PatternLearningService | null = null;

/**
 * Get the PatternLearningService singleton
 */
export function getPatternLearningService(): PatternLearningService {
  if (!instance) {
    instance = new PatternLearningService();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetPatternLearningService(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}
