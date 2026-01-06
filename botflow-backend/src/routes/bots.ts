import { FastifyInstance } from 'fastify';

export default async function botRoutes(fastify: FastifyInstance) {
    // List bots
    fastify.get('/', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'List bots - Coming soon' };
    });

    // Create bot
    fastify.post('/', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Create bot - Coming soon' };
    });

    // Get bot
    fastify.get('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Get bot - Coming soon' };
    });

    // Update bot
    fastify.patch('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Update bot - Coming soon' };
    });

    // Delete bot
    fastify.delete('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Delete bot - Coming soon' };
    });
}
