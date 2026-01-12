import { supabase } from '../config/supabase.js';
import { n8nWorkflowService } from './n8n-workflow.service.js';
import { encryptionService } from './encryption.service.js';
import { logger } from '../config/logger.js';

/**
 * Health Status Types
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
  timestamp: string;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  last_checked_at: string;
  error_rate?: number;
  next_check_at?: string;
}

/**
 * Integration Health Service
 *
 * Monitors integration health:
 * - Credential validity
 * - n8n workflow status
 * - Recent sync activity
 * - Error rates
 *
 * Runs periodic health checks and alerts on issues.
 */
export class IntegrationHealthService {
  /**
   * Check health of a single bot integration
   * @param botIntegrationId - bot_integrations.id
   * @returns Health status with detailed checks
   */
  async checkHealth(botIntegrationId: string): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const checks: HealthCheck[] = [];

    try {
      // Get bot integration
      const { data: botIntegration, error } = await supabase
        .from('bot_integrations')
        .select(
          `
          id,
          status,
          n8n_workflow_id,
          credentials,
          last_sync_at,
          error_count,
          integration:integration_id (
            id,
            name,
            requires_oauth
          )
        `
        )
        .eq('id', botIntegrationId)
        .single();

      if (error || !botIntegration) {
        return {
          overall: 'unhealthy',
          checks: [
            {
              name: 'Integration Exists',
              status: 'fail',
              message: 'Integration not found',
              timestamp,
            },
          ],
          last_checked_at: timestamp,
        };
      }

      // Check 1: Integration is enabled
      checks.push({
        name: 'Integration Enabled',
        status: botIntegration.status === 'active' ? 'pass' : 'fail',
        message:
          botIntegration.status === 'active'
            ? 'Integration is active'
            : `Integration is ${botIntegration.status}`,
        timestamp,
      });

      // Check 2: Credentials present and valid
      const credentialsValid = await this.checkCredentials(botIntegration);
      checks.push({
        name: 'Credentials Valid',
        status: credentialsValid ? 'pass' : 'fail',
        message: credentialsValid
          ? 'Credentials are present and decryptable'
          : 'Credentials missing or invalid',
        timestamp,
      });

      // Check 3: n8n workflow active (if applicable)
      if (botIntegration.n8n_workflow_id) {
        const workflowHealth = await this.checkN8nWorkflow(
          botIntegration.n8n_workflow_id
        );
        checks.push({
          name: 'n8n Workflow Active',
          status: workflowHealth.active ? 'pass' : 'fail',
          message: workflowHealth.active
            ? 'Workflow is active and running'
            : 'Workflow is inactive',
          timestamp,
        });

        // Check 4: Low error rate
        if (workflowHealth.errorRate !== undefined) {
          checks.push({
            name: 'Error Rate',
            status: workflowHealth.errorRate < 0.2 ? 'pass' : 'fail',
            message: `Error rate: ${(workflowHealth.errorRate * 100).toFixed(1)}%`,
            timestamp,
          });
        }
      }

      // Check 5: Recent sync activity
      const recentSync = await this.checkRecentSync(botIntegrationId);
      checks.push({
        name: 'Recent Activity',
        status: recentSync ? 'pass' : 'fail',
        message: recentSync
          ? 'Integration has recent activity'
          : 'No activity in last 7 days',
        timestamp,
      });

      // Determine overall health
      const failedChecks = checks.filter((c) => c.status === 'fail').length;
      let overall: 'healthy' | 'degraded' | 'unhealthy';

      if (failedChecks === 0) {
        overall = 'healthy';
      } else if (failedChecks <= 1) {
        overall = 'degraded';
      } else {
        overall = 'unhealthy';
      }

      // Update health status in database
      await this.updateHealthStatus(botIntegrationId, overall, checks);

      return {
        overall,
        checks,
        last_checked_at: timestamp,
        next_check_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      };
    } catch (error) {
      logger.error('Health check failed:', { error, botIntegrationId });

      return {
        overall: 'unhealthy',
        checks: [
          {
            name: 'Health Check',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp,
          },
        ],
        last_checked_at: timestamp,
      };
    }
  }

  /**
   * Run health checks for all active integrations
   * Called by cron job every hour
   */
  async runHealthChecks(): Promise<void> {
    logger.info('Starting health checks for all integrations');

    try {
      // Get all active bot integrations
      const { data: integrations, error } = await supabase
        .from('bot_integrations')
        .select('id, bot_id, integration_id')
        .eq('status', 'active');

      if (error) {
        logger.error('Failed to fetch active integrations', { error });
        return;
      }

      if (!integrations || integrations.length === 0) {
        logger.info('No active integrations to check');
        return;
      }

      logger.info(`Checking health for ${integrations.length} integrations`);

      // Run checks in parallel (with concurrency limit)
      const BATCH_SIZE = 5;
      for (let i = 0; i < integrations.length; i += BATCH_SIZE) {
        const batch = integrations.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (integration) => {
            try {
              const health = await this.checkHealth(integration.id);

              // Alert if unhealthy
              if (health.overall === 'unhealthy') {
                await this.sendHealthAlert(integration, health);
              }
            } catch (error) {
              logger.error('Health check failed for integration', {
                integrationId: integration.id,
                error,
              });
            }
          })
        );
      }

      logger.info('Health checks completed');
    } catch (error) {
      logger.error('Failed to run health checks', { error });
    }
  }

  /**
   * Check if credentials are valid
   * @private
   */
  private async checkCredentials(botIntegration: any): Promise<boolean> {
    try {
      if (!botIntegration.credentials) {
        return false;
      }

      // Try to decrypt credentials
      if (typeof botIntegration.credentials === 'string') {
        const decrypted = encryptionService.safeDecrypt(botIntegration.credentials);
        return Object.keys(decrypted).length > 0;
      }

      return Object.keys(botIntegration.credentials).length > 0;
    } catch (error) {
      logger.error('Credential validation failed', { error });
      return false;
    }
  }

  /**
   * Check n8n workflow health
   * @private
   */
  private async checkN8nWorkflow(
    workflowId: string
  ): Promise<{ active: boolean; errorRate: number }> {
    try {
      if (!n8nWorkflowService.isEnabled()) {
        return { active: true, errorRate: 0 }; // Skip if n8n not configured
      }

      const health = await n8nWorkflowService.checkWorkflowHealth(workflowId);
      return {
        active: health.active,
        errorRate: health.errorRate,
      };
    } catch (error) {
      logger.error('n8n workflow check failed', { error, workflowId });
      return { active: false, errorRate: 1 };
    }
  }

  /**
   * Check if integration has recent sync activity
   * @private
   */
  private async checkRecentSync(botIntegrationId: string): Promise<boolean> {
    try {
      // Check integration_logs for recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('integration_logs')
        .select('id')
        .eq('bot_integration_id', botIntegrationId)
        .gte('created_at', sevenDaysAgo)
        .limit(1);

      if (error) {
        logger.error('Failed to check recent sync', { error });
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      logger.error('Recent sync check failed', { error });
      return false;
    }
  }

  /**
   * Update health status in database
   * @private
   */
  private async updateHealthStatus(
    botIntegrationId: string,
    status: string,
    checks: HealthCheck[]
  ): Promise<void> {
    try {
      await supabase
        .from('bot_integrations')
        .update({
          health_status: status,
          health_checks: checks,
          health_checked_at: new Date().toISOString(),
        })
        .eq('id', botIntegrationId);
    } catch (error) {
      logger.error('Failed to update health status', { error });
    }
  }

  /**
   * Send health alert
   * @private
   */
  private async sendHealthAlert(
    integration: any,
    health: HealthStatus
  ): Promise<void> {
    logger.warn('Integration unhealthy - alert sent', {
      botId: integration.bot_id,
      integrationId: integration.integration_id,
      health,
    });

    // TODO: Send actual alert (email, Slack, etc.)
    // For now, just log it
    // Future: Send email to organization admins
    // Future: Create in-app notification
    // Future: Send Slack webhook
  }

  /**
   * Get health summary for a bot
   * @param botId - Bot ID
   * @returns Summary of all integrations for this bot
   */
  async getBotHealthSummary(botId: string): Promise<{
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    integrations: Array<{
      id: string;
      name: string;
      status: string;
      health: string;
    }>;
  }> {
    const { data: integrations, error } = await supabase
      .from('bot_integrations')
      .select(
        `
        id,
        status,
        health_status,
        integration:integration_id (
          id,
          name
        )
      `
      )
      .eq('bot_id', botId);

    if (error || !integrations) {
      return { total: 0, healthy: 0, degraded: 0, unhealthy: 0, integrations: [] };
    }

    const summary = integrations.reduce(
      (acc, int) => {
        acc.total++;
        if (int.health_status === 'healthy') acc.healthy++;
        else if (int.health_status === 'degraded') acc.degraded++;
        else acc.unhealthy++;

        acc.integrations.push({
          id: int.id,
          name: (int.integration as any)?.name || 'Unknown',
          status: int.status,
          health: int.health_status || 'unknown',
        });

        return acc;
      },
      {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        integrations: [] as Array<{
          id: string;
          name: string;
          status: string;
          health: string;
        }>,
      }
    );

    return summary;
  }
}

// Singleton instance
export const integrationHealthService = new IntegrationHealthService();
