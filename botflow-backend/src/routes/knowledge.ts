import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';

const createSourceSchema = z.object({
    sourceType: z.enum(['file', 'url', 'text']),
    content: z.string(),
    metadata: z.record(z.any()).default({}),
});

export default async function knowledgeRoutes(fastify: FastifyInstance) {
    // Get knowledge sources for a bot
    fastify.get('/bots/:botId/knowledge', {
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

        const { botId } = request.params as { botId: string };

        // Verify ownership
        const { data: bot, error: botError } = await supabaseAdmin
            .from('bots')
            .select('id')
            .eq('id', botId)
            .eq('user_id', userId)
            .single();

        if (botError || !bot) {
            return reply.code(404).send({ error: 'Bot not found or unauthorized' });
        }

        const { data: sources, error } = await supabaseAdmin
            .from('knowledge_sources')
            .select('*')
            .eq('bot_id', botId)
            .order('created_at', { ascending: false });

        if (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch knowledge sources' });
        }

        return { sources };
    });

    // Add knowledge source
    fastify.post('/bots/:botId/knowledge', {
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

        const { botId } = request.params as { botId: string };
        const validation = createSourceSchema.safeParse(request.body);

        if (!validation.success) {
            return reply.code(400).send({ error: 'Invalid request', details: validation.error.errors });
        }

        // Verify ownership
        const { data: bot, error: botError } = await supabaseAdmin
            .from('bots')
            .select('id')
            .eq('id', botId)
            .eq('user_id', userId)
            .single();

        if (botError || !bot) {
            return reply.code(404).send({ error: 'Bot not found or unauthorized' });
        }

        const { sourceType, content, metadata } = validation.data;

        const { data: source, error } = await supabaseAdmin
            .from('knowledge_sources')
            .insert({
                bot_id: botId,
                source_type: sourceType,
                content: content,
                metadata: metadata,
                status: 'pending' // TODO: Trigger processing job
            })
            .select()
            .single();

        if (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create knowledge source' });
        }

        return { source };
    });

    // Delete knowledge source
    fastify.delete('/bots/:botId/knowledge/:sourceId', {
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

        const { botId, sourceId } = request.params as { botId: string, sourceId: string };

        // Verify ownership via join or two steps. Two steps is safer for RLS interaction if needed, 
        // but here we are admin. 
        // Let's just check if the source belongs to a bot owned by the user.

        // 1. Check bot ownership
        const { data: bot, error: botError } = await supabaseAdmin
            .from('bots')
            .select('id')
            .eq('id', botId)
            .eq('user_id', userId)
            .single();

        if (botError || !bot) {
            return reply.code(404).send({ error: 'Bot not found or unauthorized' });
        }

        const { error } = await supabaseAdmin
            .from('knowledge_sources')
            .delete()
            .eq('id', sourceId)
            .eq('bot_id', botId);

        if (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete knowledge source' });
        }

        return { success: true };
    });
}
