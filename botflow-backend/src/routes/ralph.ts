import { FastifyPluginAsync } from 'fastify';
import { ralphService } from '../services/ralph.service.js';
import { supabase } from '../config/supabase.js';
import { z } from 'zod';

const ralphRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('onRequest', async (request, reply) => {
    await request.jwtVerify();
  });

  /**
   * POST /api/ralph/generate-template
   * Generate a new template from business description
   */
  fastify.post('/generate-template', async (request, reply) => {
    const schema = z.object({
      businessType: z.string().min(1),
      businessName: z.string().min(1),
      description: z.string().min(10),
      services: z.array(z.string()).optional(),
      bookingRequired: z.boolean().optional(),
      paymentMethods: z.array(z.string()).optional(),
      additionalRequirements: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const {
      businessType,
      businessName,
      description,
      services,
      bookingRequired,
      paymentMethods,
      additionalRequirements,
    } = parsed.data;

    try {
      const result = await ralphService.generateTemplate({
        businessType,
        businessName,
        description,
        services,
        bookingRequired,
        paymentMethods,
        additionalRequirements,
      });

      return reply.send(result);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to generate template');
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Failed to generate template',
      });
    }
  });

  /**
   * POST /api/ralph/refine-template/:id
   * Refine existing template based on feedback
   */
  fastify.post('/refine-template/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      feedback: z.string().min(10),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const { feedback } = parsed.data;

    try {
      const refinedTemplate = await ralphService.refineTemplate(id, feedback);
      return reply.send({ template: refinedTemplate });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to refine template');
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Failed to refine template',
      });
    }
  });

  /**
   * POST /api/ralph/chat
   * Chat with Ralph
   */
  fastify.post('/chat', async (request, reply) => {
    const schema = z.object({
      sessionId: z.string().optional(),
      message: z.string().min(1),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const { sessionId, message } = parsed.data;

    try {
      const response = await ralphService.chat(
        sessionId || `session-${Date.now()}`,
        message
      );
      return reply.send({ response });
    } catch (error) {
      fastify.log.error({ error }, 'Ralph chat failed');
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Chat failed',
      });
    }
  });

  /**
   * POST /api/ralph/save-template
   * Save generated template to database
   */
  fastify.post('/save-template', async (request, reply) => {
    const schema = z.object({
      vertical: z.string(),
      name: z.string(),
      description: z.string(),
      tagline: z.string().optional(),
      icon: z.string().optional(),
      tier: z.number().min(1).max(3),
      category: z.string(),
      required_fields: z.array(z.any()),
      conversation_flow: z.record(z.any()),
      example_prompts: z.array(z.string()).optional(),
      required_integrations: z.array(z.string()).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid template data',
        details: parsed.error.errors,
      });
    }

    const template = parsed.data;

    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .insert({
          ...template,
          is_published: false, // Requires review
          created_by: 'ralph',
          version: '1.0.0',
        })
        .select()
        .single();

      if (error) throw error;

      return reply.send({ template: data, message: 'Template saved successfully' });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to save template');
      return reply.code(500).send({
        error: error instanceof Error ? error.message : 'Failed to save template',
      });
    }
  });

  /**
   * GET /api/ralph/status
   * Check if Ralph is enabled
   */
  fastify.get('/status', async (request, reply) => {
    return reply.send({
      enabled: ralphService.isEnabled(),
      model: 'claude-3-5-sonnet-20241022',
      capabilities: ['template_generation', 'template_refinement', 'chat'],
    });
  });
};

export default ralphRoutes;
