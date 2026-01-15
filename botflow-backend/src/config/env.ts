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
    BIRD_API_KEY: z.string().optional(), // Now optional
    BIRD_WORKSPACE_ID: z.string().optional(), // Now optional
    BIRD_WEBHOOK_SECRET: z.string().optional(),

    // Twilio
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),

    // OpenAI
    OPENAI_API_KEY: z.string(),

    // Anthropic (for Ralph Template Assistant)
    ANTHROPIC_API_KEY: z.string().optional(),

    // Redis (optional - only needed for message queue)
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),

    // n8n
    N8N_API_URL: z.string().url().optional(),
    N8N_API_KEY: z.string().optional(),
    N8N_WEBHOOK_URL: z.string().url().optional(),
    N8N_WEBHOOK_SECRET: z.string().min(32).optional(), // For HMAC signature verification

    // Stripe (deprecated for SA - use Paystack)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Paystack (South Africa)
    PAYSTACK_SECRET_KEY: z.string().optional(),
    PAYSTACK_PUBLIC_KEY: z.string().optional(),
    PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

    // JWT
    JWT_SECRET: z.string(),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().optional(),

    // Frontend URL
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
