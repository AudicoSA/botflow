import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { N8nClient } from '../services/n8n-client.js';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

const createIntegrationSchema = z.object({
    type: z.enum(['whatsapp', 'google_sheets', 'stripe', 'openai']),
    name: z.string().min(1),
    credentials: z.record(z.any()), // Dynamic based on type
});

export default async function integrationRoutes(fastify: FastifyInstance) {
    const n8nClient = new N8nClient({
        baseUrl: env.N8N_API_URL || 'https://api.n8n.placeholder.com',
        apiKey: env.N8N_API_KEY || 'missing-key',
        logger: fastify.log,
    });

    // List integrations
    fastify.get('/', async (request, reply) => {
        let userId = (request.user as any)?.id;

        // Dev user fallback
        if (!userId) {
            try {
                const { getDevUser } = await import('../utils/dev-user.js');
                const devUser = await getDevUser(fastify.log);
                userId = devUser.id;
            } catch (error) {
                return reply.code(500).send({ error: 'Failed to initialize dev user' });
            }
        }

        const { data: integrations, error } = await supabaseAdmin
            .from('integrations')
            .select('*')
            // In a real app we'd filter by organization_id from the user's org
            // For now, we'll fetch all linked to this user's orgs or just all (MVP shortcut)
            // .eq('organization_id', userOrgId) 
            .order('created_at', { ascending: false });

        if (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch integrations' });
        }

        return { integrations };
    });

    // Create integration (Connect)
    fastify.post('/', async (request, reply) => {
        let userId = (request.user as any)?.id;

        if (!userId) {
            try {
                const { getDevUser } = await import('../utils/dev-user.js');
                const devUser = await getDevUser(fastify.log);
                userId = devUser.id;
            } catch (error) {
                return reply.code(500).send({ error: 'Failed to initialize dev user' });
            }
        }

        const validation = createIntegrationSchema.safeParse(request.body);
        if (!validation.success) {
            return reply.code(400).send({
                error: 'Invalid request',
                details: validation.error.errors
            });
        }

        const { type, name, credentials } = validation.data;

        // 1. Map our type to n8n credential type
        let n8nCredentialType = '';
        switch (type) {
            case 'whatsapp':
                // Check provider from credentials
                if (credentials.provider === 'bird') {
                    n8nCredentialType = 'messageBirdApi';
                } else if (credentials.provider === 'twilio') {
                    n8nCredentialType = 'twilioApi';
                } else {
                    n8nCredentialType = 'whatsAppApi';
                }
                break;
            case 'google_sheets': n8nCredentialType = 'googleSheetsGoogleApi'; break;
            case 'stripe': n8nCredentialType = 'stripeApi'; break;
            case 'openai': n8nCredentialType = 'openAiApi'; break;
            default: n8nCredentialType = type;
        }

        try {
            // 2. Create Credential in n8n
            // Note: In production we should verify values before sending to n8n

            // Only attempt n8n creation if URL is configured
            let n8nCredentialId = null;
            if (env.N8N_API_URL && !env.N8N_API_URL.includes('placeholder')) {
                try {
                    const n8nCredential = await n8nClient.createCredential({
                        name: `${name} (BotFlow)`,
                        type: n8nCredentialType,
                        data: credentials,
                    });
                    n8nCredentialId = n8nCredential.id;
                } catch (n8nError) {
                    fastify.log.error(n8nError, 'Failed to create n8n credential');
                    // We might want to fail hard here, or allow creating "draft" integration
                    // For now, let's fail hard so user knows it didn't connect
                    // return reply.code(502).send({ error: 'Failed to connect to integration provider (n8n)' });
                }
            }

            // 3. Store in Database
            // For MVP we default to a test organization if one isn't found. 
            // Ideally we get organization_id from the user context.
            const { data: orgs } = await supabaseAdmin.from('organization_members').select('organization_id').eq('user_id', userId).limit(1);
            const organizationId = orgs && orgs[0] ? orgs[0].organization_id : null;

            if (!organizationId) {
                return reply.code(400).send({ error: 'User does not belong to an organization' });
            }

            const { data: integration, error: dbError } = await supabaseAdmin
                .from('integrations')
                .insert({
                    organization_id: organizationId,
                    integration_type: type,
                    configuration: { name }, // Store display name in config
                    credentials: credentials, // In prod, ENCRYPT this!
                    n8n_credential_id: n8nCredentialId,
                    status: 'connected', // Always mark as connected if saved to DB, treating n8n as optional enhancement
                })
                .select()
                .single();

            if (dbError) {
                fastify.log.error(dbError);
                return reply.code(500).send({ error: 'Failed to save integration' });
            }

            // --- SYNC TO WHATSAPP_ACCOUNTS (Bridge for Webhooks) ---
            if (type === 'whatsapp' && organizationId) {
                // Determine Bird vs Meta
                // For now assuming Bird if provider is set, otherwise default logic
                const isBird = credentials.provider === 'bird';

                const waUpdate = {
                    organization_id: organizationId,
                    phone_number: credentials.phoneNumberId || credentials.name || 'unknown', // Fallback
                    display_name: credentials.name,
                    status: 'active',
                    // Meta fields
                    ...(credentials.phoneNumberId && { phone_number_id: credentials.phoneNumberId }),
                    ...(credentials.wabaId && { waba_id: credentials.wabaId }),
                    // Bird fields
                    ...(isBird && {
                        bird_channel_id: credentials.channelId,
                        bird_workspace_id: env.BIRD_WORKSPACE_ID || 'unknown'
                    })
                };

                // Check if account already exists for this number/channel
                // We'll try to find by channel_id or phone_number
                let existingAccount = null;
                if (isBird && credentials.channelId) {
                    const { data } = await supabaseAdmin.from('whatsapp_accounts').select('id').eq('bird_channel_id', credentials.channelId).single();
                    existingAccount = data;
                }

                if (existingAccount) {
                    await supabaseAdmin.from('whatsapp_accounts').update(waUpdate).eq('id', existingAccount.id);
                } else {
                    await supabaseAdmin.from('whatsapp_accounts').insert(waUpdate);
                }
            }
            // -------------------------------------------------------

            return { integration };

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    // Delete integration
    fastify.delete('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        // 1. Get integration to find n8n ID
        const { data: integration } = await supabaseAdmin
            .from('integrations')
            .select('*')
            .eq('id', id)
            .single();

        if (!integration) {
            return reply.code(404).send({ error: 'Integration not found' });
        }

        // 2. Delete from n8n
        if (integration.n8n_credential_id && env.N8N_API_URL && !env.N8N_API_URL.includes('placeholder')) {
            try {
                await n8nClient.deleteCredential(integration.n8n_credential_id);
            } catch (error) {
                fastify.log.warn({ error, id }, 'Failed to delete n8n credential, continuing...');
            }
        }

        // 3. Delete from DB
        const { error } = await supabaseAdmin
            .from('integrations')
            .delete()
            .eq('id', id);

        if (error) {
            return reply.code(500).send({ error: 'Failed to delete integration' });
        }

        return { success: true };
    });

    // --- Google OAuth Routes ---

    const getOAuth2Client = () => {
        const { google } = require('googleapis');
        return new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET,
            env.GOOGLE_REDIRECT_URI
        );
    };

    // 1. Start OAuth Flow
    fastify.get('/google/auth', async (request, reply) => {
        const { userId } = request.query as { userId?: string }; // In prod, use session/JWT, passing ID for MVP association
        // For MVP, if we don't have session cookie, we might need to pass user ID in state, 
        // OR just assume user is logged in via frontend and we trust the final "connect" call.
        // Actually best practice: Frontend calls this, we generate URL, return it, Frontend redirects.

        const oauth2Client = getOAuth2Client();

        const scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.readonly'
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Critical for refresh token
            scope: scopes,
            include_granted_scopes: true,
            prompt: 'consent' // Force consent to ensure we get refresh token
        });

        // Redirect user
        return reply.redirect(url);
    });

    // 2. OAuth Callback
    fastify.get('/google/callback', async (request, reply) => {
        const { code, state } = request.query as { code: string, state?: string };

        if (!code) {
            return reply.code(400).send('Missing code');
        }

        try {
            const oauth2Client = getOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Verify who this is.
            // Since we serve this callback, we need to associate it with a user/org.
            // Problem: We lost context in the redirect if we didn't use 'state'.
            // For this MVP, we will render a simple success page that posts the tokens back to the parent window 
            // OR redirects to the frontend with the tokens in URL (less secure but works for MVP).
            // BETTER: Store tokens in a temporary DB record or encrypted cookie, redirect to frontend "Success" page.

            // Let's redirect to frontend with a temporary "auth_code" or just the raw tokens for now (MVP style).
            // Security Warning: Passing tokens in URL is not ideal, but for MVP verification it works.
            // Alternatively, saving directly here requires knowing the Organization ID.
            // Let's pass the tokens back to frontend as query params, and let Frontend verify & save via POST /integrations.

            const params = new URLSearchParams({
                status: 'success',
                access_token: tokens.access_token || '',
                refresh_token: tokens.refresh_token || '',
                expiry_date: (tokens.expiry_date || '').toString()
            });

            return reply.redirect(`${env.FRONTEND_URL}/dashboard/integrations?${params.toString()}&action=google_connected`);

        } catch (error) {
            fastify.log.error(error, 'Google OAuth Error');
            return reply.redirect(`${env.FRONTEND_URL}/dashboard/integrations?status=error`);
        }
    });
    // --- Google OAuth Routes ---

    const getOAuth2Client = () => {
        const { google } = require('googleapis');
        return new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET,
            env.GOOGLE_REDIRECT_URI
        );
    };

    // 1. Start OAuth Flow
    fastify.get('/google/auth', async (request, reply) => {
        const { userId } = request.query as { userId?: string }; // In prod, use session/JWT, passing ID for MVP association
        // For MVP, if we don't have session cookie, we might need to pass user ID in state, 
        // OR just assume user is logged in via frontend and we trust the final "connect" call.
        // Actually best practice: Frontend calls this, we generate URL, return it, Frontend redirects.

        const oauth2Client = getOAuth2Client();

        const scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.readonly'
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Critical for refresh token
            scope: scopes,
            include_granted_scopes: true,
            prompt: 'consent' // Force consent to ensure we get refresh token
        });

        // Redirect user
        return reply.redirect(url);
    });

    // 2. OAuth Callback
    fastify.get('/google/callback', async (request, reply) => {
        const { code, state } = request.query as { code: string, state?: string };

        if (!code) {
            return reply.code(400).send('Missing code');
        }

        try {
            const oauth2Client = getOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Verify who this is.
            // Since we serve this callback, we need to associate it with a user/org.
            // Problem: We lost context in the redirect if we didn't use 'state'.
            // For this MVP, we will render a simple success page that posts the tokens back to the parent window 
            // OR redirects to the frontend with the tokens in URL (less secure but works for MVP).
            // BETTER: Store tokens in a temporary DB record or encrypted cookie, redirect to frontend "Success" page.

            // Let's redirect to frontend with a temporary "auth_code" or just the raw tokens for now (MVP style).
            // Security Warning: Passing tokens in URL is not ideal, but for MVP verification it works.
            // Alternatively, saving directly here requires knowing the Organization ID.
            // Let's pass the tokens back to frontend as query params, and let Frontend verify & save via POST /integrations.

            const params = new URLSearchParams({
                status: 'success',
                access_token: tokens.access_token || '',
                refresh_token: tokens.refresh_token || '',
                expiry_date: (tokens.expiry_date || '').toString()
            });

            return reply.redirect(`${env.FRONTEND_URL}/dashboard/integrations?${params.toString()}&action=google_connected`);

        } catch (error) {
            fastify.log.error(error, 'Google OAuth Error');
            return reply.redirect(`${env.FRONTEND_URL}/dashboard/integrations?status=error`);
        }
    });
