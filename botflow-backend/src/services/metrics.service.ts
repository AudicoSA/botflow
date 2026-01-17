import { supabase } from '../config/supabase.js';
import { redis } from '../config/redis.js';

interface ConversationMetrics {
  conversation_id: string;
  bot_id: string;
  organization_id: string;
  response_time_ms: number;
  success: boolean;
  tokens_used: number;
  knowledge_base_hit: boolean;
}

interface RealtimeMetrics {
  total_messages: number;
  successful: number;
  failed: number;
  total_tokens: number;
  success_rate: string;
  activeConversations: number;
  avgResponseTime: number;
  messagesPerHour: number;
}

export class MetricsService {
  /**
   * Record a single message metric
   */
  async recordMessageMetric(metric: ConversationMetrics): Promise<void> {
    try {
      // Update conversation metrics in real-time (Redis)
      await this.updateRealtimeMetrics(metric);

      // Queue for database persistence (will be handled by BullMQ worker)
      await this.queueForPersistence(metric);

      // Update rolling aggregates
      await this.updateRollingAggregates(metric);
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealtimeMetrics(metric: ConversationMetrics): Promise<void> {
    const key = `metrics:realtime:${metric.organization_id}`;
    const hour = new Date().toISOString().substring(0, 13); // 2024-01-16T10

    await redis.hincrby(key, 'total_messages', 1);
    await redis.hincrby(key, metric.success ? 'successful' : 'failed', 1);
    await redis.hincrby(key, 'total_tokens', metric.tokens_used);
    await redis.hincrby(`${key}:${hour}`, 'messages', 1);
    await redis.expire(key, 86400); // 24 hours

    // Track response times
    await redis.lpush(`${key}:response_times`, metric.response_time_ms);
    await redis.ltrim(`${key}:response_times`, 0, 99); // Keep last 100
    await redis.expire(`${key}:response_times`, 3600); // 1 hour

    // Track active conversations
    await redis.sadd(`${key}:active_conversations`, metric.conversation_id);
    await redis.expire(`${key}:active_conversations`, 3600);
  }

  /**
   * Queue metric for database persistence
   */
  private async queueForPersistence(metric: ConversationMetrics): Promise<void> {
    // This will be implemented with BullMQ in the worker
    // For now, we'll directly update the database
    try {
      // Update the message with response time
      await supabase
        .from('messages')
        .update({ response_time_ms: metric.response_time_ms })
        .eq('conversation_id', metric.conversation_id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Update or create conversation metrics
      const { data: existing } = await supabase
        .from('conversation_metrics')
        .select('id')
        .eq('conversation_id', metric.conversation_id)
        .single();

      if (existing) {
        // Update existing metrics
        await supabase
          .from('conversation_metrics')
          .update({
            total_messages: supabase.raw('total_messages + 1'),
            successful_responses: metric.success
              ? supabase.raw('successful_responses + 1')
              : supabase.raw('successful_responses'),
            failed_responses: !metric.success
              ? supabase.raw('failed_responses + 1')
              : supabase.raw('failed_responses'),
            tokens_used: supabase.raw(`tokens_used + ${metric.tokens_used}`),
            knowledge_base_hits: metric.knowledge_base_hit
              ? supabase.raw('knowledge_base_hits + 1')
              : supabase.raw('knowledge_base_hits'),
            knowledge_base_misses: !metric.knowledge_base_hit
              ? supabase.raw('knowledge_base_misses + 1')
              : supabase.raw('knowledge_base_misses'),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      }
    } catch (error) {
      console.error('Failed to persist metric to database:', error);
    }
  }

  /**
   * Update rolling aggregate metrics
   */
  private async updateRollingAggregates(metric: ConversationMetrics): Promise<void> {
    const key = `metrics:rolling:${metric.bot_id}:1h`;

    // Store response times for percentile calculation
    const timestamp = Date.now();
    await redis.zadd(
      `${key}:response_times`,
      timestamp,
      `${timestamp}_${metric.response_time_ms}`
    );

    // Clean old data (> 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    await redis.zremrangebyscore(`${key}:response_times`, '-inf', oneHourAgo);

    await redis.expire(`${key}:response_times`, 3600);
  }

  /**
   * Get real-time metrics for organization
   */
  async getRealtimeMetrics(organizationId: string): Promise<RealtimeMetrics> {
    const key = `metrics:realtime:${organizationId}`;
    const metrics = await redis.hgetall(key);

    // Get active conversations count
    const activeConversations = await redis.scard(`${key}:active_conversations`) || 0;

    // Get average response time
    const responseTimes = await redis.lrange(`${key}:response_times`, 0, -1);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + parseInt(rt), 0) / responseTimes.length
      : 0;

    // Get messages per hour
    const hour = new Date().toISOString().substring(0, 13);
    const messagesThisHour = parseInt(await redis.hget(`${key}:${hour}`, 'messages') || '0');

    const totalMessages = parseInt(metrics.total_messages || '0');
    const successful = parseInt(metrics.successful || '0');

    return {
      total_messages: totalMessages,
      successful,
      failed: parseInt(metrics.failed || '0'),
      total_tokens: parseInt(metrics.total_tokens || '0'),
      success_rate: totalMessages > 0
        ? ((successful / totalMessages) * 100).toFixed(2)
        : '0',
      activeConversations,
      avgResponseTime: Math.round(avgResponseTime),
      messagesPerHour: messagesThisHour
    };
  }

  /**
   * Get bot performance summary
   */
  async getBotPerformance(
    botId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_bot_performance_summary', {
        p_bot_id: botId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      });

    if (error) throw error;
    return data[0] || {};
  }

  /**
   * Calculate response time percentiles
   */
  async getResponseTimePercentiles(botId: string): Promise<{ p50: number; p95: number; p99: number }> {
    const key = `metrics:rolling:${botId}:1h:response_times`;
    const timeScores = await redis.zrange(key, 0, -1);

    if (timeScores.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    // Extract response times from "timestamp_responsetime" format
    const times = timeScores
      .map(ts => {
        const parts = ts.split('_');
        return parseInt(parts[1] || '0');
      })
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);

    if (times.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    return {
      p50: this.percentile(times, 0.50),
      p95: this.percentile(times, 0.95),
      p99: this.percentile(times, 0.99)
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil(arr.length * p) - 1;
    return arr[Math.max(0, Math.min(index, arr.length - 1))] || 0;
  }

  /**
   * Get response time data for charts (last 24 hours)
   */
  async getResponseTimeData(organizationId: string, period: '24h' | '7d' | '30d' = '24h'): Promise<any[]> {
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const data: any[] = [];

    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      const hour = time.toISOString().substring(0, 13);

      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        avg: Math.round(Math.random() * 1000 + 500), // Mock data - will be replaced with real data
        p50: Math.round(Math.random() * 800 + 400),
        p95: Math.round(Math.random() * 2000 + 1000)
      });
    }

    return data;
  }

  /**
   * Get message volume data for charts
   */
  async getMessageVolumeData(organizationId: string, period: '24h' | '7d' | '30d' = '24h'): Promise<any[]> {
    const { data, error } = await supabase
      .from('usage_analytics')
      .select('hour, messages_sent, messages_received')
      .eq('organization_id', organizationId)
      .gte('hour', this.getStartTime(period))
      .order('hour', { ascending: true });

    if (error) {
      console.error('Failed to fetch message volume:', error);
      return [];
    }

    return (data || []).map(d => ({
      time: new Date(d.hour).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit'
      }),
      inbound: d.messages_received,
      outbound: d.messages_sent
    }));
  }

  /**
   * Get start time for period
   */
  private getStartTime(period: '24h' | '7d' | '30d'): string {
    const now = new Date();
    switch (period) {
      case '24h':
        return new Date(now.getTime() - 24 * 3600000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 3600000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 3600000).toISOString();
    }
  }
}

export const metricsService = new MetricsService();
