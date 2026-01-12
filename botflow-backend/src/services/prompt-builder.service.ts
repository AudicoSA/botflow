import { TemplateConfig, replaceVariables } from './template-config.service.js';
import { logger } from '../config/logger.js';

/**
 * Prompt Builder Service
 * Constructs OpenAI prompts from template configuration
 *
 * This service is responsible for:
 * 1. Building system prompts from template configuration
 * 2. Constructing complete messages arrays for OpenAI API
 * 3. Matching customer messages to template intents
 * 4. Enhancing prompts with matched intent context
 */

/**
 * Message structure for OpenAI API
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Matched intent structure
 */
export interface MatchedIntent {
  name: string;
  response: string;
}

/**
 * Build system prompt from template configuration
 *
 * Creates a comprehensive system prompt that includes:
 * 1. Template system prompt with variables replaced
 * 2. Rules formatted as numbered list
 * 3. Intent definitions for AI awareness
 * 4. Instructions for conversation context
 *
 * @param config - Template configuration
 * @returns Complete system prompt string
 *
 * @example
 * const prompt = buildSystemPrompt(config);
 * // Returns multi-section prompt with business context, rules, and intents
 */
export function buildSystemPrompt(config: TemplateConfig): string {
  let prompt = '';

  // 1. Start with template system prompt (with variable replacement)
  const basePrompt = replaceVariables(
    config.conversationFlow.systemPrompt,
    config.variables
  );
  prompt += basePrompt + '\n\n';

  // 2. Add rules as numbered list
  if (config.conversationFlow.rules && config.conversationFlow.rules.length > 0) {
    prompt += '## Important Rules:\n';
    config.conversationFlow.rules.forEach((rule, index) => {
      prompt += `${index + 1}. ${rule}\n`;
    });
    prompt += '\n';
  }

  // 3. Add intent definitions for AI awareness
  if (config.conversationFlow.intents && Object.keys(config.conversationFlow.intents).length > 0) {
    prompt += '## Intent Recognition:\n';
    prompt += 'When the customer mentions these keywords, respond accordingly:\n\n';

    Object.entries(config.conversationFlow.intents).forEach(([intentName, intent]) => {
      // Format intent name (replace underscores with spaces, capitalize)
      const formattedName = intentName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      prompt += `**${formattedName}:**\n`;
      prompt += `- Triggers: ${intent.triggers.join(', ')}\n`;
      prompt += `- Action: ${intent.response}\n\n`;
    });
  }

  // 4. Add current context instruction
  prompt += '## Current Conversation:\n';
  prompt += 'Below is the conversation history. Respond to the most recent customer message in a helpful, professional manner.\n';

  return prompt;
}

/**
 * Build complete messages array for OpenAI
 *
 * Constructs the messages array in OpenAI's required format:
 * - System message (template-based prompt)
 * - Conversation history (last N messages)
 * - Current customer message
 *
 * @param config - Template configuration
 * @param conversationHistory - Previous messages in the conversation
 * @param currentMessage - Customer's current message
 * @returns Messages array ready for OpenAI API
 *
 * @example
 * const messages = buildMessagesArray(config, history, 'I need a ride');
 * // Returns: [
 * //   { role: 'system', content: '...' },
 * //   { role: 'user', content: 'previous msg' },
 * //   { role: 'assistant', content: 'previous response' },
 * //   { role: 'user', content: 'I need a ride' }
 * // ]
 */
