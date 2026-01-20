/**
 * AI Agent Metrics Collector (Phase 3 Week 5.2)
 *
 * Tracks performance, usage, and error metrics for the AI agent services.
 * Provides real-time insights into agent performance and health.
 */

import { logger } from '../../config/logger.js';
import type { ConversationState } from '../../types/ai-agent.js';

/**
 * Metric data point with timestamp
 */
interface MetricDataPoint {
  value: number;
  timestamp: Date;
}

/**
 * Error record for tracking
 */
interface ErrorRecord {
  type: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Agent metrics summary
 */
export interface AgentMetrics {
  // Performance metrics
  avgIntentParseTime: number;
  p50IntentParseTime: number;
  p95IntentParseTime: number;
  avgGenerationTime: number;
  p50GenerationTime: number;
  p95GenerationTime: number;
  avgDeploymentTime: number;

  // Success/failure rates
  successRate: number;
  errorRate: number;
  totalRequests: number;
  successCount: number;
  errorCount: number;

  // Cache performance
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;

  // State distribution
  stateDistribution: Record<ConversationState, number>;

  // Recent errors
  recentErrors: ErrorRecord[];

  // Time window
  windowStart: Date;
  windowEnd: Date;
}

/**
 * Configuration for metrics collector
 */
interface MetricsCollectorConfig {
  maxDataPoints: number;       // Maximum data points to keep in memory
  maxErrorHistory: number;     // Maximum errors to track
  windowSizeMs: number;        // Time window for metrics (default 1 hour)
}

const DEFAULT_CONFIG: MetricsCollectorConfig = {
  maxDataPoints: 1000,
  maxErrorHistory: 100,
  windowSizeMs: 60 * 60 * 1000 // 1 hour
};

/**
 * Metrics Collector Service
 */
export class AgentMetricsCollector {
  private config: MetricsCollectorConfig;

  // Performance metrics
  private intentParseTimes: MetricDataPoint[] = [];
  private generationTimes: MetricDataPoint[] = [];
  private deploymentTimes: MetricDataPoint[] = [];

  // Success/failure tracking
  private successCount = 0;
  private errorCount = 0;

  // Cache metrics
  private cacheHits = 0;
  private cacheMisses = 0;

  // State tracking
  private stateTransitions: Map<ConversationState, number> = new Map();

  // Error history
  private errors: ErrorRecord[] = [];

  // Window tracking
  private windowStart: Date = new Date();

  constructor(config: Partial<MetricsCollectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.resetWindow();
  }

  /**
   * Record intent parsing time
   */
  recordIntentParse(durationMs: number): void {
    this.intentParseTimes.push({
      value: durationMs,
      timestamp: new Date()
    });
    this.trimOldData(this.intentParseTimes);
  }

  /**
   * Record workflow generation time
   */
  recordGeneration(durationMs: number, success: boolean): void {
    this.generationTimes.push({
      value: durationMs,
      timestamp: new Date()
    });
    this.trimOldData(this.generationTimes);

    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }
  }

  /**
   * Record deployment time
   */
  recordDeployment(durationMs: number, success: boolean): void {
    this.deploymentTimes.push({
      value: durationMs,
      timestamp: new Date()
    });
    this.trimOldData(this.deploymentTimes);

    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Record state transition
   */
  recordStateTransition(state: ConversationState): void {
    const count = this.stateTransitions.get(state) || 0;
    this.stateTransitions.set(state, count + 1);
  }

  /**
   * Record an error
   */
  recordError(type: string, message: string, context?: Record<string, unknown>): void {
    this.errors.push({
      type,
      message,
      context,
      timestamp: new Date()
    });

    // Keep only recent errors
    if (this.errors.length > this.config.maxErrorHistory) {
      this.errors = this.errors.slice(-this.config.maxErrorHistory);
    }

    this.errorCount++;
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.successCount++;
  }

  /**
   * Get current metrics summary
   */
  getStats(): AgentMetrics {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowSizeMs);

    // Filter data points within window
    const recentIntentTimes = this.filterByWindow(this.intentParseTimes, windowStart);
    const recentGenerationTimes = this.filterByWindow(this.generationTimes, windowStart);
    const recentDeploymentTimes = this.filterByWindow(this.deploymentTimes, windowStart);
    const recentErrors = this.errors.filter(e => e.timestamp >= windowStart);

    // Calculate averages and percentiles
    const intentValues = recentIntentTimes.map(d => d.value);
    const generationValues = recentGenerationTimes.map(d => d.value);
    const deploymentValues = recentDeploymentTimes.map(d => d.value);

    // Build state distribution
    const stateDistribution: Record<ConversationState, number> = {
      'idle': 0,
      'gathering': 0,
      'confirming': 0,
      'refining': 0,
      'deploying': 0,
      'complete': 0,
      'error': 0
    };
    for (const [state, count] of this.stateTransitions) {
      stateDistribution[state] = count;
    }

    const totalRequests = this.successCount + this.errorCount;
    const totalCacheOps = this.cacheHits + this.cacheMisses;

    return {
      // Intent parsing metrics
      avgIntentParseTime: this.average(intentValues),
      p50IntentParseTime: this.percentile(intentValues, 50),
      p95IntentParseTime: this.percentile(intentValues, 95),

      // Generation metrics
      avgGenerationTime: this.average(generationValues),
      p50GenerationTime: this.percentile(generationValues, 50),
      p95GenerationTime: this.percentile(generationValues, 95),

      // Deployment metrics
      avgDeploymentTime: this.average(deploymentValues),

      // Success rates
      successRate: totalRequests > 0 ? this.successCount / totalRequests : 1,
      errorRate: totalRequests > 0 ? this.errorCount / totalRequests : 0,
      totalRequests,
      successCount: this.successCount,
      errorCount: this.errorCount,

      // Cache metrics
      cacheHitRate: totalCacheOps > 0 ? this.cacheHits / totalCacheOps : 0,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,

      // State distribution
      stateDistribution,

      // Recent errors
      recentErrors: recentErrors.slice(-10),

      // Time window
      windowStart,
      windowEnd: now
    };
  }

