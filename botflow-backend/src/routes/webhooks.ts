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

            if (eventType === 'message.created') {
                const message = payload.message;
                const contact = payload.contact;

                // Only process inbound messages
                if (message.direction !== 'received') {
                    return { status: 'ok', message: 'Outbound message, skipping' };
                }

                const customerPhone = contact.identifierValue;
                const messageContent = message.content?.text || '';
                const channelId = payload.channelId;

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
                await messageQueue.add('process-message', {
                    conversationId: conversation!.id,
                    messageId: savedMessage!.id,
                    customerPhone,
                    messageContent,
                    whatsappAccountId: whatsappAccount.id,
                });

                logger.info({ conversationId: conversation!.id }, 'Message queued for processing');
            }

            return { status: 'ok' };
        } catch (error) {
            logger.error({ error }, 'Webhook processing error');
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
