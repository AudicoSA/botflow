/**
 * Debug endpoint to check environment configuration
 * REMOVE IN PRODUCTION!
 */

import { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';

const debugRoutes: FastifyPluginAsync = async (fastify) => {
    // Debug: Check Supabase connection and config
    fastify.get('/debug/supabase', async (request, reply) => {
        try {
            // Get partial URL to verify which Supabase instance we're connected to
            const supabaseUrl = env.SUPABASE_URL;
            const urlParts = supabaseUrl.split('.');
            const projectRef = urlParts[0].split('//')[1]; // Extract project reference

            // Test database connection by counting users
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
            const userCount = userData?.users?.length || 0;

            // Test database query
            const { data: orgData, count: orgCount, error: orgError } = await supabaseAdmin
                .from('organizations')
                .select('*', { count: 'exact', head: true });

            // Test whatsapp_accounts table
            const { count: waCount, error: waError } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*', { count: 'exact', head: true });

            return {
                supabase: {
                    projectRef: projectRef,
                    url: supabaseUrl,
                    connected: !userError && !orgError,
                },
                counts: {
                    users: userError ? `Error: ${userError.message}` : userCount,
                    organizations: orgError ? `Error: ${orgError.message}` : orgCount,
                    whatsapp_accounts: waError ? `Error: ${waError.message}` : waCount,
                },
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return reply.status(500).send({
                error: 'Debug check failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Debug: Test login flow for specific user
    fastify.get('/debug/user/:email', async (request, reply) => {
        const { email } = request.params as { email: string };

        try {
            // Find user
            const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
            const user = userData.users.find((u: any) => u.email === email);

            if (!user) {
                return reply.status(404).send({ error: 'User not found', email });
            }

            // Get organization membership
            const { data: memberData } = await supabaseAdmin
                .from('organization_members')
                .select('organization_id, role, organizations(id, name)')
                .eq('user_id', user.id);

            const member = memberData?.[0];

            if (!member) {
                return {
                    user: { id: user.id, email: user.email },
                    organization: null,
                    whatsappAccount: null,
                    issue: 'No organization membership found',
                };
            }

            // Get WhatsApp account
            const { data: waData } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*')
                .eq('organization_id', member.organization_id)
                .eq('status', 'active')
                .limit(1);

            return {
                user: {
                    id: user.id,
                    email: user.email,
                },
                organization: {
                    id: member.organization_id,
                    name: (member.organizations as any)?.name,
                },
                whatsappAccount: waData?.[0] || null,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return reply.status(500).send({
                error: 'Debug user check failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
};

export default debugRoutes;
