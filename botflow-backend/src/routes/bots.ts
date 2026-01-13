import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WorkflowGenerator } from '../services/workflow-generator.js';
import { N8nClient } from '../services/n8n-client.js';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { TemplateInstantiationService } from '../services/template-instantiation.service.js';

const createBotSchema = z.object({
    templateId: z.string(),
    config: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        welcomeMessage: z.string().min(1),
        fallbackMessage: z.string().optional(),
    }),
    systemPrompt: z.string().optional(),
    modelConfig: z.object({
        provider: z.string().default('openai'),
        model: z.string().default('gpt-4o'),
        temperature: z.number().min(0).max(1).default(0.7),
    }).optional(),
});

export default async function botRoutes(fastify: FastifyInstance) {
    // Initialize n8n client and workflow generator with safe defaults to prevent startup crash
    const n8nClient = new N8nClient({
        baseUrl: env.N8N_API_URL || 'https://api.n8n.placeholder.com', // Safe default
        apiKey: env.N8N_API_KEY || 'missing-key',
        logger: fastify.log,
    });

    const workflowGenerator = new WorkflowGenerator({
        n8nClient,
        logger: fastify.log,
        webhookBaseUrl: env.N8N_WEBHOOK_URL || 'https://webhook.n8n.placeholder.com',
    });

    // List bots
    fastify.get('/', {
        // onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // Match the field name used in create-from-template endpoint
        let userId = (request.user as any)?.userId || (request.user as any)?.id;

        // Fallback to dev user if no auth (same as POST)
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

        const { templateId, config, systemPrompt, modelConfig } = validation.data;

        // Check for n8n configuration
        if (!env.N8N_API_URL || env.N8N_API_URL.includes('placeholder')) {
            return reply.code(500).send({
                error: 'Configuration Error',
                details: 'n8n API URL is not configured in Railway variables. Please add N8N_API_URL and N8N_API_KEY.'
            });
        }

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
                    system_prompt: systemPrompt,
                    model_config: modelConfig,
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
                fastify.log.error({ error: workflowError, botId, workflowId: workflowResult.workflowId }, 'Failed to create bot_workflow record');
                // Continue anyway, workflow is created
            } else {
                fastify.log.info({ botId }, 'Successfully created bot_workflow record');
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
            // DEBUG: Return full error details to identifying the issue
            return reply.code(500).send({
                error: 'Failed to create bot',
                details: error instanceof Error ? error.message : 'Unknown error',
                params: {
                    n8nUrl: process.env.N8N_API_URL,
                    hasN8nKey: !!process.env.N8N_API_KEY
                }
            });
        }
    });

    // Get bot
    fastify.get('/:id', {
        // onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // Match the field name used in create-from-template endpoint
        let userId = (request.user as any)?.userId || (request.user as any)?.id;

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

        const { id } = request.params as { id: string };

        // Query bot first (without join to avoid schema cache issues)
        const { data: bot, error: botError } = await supabaseAdmin
            .from('bots')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (botError || !bot) {
            if (botError) {
                fastify.log.warn({ error: botError, id }, 'Error fetching bot');
            }
            return reply.code(404).send({ error: 'Bot not found', details: botError });
        }

        // Fetch workflow separately
        const { data: workflows, error: workflowError } = await supabaseAdmin
            .from('bot_workflows')
            .select('*')
            .eq('bot_id', id);

        // Combine result (expecting 0 or 1 workflow)
        const result = {
            ...bot,
            bot_workflows: workflows || []
        };

        return { bot: result };
    });

    // Update bot
    fastify.patch('/:id', {
        // onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        let userId = (request.user as any)?.id;

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

        const { id } = request.params as { id: string };
        const { systemPrompt, modelConfig, ...otherUpdates } = request.body as any;

        const dbUpdates = {
            ...otherUpdates,
            ...(systemPrompt !== undefined && { system_prompt: systemPrompt }),
            ...(modelConfig !== undefined && { model_config: modelConfig }),
        };

        const { data: bot, error } = await supabaseAdmin
            .from('bots')
            .update(dbUpdates)
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
        // onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        let userId = (request.user as any)?.id;

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

    // POST /api/bots/create-from-template - Create bot from template
    fastify.post('/create-from-template', {
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const schema = z.object({
            template_id: z.string().uuid(),
            organization_id: z.string().uuid(),
            whatsapp_account_id: z.string().uuid(),
            bot_name: z.string().min(1),
            field_values: z.record(z.any()),
        });

        try {
            const data = schema.parse(request.body) as {
                template_id: string;
                organization_id: string;
                whatsapp_account_id: string;
                bot_name: string;
                field_values: Record<string, any>;
            };

            // Extract user ID from JWT token
            const userId = (request.user as any)?.userId;
            if (!userId) {
                return reply.code(401).send({ error: 'Unauthorized: User ID not found in token' });
            }

            const result = await TemplateInstantiationService.instantiateBot(data, userId);

            return reply.code(201).send({
                success: true,
                bot: result.bot,
                template: result.template,
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation error', details: error.errors });
            }
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Failed to create bot from template' });
        }
    });
}
