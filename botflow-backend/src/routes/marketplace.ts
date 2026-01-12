import type { FastifyInstance } from 'fastify';
import { integrationMarketplaceService } from '../services/integration-marketplace.service.js';
import type {
  ListIntegrationsQuery,
  EnableIntegrationRequest,
  UpdateIntegrationRequest,
} from '../types/marketplace.js';

export default async function marketplaceRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/marketplace
   * List all available integrations with optional filtering
   * Public endpoint - no authentication required
   */
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as ListIntegrationsQuery;
      const result = await integrationMarketplaceService.listIntegrations(query);
      return reply.send(result);
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
   * GET /api/marketplace/:slug
   * Get a specific integration by slug
   * Public endpoint - no authentication required
   */
  fastify.get('/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      const integration = await integrationMarketplaceService.getIntegration(slug);
      return reply.send(integration);
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
