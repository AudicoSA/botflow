import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { metaWhatsAppService } from '../services/meta-whatsapp.service.js';

// Validation schemas
const connectMetaSchema = z.object({
    accessToken: z.string().min(1, 'Access token is required'),
    phoneNumberId: z.string().min(1, 'Phone number ID is required'),
    wabaId: z.string().min(1, 'WABA ID is required'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    displayName: z.string().optional(),
    businessId: z.string().optional(),
});

const sendMessageSchema = z.object({
    accountId: z.string().uuid('Invalid account ID'),
    to: z.string().min(1, 'Recipient phone number is required'),
    message: z.string().min(1, 'Message content is required'),
});

export default async function whatsappRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/whatsapp/accounts
     * List connected WhatsApp accounts for the organization
     */
    fastify.get('/accounts', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const user = request.user as any;
            const userId = user.userId || user.id; // Support both JWT formats

            // Get user's organization
            const { data: member } = await supabaseAdmin
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', userId)
                .single();

            if (!member) {
                logger.warn({ userId }, 'No organization found for user');
                return reply.status(403).send({ error: 'No organization found' });
            }

            // Get WhatsApp accounts for the organization
            const { data: accounts, error } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('id, phone_number, display_name, provider, is_active, created_at, meta_waba_id')
                .eq('organization_id', member.organization_id)
                .order('created_at', { ascending: false });

            if (error) {
                logger.error({ error }, 'Failed to fetch WhatsApp accounts');
                return reply.status(500).send({ error: 'Failed to fetch accounts' });
            }

            return { accounts: accounts || [] };
        } catch (error) {
            logger.error({ error }, 'Error in GET /accounts');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    /**
     * GET /api/whatsapp/accounts/:id
     * Get a specific WhatsApp account
     */
    fastify.get('/accounts/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const user = request.user as any;
            const userId = user.userId || user.id;

            // Get user's organization
            const { data: member } = await supabaseAdmin
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', userId)
                .single();

            if (!member) {
                return reply.status(403).send({ error: 'No organization found' });
            }

            // Get the specific account
            const { data: account, error } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('id, phone_number, display_name, provider, is_active, created_at, meta_waba_id, meta_phone_number_id')
                .eq('id', id)
                .eq('organization_id', member.organization_id)
                .single();

            if (error || !account) {
                return reply.status(404).send({ error: 'Account not found' });
            }

            return { account };
        } catch (error) {
            logger.error({ error }, 'Error in GET /accounts/:id');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    /**
     * POST /api/whatsapp/connect
     * Save WhatsApp credentials after Meta Embedded Signup
     */
    fastify.post('/connect', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const user = request.user as any;
            const userId = user.userId || user.id;
            const body = connectMetaSchema.parse(request.body);

            // Get user's organization
            const { data: member } = await supabaseAdmin
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', userId)
                .single();

            if (!member) {
                return reply.status(403).send({ error: 'No organization found' });
            }

            // Check if this phone number is already connected
            const { data: existing } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('id')
                .eq('meta_phone_number_id', body.phoneNumberId)
                .single();

            if (existing) {
                return reply.status(400).send({
                    error: 'This WhatsApp number is already connected to an account',
                });
            }

            // Verify the access token works by getting business profile
            try {
                await metaWhatsAppService.getBusinessProfile(body.phoneNumberId, body.accessToken);
            } catch (verifyError) {
                logger.error({ verifyError }, 'Failed to verify Meta credentials');
                return reply.status(400).send({
                    error: 'Failed to verify WhatsApp credentials. Please try connecting again.',
                });
            }

            // Create the WhatsApp account record
            const { data: account, error } = await supabaseAdmin
                .from('whatsapp_accounts')
                .insert({
                    organization_id: member.organization_id,
                    phone_number: body.phoneNumber,
                    display_name: body.displayName || body.phoneNumber,
                    provider: 'meta',
                    meta_phone_number_id: body.phoneNumberId,
                    meta_waba_id: body.wabaId,
                    meta_access_token: body.accessToken, // TODO: Encrypt this
                    meta_business_id: body.businessId,
                    is_active: true,
                })
                .select('id, phone_number, display_name, provider, is_active, created_at')
                .single();

            if (error) {
                logger.error({ error }, 'Failed to save WhatsApp account');
                return reply.status(500).send({ error: 'Failed to save WhatsApp connection' });
            }

            logger.info({
                accountId: account.id,
                organizationId: member.organization_id,
                phoneNumber: body.phoneNumber,
            }, 'WhatsApp account connected via Meta Embedded Signup');

            return {
                success: true,
                message: 'WhatsApp connected successfully',
                account,
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    error: 'Validation error',
                    details: error.errors,
                });
            }
            logger.error({ error }, 'Error in POST /connect');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    /**
     * DELETE /api/whatsapp/accounts/:id
     * Disconnect a WhatsApp account
     */
    fastify.delete('/accounts/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const user = request.user as any;
            const userId = user.userId || user.id;

            // Get user's organization
            const { data: member } = await supabaseAdmin
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', userId)
                .single();

            if (!member) {
                return reply.status(403).send({ error: 'No organization found' });
            }

            // Verify the account belongs to this organization
            const { data: account } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('id')
                .eq('id', id)
                .eq('organization_id', member.organization_id)
                .single();

            if (!account) {
                return reply.status(404).send({ error: 'Account not found' });
            }

            // Check if there are active bots using this account
            const { data: bots } = await supabaseAdmin
                .from('bots')
                .select('id, name')
                .eq('whatsapp_account_id', id)
                .eq('is_active', true);

            if (bots && bots.length > 0) {
                return reply.status(400).send({
                    error: 'Cannot disconnect: This account is being used by active bots',
                    bots: bots.map(b => ({ id: b.id, name: b.name })),
                });
            }

            // Soft delete - set is_active to false and clear sensitive data
            const { error } = await supabaseAdmin
                .from('whatsapp_accounts')
                .update({
                    is_active: false,
                    meta_access_token: null,
                    deleted_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) {
                logger.error({ error }, 'Failed to disconnect WhatsApp account');
                return reply.status(500).send({ error: 'Failed to disconnect account' });
            }

            logger.info({ accountId: id }, 'WhatsApp account disconnected');

            return {
                success: true,
                message: 'WhatsApp account disconnected successfully',
            };
        } catch (error) {
            logger.error({ error }, 'Error in DELETE /accounts/:id');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    /**
     * GET /api/whatsapp/embedded-signup-url
     * Return the Embedded Signup configuration
     */
    fastify.get('/embedded-signup-url', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            if (!env.META_APP_ID) {
                return reply.status(503).send({
                    error: 'WhatsApp Embedded Signup is not configured',
                    message: 'Please contact support to enable WhatsApp connection',
                });
            }

            const user = request.user as any;
            const userId = user.userId || user.id;

            // Generate a state token for security (CSRF protection)
            const stateToken = Buffer.from(JSON.stringify({
                userId: userId,
                timestamp: Date.now(),
                random: Math.random().toString(36).substring(2),
            })).toString('base64');

            return {
                appId: env.META_APP_ID,
                configId: '', // Set this in Meta Developer Console
                stateToken,
                // Instructions for the frontend
                instructions: {
                    step1: 'Load the Meta SDK',
                    step2: 'Call FB.login() with whatsapp_business_messaging scope',
                    step3: 'On success, POST the credentials to /api/whatsapp/connect',
                },
            };
        } catch (error) {
            logger.error({ error }, 'Error in GET /embedded-signup-url');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    /**
     * POST /api/whatsapp/send
     * Send a WhatsApp message (for manual replies)
     */
    fastify.post('/send', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const user = request.user as any;
            const userId = user.userId || user.id;
            const body = sendMessageSchema.parse(request.body);

            // Get user's organization
            const { data: member } = await supabaseAdmin
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', userId)
                .single();

            if (!member) {
                return reply.status(403).send({ error: 'No organization found' });
            }

            // Get the WhatsApp account
            const { data: account } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*')
                .eq('id', body.accountId)
                .eq('organization_id', member.organization_id)
                .eq('is_active', true)
                .single();

            if (!account) {
                return reply.status(404).send({ error: 'WhatsApp account not found' });
            }

            // Send based on provider
            let result;
            if (account.provider === 'meta' && account.meta_phone_number_id && account.meta_access_token) {
                result = await metaWhatsAppService.sendMessage({
                    phoneNumberId: account.meta_phone_number_id,
                    accessToken: account.meta_access_token,
                    to: body.to,
                    message: body.message,
                });
            } else {
                return reply.status(400).send({
                    error: 'This WhatsApp account is not properly configured for sending messages',
                });
            }

            return {
                success: true,
                messageId: result.messages?.[0]?.id,
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    error: 'Validation error',
                    details: error.errors,
                });
            }
            logger.error({ error }, 'Error in POST /send');
            return reply.status(500).send({ error: 'Failed to send message' });
        }
    });

    /**
     * POST /api/whatsapp/test-connection
     * Test if a WhatsApp account is properly connected
     */
    fastify.post('/test-connection/:id', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const user = request.user as any;
            const userId = user.userId || user.id;

            // Get user's organization
            const { data: member } = await supabaseAdmin
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', userId)
                .single();

            if (!member) {
                return reply.status(403).send({ error: 'No organization found' });
            }

            // Get the WhatsApp account
            const { data: account } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*')
                .eq('id', id)
                .eq('organization_id', member.organization_id)
                .single();

            if (!account) {
                return reply.status(404).send({ error: 'Account not found' });
            }

            if (account.provider === 'meta' && account.meta_phone_number_id && account.meta_access_token) {
                try {
                    const profile = await metaWhatsAppService.getBusinessProfile(
                        account.meta_phone_number_id,
                        account.meta_access_token
                    );

                    return {
                        success: true,
                        status: 'connected',
                        profile,
                    };
                } catch (error) {
                    return {
                        success: false,
                        status: 'disconnected',
                        error: 'Failed to verify connection. The access token may have expired.',
                    };
                }
            }

            return {
                success: false,
                status: 'unknown',
                error: 'Unsupported provider or missing credentials',
            };
        } catch (error) {
            logger.error({ error }, 'Error in POST /test-connection');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
}
