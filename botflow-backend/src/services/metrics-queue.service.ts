import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

interface MetricAggregationJob {
  type: 'daily' | 'hourly';
  botId?: string;
  organizationId: string;
  date?: string;
  hour?: string;
}

/**
 * Metrics Queue Service
 * Manages scheduling of metric aggregation jobs
 */
class MetricsQueueService {
  private queue: Queue<MetricAggregationJob>;

  constructor() {
    this.queue = new Queue<MetricAggregationJob>('metrics-aggregation', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 1000
        },
        removeOnFail: {
          age: 604800 // Keep failed jobs for 7 days
        }
      }
    });

    logger.info('Metrics queue service initialized');
  }

  /**
   * Schedule daily aggregation for a bot
   */
  async scheduleDailyAggregation(
    botId: string,
    organizationId: string,
    date?: string
  ): Promise<void> {
    const targetDate = date || new Date(Date.now() - 86400000).toISOString().split('T')[0]; // Yesterday

    await this.queue.add(
      `daily-${botId}-${targetDate}`,
      {
        type: 'daily',
        botId,
        organizationId,
        date: targetDate
      },
      {
        jobId: `daily-${botId}-${targetDate}`,
        delay: 0 // Process immediately
      }
    );

    logger.info({ botId, date: targetDate }, 'Scheduled daily metrics aggregation');
  }

  /**
   * Schedule hourly aggregation for an organization
   */
  async scheduleHourlyAggregation(
    organizationId: string,
    hour?: string
  ): Promise<void> {
    const targetHour = hour || new Date(Date.now() - 3600000).toISOString().substring(0, 13); // Last hour

    await this.queue.add(
      `hourly-${organizationId}-${targetHour}`,
      {
        type: 'hourly',
        organizationId,
        hour: targetHour
      },
      {
        jobId: `hourly-${organizationId}-${targetHour}`,
        delay: 0
      }
    );

    logger.info({ organizationId, hour: targetHour }, 'Scheduled hourly metrics aggregation');
  }

  /**
   * Schedule recurring daily aggregation jobs
   * Run every day at 1 AM to aggregate previous day's metrics
   */
  async scheduleRecurringDailyAggregation(): Promise<void> {
    await this.queue.add(
      'recurring-daily-aggregation',
      {
        type: 'daily',
        organizationId: 'system' // System job - will process all bots
      },
      {
        repeat: {
          pattern: '0 1 * * *' // Every day at 1 AM
        }
      }
    );

    logger.info('Scheduled recurring daily metrics aggregation');
  }

  /**
   * Schedule recurring hourly aggregation jobs
   * Run every hour at :05 to aggregate previous hour's metrics
   */
  async scheduleRecurringHourlyAggregation(): Promise<void> {
    await this.queue.add(
      'recurring-hourly-aggregation',
      {
        type: 'hourly',
        organizationId: 'system' // System job - will process all organizations
      },
      {
        repeat: {
          pattern: '5 * * * *' // Every hour at :05
        }
      }
    );

    logger.info('Scheduled recurring hourly metrics aggregation');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }

  /**
   * Clear all jobs from queue
   */
  async clearQueue(): Promise<void> {
    await this.queue.drain();
    logger.info('Metrics queue cleared');
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    await this.queue.close();
    logger.info('Metrics queue closed');
  }
}

export const metricsQueueService = new MetricsQueueService();
