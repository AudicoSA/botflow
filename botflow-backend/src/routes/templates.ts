import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';

const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/templates - List all published templates
  fastify.get('/', async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .select('*')
        .eq('is_published', true)
        .order('tier', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return reply.send({ templates: data });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch templates' });
    }
  });

  // GET /api/templates/:id - Get specific template
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      return reply.send({ template: data });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch template' });
    }
  });

  // GET /api/templates/vertical/:vertical - Get templates by vertical
  fastify.get('/vertical/:vertical', async (request, reply) => {
    const { vertical } = request.params as { vertical: string };

    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .select('*')
        .eq('vertical', vertical)
        .eq('is_published', true)
        .order('tier', { ascending: true });

      if (error) throw error;

      return reply.send({ templates: data });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch templates' });
    }
  });

  // POST /api/templates - Create new template (admin only)
  fastify.post('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    // TODO: Add admin role check

    const templateSchema = z.object({
      name: z.string().min(1),
      vertical: z.string().min(1),
      tier: z.number().min(1).max(3),
      description: z.string(),
      tagline: z.string().optional(),
      icon: z.string().optional(),
      required_fields: z.record(z.any()),
      conversation_flow: z.object({
        systemPrompt: z.string(),
        welcomeMessage: z.string().optional(),
        exampleConversations: z.array(z.any()).optional(),
        rules: z.array(z.string()).optional(),
        intents: z.record(z.any()).optional(),
        handoffConditions: z.array(z.string()).optional(),
      }),
      example_prompts: z.array(z.string()).optional(),
      integrations: z.array(z.string()).optional(),
      is_published: z.boolean().default(false),
    });

    try {
      const templateData = templateSchema.parse(request.body);

      const { data, error } = await supabase
        .from('bot_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;

      return reply.code(201).send({ template: data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create template' });
    }
  });

  // PATCH /api/templates/:id - Update template (admin only)
  fastify.patch('/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body;

    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      return reply.send({ template: data });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update template' });
    }
  });

  // DELETE /api/templates/:id - Delete template (admin only)
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const { error } = await supabase
        .from('bot_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete template' });
    }
  });
};

export default templatesRoutes;
