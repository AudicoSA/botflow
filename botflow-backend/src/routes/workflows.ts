/**
 * Workflow API Routes (Phase 2 Week 2 Day 5)
 *
 * Endpoints for managing workflow versions:
 * - POST   /api/bots/:botId/workflows          - Create new workflow version
 * - GET    /api/bots/:botId/workflows          - List workflow versions
 * - GET    /api/bots/:botId/workflows/:version - Get specific version
 * - POST   /api/bots/:botId/workflows/:version/activate - Activate version
 * - POST   /api/bots/:botId/workflows/:version/rollback - Rollback to version
 * - DELETE /api/bots/:botId/workflows/:version - Delete (archive) version
 * - POST   /api/bots/:botId/workflows/validate - Dry-run validation
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getWorkflowCompiler } from '../services/workflow-compiler.js';
import { getWorkflowValidator } from '../services/workflow-validator.js';
import { supabase } from '../config/supabase.js';

// ============================================================================
// Zod Schemas for Request Validation
// ============================================================================

const BlueprintNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  config: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

const BlueprintEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional()
});

const BlueprintSchema = z.object({
  bot_id: z.string().uuid(),
  version: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  nodes: z.array(BlueprintNodeSchema),
  edges: z.array(BlueprintEdgeSchema),
  variables: z.record(z.string()).optional().default({}),
  credentials: z.array(z.object({
    service: z.string(),
    credential_id: z.string().uuid()
  })).optional().default([])
});

const CreateWorkflowSchema = z.object({
  blueprint: BlueprintSchema,
  auto_deploy: z.boolean().optional().default(false)
});

const ValidateWorkflowSchema = z.object({
  blueprint: BlueprintSchema
});

// ============================================================================
// Routes
// ============================================================================

export const workflowRoutes: FastifyPluginAsync = async (fastify) => {
  const compiler = getWorkflowCompiler();
  const validator = getWorkflowValidator();

  /**
   * POST /api/bots/:botId/workflows
   * Create a new workflow version
   */
  fastify.post<{
    Params: { botId: string };
    Body: z.infer<typeof CreateWorkflowSchema>;
  }>(
    '/:botId/workflows',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['workflows'],
        description: 'Create a new workflow version',
        params: z.object({ botId: z.string().uuid() }),
        body: CreateWorkflowSchema
      }
    },
    async (request, reply) => {
      const { botId } = request.params;
      const { blueprint, auto_deploy } = request.body;

      try {
        // Verify bot exists and user has access
        const { data: bot, error: botError } = await supabase
          .from('bots')
          .select('id, whatsapp_account_id')
          .eq('id', botId)
          .single();

        if (botError || !bot) {
          return reply.code(404).send({ error: 'Bot not found' });
        }

        // Get next version number
        const { data: latestVersionData } = await supabase
          .rpc('get_latest_workflow_version', { p_bot_id: botId });

        const nextVersion = (latestVersionData || 0) + 1;

        // Compile Blueprint → n8n workflow
        const compilationResult = await compiler.compile(blueprint);

        if (!compilationResult.success) {
          return reply.code(400).send({
            error: 'Workflow compilation failed',
            validation: compilationResult.validation
          });
        }

        // Insert workflow version
        const { data: workflowVersion, error: insertError } = await supabase
          .from('workflow_versions')
          .insert({
            bot_id: botId,
            version: nextVersion,
            blueprint: blueprint,
            n8n_workflow: compilationResult.workflow,
            status: auto_deploy ? 'active' : 'draft',
            created_by: request.user.id
          })
          .select()
          .single();

        if (insertError) {
          fastify.log.error(insertError);
          return reply.code(500).send({ error: 'Failed to create workflow version' });
        }

        // If auto_deploy, activate this version
        if (auto_deploy) {
          await supabase.rpc('activate_workflow_version', {
            p_bot_id: botId,
            p_version: nextVersion
          });

          // TODO: Deploy to n8n (Day 6)
          fastify.log.info(`Workflow version ${nextVersion} deployed for bot ${botId}`);
        }

        return reply.code(201).send({
          success: true,
          version: workflowVersion,
          stats: compilationResult.stats
        });

      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/bots/:botId/workflows
   * List all workflow versions for a bot
   */
  fastify.get<{
    Params: { botId: string };
  }>(
    '/:botId/workflows',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['workflows'],
        description: 'List all workflow versions',
        params: z.object({ botId: z.string().uuid() })
      }
    },
    async (request, reply) => {
      const { botId } = request.params;

      const { data: versions, error } = await supabase
        .from('workflow_versions')
        .select('id, version, status, created_at, deployed_at, created_by')
        .eq('bot_id', botId)
        .order('version', { ascending: false });

      if (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch workflow versions' });
      }

      // Get workflow stats
      const { data: stats } = await supabase
        .rpc('get_workflow_stats', { p_bot_id: botId })
        .single();

      return reply.send({
        versions,
        stats
      });
    }
  );

  /**
   * GET /api/bots/:botId/workflows/:version
   * Get a specific workflow version
   */
  fastify.get<{
    Params: { botId: string; version: string };
  }>(
    '/:botId/workflows/:version',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['workflows'],
        description: 'Get specific workflow version',
        params: z.object({
          botId: z.string().uuid(),
          version: z.string()
        })
      }
    },
    async (request, reply) => {
      const { botId, version } = request.params;

      const { data: workflowVersion, error } = await supabase
        .from('workflow_versions')
        .select('*')
        .eq('bot_id', botId)
        .eq('version', parseInt(version))
        .single();

      if (error || !workflowVersion) {
        return reply.code(404).send({ error: 'Workflow version not found' });
      }

      return reply.send(workflowVersion);
    }
  );

  /**
   * POST /api/bots/:botId/workflows/:version/activate
   * Activate a workflow version
   */
  fastify.post<{
    Params: { botId: string; version: string };
  }>(
    '/:botId/workflows/:version/activate',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['workflows'],
        description: 'Activate a workflow version',
        params: z.object({
          botId: z.string().uuid(),
          version: z.string()
        })
      }
    },
    async (request, reply) => {
      const { botId, version } = request.params;

      try {
        const { data: success, error } = await supabase
          .rpc('activate_workflow_version', {
            p_bot_id: botId,
            p_version: parseInt(version)
          });

        if (error || !success) {
          return reply.code(400).send({ error: 'Failed to activate workflow version' });
        }

        // TODO: Deploy to n8n (Day 6)
        fastify.log.info(`Workflow version ${version} activated for bot ${botId}`);

        return reply.send({
          success: true,
          message: `Workflow version ${version} activated`
        });

      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/bots/:botId/workflows/:version/rollback
   * Rollback to a previous workflow version
   */
  fastify.post<{
    Params: { botId: string; version: string };
  }>(
    '/:botId/workflows/:version/rollback',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['workflows'],
        description: 'Rollback to a previous workflow version',
        params: z.object({
          botId: z.string().uuid(),
          version: z.string()
        })
      }
    },
    async (request, reply) => {
      const { botId, version } = request.params;

      try {
        // Get the target version
        const { data: targetVersion, error: fetchError } = await supabase
          .from('workflow_versions')
          .select('*')
          .eq('bot_id', botId)
          .eq('version', parseInt(version))
          .single();

        if (fetchError || !targetVersion) {
          return reply.code(404).send({ error: 'Workflow version not found' });
        }

        // Activate the target version
        const { error: activateError } = await supabase
          .rpc('activate_workflow_version', {
            p_bot_id: botId,
            p_version: parseInt(version)
          });

        if (activateError) {
          throw activateError;
        }

        // TODO: Deploy to n8n (Day 6)
        fastify.log.info(`Rolled back to workflow version ${version} for bot ${botId}`);

        return reply.send({
          success: true,
          message: `Rolled back to workflow version ${version}`
        });

      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * DELETE /api/bots/:botId/workflows/:version
   * Delete (archive) a workflow version
   */
  fastify.delete<{
    Params: { botId: string; version: string };
  }>(
    '/:botId/workflows/:version',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['workflows'],
        description: 'Delete (archive) a workflow version',
        params: z.object({
          botId: z.string().uuid(),
          version: z.string()
        })
      }
    },
    async (request, reply) => {
      const { botId, version } = request.params;

      try {
        // Don't allow deleting active versions
        const { data: workflowVersion } = await supabase
          .from('workflow_versions')
          .select('status')
          .eq('bot_id', botId)
          .eq('version', parseInt(version))
          .single();

        if (workflowVersion?.status === 'active') {
          return reply.code(400).send({
            error: 'Cannot delete active workflow version. Activate another version first.'
          });
        }

        // Archive the version
        const { error } = await supabase
          .from('workflow_versions')
          .update({ status: 'archived' })
          .eq('bot_id', botId)
          .eq('version', parseInt(version));

        if (error) {
          throw error;
        }

        return reply.send({
          success: true,
          message: `Workflow version ${version} archived`
        });

      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * POST /api/bots/:botId/workflows/validate
   * Dry-run validation of a workflow without creating it
   */
  fastify.post<{
    Params: { botId: string };
    Body: z.infer<typeof ValidateWorkflowSchema>;
  }>(
    '/:botId/workflows/validate',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['workflows'],
        description: 'Validate a workflow without creating it (dry-run)',
        params: z.object({ botId: z.string().uuid() }),
        body: ValidateWorkflowSchema
      }
    },
    async (request, reply) => {
      const { blueprint } = request.body;

      try {
        // Validate Blueprint
        const validation = await validator.validateBlueprint(blueprint);

        // Compile (validate_only mode)
        const compilationResult = await compiler.compile(blueprint, {
          validate_only: true
        });

        // Calculate complexity
        const complexity = validator.calculateComplexity(blueprint);

        // Get optimization suggestions
        const suggestions = validator.suggestOptimizations(blueprint);

        return reply.send({
          valid: validation.valid && compilationResult.success,
          validation: validation,
          compilation: compilationResult,
          complexity,
          suggestions,
          executable: validator.isExecutable(blueprint)
        });

      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );
};

export default workflowRoutes;
