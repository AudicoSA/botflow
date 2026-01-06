import { FastifyInstance } from 'fastify';

export default async function organizationRoutes(fastify: FastifyInstance) {
    // Get current organization
    fastify.get('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Get organization - Coming soon' };
    });

    // Update organization
    fastify.patch('/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Update organization - Coming soon' };
    });
}
