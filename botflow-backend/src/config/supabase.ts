import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

// Client for user-level operations (uses anon key + RLS)
export const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: false,
        },
    }
);

// Admin client for service-level operations (bypasses RLS)
export const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

logger.info('✅ Supabase clients initialized');
