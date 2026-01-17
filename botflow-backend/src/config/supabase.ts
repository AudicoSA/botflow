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
        db: {
            schema: 'public'
        },
        // Connection pooling configuration for production performance
        global: {
            headers: {
                'x-client-info': 'botflow-backend/1.0.0'
            }
        }
    }
);

// Admin client for service-level operations (bypasses RLS)
// Optimized with connection pooling for production workloads
export const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        db: {
            schema: 'public'
        },
        // Production-optimized configuration
        global: {
            headers: {
                'x-client-info': 'botflow-backend-admin/1.0.0',
                'x-connection-pool': 'true'
            }
        }
    }
);

// Separate client for real-time subscriptions (uses anon key)
// Real-time requires separate connection to avoid blocking main queries
export const supabaseRealtime = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        },
        auth: {
            autoRefreshToken: true,
            persistSession: false
        }
    }
);

logger.info('✅ Supabase clients initialized with connection pooling');
