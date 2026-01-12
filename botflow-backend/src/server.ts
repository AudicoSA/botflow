import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import formbody from '@fastify/formbody';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

// Import routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import whatsappRoutes from './routes/whatsapp.js';
import botRoutes from './routes/bots.js';
import conversationRoutes from './routes/conversations.js';
import webhookRoutes from './routes/webhooks.js';
import templateRoutes from './routes/templates.js';

const fastify = Fastify({
    logger: logger,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
});

// Register plugins
await fastify.register(cors, {
    origin: (origin, cb) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return cb(null, true);

        // Allow localhost on any port for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return cb(null, true);
        }

        // Allow Vercel frontend (both old and new deployments)
        if (origin === 'https://botflow-two.vercel.app' ||
            origin.includes('botflow-two.vercel.app') ||
            origin === 'https://botflow-r9q3.vercel.app' ||
            origin.includes('botflow-r9q3.vercel.app') ||
            origin.includes('.vercel.app')) {
            return cb(null, true);
        }

        // Allow configured frontend URL
        if (origin === env.FRONTEND_URL) {
            return cb(null, true);
        }

        // Reject other origins
        cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await fastify.register(jwt, {
    secret: env.JWT_SECRET,
});

await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
});

await fastify.register(formbody);

await fastify.register(websocket);

// Register authentication decorator
fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ error, request: request.url }, 'Request error');

    if (error.validation) {
        return reply.status(400).send({
            error: 'Validation Error',
            message: error.message,
            details: error.validation,
        });
    }

    if (error.statusCode === 401) {
        return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid or missing authentication token',
        });
    }

    return reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: env.NODE_ENV === 'development' ? error.message : 'An error occurred',
    });
});

import knowledgeRoutes from './routes/knowledge.js';
import integrationRoutes from './routes/integrations.js';
import { propertiesRoutes } from './routes/properties.js';
import { schedulerService } from './services/scheduler.service.js';
import calendarRoutes from './routes/calendar.js';
import paymentRoutes from './routes/payments.js';
import marketplaceRoutes from './routes/marketplace.js';
import ralphRoutes from './routes/ralph.js';

// Register routes
await fastify.register(healthRoutes, { prefix: '/health' });
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(organizationRoutes, { prefix: '/api/organizations' });
await fastify.register(whatsappRoutes, { prefix: '/api/whatsapp' });
await fastify.register(botRoutes, { prefix: '/api/bots' });
await fastify.register(templateRoutes, { prefix: '/api/templates' });
await fastify.register(knowledgeRoutes, { prefix: '/api' }); // prefixes: /api/bots/:id/knowledge
await fastify.register(integrationRoutes, { prefix: '/api/integrations' });
await fastify.register(calendarRoutes, { prefix: '/api/calendar' });
await fastify.register(paymentRoutes, { prefix: '/api/payments' });
await fastify.register(marketplaceRoutes, { prefix: '/api/marketplace' });
await fastify.register(propertiesRoutes, { prefix: '/api' });
await fastify.register(conversationRoutes, { prefix: '/api/conversations' });
await fastify.register(webhookRoutes, { prefix: '/webhooks' });
await fastify.register(ralphRoutes, { prefix: '/api/ralph' });

// Start server
const start = async () => {
    try {
        await fastify.listen({
            port: parseInt(env.PORT),
            host: env.HOST,
        });

        fastify.log.info(`🚀 Server running on http://${env.HOST}:${env.PORT}`);
        fastify.log.info(`📝 Environment: ${env.NODE_ENV}`);

        // Start scheduled tasks (property calendar sync)
        schedulerService.start();
        fastify.log.info(`⏰ Scheduler started`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
    process.on(signal, async () => {
        fastify.log.info(`Received ${signal}, closing server...`);
        schedulerService.stop();
        await fastify.close();
        process.exit(0);
    });
});
