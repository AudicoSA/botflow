import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { google } from 'googleapis';
import { env } from '../config/env.js';

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

    // ===== Google OAuth Sign-In =====

    const getOAuth2Client = () => {
        if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth not configured');
        }

        return new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET,
            `${env.FRONTEND_URL}/auth/google/callback`
        );
    };

    // 1. Start Google Sign-In Flow
    fastify.get('/google', async (request, reply) => {
        try {
            const oauth2Client = getOAuth2Client();

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile',
                ],
                prompt: 'consent',
            });

            return reply.redirect(authUrl);
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Failed to initiate Google sign-in' });
        }
    });

    // 2. Google OAuth Callback
    fastify.get('/google/callback', async (request, reply) => {
        const { code } = request.query as { code?: string };

        if (!code) {
            return reply.code(400).send({ error: 'Missing authorization code' });
        }

        try {
            const oauth2Client = getOAuth2Client();

            // Exchange code for tokens
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Get user info from Google
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const { data: googleUser } = await oauth2.userinfo.get();

            if (!googleUser.email) {
                return reply.code(400).send({ error: 'Failed to get email from Google' });
            }

            // Check if user exists in Supabase
            const { data: existingUsers } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', googleUser.email)
                .limit(1);

            let userId: string;
            let organizationId: string | undefined;
            let isNewUser = false;

            if (existingUsers && existingUsers.length > 0) {
                // User exists - get their organization
                userId = existingUsers[0].id;

                const { data: memberData } = await supabaseAdmin
                    .from('organization_members')
                    .select('organization_id')
                    .eq('user_id', userId)
                    .single();

                organizationId = memberData?.organization_id;
            } else {
                // New user - create account
                isNewUser = true;

                // Create user in Supabase Auth (with Google provider)
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: googleUser.email,
                    email_confirm: true,
                    user_metadata: {
                        full_name: googleUser.name || googleUser.email.split('@')[0],
                        avatar_url: googleUser.picture,
                        provider: 'google',
                    },
                });

                if (authError || !authData.user) {
                    fastify.log.error({ error: authError }, 'Failed to create user from Google sign-in');
                    return reply.code(500).send({ error: 'Failed to create account' });
                }

                userId = authData.user.id;

                // Create organization
                const orgName = googleUser.name || googleUser.email.split('@')[0];
                const { data: orgData, error: orgError } = await supabaseAdmin
                    .from('organizations')
                    .insert({
                        name: `${orgName}'s Organization`,
                        slug: `${orgName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                        plan: 'starter',
                    })
                    .select()
                    .single();

                if (orgError || !orgData) {
                    fastify.log.error({ error: orgError }, 'Failed to create organization');
                    return reply.code(500).send({ error: 'Failed to create organization' });
                }

                organizationId = orgData.id;

                // Add user as organization owner
                await supabaseAdmin.from('organization_members').insert({
                    organization_id: orgData.id,
                    user_id: userId,
                    role: 'owner',
                });
            }

            // Generate JWT
            const token = fastify.jwt.sign({
                userId,
                email: googleUser.email,
                organizationId,
            });

            // Get organization details
            const { data: orgData } = await supabaseAdmin
                .from('organizations')
                .select('*')
                .eq('id', organizationId)
                .single();

            // Get WhatsApp account if exists
            let whatsappAccount = null;
            if (organizationId) {
                const { data: waData } = await supabaseAdmin
                    .from('whatsapp_accounts')
                    .select('*')
                    .eq('organization_id', organizationId)
                    .eq('status', 'active')
                    .limit(1);

                if (waData && waData.length > 0) {
                    whatsappAccount = waData[0];
                }
            }

            // Redirect to frontend with token
            const redirectUrl = new URL('/auth/google/success', env.FRONTEND_URL);
            redirectUrl.searchParams.set('token', token);
            redirectUrl.searchParams.set('email', googleUser.email);
            redirectUrl.searchParams.set('name', googleUser.name || '');
            redirectUrl.searchParams.set('isNewUser', isNewUser.toString());

            if (organizationId) {
                redirectUrl.searchParams.set('organizationId', organizationId);
            }
            if (whatsappAccount) {
                redirectUrl.searchParams.set('whatsappAccountId', whatsappAccount.id);
            }

            return reply.redirect(redirectUrl.toString());
        } catch (error: any) {
            fastify.log.error(error);
            const errorUrl = new URL('/auth/google/error', env.FRONTEND_URL);
            errorUrl.searchParams.set('error', error.message || 'Authentication failed');
            return reply.redirect(errorUrl.toString());
        }
    });
}
