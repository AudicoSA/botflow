/**
 * AI Agent Routes (Phase 3)
 *
 * API endpoints for the AI-powered workflow builder.
 * Enables conversational workflow creation through natural language.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getConversationEngine,
  getContextManager,
  getWorkflowGenerator,
  getIntentParser
} from '../services/ai-agent/index.js';
import { supabaseAdmin } from '../config/supabase.js';

// Request Schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional()
});

const GenerateRequestSchema = z.object({
  description: z.string().min(10).max(2000),
  integrations: z.array(z.string()).optional(),
  template: z.string().optional(),
  vertical: z.string().optional()
});

const RefineRequestSchema = z.object({
  sessionId: z.string().uuid(),
  modifications: z.string().min(1).max(1000)
});

const DeployRequestSchema = z.object({
  sessionId: z.string().uuid(),
  activate: z.boolean().default(true)
});

/**
 * Register AI Agent routes
 */
export default async function aiAgentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/bots/:botId/agent/chat
   * Send a message to the AI agent for conversational workflow building.
   */
  fastify.post('/:botId/agent/chat', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const user = request.user as { id: string; organization_id?: string };

    // Validate request body
    const validation = ChatRequestSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: validation.error.errors[0]?.message || 'Invalid request'
      });
    }

    const { message, sessionId } = validation.data;

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseAdmin
      .from('bots')
      .select('id, user_id, organization_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Bot not found'
      });
    }

    try {
      const engine = getConversationEngine();
      const response = await engine.processMessage(
        { message, sessionId },
        user.id,
        botId,
        user.organization_id || bot.organization_id
      );

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error, 'AI Agent chat error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process message'
      });
    }
  });

  /**
   * POST /api/bots/:botId/agent/generate
   * Generate a workflow directly from a description (without conversation).
   */
  fastify.post('/:botId/agent/generate', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const user = request.user as { id: string; organization_id?: string };

    // Validate request body
    const validation = GenerateRequestSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: validation.error.errors[0]?.message || 'Invalid request'
      });
    }

    const { description, integrations, template, vertical } = validation.data;

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseAdmin
      .from('bots')
      .select('id, user_id, organization_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Bot not found'
      });
    }

    try {
      const intentParser = getIntentParser();
      const workflowGenerator = getWorkflowGenerator();
      const contextManager = getContextManager();

      // Create temporary context for generation
      const context = await contextManager.createSession(
        user.id,
        botId,
        user.organization_id || bot.organization_id,
        { vertical }
      );

      // Parse the description
      const intent = await intentParser.parse(description, context);

      // Add specified integrations
      if (integrations) {
        intent.integrations = [...new Set([...intent.integrations, ...integrations])];
      }

      // Generate workflow
      const result = await workflowGenerator.generateFromIntent(intent, context);

      // Clean up temporary session
      await contextManager.deleteSession(context.sessionId);

      if (!result.success) {
        return reply.code(400).send({
          error: 'Generation Failed',
          message: result.errors.join(', '),
          warnings: result.warnings
        });
      }

      return reply.send({
        workflow: result.workflow,
        confidence: result.confidence,
        explanation: result.explanation,
        warnings: result.warnings,
        processingTimeMs: result.processingTimeMs
      });
    } catch (error) {
      fastify.log.error(error, 'AI Agent generate error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate workflow'
      });
    }
  });

  /**
   * POST /api/bots/:botId/agent/refine
   * Refine an existing workflow based on modifications.
   */
  fastify.post('/:botId/agent/refine', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const user = request.user as { id: string; organization_id?: string };

    // Validate request body
    const validation = RefineRequestSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: validation.error.errors[0]?.message || 'Invalid request'
      });
    }

    const { sessionId, modifications } = validation.data;

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseAdmin
      .from('bots')
      .select('id, user_id, organization_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Bot not found'
      });
    }

    try {
      const contextManager = getContextManager();
      const workflowGenerator = getWorkflowGenerator();

      // Get session
      const context = await contextManager.getSession(sessionId);
      if (!context || context.botId !== botId) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Session not found or expired'
        });
      }

      if (!context.currentWorkflow) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No workflow in session to refine'
        });
      }

      // Refine the workflow
      const result = await workflowGenerator.refineWorkflow(
        context.currentWorkflow,
        modifications,
        context
      );

      if (result.success && result.workflow) {
        // Update context with new workflow
        contextManager.updateWorkflow(context, result.workflow, true);
        await contextManager.updateSession(context);
      }

      return reply.send({
        workflow: result.workflow,
        success: result.success,
        explanation: result.explanation,
        warnings: result.warnings,
        errors: result.errors
      });
    } catch (error) {
      fastify.log.error(error, 'AI Agent refine error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refine workflow'
      });
    }
  });

  /**
   * POST /api/bots/:botId/agent/deploy
   * Deploy the current workflow from a session.
   */
  fastify.post('/:botId/agent/deploy', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const user = request.user as { id: string; organization_id?: string };

    // Validate request body
    const validation = DeployRequestSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: validation.error.errors[0]?.message || 'Invalid request'
      });
    }

    const { sessionId, activate } = validation.data;

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseAdmin
      .from('bots')
      .select('id, user_id, organization_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Bot not found'
      });
    }

    try {
      const contextManager = getContextManager();

      // Get session
      const context = await contextManager.getSession(sessionId);
      if (!context || context.botId !== botId) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Session not found or expired'
        });
      }

      if (!context.currentWorkflow) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No workflow in session to deploy'
        });
      }

      // Save workflow to bot
      const { error: updateError } = await supabaseAdmin
        .from('bots')
        .update({
          workflow_nodes: context.currentWorkflow.nodes,
          workflow_edges: context.currentWorkflow.edges,
          workflow_variables: context.currentWorkflow.variables,
          is_active: activate,
          updated_at: new Date().toISOString()
        })
        .eq('id', botId);

      if (updateError) {
        throw updateError;
      }

      // Update session state
      contextManager.transitionState(context, 'complete');
      await contextManager.updateSession(context);

      return reply.send({
        success: true,
        workflowId: botId,
        status: activate ? 'active' : 'inactive',
        message: activate
          ? 'Workflow deployed and activated successfully'
          : 'Workflow deployed but not activated'
      });
    } catch (error) {
      fastify.log.error(error, 'AI Agent deploy error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to deploy workflow'
      });
    }
  });

  /**
   * GET /api/bots/:botId/agent/session
   * Get info about the current session for a bot.
   */
  fastify.get('/:botId/agent/session', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const { sessionId } = request.query as { sessionId?: string };
    const user = request.user as { id: string; organization_id?: string };

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseAdmin
      .from('bots')
      .select('id, user_id, organization_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Bot not found'
      });
    }

    if (!sessionId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'sessionId query parameter required'
      });
    }

    try {
      const contextManager = getContextManager();
      const context = await contextManager.getSession(sessionId);

      if (!context || context.botId !== botId) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Session not found or expired'
        });
      }

      return reply.send(contextManager.getSessionInfo(context));
    } catch (error) {
      fastify.log.error(error, 'AI Agent session info error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get session info'
      });
    }
  });

  /**
   * DELETE /api/bots/:botId/agent/session/:sessionId
   * Delete a session.
   */
  fastify.delete('/:botId/agent/session/:sessionId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { botId, sessionId } = request.params as { botId: string; sessionId: string };
    const user = request.user as { id: string; organization_id?: string };

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseAdmin
      .from('bots')
      .select('id, user_id, organization_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Bot not found'
      });
    }

    try {
      const contextManager = getContextManager();
      const context = await contextManager.getSession(sessionId);

      if (!context || context.botId !== botId) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Session not found'
        });
      }

      await contextManager.deleteSession(sessionId);

      return reply.send({
        success: true,
        message: 'Session deleted'
      });
    } catch (error) {
      fastify.log.error(error, 'AI Agent session delete error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete session'
      });
    }
  });

  /**
   * GET /api/bots/:botId/agent/explain
   * Get a natural language explanation of the current workflow.
   */
  fastify.get('/:botId/agent/explain', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const { sessionId } = request.query as { sessionId: string };
    const user = request.user as { id: string; organization_id?: string };

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseAdmin
      .from('bots')
      .select('id, user_id, organization_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Bot not found'
      });
    }

    if (!sessionId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'sessionId query parameter required'
      });
    }

    try {
      const contextManager = getContextManager();
      const workflowGenerator = getWorkflowGenerator();

      const context = await contextManager.getSession(sessionId);
      if (!context || context.botId !== botId) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Session not found or expired'
        });
      }

      if (!context.currentWorkflow) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No workflow in session to explain'
        });
      }

      const explanation = await workflowGenerator.explainWorkflow(context.currentWorkflow);

      return reply.send({
        explanation,
        workflow: context.currentWorkflow
      });
    } catch (error) {
      fastify.log.error(error, 'AI Agent explain error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to explain workflow'
      });
    }
  });

  /**
   * GET /api/bots/:botId/agent/stats
   * Get statistics about AI agent usage.
   */
  fastify.get('/:botId/agent/stats', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: string; organization_id?: string };

    try {
      const contextManager = getContextManager();
      const stats = contextManager.getStats();

      return reply.send(stats);
    } catch (error) {
      fastify.log.error(error, 'AI Agent stats error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get stats'
      });
    }
  });
}
