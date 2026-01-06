import { FastifyInstance } from 'fastify';

export default async function conversationRoutes(fastify: FastifyInstance) {
    // List conversations
    fastify.get('/', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'List conversations - Coming soon' };
    });

    // Get conversation
    fastify.get('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Get conversation - Coming soon' };
    });

    // Get messages
    fastify.get('/:id/messages', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Get messages - Coming soon' };
    });

    // Send message
    fastify.post('/:id/messages', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Send message - Coming soon' };
    });
}
