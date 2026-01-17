import { FastifyPluginAsync } from 'fastify';
import { metricsService } from '../services/metrics.service.js';
import { supabase } from '../config/supabase.js';

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/analytics/realtime
   * Get real-time metrics for the current organization
   */
  fastify.get('/realtime', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const user = request.user as any;

        // Get user's organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          return reply.status(404).send({ error: 'Organization not found' });
        }

        const metrics = await metricsService.getRealtimeMetrics(membership.organization_id);

        return reply.send({
          activeConversations: metrics.activeConversations,
          avgResponseTime: metrics.avgResponseTime,
          successRate: parseFloat(metrics.success_rate),
          messagesPerHour: metrics.messagesPerHour
        });
      } catch (error) {
        console.error('Failed to fetch realtime metrics:', error);
        return reply.status(500).send({ error: 'Failed to fetch metrics' });
      }
    }
  });

  /**
   * GET /api/analytics/response-times
   * Get response time data for charts
   */
  fastify.get('/response-times', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const user = request.user as any;
        const { period } = request.query as { period?: '24h' | '7d' | '30d' };

        // Get user's organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          return reply.status(404).send({ error: 'Organization not found' });
        }

        const data = await metricsService.getResponseTimeData(
          membership.organization_id,
          period || '24h'
        );

        return reply.send({ data });
      } catch (error) {
        console.error('Failed to fetch response time data:', error);
        return reply.status(500).send({ error: 'Failed to fetch data' });
      }
    }
  });

  /**
   * GET /api/analytics/message-volume
   * Get message volume data for charts
   */
  fastify.get('/message-volume', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const user = request.user as any;
        const { period } = request.query as { period?: '24h' | '7d' | '30d' };

        // Get user's organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          return reply.status(404).send({ error: 'Organization not found' });
        }

        const data = await metricsService.getMessageVolumeData(
          membership.organization_id,
          period || '24h'
        );

        return reply.send({ data });
      } catch (error) {
        console.error('Failed to fetch message volume data:', error);
        return reply.status(500).send({ error: 'Failed to fetch data' });
      }
    }
  });

  /**
   * GET /api/analytics/bot/:botId/performance
   * Get performance summary for a specific bot
   */
  fastify.get('/bot/:botId/performance', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const user = request.user as any;
        const { botId } = request.params as { botId: string };
        const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

        // Verify bot ownership
        const { data: bot } = await supabase
          .from('bots')
          .select('organization_id')
          .eq('id', botId)
          .single();

        if (!bot) {
          return reply.status(404).send({ error: 'Bot not found' });
        }

        // Verify user has access to this organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', bot.organization_id)
          .single();

        if (!membership) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 3600000);
        const end = endDate ? new Date(endDate) : new Date();

        const performance = await metricsService.getBotPerformance(botId, start, end);

        return reply.send(performance);
      } catch (error) {
        console.error('Failed to fetch bot performance:', error);
        return reply.status(500).send({ error: 'Failed to fetch performance data' });
      }
    }
  });

  /**
   * GET /api/analytics/bot/:botId/percentiles
   * Get response time percentiles for a bot
   */
  fastify.get('/bot/:botId/percentiles', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const user = request.user as any;
        const { botId } = request.params as { botId: string };

        // Verify bot ownership
        const { data: bot } = await supabase
          .from('bots')
          .select('organization_id')
          .eq('id', botId)
          .single();

        if (!bot) {
          return reply.status(404).send({ error: 'Bot not found' });
        }

        // Verify user has access to this organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', bot.organization_id)
          .single();

        if (!membership) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const percentiles = await metricsService.getResponseTimePercentiles(botId);

        return reply.send(percentiles);
      } catch (error) {
        console.error('Failed to fetch percentiles:', error);
        return reply.status(500).send({ error: 'Failed to fetch percentiles' });
      }
    }
  });

  /**
   * GET /api/analytics/export
   * Export analytics data as CSV
   */
  fastify.get('/export', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const user = request.user as any;
        const { period, startDate, endDate, botId, status } = request.query as {
          period?: string;
          startDate?: string;
          endDate?: string;
          botId?: string;
          status?: string;
        };

        // Get user's organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          return reply.status(404).send({ error: 'Organization not found' });
        }

        // Build query for conversation metrics
        let query = supabase
          .from('conversation_metrics')
          .select(`
            *,
            conversations!inner(customer_phone, status),
            bots!inner(name)
          `)
          .eq('organization_id', membership.organization_id)
          .order('started_at', { ascending: false });

        // Apply date filter
        if (period) {
          const now = new Date();
          let startTime: Date;
          switch (period) {
            case 'today':
              startTime = new Date(now.setHours(0, 0, 0, 0));
              break;
            case '7days':
              startTime = new Date(now.getTime() - 7 * 24 * 3600000);
              break;
            case '30days':
              startTime = new Date(now.getTime() - 30 * 24 * 3600000);
              break;
            default:
              startTime = new Date(now.getTime() - 7 * 24 * 3600000);
          }
          query = query.gte('started_at', startTime.toISOString());
        } else if (startDate && endDate) {
          query = query.gte('started_at', startDate).lte('started_at', endDate);
        }

        // Apply bot filter
        if (botId) {
          query = query.eq('bot_id', botId);
        }

        // Apply status filter
        if (status) {
          query = query.eq('conversations.status', status);
        }

        const { data: metrics, error } = await query.limit(1000); // Limit to 1000 rows

        if (error) {
          throw error;
        }

        // Generate CSV
        const csvRows: string[] = [];

        // Header row
        csvRows.push([
          'Date',
          'Bot Name',
          'Customer Phone',
          'Total Messages',
          'User Messages',
          'Bot Messages',
          'Avg Response Time (ms)',
          'p50 Response Time (ms)',
          'p95 Response Time (ms)',
          'Successful Responses',
          'Failed Responses',
          'Knowledge Base Hits',
          'Tokens Used',
          'Estimated Cost (USD)',
          'Duration (seconds)',
          'Status',
          'Customer Satisfaction'
        ].join(','));

        // Data rows
        if (metrics) {
          for (const metric of metrics) {
            csvRows.push([
              new Date(metric.started_at).toISOString(),
              `"${(metric as any).bots?.name || 'Unknown'}"`,
              `"${(metric as any).conversations?.customer_phone || 'Unknown'}"`,
              metric.total_messages || 0,
              metric.user_messages || 0,
              metric.bot_messages || 0,
              metric.avg_response_time_ms || 0,
              metric.p50_response_time_ms || 0,
              metric.p95_response_time_ms || 0,
              metric.successful_responses || 0,
              metric.failed_responses || 0,
              metric.knowledge_base_hits || 0,
              metric.tokens_used || 0,
              metric.estimated_cost_usd || 0,
              metric.duration_seconds || 0,
              `"${metric.resolution_status || 'N/A'}"`,
              metric.customer_satisfaction || 'N/A'
            ].join(','));
          }
        }

        const csv = csvRows.join('\n');

        // Set headers for CSV download
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="analytics-export-${Date.now()}.csv"`);

        return reply.send(csv);
      } catch (error) {
        console.error('Failed to export analytics:', error);
        return reply.status(500).send({ error: 'Failed to export data' });
      }
    }
  });
};

export default analyticsRoutes;
