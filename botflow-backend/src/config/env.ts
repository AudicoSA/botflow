import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001'),
    HOST: z.string().default('0.0.0.0'),

    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),

    // Bird
    BIRD_API_KEY: z.string(),
    BIRD_WORKSPACE_ID: z.string(),
    BIRD_WEBHOOK_SECRET: z.string().optional(),

    // OpenAI
    OPENAI_API_KEY: z.string(),

    // Redis (optional - only needed for message queue)
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),

    // n8n
    N8N_API_URL: z.string().url(),
    N8N_API_KEY: z.string(),
    N8N_WEBHOOK_URL: z.string().url(),

    // Stripe
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),

    // JWT
    JWT_SECRET: z.string(),

    // Frontend
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),

    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Invalid environment variables:');
            error.errors.forEach((err) => {
                console.error(`  ${err.path.join('.')}: ${err.message}`);
            });
            process.exit(1);
        }
        throw error;
    }
}

export const env = validateEnv();
