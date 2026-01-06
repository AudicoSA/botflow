// Type declarations for Fastify extensions
import 'fastify';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: any, reply: any) => Promise<void>;
    }

    interface FastifyRequest {
        user?: {
            userId: string;
            [key: string]: any;
        };
    }
}
