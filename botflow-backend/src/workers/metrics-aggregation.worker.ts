import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';

interface MetricAggregationJob {
  type: 'daily' | 'hourly';
  botId?: string;
  organizationId: string;
  date?: string;
  hour?: string;
}

/**
 * Metrics Aggregation Worker
 * Processes background jobs for aggregating metrics into daily and hourly summaries
 */
const metricsAggregationWorker = new Worker<MetricAggregationJob>(
  'metrics-aggregation',
  async (job: Job<MetricAggregationJob>) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing metrics aggregation job');

    try {
      if (job.data.type === 'daily') {
        await aggregateDailyMetrics(job.data);
      } else if (job.data.type === 'hourly') {
        await aggregateHourlyMetrics(job.data);
      }

      logger.info({ jobId: job.id }, 'Metrics aggregation job completed');
    } catch (error) {
      logger.error({ jobId: job.id, error }, 'Metrics aggregation job failed');
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000 // 10 jobs per second
    }
  }
);

/**
 * Aggregate daily metrics for a bot
 */
async function aggregateDailyMetrics(data: MetricAggregationJob): Promise<void> {
  const { botId, organizationId, date } = data;

  if (!botId || !date) {
    throw new Error('botId and date are required for daily aggregation');
  }

  // Get all conversation metrics for this bot on this date
  const { data: metrics, error } = await supabase
    .from('conversation_metrics')
    .select('*')
    .eq('bot_id', botId)
    .gte('started_at', `${date}T00:00:00Z`)
    .lt('started_at', `${date}T23:59:59Z`);

  if (error) {
    logger.error({ error, botId, date }, 'Failed to fetch conversation metrics');
    throw error;
  }

  if (!metrics || metrics.length === 0) {
    logger.info({ botId, date }, 'No metrics to aggregate');
    return;
  }

  // Calculate aggregated metrics
  const totalConversations = metrics.length;
  const totalMessages = metrics.reduce((sum, m) => sum + (m.total_messages || 0), 0);
  const activeConversations = metrics.filter(m => !m.ended_at).length;

  // Response time metrics
  const responseTimes = metrics
    .map(m => m.avg_response_time_ms)
    .filter(rt => rt !== null && rt !== undefined);

  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length)
    : null;

  const p50ResponseTime = responseTimes.length > 0
    ? percentile(responseTimes.sort((a, b) => a - b), 0.50)
    : null;

  const p95ResponseTime = responseTimes.length > 0
    ? percentile(responseTimes.sort((a, b) => a - b), 0.95)
    : null;

  const p99ResponseTime = responseTimes.length > 0
    ? percentile(responseTimes.sort((a, b) => a - b), 0.99)
    : null;

  // Success metrics
  const totalSuccessful = metrics.reduce((sum, m) => sum + (m.successful_responses || 0), 0);
  const totalFailed = metrics.reduce((sum, m) => sum + (m.failed_responses || 0), 0);
  const totalFallback = metrics.reduce((sum, m) => sum + (m.fallback_responses || 0), 0);
  const totalHandoffs = metrics.filter(m => m.handoff_triggered).length;

  const totalResponses = totalSuccessful + totalFailed;
  const successRate = totalResponses > 0 ? (totalSuccessful / totalResponses) * 100 : 0;
  const errorRate = totalResponses > 0 ? (totalFailed / totalResponses) * 100 : 0;
  const fallbackRate = totalResponses > 0 ? (totalFallback / totalResponses) * 100 : 0;
  const handoffRate = totalConversations > 0 ? (totalHandoffs / totalConversations) * 100 : 0;

  // AI metrics
  const totalKBHits = metrics.reduce((sum, m) => sum + (m.knowledge_base_hits || 0), 0);
  const totalKBMisses = metrics.reduce((sum, m) => sum + (m.knowledge_base_misses || 0), 0);
  const totalKBQueries = totalKBHits + totalKBMisses;
  const kbHitRate = totalKBQueries > 0 ? (totalKBHits / totalKBQueries) * 100 : 0;

  const totalTokens = metrics.reduce((sum, m) => sum + (m.tokens_used || 0), 0);
  const avgTokensPerConversation = totalConversations > 0
    ? Math.round(totalTokens / totalConversations)
    : 0;

  // Cost metrics (OpenAI pricing: $0.015 per 1K input tokens, $0.060 per 1K output tokens)
  // Simplified: assume 50/50 split input/output
  const avgTokenCost = 0.0375; // Average of $0.015 and $0.060 per 1K tokens
  const totalCost = (totalTokens / 1000) * avgTokenCost;
  const costPerConversation = totalConversations > 0 ? totalCost / totalConversations : 0;

  // Engagement metrics
  const conversationsWithDuration = metrics.filter(m => m.duration_seconds !== null);
  const avgDuration = conversationsWithDuration.length > 0
    ? Math.round(
        conversationsWithDuration.reduce((sum, m) => sum + (m.duration_seconds || 0), 0) /
        conversationsWithDuration.length
      )
    : null;

  const avgMessagesPerConversation = totalConversations > 0
    ? totalMessages / totalConversations
    : 0;

  const satisfactionRatings = metrics
    .map(m => m.customer_satisfaction)
    .filter(s => s !== null && s !== undefined);

  const avgSatisfaction = satisfactionRatings.length > 0
    ? satisfactionRatings.reduce((sum, s) => sum + s, 0) / satisfactionRatings.length
    : null;

  // Insert or update bot_performance_metrics
  const { error: upsertError } = await supabase
    .from('bot_performance_metrics')
    .upsert({
      bot_id: botId,
      organization_id: organizationId,
      date,
      total_conversations: totalConversations,
      total_messages: totalMessages,
      active_conversations: activeConversations,
      avg_response_time_ms: avgResponseTime,
      p50_response_time_ms: p50ResponseTime,
      p95_response_time_ms: p95ResponseTime,
      p99_response_time_ms: p99ResponseTime,
      success_rate: successRate,
      error_rate: errorRate,
      fallback_rate: fallbackRate,
      handoff_rate: handoffRate,
      knowledge_base_hit_rate: kbHitRate,
      avg_tokens_per_conversation: avgTokensPerConversation,
      total_tokens_used: totalTokens,
      total_cost_usd: totalCost,
      cost_per_conversation_usd: costPerConversation,
      avg_conversation_duration_seconds: avgDuration,
      avg_messages_per_conversation: avgMessagesPerConversation,
      customer_satisfaction_avg: avgSatisfaction,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'bot_id,date'
    });

  if (upsertError) {
    logger.error({ error: upsertError, botId, date }, 'Failed to upsert bot performance metrics');
    throw upsertError;
  }

  logger.info({ botId, date, totalConversations, successRate }, 'Daily metrics aggregated');
}

