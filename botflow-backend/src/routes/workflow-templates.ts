/**
 * Workflow Templates API Routes (Phase 3 Week 3)
 *
 * Endpoints for managing workflow templates:
 * - List, search, and filter templates
 * - Get template details
 * - Instantiate templates for bots
 * - Get recommended templates
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import {
  getTemplateLibrary,
  TemplateFilterOptions
} from '../services/ai-agent/template-library.js';
import {
  getTemplateMatcher,
  TemplateCustomization
} from '../services/ai-agent/template-matcher.js';
import { TemplateCategory } from '../types/ai-agent.js';

/**
 * Query params for listing templates
 */
interface ListTemplatesQuery {
  category?: string;
  vertical?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'popularity' | 'usage' | 'name' | 'created';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Params for template by slug
 */
interface TemplateParams {
  slug: string;
}

/**
 * Body for instantiating a template
 */
interface InstantiateBody {
  botId: string;
  variables: Record<string, unknown>;
  configuration?: Record<string, unknown>;
}

/**
 * Body for matching templates to intent
 */
interface MatchTemplatesBody {
  message: string;
  vertical?: string;
  integrations?: string[];
}

export default async function workflowTemplatesRoutes(fastify: FastifyInstance) {
  const templateLibrary = getTemplateLibrary();
  const templateMatcher = getTemplateMatcher();

  // ============================================================================
  // Public Endpoints (no auth required)
  // ============================================================================

  /**
   * List all templates with filtering
   * GET /api/workflow-templates
   */
  fastify.get<{ Querystring: ListTemplatesQuery }>(
    '/',
    async (request, reply) => {
      try {
        const {
          category,
          vertical,
          search,
          limit = 20,
          offset = 0,
          sortBy = 'popularity',
          sortOrder = 'desc'
        } = request.query;

        const options: TemplateFilterOptions = {
          category: category as TemplateCategory,
          vertical,
          search,
          limit: Math.min(Number(limit), 100),
          offset: Number(offset),
          sortBy,
          sortOrder,
          isPublic: true
        };

        const result = await templateLibrary.getTemplates(options);

        return reply.status(200).send({
          templates: result.items,
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore
        });
      } catch (error) {
        logger.error({ error }, 'Failed to list templates');
        return reply.status(500).send({
          error: 'Failed to list templates',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Get template categories with counts
   * GET /api/workflow-templates/categories
   */
  fastify.get('/categories', async (request, reply) => {
    try {
      const categories = await templateLibrary.getCategories();

      return reply.status(200).send({ categories });
    } catch (error) {
      logger.error({ error }, 'Failed to get categories');
      return reply.status(500).send({
        error: 'Failed to get categories',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Search templates
   * GET /api/workflow-templates/search
   */
  fastify.get<{ Querystring: { q: string; limit?: number } }>(
    '/search',
    async (request, reply) => {
      try {
        const { q, limit = 10 } = request.query;

        if (!q || q.trim().length < 2) {
          return reply.status(400).send({
            error: 'Search query must be at least 2 characters'
          });
        }

        const templates = await templateLibrary.searchTemplates(q, Number(limit));

        return reply.status(200).send({
          templates,
          total: templates.length,
          query: q
        });
      } catch (error) {
        logger.error({ error }, 'Failed to search templates');
        return reply.status(500).send({
          error: 'Failed to search templates',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Get template by slug
   * GET /api/workflow-templates/:slug
   */
  fastify.get<{ Params: TemplateParams }>(
    '/:slug',
    async (request, reply) => {
      try {
        const { slug } = request.params;

        const template = await templateLibrary.getTemplateBySlug(slug);

        if (!template) {
          return reply.status(404).send({
            error: 'Template not found'
          });
        }

        // Get usage stats
        const stats = await templateLibrary.getTemplateStats(template.id);

        return reply.status(200).send({
          template,
          stats
        });
      } catch (error) {
        logger.error({ error }, 'Failed to get template');
        return reply.status(500).send({
          error: 'Failed to get template',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Get templates by category
   * GET /api/workflow-templates/category/:category
   */
  fastify.get<{ Params: { category: string }; Querystring: { limit?: number } }>(
    '/category/:category',
    async (request, reply) => {
      try {
        const { category } = request.params;
        const { limit = 20 } = request.query;

        const result = await templateLibrary.getTemplates({
          category: category as TemplateCategory,
          limit: Number(limit),
          isPublic: true
        });

        return reply.status(200).send({
          templates: result.items,
          total: result.total,
          category
        });
      } catch (error) {
        logger.error({ error }, 'Failed to get templates by category');
        return reply.status(500).send({
          error: 'Failed to get templates by category',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // ============================================================================
  // Authenticated Endpoints
  // ============================================================================

  /**
   * Get recommended templates for a bot
   * GET /api/workflow-templates/recommended/:botId
   */
  fastify.get<{ Params: { botId: string } }>(
    '/recommended/:botId',
    { onRequest: [fastify.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { botId } = request.params;
        const userId = request.user.sub;

        // Get bot info
        const { data: bot, error: botError } = await supabase
          .from('bots')
          .select('*, organizations(*)')
          .eq('id', botId)
          .single();

        if (botError || !bot) {
          return reply.status(404).send({ error: 'Bot not found' });
        }

        // Verify access
        const { data: member } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', bot.organization_id)
          .eq('user_id', userId)
          .single();

        if (!member) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Get bot's enabled integrations
        const { data: botIntegrations } = await supabase
          .from('bot_integrations')
          .select('integration_marketplace(slug)')
          .eq('bot_id', botId)
          .eq('is_enabled', true);

        const availableIntegrations = (botIntegrations || [])
          .map((bi: any) => bi.integration_marketplace?.slug)
          .filter(Boolean);

        // Get recommended templates
        const templates = await templateLibrary.getRecommendedTemplates(
          bot.vertical || bot.type,
          availableIntegrations,
          5
        );

        return reply.status(200).send({ templates });
      } catch (error) {
        logger.error({ error }, 'Failed to get recommended templates');
        return reply.status(500).send({
          error: 'Failed to get recommended templates',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Match templates to a user's natural language description
   * POST /api/workflow-templates/match
   */
  fastify.post<{ Body: MatchTemplatesBody }>(
    '/match',
    { onRequest: [fastify.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { message, vertical, integrations = [] } = request.body;

        if (!message || message.trim().length < 3) {
          return reply.status(400).send({
            error: 'Message must be at least 3 characters'
          });
        }

        // Create a simple parsed intent from the message
        const simpleIntent = {
          action: 'create' as const,
          rawMessage: message,
          entities: [],
          integrations: integrations,
          requirements: [],
          confidence: 0.5,
          needsClarification: false,
          workflowType: undefined
        };

        // Find matching templates
        const matches = await templateMatcher.findMatches(
          simpleIntent,
          integrations,
          vertical,
          5
        );

        return reply.status(200).send({
          matches,
          query: message
        });
      } catch (error) {
        logger.error({ error }, 'Failed to match templates');
        return reply.status(500).send({
          error: 'Failed to match templates',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Instantiate a template for a bot
   * POST /api/workflow-templates/:slug/instantiate
   */
  fastify.post<{ Params: TemplateParams; Body: InstantiateBody }>(
    '/:slug/instantiate',
    { onRequest: [fastify.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { slug } = request.params;
        const { botId, variables, configuration = {} } = request.body;
        const userId = request.user.sub;

        // Validate request
        if (!botId) {
          return reply.status(400).send({ error: 'botId is required' });
        }

        // Get template
        const template = await templateLibrary.getTemplateBySlug(slug);
        if (!template) {
          return reply.status(404).send({ error: 'Template not found' });
        }

        // Get bot and verify access
        const { data: bot, error: botError } = await supabase
          .from('bots')
          .select('*, organizations(*)')
          .eq('id', botId)
          .single();

        if (botError || !bot) {
          return reply.status(404).send({ error: 'Bot not found' });
        }

        // Verify user has access to the organization
        const { data: member } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', bot.organization_id)
          .eq('user_id', userId)
          .single();

        if (!member) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Validate customization
        const customization: TemplateCustomization = {
          variableValues: variables || {},
          fieldConfig: configuration
        };

        const validation = templateMatcher.validateCustomization(template, customization);

        if (!validation.valid) {
          return reply.status(400).send({
            error: 'Invalid customization',
            missing: validation.missing,
            errors: validation.errors
          });
        }

        // Generate customized blueprint
        const workflow = await templateMatcher.customizeTemplate(template, customization);

        // Update bot with the new workflow
        const { error: updateError } = await supabase
          .from('bots')
          .update({
            workflow_nodes: workflow.nodes,
            workflow_edges: workflow.edges,
            updated_at: new Date().toISOString()
          })
          .eq('id', botId);

        if (updateError) {
          logger.error({ error: updateError }, 'Failed to update bot workflow');
          return reply.status(500).send({ error: 'Failed to save workflow' });
        }

        // Record template usage
        const usageId = await templateLibrary.recordUsage(
          template.id,
          botId,
          bot.organization_id,
          customization.variableValues
        );

        logger.info({ templateSlug: slug, botId, usageId }, 'Template instantiated');

        return reply.status(200).send({
          success: true,
          workflow,
          usageId,
          message: `Workflow "${workflow.name}" has been created from template "${template.name}"`
        });
      } catch (error) {
        logger.error({ error }, 'Failed to instantiate template');
        return reply.status(500).send({
          error: 'Failed to instantiate template',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Preview a template instantiation (without saving)
   * POST /api/workflow-templates/:slug/preview
   */
  fastify.post<{ Params: TemplateParams; Body: { variables: Record<string, unknown>; configuration?: Record<string, unknown> } }>(
    '/:slug/preview',
    async (request, reply) => {
      try {
        const { slug } = request.params;
        const { variables, configuration = {} } = request.body;

        // Get template
        const template = await templateLibrary.getTemplateBySlug(slug);
        if (!template) {
          return reply.status(404).send({ error: 'Template not found' });
        }

        // Validate customization
        const customization: TemplateCustomization = {
          variableValues: variables || {},
          fieldConfig: configuration
        };

        const validation = templateMatcher.validateCustomization(template, customization);

        // Generate preview even if not fully valid
        const workflow = await templateMatcher.customizeTemplate(template, customization);

        return reply.status(200).send({
          workflow,
          validation,
          template: {
            name: template.name,
            description: template.description,
            requiredIntegrations: template.requiredIntegrations
          }
        });
      } catch (error) {
        logger.error({ error }, 'Failed to preview template');
        return reply.status(500).send({
          error: 'Failed to preview template',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Rate a template usage
   * POST /api/workflow-templates/usage/:usageId/rate
   */
  fastify.post<{ Params: { usageId: string }; Body: { rating: number } }>(
    '/usage/:usageId/rate',
    { onRequest: [fastify.authenticate as any] },
    async (request: any, reply) => {
      try {
        const { usageId } = request.params;
        const { rating } = request.body;
        const userId = request.user.sub;

        // Validate rating
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
          return reply.status(400).send({
            error: 'Rating must be a number between 1 and 5'
          });
        }

        // Verify user has access to this usage
        const { data: usage, error: usageError } = await supabase
          .from('workflow_template_usage')
          .select('*, organizations(*)')
          .eq('id', usageId)
          .single();

        if (usageError || !usage) {
          return reply.status(404).send({ error: 'Usage record not found' });
        }

        // Verify user is member of organization
        const { data: member } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', usage.organization_id)
          .eq('user_id', userId)
          .single();

        if (!member) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Update rating
        await templateLibrary.updateUsageMetrics(usageId, { userRating: rating });

        return reply.status(200).send({
          success: true,
          message: 'Rating recorded'
        });
      } catch (error) {
        logger.error({ error }, 'Failed to rate template');
        return reply.status(500).send({
          error: 'Failed to rate template',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * Get template statistics
   * GET /api/workflow-templates/stats
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const { items: templates } = await templateLibrary.getTemplates({ limit: 1000 });

      const categories = await templateLibrary.getCategories();

      const totalTemplates = templates.length;
      const totalUsage = templates.reduce((sum, t) => sum + (t as any).usageCount || 0, 0);

      return reply.status(200).send({
        totalTemplates,
        totalUsage,
        categories,
        topTemplates: templates.slice(0, 5).map(t => ({
          name: t.name,
          slug: t.slug,
          category: t.category,
          popularityScore: t.popularityScore
        }))
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get template stats');
      return reply.status(500).send({
        error: 'Failed to get template stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