export function buildMessagesArray(
  config: TemplateConfig,
  conversationHistory: Array<{ role: string; content: string; created_at: string }>,
  currentMessage: string
): Message[] {
  const messages: Message[] = [];

  // 1. System message (template-based prompt)
  messages.push({
    role: 'system',
    content: buildSystemPrompt(config)
  });

  // 2. Conversation history (last 10 messages to keep context manageable)
  const recentHistory = conversationHistory.slice(-10);

  recentHistory.forEach((msg) => {
    messages.push({
      role: msg.role === 'customer' || msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  });

  // 3. Current customer message
  messages.push({
    role: 'user',
    content: currentMessage
  });

  logger.debug({
    botId: config.botId,
    messageCount: messages.length,
    historyCount: recentHistory.length,
    systemPromptLength: messages[0].content.length
  }, 'Messages array built for OpenAI');

  return messages;
}

/**
 * Match customer message to template intents
 *
 * Uses keyword-based matching to identify customer intent:
 * - Converts message to lowercase for case-insensitive matching
 * - Checks each intent's triggers
 * - Returns first matched intent (priority order from template)
 *
 * @param message - Customer's message
 * @param config - Template configuration
 * @returns Matched intent or null if no match
 *
 * @example
 * const intent = matchIntent('I need to book a ride', config);
 * // Returns: { name: 'book_ride', response: 'Collect: pickup location...' }
 */
export function matchIntent(
  message: string,
  config: TemplateConfig
): MatchedIntent | null {
  if (!config.conversationFlow.intents || Object.keys(config.conversationFlow.intents).length === 0) {
    return null;
  }

  const lowerMessage = message.toLowerCase();

  // Check each intent's triggers
  for (const [intentName, intent] of Object.entries(config.conversationFlow.intents)) {
    const hasMatch = intent.triggers.some((trigger) =>
      lowerMessage.includes(trigger.toLowerCase())
    );

    if (hasMatch) {
      logger.info({
        botId: config.botId,
        intent: intentName,
        triggers: intent.triggers,
        message: message.substring(0, 50) + '...'
      }, 'Intent matched');

      return {
        name: intentName,
        response: intent.response
      };
    }
  }

  logger.debug({
    botId: config.botId,
    message: message.substring(0, 50) + '...'
  }, 'No intent matched');

  return null;
}

/**
 * Enhance prompt with matched intent
 *
 * Adds specific intent instructions to the system prompt.
 * This helps the AI focus on the matched intent's requirements.
 *
 * @param basePrompt - Original system prompt
 * @param matchedIntent - Intent that was matched
 * @returns Enhanced system prompt
 *
 * @example
 * const enhanced = enhancePromptWithIntent(prompt, {
 *   name: 'book_ride',
 *   response: 'Collect pickup, destination, time'
 * });
 * // Returns original prompt + intent-specific instructions
 */
export function enhancePromptWithIntent(
  basePrompt: string,
  matchedIntent: MatchedIntent | null
): string {
  if (!matchedIntent) {
    return basePrompt;
  }

  // Format intent name for display
  const formattedName = matchedIntent.name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const enhancement = `\n\n## MATCHED INTENT: ${formattedName}\n`;
  const action = `The customer's message matches the "${formattedName}" intent.\n`;
  const instruction = `IMPORTANT: ${matchedIntent.response}\n`;
  const reminder = `Focus your response on fulfilling this intent.\n`;

  return basePrompt + enhancement + action + instruction + reminder;
}

/**
 * Format conversation history for logging/debugging
 *
 * Creates a human-readable summary of the conversation.
 * Useful for debugging and monitoring.
 *
 * @param history - Conversation history messages
 * @returns Formatted string summary
 */
export function formatConversationSummary(
  history: Array<{ role: string; content: string; created_at: string }>
): string {
  if (!history || history.length === 0) {
    return 'No conversation history';
  }

  const summary = history.slice(-5).map((msg, index) => {
    const role = msg.role === 'customer' || msg.role === 'user' ? 'Customer' : 'Bot';
    const content = msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : '');
    return `${index + 1}. ${role}: ${content}`;
  }).join('\n');

  return `Last ${Math.min(5, history.length)} messages:\n${summary}`;
}

/**
 * Validate messages array before sending to OpenAI
 *
 * Ensures the messages array is properly structured.
 * Helps catch errors before making API calls.
 *
 * @param messages - Messages array to validate
 * @returns true if valid, false otherwise
 */
export function validateMessagesArray(messages: Message[]): boolean {
  if (!Array.isArray(messages) || messages.length === 0) {
    logger.error('Messages array is empty or not an array');
    return false;
  }

  // First message should be system
  if (messages[0].role !== 'system') {
    logger.error('First message should be system role');
    return false;
  }

  // Last message should be user
  if (messages[messages.length - 1].role !== 'user') {
    logger.error('Last message should be user role');
    return false;
  }

  // Check all messages have required fields
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      logger.error({ msg }, 'Message missing role or content');
      return false;
    }

    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      logger.error({ role: msg.role }, 'Invalid message role');
      return false;
    }
  }

  return true;
}
