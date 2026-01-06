import { FastifyInstance } from 'fastify';

export default async function whatsappRoutes(fastify: FastifyInstance) {
    // Connect WhatsApp account
    fastify.post('/connect', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement Bird API integration
        return { message: 'Connect WhatsApp - Coming soon' };
    });

    // Get WhatsApp accounts
    fastify.get('/accounts', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement
        return { message: 'Get accounts - Coming soon' };
    });

    // Send message
    fastify.post('/send', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        // TODO: Implement Bird message sending
        return { message: 'Send message - Coming soon' };
    });
}
