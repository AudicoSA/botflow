import { FastifyBaseLogger } from 'fastify';
import { supabaseAdmin } from '../config/supabase.js';

const DEV_USER_EMAIL = 'dev@botflow.app';
const DEV_USER_PASSWORD = 'dev-password-123';

export async function getDevUser(logger: FastifyBaseLogger) {
    try {
        // Check if dev user exists
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            logger.error({ error: listError }, 'Failed to list users');
            throw listError;
        }

        const existingUser = users.find(u => u.email === DEV_USER_EMAIL);

        if (existingUser) {
            logger.info({ userId: existingUser.id }, 'Found existing dev user');
            return existingUser;
        }

        // Create dev user if not exists
        logger.info('Creating new dev user');
        const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: DEV_USER_EMAIL,
            password: DEV_USER_PASSWORD,
            email_confirm: true,
            user_metadata: {
                name: 'Dev User'
            }
        });

        if (createError || !user) {
            logger.error({ error: createError }, 'Failed to create dev user');
            throw createError || new Error('User creation returned no data');
        }

        logger.info({ userId: user.id }, 'Created dev user');
        return user;
    } catch (error) {
        logger.error({ error }, 'Error in getDevUser');
        throw error;
    }
}
