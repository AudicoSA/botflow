import type { FastifyInstance } from 'fastify';
import { integrationMarketplaceService } from '../services/integration-marketplace.service.js';
import { n8nMarketplaceService } from '../services/n8n-marketplace.service.js';
import type {
  ListIntegrationsQuery,
  EnableIntegrationRequest,
  UpdateIntegrationRequest,
} from '../types/marketplace.js';

export default async function marketplaceRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/marketplace
   * List all available integrations with optional filtering
   * Merges database integrations with n8n dynamic integrations
   * Public endpoint - no authentication required
   */
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as ListIntegrationsQuery;

      // Get database integrations
      const dbResult = await integrationMarketplaceService.listIntegrations(query);

      // Get n8n dynamic integrations (if not filtering by category/vertical)
      let allIntegrations = dbResult.integrations;

      if (!query.category && !query.vertical) {
        try {
          const n8nIntegrations = await n8nMarketplaceService.getMarketplaceIntegrations();

          // Merge and deduplicate by slug (database takes priority)
          const dbSlugs = new Set(dbResult.integrations.map(i => i.slug));
          const uniqueN8nIntegrations = n8nIntegrations.filter(i => !dbSlugs.has(i.slug));

          allIntegrations = [...dbResult.integrations, ...uniqueN8nIntegrations];

          // Apply search filter if provided
          if (query.search) {
            const searchLower = query.search.toLowerCase();
            allIntegrations = allIntegrations.filter(i =>
              i.name.toLowerCase().includes(searchLower) ||
              i.description.toLowerCase().includes(searchLower) ||
              i.slug.includes(searchLower)
            );
          }

          // Apply featured filter if provided
          if (query.featured !== undefined) {
            allIntegrations = allIntegrations.filter(i => i.is_featured === query.featured);
          }

          // Sort by popularity
          allIntegrations.sort((a, b) => b.popularity_score - a.popularity_score);
        } catch (n8nError: any) {
          // Log n8n error but continue with database results
          fastify.log.warn({ error: n8nError }, 'Failed to fetch n8n integrations, using database only');
        }
      }

      // Apply pagination
      const page = query.page || 1;
      const perPage = query.per_page || 20;
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const paginatedIntegrations = allIntegrations.slice(start, end);

      return reply.send({
        integrations: paginatedIntegrations,
        total: allIntegrations.length,
        page,
        per_page: perPage,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to list integrations',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/marketplace/categories
   * Get all integration categories with counts
   * Public endpoint - no authentication required
   */
  fastify.get('/categories', async (request, reply) => {
    try {
      const categories = await integrationMarketplaceService.getCategories();
      return reply.send({ categories });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to get categories',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/marketplace/stats
   * Get marketplace statistics from both database and n8n
   * Public endpoint - no authentication required
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const n8nStats = await n8nMarketplaceService.getStatistics();
      const dbIntegrations = await integrationMarketplaceService.listIntegrations({});

      return reply.send({
        database: {
          total: dbIntegrations.total,
          featured: dbIntegrations.integrations.filter((i: any) => i.is_featured).length,
        },
        n8n: n8nStats,
        combined: {
          total: dbIntegrations.total + n8nStats.total,
          potential: n8nStats.total,
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to get marketplace stats',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/marketplace/refresh-cache
   * Clear n8n marketplace cache and fetch fresh data
   * Requires authentication (admin only)
   */
  fastify.post(
    '/refresh-cache',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        n8nMarketplaceService.clearCache();
        const integrations = await n8nMarketplaceService.getMarketplaceIntegrations();

        return reply.send({
          message: 'Cache refreshed successfully',
          n8n_integrations_count: integrations.length,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to refresh cache',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/marketplace/search
   * Search integrations across both database and n8n
   * Public endpoint - no authentication required
   */
  fastify.get('/search', async (request, reply) => {
    try {
      const { q } = request.query as { q: string };

      if (!q || q.trim().length === 0) {
        return reply.status(400).send({
          error: 'Search query is required',
          message: 'Please provide a search query (q parameter)',
        });
      }

      // Search n8n integrations
      const n8nResults = await n8nMarketplaceService.searchIntegrations(q);

      // Search database integrations
      const dbResults = await integrationMarketplaceService.listIntegrations({ search: q });

      // Merge and deduplicate by slug
      const dbSlugs = new Set(dbResults.integrations.map(i => i.slug));
      const uniqueN8nResults = n8nResults.filter(i => !dbSlugs.has(i.slug));

      const allResults = [...dbResults.integrations, ...uniqueN8nResults];

      return reply.send({
        results: allResults,
        total: allResults.length,
        query: q,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to search integrations',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/marketplace/:slug
   * Get a specific integration by slug
   * Checks both database and n8n sources
   * Public endpoint - no authentication required
   */
  fastify.get('/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };

      // Try database first
      try {
        const integration = await integrationMarketplaceService.getIntegration(slug);
        return reply.send(integration);
      } catch (dbError: any) {
        // If not in database, try n8n
        if (dbError.message.includes('not found')) {
          const n8nIntegrations = await n8nMarketplaceService.getMarketplaceIntegrations();
          const n8nIntegration = n8nIntegrations.find(i => i.slug === slug);

          if (n8nIntegration) {
            return reply.send(n8nIntegration);
          }
        }
        throw dbError;
      }
    } catch (error: any) {
      fastify.log.error(error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      return reply.status(statusCode).send({
        error: 'Failed to get integration',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/marketplace/recommended/:botId
   * Get recommended integrations for a specific bot
   * Requires authentication
   */
  fastify.get(
    '/recommended/:botId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { botId } = request.params as { botId: string };
        const integrations = await integrationMarketplaceService.getRecommendedForBot(botId);
        return reply.send({ integrations });
      } catch (error: any) {
        fastify.log.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
          error: 'Failed to get recommended integrations',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/marketplace/:slug/enable
   * Enable an integration for a bot
   * Requires authentication
   */
  fastify.post(
    '/:slug/enable',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { slug } = request.params as { slug: string };
        const requestData = request.body as EnableIntegrationRequest;

        const botIntegration = await integrationMarketplaceService.enableIntegration(
          slug,
          requestData
        );

        return reply.status(201).send({
          bot_integration: botIntegration,
          message: 'Integration enabled successfully',
        });
      } catch (error: any) {
        fastify.log.error(error);
        const statusCode = error.message.includes('already enabled') ? 409 :
                          error.message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
          error: 'Failed to enable integration',
          message: error.message,
        });
      }
    }
  );

  /**
   * PATCH /api/marketplace/bot-integrations/:id
   * Update a bot integration configuration
   * Requires authentication
   */
  fastify.patch(
    '/bot-integrations/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const requestData = request.body as UpdateIntegrationRequest;

        const botIntegration = await integrationMarketplaceService.updateIntegration(
          id,
          requestData
        );

        return reply.send({
          bot_integration: botIntegration,
          message: 'Integration updated successfully',
        });
      } catch (error: any) {
        fastify.log.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
          error: 'Failed to update integration',
          message: error.message,
        });
      }
    }
  );

  /**
   * DELETE /api/marketplace/bot-integrations/:id
   * Disable an integration for a bot
   * Requires authentication
   */
  fastify.delete(
    '/bot-integrations/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await integrationMarketplaceService.disableIntegration(id);
        return reply.send({ message: 'Integration disabled successfully' });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to disable integration',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/marketplace/bots/:botId/integrations
   * Get all enabled integrations for a bot
   * Requires authentication
   */
  fastify.get(
    '/bots/:botId/integrations',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { botId } = request.params as { botId: string };
        const integrations = await integrationMarketplaceService.getBotIntegrations(botId);
        return reply.send({ integrations });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get bot integrations',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/marketplace/bot-integrations/:id
   * Get a specific bot integration
   * Requires authentication
   */
  fastify.get(
    '/bot-integrations/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const integration = await integrationMarketplaceService.getBotIntegration(id);
        return reply.send(integration);
      } catch (error: any) {
        fastify.log.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return reply.status(statusCode).send({
          error: 'Failed to get bot integration',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/marketplace/bot-integrations/:id/logs
   * Get integration logs for a bot integration
   * Requires authentication
   */
  fastify.get(
    '/bot-integrations/:id/logs',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { limit } = request.query as { limit?: string };
        const logs = await integrationMarketplaceService.getIntegrationLogs(
          id,
          limit ? parseInt(limit) : 50
        );
        return reply.send({ logs });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get integration logs',
          message: error.message,
        });
      }
    }
  );
}
