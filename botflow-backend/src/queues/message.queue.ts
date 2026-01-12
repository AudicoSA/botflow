import { Queue, Worker, Job } from 'bullmq';
import redis from '../config/redis.js';
import { logger } from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { birdService } from '../services/bird.service.js';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { loadTemplateConfig } from '../services/template-config.service.js';
import { buildMessagesArray, matchIntent, enhancePromptWithIntent, validateMessagesArray } from '../services/prompt-builder.service.js';

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
        const startTime = Date.now();

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

            // 2. Load template configuration (NEW - Week 3)
            const templateConfig = await loadTemplateConfig(bot.id);

            // If no template config, fall back to generic AI
            if (!templateConfig) {
                logger.warn({ botId: bot.id, bot_type: bot.bot_type }, 'No template config, using generic AI');
                return await processGenericAI(job, bot, conversation, messageContent, customerPhone, whatsappAccountId);
            }

            // 3. Get conversation context
            const { data: context } = await supabaseAdmin
                .from('conversation_context')
                .select('*')
                .eq('conversation_id', conversationId)
                .single();

            // 4. Build conversation history
            const { data: messages } = await supabaseAdmin
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .limit(10);

            // Format messages for OpenAI
            const conversationHistory = messages?.map((msg) => ({
                role: msg.direction === 'inbound' ? 'user' : 'assistant',
                content: msg.content || '',
                created_at: msg.created_at
            })) || [];

            // 5. Match customer intent (NEW - Week 3)
            const matchedIntent = matchIntent(messageContent, templateConfig);

            if (matchedIntent) {
                logger.info({
                    conversationId,
                    botId: bot.id,
                    intent: matchedIntent.name
                }, 'Intent matched for message');
            }

            // 6. Build OpenAI messages array (NEW - Week 3)
            const messagesArray = buildMessagesArray(
                templateConfig,
                conversationHistory,
                messageContent
            );

            // 7. Enhance with matched intent (NEW - Week 3)
            if (matchedIntent) {
                messagesArray[0].content = enhancePromptWithIntent(
                    messagesArray[0].content,
                    matchedIntent
                );
            }

            // 8. Validate messages array
            if (!validateMessagesArray(messagesArray)) {
                throw new Error('Invalid messages array structure');
            }

            // 9. Call OpenAI
            logger.debug({
                conversationId,
                botId: bot.id,
                messageCount: messagesArray.length,
                intentMatched: !!matchedIntent
            }, 'Calling OpenAI');

            const completion = await openai.chat.completions.create({
                model: bot.ai_model || 'gpt-4o',
                temperature: bot.ai_temperature || 0.7,
                messages: messagesArray,
            });

            const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not process that.';

            // 10. Check handoff conditions (NEW - Week 3)
            const needsHandoff = checkHandoffConditions(
                aiResponse,
                messageContent,
                templateConfig
            );

            if (needsHandoff) {
                logger.warn({
                    conversationId,
                    botId: bot.id
                }, 'Handoff condition detected');
            }

            // 11. Save AI response to database
            const { data: responseMessage } = await supabaseAdmin
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    direction: 'outbound',
                    message_type: 'text',
                    content: aiResponse,
                    sent_by: 'bot',
                    metadata: {
                        intent: matchedIntent?.name,
                        needs_handoff: needsHandoff,
                        processing_time_ms: Date.now() - startTime
                    }
                })
                .select()
                .single();

            // 12. Send via Bird WhatsApp
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

            // 13. Handle handoff if needed (NEW - Week 3)
            if (needsHandoff) {
                await notifyHumanAgent(conversationId, customerPhone, conversation);
            }

            // 14. Update conversation context
            await supabaseAdmin
                .from('conversation_context')
                .upsert({
                    conversation_id: conversationId,
                    context_data: {
                        ...context?.context_data,
                        last_message: messageContent,
                        last_response: aiResponse,
                        message_count: (context?.context_data?.message_count || 0) + 1,
                        last_intent: matchedIntent?.name,
                        handoff_requested: needsHandoff
                    },
                });

            const processingTime = Date.now() - startTime;
            logger.info({
                conversationId,
                botId: bot.id,
                processingTime,
                intent: matchedIntent?.name,
                needsHandoff
            }, 'Message processed successfully');

            return {
                success: true,
                botResponse: aiResponse,
                intent: matchedIntent?.name,
                needsHandoff,
                processingTime
            };

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

/**
 * Check if conversation needs human handoff
 *
 * Uses template handoff conditions to determine if human intervention is needed.
 * Implements simple keyword matching for Week 3 (can be enhanced with ML later).
 *
 * @param botResponse - AI-generated response
 * @param customerMessage - Customer's message
 * @param config - Template configuration
 * @returns true if handoff is needed
 */
