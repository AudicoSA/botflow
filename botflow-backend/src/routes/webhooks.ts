import { FastifyInstance } from 'fastify';
import { logger } from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { messageQueue } from '../queues/message.queue.js';
import { env } from '../config/env.js';
import { metaWhatsAppService, MetaWebhookPayload } from '../services/meta-whatsapp.service.js';

export default async function webhookRoutes(fastify: FastifyInstance) {
    // Bird WhatsApp webhook
    fastify.post('/bird/whatsapp', async (request, reply) => {
        try {
            const payload = request.body as any;
            logger.info({ payload }, 'Received Bird webhook');

            // Bird sends different event types
            const eventType = payload.type;

            if (eventType === 'message.created' || eventType === 'whatsapp.inbound') {
                let message, contact, customerPhone, messageContent, channelId;

                if (eventType === 'whatsapp.inbound') {
                    // Normalize 'whatsapp.inbound' payload structure
                    const data = payload.data || {};
                    message = {
                        id: data.id,
                        direction: 'received', // Inbound is always received
                        content: { text: data.content?.text || '' }
                    };
                    contact = {
                        identifierValue: data.from,
                        displayName: data.profileName || 'Unknown'
                    };
                    customerPhone = data.from;
                    messageContent = data.content?.text || '';
                    channelId = data.channelId;
                } else {
                    // Existing 'message.created' structure
                    message = payload.message;
                    contact = payload.contact;
                    customerPhone = contact.identifierValue;
                    messageContent = message.content?.text || '';
                    channelId = payload.channelId;
                }

                // Only process inbound messages (double check for message.created)
                if (message.direction !== 'received' && message.direction !== 'inbound') {
                    return { status: 'ok', message: 'Outbound message, skipping' };
                }

                // Get WhatsApp account by Bird channel ID
                const { data: whatsappAccount } = await supabaseAdmin
                    .from('whatsapp_accounts')
                    .select('*')
                    .eq('bird_channel_id', channelId)
                    .single();

                if (!whatsappAccount) {
                    logger.warn({ channelId }, 'No WhatsApp account found for channel');
                    return { status: 'ok', message: 'Unknown channel' };
                }

                // Find or create conversation
                let { data: conversation } = await supabaseAdmin
                    .from('conversations')
                    .select('*')
                    .eq('whatsapp_account_id', whatsappAccount.id)
                    .eq('customer_phone', customerPhone)
                    .eq('status', 'active')
                    .single();

                if (!conversation) {
                    // Create new conversation
                    const { data: newConversation } = await supabaseAdmin
                        .from('conversations')
                        .insert({
                            organization_id: whatsappAccount.organization_id,
                            whatsapp_account_id: whatsappAccount.id,
                            customer_phone: customerPhone,
                            customer_name: contact.displayName,
                            status: 'active',
                        })
                        .select()
                        .single();

                    conversation = newConversation;

                    // Assign to active bot (get first active bot for this account)
                    const { data: bot } = await supabaseAdmin
                        .from('bots')
                        .select('*')
                        .eq('whatsapp_account_id', whatsappAccount.id)
                        .eq('is_active', true)
                        .limit(1)
                        .single();

                    if (bot) {
                        await supabaseAdmin
                            .from('conversations')
                            .update({ bot_id: bot.id })
                            .eq('id', conversation!.id);
                    }
                }

                // Save incoming message
                const { data: savedMessage } = await supabaseAdmin
                    .from('messages')
                    .insert({
                        conversation_id: conversation!.id,
                        bird_message_id: message.id,
                        direction: 'inbound',
                        message_type: 'text',
                        content: messageContent,
                        status: 'delivered',
                    })
                    .select()
                    .single();

                // Queue message for AI processing
                try {
                    await messageQueue.add('process-message', {
                        conversationId: conversation!.id,
                        messageId: savedMessage!.id,
                        customerPhone,
                        messageContent,
                        whatsappAccountId: whatsappAccount.id,
                    });
                    logger.info({ conversationId: conversation!.id }, 'Message queued for processing');
                } catch (queueError) {
                    logger.warn({ error: queueError, conversationId: conversation!.id }, 'Failed to queue message (Redis likely down). Message saved but AI will not reply.');
                }
            }

            return { status: 'ok' };
        } catch (error) {
            logger.error({ error }, 'Webhook processing error');
            return reply.status(500).send({ error: 'Webhook processing failed' });
        }
    });

    // Twilio WhatsApp webhook
    fastify.post('/twilio/whatsapp', async (request, reply) => {
        try {
            // Twilio sends data as form-urlencoded (parsed by fastify-formbody)
            const body = request.body as any;
            logger.info({ body }, 'Received Twilio webhook');

            const messageSid = body.MessageSid;
            const from = body.From; // e.g. "whatsapp:+1234567890"
            const to = body.To;     // e.g. "whatsapp:+1987654321" (Our/Bot Number)
            const bodyText = body.Body;

            // Only process if it has a body (ignore status updates like 'delivered'/'read' for now)
            if (!bodyText) {
                return { status: 'ok', message: 'No body content, skipping' };
            }

            const customerPhone = from.replace('whatsapp:', '');
            // Our bot number (Twilio format includes 'whatsapp:' prefix usually)
            // But in DB we might store it with or without. Let's normalize to E.164 without prefix for search.
            const botPhoneNumber = to.replace('whatsapp:', '');

            // 1. Find WhatsApp Account
            // We search by the phone_number column we stored in integrations.ts
            // We search for exact match OR 'whatsapp:' + match
            const { data: whatsappAccount } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*')
                .or(`phone_number.eq.${to},phone_number.eq.${botPhoneNumber}`)
                .limit(1)
                .single();

            if (!whatsappAccount) {
                logger.warn({ to }, 'No WhatsApp account found for incoming Twilio number');
                return { status: 'ok', message: 'Unknown account' };
            }

            // 2. Find or Create Conversation
            let { data: conversation } = await supabaseAdmin
                .from('conversations')
                .select('*')
                .eq('whatsapp_account_id', whatsappAccount.id)
                .eq('customer_phone', customerPhone)
                .eq('status', 'active')
                .single();

            if (!conversation) {
                // Create new conversation
                const { data: newConversation } = await supabaseAdmin
                    .from('conversations')
                    .insert({
                        organization_id: whatsappAccount.organization_id,
                        whatsapp_account_id: whatsappAccount.id,
                        customer_phone: customerPhone,
                        customer_name: body.ProfileName || 'Unknown', // Twilio sometimes sends ProfileName
                        status: 'active',
                    })
                    .select()
                    .single();
                conversation = newConversation;

                // Assign Bot
                const { data: bot } = await supabaseAdmin
                    .from('bots')
                    .select('*')
                    .eq('whatsapp_account_id', whatsappAccount.id)
                    .eq('is_active', true)
                    .limit(1)
                    .single();

                if (bot) {
                    await supabaseAdmin.from('conversations').update({ bot_id: bot.id }).eq('id', conversation!.id);
                }
            }

            // 3. Save Message
            const { data: savedMessage } = await supabaseAdmin
                .from('messages')
                .insert({
                    conversation_id: conversation!.id,
                    bird_message_id: messageSid, // Reuse column or Rename later. Storing SID here.
                    direction: 'inbound',
                    message_type: 'text',
                    content: bodyText,
                    status: 'delivered',
                })
                .select()
                .single();

            // 4. Queue for AI
            try {
                await messageQueue.add('process-message', {
                    conversationId: conversation!.id,
                    messageId: savedMessage!.id,
                    customerPhone,
                    messageContent: bodyText,
                    whatsappAccountId: whatsappAccount.id,
                });
                logger.info({ conversationId: conversation!.id }, 'Twilio Message queued for processing');
            } catch (queueError) {
                logger.warn({ error: queueError }, 'Failed to queue Twilio message');
            }

            return reply.header('Content-Type', 'text/xml').send('<Response></Response>');

        } catch (error) {
            logger.error({ error }, 'Twilio webhook error');
            return reply.status(500).send({ error: 'Webhook processing failed' });
        }
    });
    // Stripe webhook
    fastify.post('/stripe', async (request, reply) => {
        try {
            logger.info('Received Stripe webhook');

            // TODO: Verify Stripe signature
            // TODO: Handle subscription events

            return { received: true };
        } catch (error) {
            logger.error({ error }, 'Stripe webhook error');
            return reply.status(400).send({ error: 'Webhook processing failed' });
        }
    });

    /**
     * GET /webhooks/meta/whatsapp - Webhook verification
     * Meta requires this endpoint to verify the webhook during setup
     */
    fastify.get('/meta/whatsapp', async (request, reply) => {
        const query = request.query as {
            'hub.mode'?: string;
            'hub.verify_token'?: string;
            'hub.challenge'?: string;
        };

        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];

        logger.info({ mode, token: token ? '***' : undefined }, 'Meta webhook verification request');

        // Check if mode and token are correct
        if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
            logger.info('Meta webhook verified successfully');
            return reply.status(200).send(challenge);
        }

        logger.warn({ mode, tokenProvided: !!token }, 'Meta webhook verification failed');
        return reply.status(403).send('Forbidden');
    });

    /**
     * POST /webhooks/meta/whatsapp - Receive messages from Meta
     * Handles incoming WhatsApp messages via Meta Cloud API
     */
    fastify.post('/meta/whatsapp', async (request, reply) => {
        try {
            const payload = request.body as MetaWebhookPayload;
            logger.info({ object: payload.object }, 'Received Meta webhook');

            // Verify webhook signature if app secret is configured
            if (env.META_APP_SECRET) {
                const signature = request.headers['x-hub-signature-256'] as string;
                const rawBody = JSON.stringify(request.body);

                if (!metaWhatsAppService.verifyWebhookSignature(signature, rawBody, env.META_APP_SECRET)) {
                    logger.warn('Invalid Meta webhook signature');
                    return reply.status(401).send({ error: 'Invalid signature' });
                }
            }

            // Parse the webhook payload
            const parsed = metaWhatsAppService.parseWebhookPayload(payload);

            if (!parsed || parsed.messages.length === 0) {
                // Might be a status update, acknowledge it
                return { status: 'ok', message: 'No messages to process' };
            }

            const { phoneNumberId, messages } = parsed;

            // Get WhatsApp account by phone_number_id
            const { data: whatsappAccount } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*')
                .eq('meta_phone_number_id', phoneNumberId)
                .eq('is_active', true)
                .single();

            if (!whatsappAccount) {
                logger.warn({ phoneNumberId }, 'No WhatsApp account found for phone number ID');
                return { status: 'ok', message: 'Unknown phone number' };
            }

            // Process each message
            for (const msg of messages) {
                const customerPhone = msg.from;
                const messageContent = msg.content;
                const contactName = msg.contactName || 'Unknown';

                // Skip non-text messages for now (could be extended later)
                if (msg.type !== 'text' && msg.type !== 'button' && msg.type !== 'interactive') {
                    logger.info({ messageType: msg.type }, 'Skipping non-text message');
                    continue;
                }

                // Find or create conversation
                let { data: conversation } = await supabaseAdmin
                    .from('conversations')
                    .select('*')
                    .eq('whatsapp_account_id', whatsappAccount.id)
                    .eq('customer_phone', customerPhone)
                    .eq('status', 'active')
                    .single();

                if (!conversation) {
                    // Create new conversation
                    const { data: newConversation } = await supabaseAdmin
                        .from('conversations')
                        .insert({
                            organization_id: whatsappAccount.organization_id,
                            whatsapp_account_id: whatsappAccount.id,
                            customer_phone: customerPhone,
                            customer_name: contactName,
                            status: 'active',
                        })
                        .select()
                        .single();

                    conversation = newConversation;

                    // Assign to active bot
                    const { data: bot } = await supabaseAdmin
                        .from('bots')
                        .select('*')
                        .eq('whatsapp_account_id', whatsappAccount.id)
                        .eq('is_active', true)
                        .limit(1)
                        .single();

                    if (bot) {
                        await supabaseAdmin
                            .from('conversations')
                            .update({ bot_id: bot.id })
                            .eq('id', conversation!.id);
                    }
                }

                // Save incoming message
                const { data: savedMessage } = await supabaseAdmin
                    .from('messages')
                    .insert({
                        conversation_id: conversation!.id,
                        bird_message_id: msg.messageId, // Reusing this column for Meta message ID
                        direction: 'inbound',
                        message_type: 'text',
                        content: messageContent,
                        status: 'delivered',
                        metadata: {
                            provider: 'meta',
                            original_type: msg.type,
                        },
                    })
                    .select()
                    .single();

                // Mark message as read (best effort)
                if (whatsappAccount.meta_access_token) {
                    metaWhatsAppService.markAsRead(
                        phoneNumberId,
                        whatsappAccount.meta_access_token,
                        msg.messageId
                    ).catch(err => logger.warn({ err }, 'Failed to mark message as read'));
                }

                // Queue message for AI processing
                try {
                    if (messageQueue) {
                        await messageQueue.add('process-message', {
                            conversationId: conversation!.id,
                            messageId: savedMessage!.id,
                            customerPhone,
                            messageContent,
                            whatsappAccountId: whatsappAccount.id,
                        });
                        logger.info({ conversationId: conversation!.id }, 'Meta message queued for processing');
                    } else {
                        logger.warn({ conversationId: conversation!.id }, 'Message queue not available (Redis down). Message saved but AI will not reply.');
                    }
                } catch (queueError) {
                    logger.warn({ error: queueError, conversationId: conversation!.id }, 'Failed to queue Meta message');
                }
            }

            return { status: 'ok' };
        } catch (error) {
            logger.error({ error }, 'Meta webhook processing error');
            return reply.status(500).send({ error: 'Webhook processing failed' });
        }
    });
}