  /**
   * Get the most recent error
   */
  getLastError(): ErrorRecord | null {
    return this.errors.length > 0 ? this.errors[this.errors.length - 1] : null;
  }

  /**
   * Get error count by type
   */
  getErrorsByType(): Record<string, number> {
    const byType: Record<string, number> = {};
    for (const error of this.errors) {
      byType[error.type] = (byType[error.type] || 0) + 1;
    }
    return byType;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.intentParseTimes = [];
    this.generationTimes = [];
    this.deploymentTimes = [];
    this.successCount = 0;
    this.errorCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.stateTransitions.clear();
    this.errors = [];
    this.windowStart = new Date();
  }

  /**
   * Reset the time window
   */
  private resetWindow(): void {
    this.windowStart = new Date();
  }

  /**
   * Filter data points by time window
   */
  private filterByWindow(data: MetricDataPoint[], since: Date): MetricDataPoint[] {
    return data.filter(d => d.timestamp >= since);
  }

  /**
   * Trim old data points
   */
  private trimOldData(data: MetricDataPoint[]): void {
    if (data.length > this.config.maxDataPoints) {
      data.splice(0, data.length - this.config.maxDataPoints);
    }
  }

  /**
   * Calculate average of values
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate percentile of values
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Export metrics for external monitoring
   */
  exportPrometheusMetrics(): string {
    const stats = this.getStats();
    const lines: string[] = [];

    // Intent parsing metrics
    lines.push(`# HELP ai_agent_intent_parse_time_ms Intent parsing time in milliseconds`);
    lines.push(`# TYPE ai_agent_intent_parse_time_ms gauge`);
    lines.push(`ai_agent_intent_parse_time_ms{quantile="0.5"} ${stats.p50IntentParseTime}`);
    lines.push(`ai_agent_intent_parse_time_ms{quantile="0.95"} ${stats.p95IntentParseTime}`);
    lines.push(`ai_agent_intent_parse_time_ms{quantile="avg"} ${stats.avgIntentParseTime}`);

    // Generation metrics
    lines.push(`# HELP ai_agent_generation_time_ms Workflow generation time in milliseconds`);
    lines.push(`# TYPE ai_agent_generation_time_ms gauge`);
    lines.push(`ai_agent_generation_time_ms{quantile="0.5"} ${stats.p50GenerationTime}`);
    lines.push(`ai_agent_generation_time_ms{quantile="0.95"} ${stats.p95GenerationTime}`);
    lines.push(`ai_agent_generation_time_ms{quantile="avg"} ${stats.avgGenerationTime}`);

    // Success/error counts
    lines.push(`# HELP ai_agent_requests_total Total number of requests`);
    lines.push(`# TYPE ai_agent_requests_total counter`);
    lines.push(`ai_agent_requests_total{status="success"} ${stats.successCount}`);
    lines.push(`ai_agent_requests_total{status="error"} ${stats.errorCount}`);

    // Cache metrics
    lines.push(`# HELP ai_agent_cache_hit_rate Cache hit rate`);
    lines.push(`# TYPE ai_agent_cache_hit_rate gauge`);
    lines.push(`ai_agent_cache_hit_rate ${stats.cacheHitRate}`);

    return lines.join('\n');
  }
}

// Singleton instance
let instance: AgentMetricsCollector | null = null;

/**
 * Get the AgentMetricsCollector singleton
 */
export function getAgentMetrics(): AgentMetricsCollector {
  if (!instance) {
    instance = new AgentMetricsCollector();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetAgentMetrics(): void {
  instance = null;
}
