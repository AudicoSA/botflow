import { Queue, Worker, Job } from 'bullmq';
import redis from '../config/redis.js';
import { logger } from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { birdService } from '../services/bird.service.js';
import OpenAI from 'openai';
import { env } from '../config/env.js';

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

// Message processing queue - only if Redis is available
export const messageQueue = redis ? new Queue('message-processing', {
    connection: redis as any,
}) : null;

// Job data interface
interface MessageJob {
    conversationId: string;
    messageId: string;
    customerPhone: string;
    messageContent: string;
    whatsappAccountId: string;
}

// Process incoming messages - only if Redis is available
const messageWorker = redis ? new Worker<MessageJob>(
    'message-processing',
    async (job: Job<MessageJob>) => {
        const { conversationId, messageContent, customerPhone, whatsappAccountId } = job.data;

        try {
            logger.info({ conversationId, customerPhone }, 'Processing message');

            // 1. Get conversation and bot
            const { data: conversation } = await supabaseAdmin
                .from('conversations')
                .select('*, bots(*)')
                .eq('id', conversationId)
                .single();

            if (!conversation || !conversation.bots) {
                logger.warn({ conversationId }, 'No bot found for conversation');
                return;
            }

            const bot = conversation.bots;

            // 2. Get conversation context
            const { data: context } = await supabaseAdmin
                .from('conversation_context')
                .select('*')
                .eq('conversation_id', conversationId)
                .single();

            // 3. Build conversation history
            const { data: messages } = await supabaseAdmin
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .limit(10);

            const conversationHistory = messages?.map((msg): { role: 'user' | 'assistant'; content: string } => ({
                role: msg.direction === 'inbound' ? 'user' as const : 'assistant' as const,
                content: msg.content || '',
            })) || [];

            // 4. Generate AI response based on bot type
            let systemPrompt = '';

            switch (bot.task_type) {
                case 'booking':
                    systemPrompt = `You are a helpful booking assistant. Help customers book appointments or services. 
Ask for: date/time, number of people, pickup location (if applicable), and contact details.
Be friendly and concise. Confirm all details before finalizing.`;
                    break;

                case 'faq':
                    systemPrompt = `You are a helpful FAQ assistant. Answer customer questions based on the knowledge base.
Be concise and helpful. If you don't know the answer, offer to connect them with a human.`;
                    break;

                case 'order_tracking':
                    systemPrompt = `You are an order tracking assistant. Help customers track their orders.
Ask for their order number and provide status updates.`;
                    break;

                default:
                    systemPrompt = `You are a helpful customer service assistant. Help customers with their inquiries.`;
            }

            // 5. Call OpenAI
            const completion = await openai.chat.completions.create({
                model: bot.ai_model || 'gpt-4o',
                temperature: bot.ai_temperature || 0.7,
                messages: [
                    { role: 'system' as const, content: systemPrompt },
                    ...conversationHistory,
                    { role: 'user' as const, content: messageContent },
                ],
            });

            const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not process that.';

            // 6. Save AI response to database
            const { data: responseMessage } = await supabaseAdmin
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    direction: 'outbound',
                    message_type: 'text',
                    content: aiResponse,
                    sent_by: 'bot',
                })
                .select()
                .single();

            // 7. Send via Bird WhatsApp
            const { data: whatsappAccount } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*')
                .eq('id', whatsappAccountId)
                .single();

            if (whatsappAccount?.bird_channel_id) {
                const birdResponse = await birdService.sendMessage({
                    to: customerPhone,
                    content: { text: aiResponse },
                    channelId: whatsappAccount.bird_channel_id,
                });

                // Update message with Bird message ID
                await supabaseAdmin
                    .from('messages')
                    .update({ bird_message_id: birdResponse.id, status: 'sent' })
                    .eq('id', responseMessage.id);
            }

            // 8. Update conversation context
            await supabaseAdmin
                .from('conversation_context')
                .upsert({
                    conversation_id: conversationId,
                    context_data: {
                        ...context?.context_data,
                        last_message: messageContent,
                        last_response: aiResponse,
                        message_count: (context?.context_data?.message_count || 0) + 1,
                    },
                });

            logger.info({ conversationId }, 'Message processed successfully');
        } catch (error) {
            logger.error({ error, job: job.data }, 'Failed to process message');
            throw error;
        }
    },
    {
        connection: redis as any,
        concurrency: 5,
    }
) : null;

if (messageWorker) {
    messageWorker.on('completed', (job) => {
        logger.info({ jobId: job.id }, 'Message job completed');
    });

    messageWorker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, error: err }, 'Message job failed');
    });
}

export { messageWorker };
