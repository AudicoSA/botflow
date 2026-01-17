/**
 * Bot Builder API Routes
 *
 * GPT-4 powered bot creation from natural language
 *
 * Endpoints:
 * - POST /api/bots/:botId/builder/analyze - Analyze user intent
 * - POST /api/bots/:botId/builder/generate - Generate Blueprint from intent
 * - POST /api/bots/:botId/builder/conversation - Conversational bot building
 * - POST /api/bots/:botId/builder/optimize - Get optimization suggestions
 * - POST /api/bots/:botId/builder/recommend - Get node recommendations
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  getBotBuilderService,
  IntentAnalysis
} from '../services/bot-builder.service.js';
import { getNodeRecommendationEngine } from '../services/node-recommendation.service.js';
import { supabase } from '../config/supabase.js';

/**
 * Zod Schemas for validation
 */
const AnalyzeBodySchema = z.object({
  description: z.string().min(10).max(5000)
});

const GenerateBodySchema = z.object({
  intent: z.object({
    trigger: z.object({
      type: z.enum(['keyword', 'any_message', 'webhook', 'schedule']),
      description: z.string(),
      suggested_node: z.string(),
      config_hints: z.record(z.any()).optional()
    }),
    steps: z.array(z.object({
      action: z.string(),
      description: z.string(),
      suggested_node: z.string(),
      config_hints: z.record(z.any()).optional()
    })),
    conditions: z.array(z.object({
      condition: z.string(),
      true_path: z.string(),
      false_path: z.string()
    })),
    integrations: z.array(z.object({
      service: z.string(),
      purpose: z.string()
    })),
    variables: z.array(z.string())
  })
});

const ConversationBodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).min(1).max(20) // Limit conversation history
});

const OptimizeBodySchema = z.object({
  blueprint: z.object({
    bot_id: z.string(),
    version: z.string(),
    name: z.string(),
    nodes: z.array(z.any()),
    edges: z.array(z.any())
  })
});

const RecommendBodySchema = z.object({
  action: z.string().min(3).max(500),
  context: z.object({
    previousNodes: z.array(z.string()).optional(),
    integrations: z.array(z.string()).optional()
  }).optional()
});

/**
 * Bot Builder Routes Plugin
 */
const botBuilderRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/bots/:botId/builder/analyze
   *
   * Analyze user intent from natural language description
   *
   * @example
   * POST /api/bots/123/builder/analyze
   * {
   *   "description": "Bot that asks for order number and looks it up in Shopify"
   * }
   *
   * @returns Intent analysis JSON
   */
  fastify.post<{
    Params: { botId: string };
    Body: z.infer<typeof AnalyzeBodySchema>;
  }>(
    '/:botId/builder/analyze',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      const { botId } = request.params;
      const { description } = request.body;

      try {
        // Verify bot ownership
        const user = request.user as { userId: string; organizationId: string };
        const { data: bot, error } = await supabase
          .from('bots')
          .select('id, organization_id')
          .eq('id', botId)
          .eq('organization_id', user.organizationId)
          .single();

        if (error || !bot) {
          return reply.status(404).send({
            success: false,
            error: 'Bot not found'
          });
        }

        // Analyze intent
        const service = getBotBuilderService();
        const intent = await service.analyzeIntent(description, botId);

        return reply.send({
          success: true,
          intent
        });
      } catch (error: any) {
        request.log.error({ error, botId }, 'Failed to analyze intent');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to analyze intent'
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/builder/generate
   *
   * Generate Blueprint JSON from intent analysis
   *
   * @example
   * POST /api/bots/123/builder/generate
   * {
   *   "intent": { ... }
   * }
   *
   * @returns Blueprint with confidence, warnings, and suggestions
   */
  fastify.post<{
    Params: { botId: string };
    Body: z.infer<typeof GenerateBodySchema>;
  }>(
    '/:botId/builder/generate',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      const { botId } = request.params;
      const { intent } = request.body;

      try {
        // Verify bot ownership
        const user = request.user as { userId: string; organizationId: string };
        const { data: bot, error } = await supabase
          .from('bots')
          .select('id, organization_id')
          .eq('id', botId)
          .eq('organization_id', user.organizationId)
          .single();

        if (error || !bot) {
          return reply.status(404).send({
            success: false,
            error: 'Bot not found'
          });
        }

        // Generate Blueprint
        const service = getBotBuilderService();
        const result = await service.generateBlueprint(intent as IntentAnalysis, botId);

        return reply.send({
          success: true,
          blueprint: result.blueprint,
          confidence: result.confidence,
          warnings: result.warnings,
          suggestions: result.suggestions
        });
      } catch (error: any) {
        request.log.error({ error, botId }, 'Failed to generate Blueprint');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to generate Blueprint'
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/builder/conversation
   *
   * Conversational bot building - multi-turn conversation
   *
   * @example
   * POST /api/bots/123/builder/conversation
   * {
   *   "messages": [
   *     { "role": "user", "content": "I want to make a bot for my store" },
   *     { "role": "assistant", "content": "What should the bot help with?" },
   *     { "role": "user", "content": "Order tracking" }
   *   ]
   * }
   *
   * @returns Assistant response with optional intent/blueprint if complete
   */
  fastify.post<{
    Params: { botId: string };
    Body: z.infer<typeof ConversationBodySchema>;
  }>(
    '/:botId/builder/conversation',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      const { botId } = request.params;
      const { messages } = request.body;

      try {
        // Verify bot ownership
        const user = request.user as { userId: string; organizationId: string };
        const { data: bot, error } = await supabase
          .from('bots')
          .select('id, organization_id')
          .eq('id', botId)
          .eq('organization_id', user.organizationId)
          .single();

        if (error || !bot) {
          return reply.status(404).send({
            success: false,
            error: 'Bot not found'
          });
        }

        // Continue conversation
        const service = getBotBuilderService();
        const result = await service.conversationalBuilder(messages, botId);

        return reply.send({
          success: true,
          response: result.response,
          intent: result.intent,
          blueprint: result.blueprint,
          complete: result.complete
        });
      } catch (error: any) {
        request.log.error({ error, botId }, 'Failed in conversational builder');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to process conversation'
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/builder/optimize
   *
   * Get optimization suggestions for a Blueprint
   *
   * @example
   * POST /api/bots/123/builder/optimize
   * {
   *   "blueprint": { ... }
   * }
   *
   * @returns List of optimization suggestions
   */
  fastify.post<{
    Params: { botId: string };
    Body: z.infer<typeof OptimizeBodySchema>;
  }>(
    '/:botId/builder/optimize',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      const { botId } = request.params;
      const { blueprint } = request.body;

      try {
        // Verify bot ownership
        const user = request.user as { userId: string; organizationId: string };
        const { data: bot, error } = await supabase
          .from('bots')
          .select('id, organization_id')
          .eq('id', botId)
          .eq('organization_id', user.organizationId)
          .single();

        if (error || !bot) {
          return reply.status(404).send({
            success: false,
            error: 'Bot not found'
          });
        }

        // Generate optimizations
        const service = getBotBuilderService();
        const suggestions = await service.generateOptimizations(blueprint);

        return reply.send({
          success: true,
          suggestions
        });
      } catch (error: any) {
        request.log.error({ error, botId }, 'Failed to generate optimizations');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to generate optimizations'
        });
      }
    }
  );

  /**
   * POST /api/bots/:botId/builder/recommend
   *
   * Get node recommendations for an action
   *
   * @example
   * POST /api/bots/123/builder/recommend
   * {
   *   "action": "send payment link",
   *   "context": {
   *     "previousNodes": ["ask_question"],
   *     "integrations": ["paystack"]
   *   }
   * }
   *
   * @returns Top 3 node recommendations
   */
  fastify.post<{
    Params: { botId: string };
    Body: z.infer<typeof RecommendBodySchema>;
  }>(
    '/:botId/builder/recommend',
    {
      onRequest: [fastify.authenticate]
    },
    async (request, reply) => {
      const { botId } = request.params;
      const { action, context } = request.body;

      try {
        // Verify bot ownership
        const user = request.user as { userId: string; organizationId: string };
        const { data: bot, error } = await supabase
          .from('bots')
          .select('id, organization_id')
          .eq('id', botId)
          .eq('organization_id', user.organizationId)
          .single();

        if (error || !bot) {
          return reply.status(404).send({
            success: false,
            error: 'Bot not found'
          });
        }

        // Get recommendations
        const engine = getNodeRecommendationEngine();
        const recommendations = engine.recommendNodes(action, context);

        return reply.send({
          success: true,
          recommendations
        });
      } catch (error: any) {
        request.log.error({ error, botId }, 'Failed to get recommendations');
        return reply.status(500).send({
          success: false,
          error: error.message || 'Failed to get recommendations'
        });
      }
    }
  );
};

export default botBuilderRoutes;