/**
 * Aggregate hourly usage analytics for an organization
 */
async function aggregateHourlyMetrics(data: MetricAggregationJob): Promise<void> {
  const { organizationId, hour } = data;

  if (!hour) {
    throw new Error('hour is required for hourly aggregation');
  }

  const hourStart = new Date(hour);
  const hourEnd = new Date(hourStart.getTime() + 3600000); // +1 hour

  // Get all messages in this hour
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('direction, conversation_id')
    .eq('organization_id', organizationId)
    .gte('created_at', hourStart.toISOString())
    .lt('created_at', hourEnd.toISOString());

  if (messagesError) {
    logger.error({ error: messagesError, organizationId, hour }, 'Failed to fetch messages');
    throw messagesError;
  }

  // Count messages
  const messagesSent = messages?.filter(m => m.direction === 'outbound').length || 0;
  const messagesReceived = messages?.filter(m => m.direction === 'inbound').length || 0;

  // Get conversations started in this hour
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', hourStart.toISOString())
    .lt('created_at', hourEnd.toISOString());

  if (conversationsError) {
    logger.error({ error: conversationsError, organizationId, hour }, 'Failed to fetch conversations');
    throw conversationsError;
  }

  const conversationsStarted = conversations?.length || 0;

  // Get unique customers (active users)
  const uniqueCustomers = new Set(messages?.map(m => m.conversation_id)).size;

  // Get active bots count
  const { data: bots, error: botsError } = await supabase
    .from('bots')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (botsError) {
    logger.error({ error: botsError, organizationId, hour }, 'Failed to fetch bots');
    throw botsError;
  }

  const botsActive = bots?.length || 0;

  // Insert or update usage_analytics
  const { error: upsertError } = await supabase
    .from('usage_analytics')
    .upsert({
      organization_id: organizationId,
      hour: hourStart.toISOString(),
      messages_sent: messagesSent,
      messages_received: messagesReceived,
      conversations_started: conversationsStarted,
      active_users: uniqueCustomers,
      bots_active: botsActive
    }, {
      onConflict: 'organization_id,hour'
    });

  if (upsertError) {
    logger.error({ error: upsertError, organizationId, hour }, 'Failed to upsert usage analytics');
    throw upsertError;
  }

  logger.info({ organizationId, hour, messagesSent, messagesReceived }, 'Hourly metrics aggregated');
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const index = Math.ceil(arr.length * p) - 1;
  return arr[Math.max(0, Math.min(index, arr.length - 1))] || 0;
}

// Worker event handlers
metricsAggregationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Metrics aggregation job completed');
});

metricsAggregationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Metrics aggregation job failed');
});

metricsAggregationWorker.on('error', (err) => {
  logger.error({ error: err }, 'Metrics aggregation worker error');
});

export { metricsAggregationWorker };
