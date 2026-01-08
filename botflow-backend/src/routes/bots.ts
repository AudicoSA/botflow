import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WorkflowGenerator } from '../services/workflow-generator.js';
import { N8nClient } from '../services/n8n-client.js';
import { supabaseAdmin } from '../config/supabase.js';

const createBotSchema = z.object({
    templateId: z.string(),
    config: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        welcomeMessage: z.string().min(1),
        fallbackMessage: z.string().optional(),
    }),
});

export default async function botRoutes(fastify: FastifyInstance) {
    // Initialize n8n client and workflow generator
    const n8nClient = new N8nClient({
        baseUrl: process.env.N8N_API_URL!,
        apiKey: process.env.N8N_API_KEY!,
        logger: fastify.log,
    });

    const workflowGenerator = new WorkflowGenerator({
        n8nClient,
        logger: fastify.log,
        webhookBaseUrl: process.env.N8N_WEBHOOK_URL!,
    });

    // List bots
    fastify.get('/', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = (request.user as any).id;

        const { data: bots, error } = await supabaseAdmin
            .from('bots')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch bots' });
        }

        return { bots };
    });

    // Create bot
    fastify.post('/', {
        // TODO: Re-enable auth after testing
        // onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // Temporarily use a test user ID until auth is implemented
        let userId = (request.user as any)?.id;

        // If no user is authenticated, use/create a dev user (for now, regardless of ENV)
        if (!userId) {
            try {
                const { getDevUser } = await import('../utils/dev-user.js');
                const devUser = await getDevUser(fastify.log);
                userId = devUser.id;
            } catch (error) {
                fastify.log.error(error, 'Failed to get dev user');
                return reply.code(500).send({ error: 'Failed to initialize dev user' });
            }
        }

        if (!userId) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Validate request body
        const validation = createBotSchema.safeParse(request.body);
        if (!validation.success) {
            return reply.code(400).send({
                error: 'Invalid request',
                details: validation.error.errors
            });
        }

        const { templateId, config } = validation.data;

        try {
            // Generate unique bot ID
            const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Generate n8n workflow
            fastify.log.info({ templateId, botId }, 'Generating n8n workflow');

            const workflowResult = await workflowGenerator.generateFromTemplate({
                templateId,
                botId,
                userId,
                config: {
                    ...config,
                    // Template-specific configs can be added here
                },
            });

            // Create bot record in database
            const { data: bot, error: botError } = await supabaseAdmin
                .from('bots')
                .insert({
                    id: botId,
                    user_id: userId,
                    name: config.name,
                    description: config.description || '',
                    template_id: templateId,
                    config: config,
                    status: 'active',
                })
                .select()
                .single();

            if (botError) {
                fastify.log.error(botError);
                // Try to clean up n8n workflow if bot creation fails
                try {
                    await n8nClient.deleteWorkflow(workflowResult.workflowId);
                } catch (cleanupError) {
                    fastify.log.error(cleanupError, 'Failed to cleanup n8n workflow');
                }
                return reply.code(500).send({ error: 'Failed to create bot' });
            }

            // Create bot_workflows record
            const { error: workflowError } = await supabaseAdmin
                .from('bot_workflows')
                .insert({
                    bot_id: botId,
                    n8n_workflow_id: workflowResult.workflowId,
                    n8n_webhook_path: workflowResult.webhookPath,
                    n8n_webhook_url: workflowResult.webhookUrl,
                    workflow_config: config,
                    template_id: templateId,
                    is_active: true,
                });

            if (workflowError) {
                fastify.log.error(workflowError);
                // Continue anyway, workflow is created
            }

            fastify.log.info({ botId, workflowId: workflowResult.workflowId }, 'Bot created successfully');

            return {
                id: botId,
                ...bot,
                workflow: {
                    id: workflowResult.workflowId,
                    webhookUrl: workflowResult.webhookUrl,
                },
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({
                error: 'Failed to create bot',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get bot
    fastify.get('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = (request.user as any).id;
        const { id } = request.params as { id: string };

        const { data: bot, error } = await supabaseAdmin
            .from('bots')
            .select('*, bot_workflows(*)')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !bot) {
            return reply.code(404).send({ error: 'Bot not found' });
        }

        return { bot };
    });

    // Update bot
    fastify.patch('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = (request.user as any).id;
        const { id } = request.params as { id: string };
        const updates = request.body as any;

        const { data: bot, error } = await supabaseAdmin
            .from('bots')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update bot' });
        }

        return { bot };
    });

    // Delete bot
    fastify.delete('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = (request.user as any).id;
        const { id } = request.params as { id: string };

        // Get bot workflow to delete from n8n
        const { data: botWorkflow } = await supabaseAdmin
            .from('bot_workflows')
            .select('n8n_workflow_id')
            .eq('bot_id', id)
            .single();

        // Delete from n8n
        if (botWorkflow?.n8n_workflow_id) {
            try {
                await n8nClient.deleteWorkflow(botWorkflow.n8n_workflow_id);
            } catch (error) {
                fastify.log.error(error, 'Failed to delete n8n workflow');
                // Continue with bot deletion anyway
            }
        }

        // Delete bot (cascade will delete bot_workflows)
        const { error } = await supabaseAdmin
            .from('bots')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete bot' });
        }

        return { success: true };
    });
}
