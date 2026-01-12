import cron from 'node-cron';
import { icalSyncService } from './ical-sync.service.js';
import { integrationHealthService } from './integration-health.service.js';
import { logger } from '../config/logger.js';

/**
 * Scheduler Service
 * Manages scheduled tasks like property calendar syncing
 */
export class SchedulerService {
  private syncTask?: any; // node-cron ScheduledTask
  private healthCheckTask?: any; // node-cron ScheduledTask

  /**
   * Start all scheduled tasks
   */
  start(): void {
    logger.info('[Scheduler] Starting scheduled tasks');

    // Sync all properties every 15 minutes
    // Cron format: minute hour day month weekday
    // */15 * * * * = every 15 minutes
    this.syncTask = cron.schedule('*/15 * * * *', async () => {
      logger.info('[Scheduler] Running scheduled property sync (every 15 minutes)');
      try {
        await icalSyncService.syncAllProperties();
      } catch (error) {
        logger.error(`[Scheduler] Sync task failed: ${error}`);
      }
    });

    logger.info('[Scheduler] Property sync scheduled: every 15 minutes');

    // Run integration health checks every hour
    // Cron format: 0 * * * * = at minute 0 of every hour
    this.healthCheckTask = cron.schedule('0 * * * *', async () => {
      logger.info('[Scheduler] Running scheduled integration health checks (every hour)');
      try {
        await integrationHealthService.runHealthChecks();
      } catch (error) {
        logger.error(`[Scheduler] Health check task failed: ${error}`);
      }
    });

    logger.info('[Scheduler] Integration health checks scheduled: every hour');

    // Optional: Run initial sync on startup after 30 seconds
    setTimeout(async () => {
      logger.info('[Scheduler] Running initial property sync on startup');
      try {
        await icalSyncService.syncAllProperties();
      } catch (error) {
        logger.error(`[Scheduler] Initial sync failed: ${error}`);
      }
    }, 30000);

    // Optional: Run initial health check on startup after 1 minute
    setTimeout(async () => {
      logger.info('[Scheduler] Running initial health checks on startup');
      try {
        await integrationHealthService.runHealthChecks();
      } catch (error) {
        logger.error(`[Scheduler] Initial health check failed: ${error}`);
      }
    }, 60000);
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    logger.info('[Scheduler] Stopping scheduled tasks');

    if (this.syncTask) {
      this.syncTask.stop();
    }

    if (this.healthCheckTask) {
      this.healthCheckTask.stop();
    }

    logger.info('[Scheduler] All tasks stopped');
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return (
      this.syncTask?.getStatus() === 'scheduled' ||
      this.healthCheckTask?.getStatus() === 'scheduled'
    );
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    tasks: {
      propertySync: boolean;
      healthChecks: boolean;
    };
  } {
    return {
      running: this.isRunning(),
      tasks: {
        propertySync: this.syncTask?.getStatus() === 'scheduled',
        healthChecks: this.healthCheckTask?.getStatus() === 'scheduled',
      },
    };
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