function checkHandoffConditions(
    botResponse: string,
    customerMessage: string,
    config: any
): boolean {
    if (!config.conversationFlow.handoffConditions || config.conversationFlow.handoffConditions.length === 0) {
        return false;
    }

    const combinedText = (botResponse + ' ' + customerMessage).toLowerCase();

    // Check each handoff condition
    for (const condition of config.conversationFlow.handoffConditions) {
        const lowerCondition = condition.toLowerCase();

        // Detect anger/frustration
        if (lowerCondition.includes('angry') || lowerCondition.includes('frustrat')) {
            const angerKeywords = ['angry', 'frustrated', 'terrible', 'horrible', 'worst', 'useless', 'stupid', 'pathetic', 'ridiculous'];
            if (angerKeywords.some(keyword => combinedText.includes(keyword))) {
                logger.info({ condition, reason: 'customer_frustration' }, 'Handoff condition matched');
                return true;
            }
        }

        // Detect bot limitations
        if (lowerCondition.includes('outside') || lowerCondition.includes('special') || lowerCondition.includes('technical')) {
            const limitationKeywords = ['unable to', 'cannot help', 'don\'t know', 'not sure', 'beyond my'];
            if (limitationKeywords.some(keyword => combinedText.includes(keyword))) {
                logger.info({ condition, reason: 'bot_limitation' }, 'Handoff condition matched');
                return true;
            }
        }

        // Detect cancellation/modification requests
        if (lowerCondition.includes('cancel') || lowerCondition.includes('modify')) {
            const changeKeywords = ['cancel', 'change booking', 'modify', 'reschedule'];
            if (changeKeywords.some(keyword => combinedText.includes(keyword))) {
                logger.info({ condition, reason: 'booking_change' }, 'Handoff condition matched');
                return true;
            }
        }
    }

    return false;
}

/**
 * Notify human agent of handoff request
 *
 * Updates conversation status and prepares for human takeover.
 * TODO: Add actual notification system (email, Slack, dashboard alert)
 *
 * @param conversationId - Conversation ID
 * @param customerPhone - Customer's phone number
 * @param conversation - Conversation object
 */
async function notifyHumanAgent(conversationId: string, customerPhone: string, conversation: any): Promise<void> {
    try {
        // Update conversation status to needs_handoff
        await supabaseAdmin
            .from('conversations')
            .update({
                status: 'needs_handoff',
                metadata: {
                    ...conversation.metadata,
                    handoff_requested_at: new Date().toISOString(),
                    handoff_reason: 'Automated handoff condition triggered'
                }
            })
            .eq('id', conversationId);

        // TODO: Implement actual notification system
        // - Send email to support team
        // - Post to Slack channel
        // - Create dashboard alert
        // - Send SMS to on-call agent

        logger.info({
            conversationId,
            customerPhone,
            botId: conversation.bots?.id
        }, 'Human handoff requested and conversation updated');

    } catch (error) {
        logger.error({ conversationId, error }, 'Failed to notify human agent');
        // Don't throw - handoff notification failure shouldn't block message processing
    }
}

/**
 * Fallback to generic AI for non-template bots
 *
 * Maintains backward compatibility with bots created before template system.
 * Uses simple task_type-based prompts.
 *
 * @param job - BullMQ job
 * @param bot - Bot record
 * @param conversation - Conversation record
 * @param messageContent - Customer's message
 * @param customerPhone - Customer's phone
 * @param whatsappAccountId - WhatsApp account ID
 */
async function processGenericAI(
    job: Job<MessageJob>,
    bot: any,
    conversation: any,
    messageContent: string,
    customerPhone: string,
    whatsappAccountId: string
) {
    try {
        logger.info({ botId: bot.id, task_type: bot.task_type }, 'Processing with generic AI');

        // Build conversation history
        const { data: messages } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })
            .limit(10);

        const conversationHistory = messages?.map((msg) => ({
            role: msg.direction === 'inbound' ? 'user' as const : 'assistant' as const,
            content: msg.content || '',
        })) || [];

        // Generate generic system prompt based on task_type
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

        // Call OpenAI
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

        // Save AI response to database
        const { data: responseMessage } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: conversation.id,
                direction: 'outbound',
                message_type: 'text',
                content: aiResponse,
                sent_by: 'bot',
                metadata: {
                    processing_type: 'generic_ai'
                }
            })
            .select()
            .single();

        // Send via Bird WhatsApp
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

            await supabaseAdmin
                .from('messages')
                .update({ bird_message_id: birdResponse.id, status: 'sent' })
                .eq('id', responseMessage.id);
        }

        logger.info({ conversationId: conversation.id }, 'Generic AI message processed');

    } catch (error) {
        logger.error({ error, botId: bot.id }, 'Failed to process generic AI message');
        throw error;
    }
}

if (messageWorker) {
    messageWorker.on('completed', (job) => {
        logger.info({ jobId: job.id }, 'Message job completed');
    });

    messageWorker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, error: err }, 'Message job failed');
    });
}

export { messageWorker };
