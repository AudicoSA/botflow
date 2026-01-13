import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    organizationName: z.string().min(2),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export default async function authRoutes(fastify: FastifyInstance) {
    // Sign up
    fastify.post('/signup', async (request, reply) => {
        const body = signupSchema.parse(request.body);

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: body.email,
            password: body.password,
            options: {
                data: {
                    full_name: body.fullName,
                },
            },
        });

        if (authError) {
            reply.status(400);
            return { error: authError.message };
        }

        if (!authData.user) {
            reply.status(400);
            return { error: 'Failed to create user' };
        }

        // Create organization
        const { data: orgData, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: body.organizationName,
                slug: body.organizationName.toLowerCase().replace(/\s+/g, '-'),
                plan: 'starter',
            })
            .select()
            .single();

        if (orgError) {
            fastify.log.error({ error: orgError }, 'Failed to create organization');
            reply.status(500);
            return { error: 'Failed to create organization' };
        }

        // Add user as organization owner
        await supabaseAdmin.from('organization_members').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'owner',
        });

        // Generate JWT
        const token = fastify.jwt.sign({
            userId: authData.user.id,
            email: authData.user.email,
            organizationId: orgData.id,
        });

        return {
            user: {
                id: authData.user.id,
                email: authData.user.email,
                fullName: body.fullName,
            },
            organization: orgData,
            token,
        };
    });

    // Login
    fastify.post('/login', async (request, reply) => {
        const body = loginSchema.parse(request.body);

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: body.email,
            password: body.password,
        });

        if (authError || !authData.user) {
            reply.status(401);
            return { error: 'Invalid credentials' };
        }

        // Get user's organization (use admin client to bypass RLS)
        const { data: memberData } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id, organizations(*)')
            .eq('user_id', authData.user.id)
            .single();

        // Get organization's WhatsApp account (if exists)
        let whatsappAccount = null;
        if (memberData?.organization_id) {
            const { data: waData, error: waError } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*')
                .eq('organization_id', memberData.organization_id)
                .eq('status', 'active')
                .limit(1);

            // Take first result if exists (don't use .single() as it errors if not found)
            if (waData && waData.length > 0) {
                whatsappAccount = waData[0];
            }
        }

        const token = fastify.jwt.sign({
            userId: authData.user.id,
            email: authData.user.email,
            organizationId: memberData?.organization_id,
        });

        return {
            user: {
                id: authData.user.id,
                email: authData.user.email,
                fullName: authData.user.user_metadata.full_name,
            },
            organization: memberData?.organizations,
            whatsappAccount: whatsappAccount,
            token,
        };
    });

    // Get current user
    fastify.get('/me', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const decoded: any = await request.jwtVerify();

        const { data: userData } = await supabase.auth.getUser(decoded.userId);

        return {
            user: userData.user,
        };
    });
}
