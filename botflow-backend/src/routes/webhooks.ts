import { FastifyInstance } from 'fastify';
import { logger } from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { messageQueue } from '../queues/message.queue.js';

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
}
