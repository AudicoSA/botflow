import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Template Configuration Service
 * Loads and caches bot template configurations for message processing
 *
 * This service is responsible for:
 * 1. Loading bot configurations from the database
 * 2. Extracting conversation_flow and field_values
 * 3. Converting field_values to replaceable variables
 * 4. Caching configurations for performance
 * 5. Replacing {{variable}} placeholders in text
 */

/**
 * Template configuration structure
 * Extracted from bot record in database
 */
export interface TemplateConfig {
  botId: string;
  botName: string;
  templateId: string | null;
  conversationFlow: {
    systemPrompt: string;
    welcomeMessage: string;
    rules: string[];
    intents: Record<string, {
      triggers: string[];
      response: string;
    }>;
    handoffConditions: string[];
  };
  fieldValues: Record<string, any>; // Raw field values from bot config
  variables: Record<string, string>; // Processed variables for {{replacement}}
}

// In-memory cache for template configurations
// TODO: Move to Redis in Day 6 for production
const configCache = new Map<string, { config: TemplateConfig; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load template configuration for a bot from database or cache
 *
 * @param botId - UUID of the bot
 * @returns Template configuration or null if not found/invalid
 *
 * @example
 * const config = await loadTemplateConfig('bot-uuid-123');
 * if (config) {
 *   console.log(config.conversationFlow.systemPrompt);
 * }
 */
export async function loadTemplateConfig(botId: string): Promise<TemplateConfig | null> {
  try {
    // Check cache first
    const cached = configCache.get(botId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug({ botId }, 'Template config loaded from cache');
      return cached.config;
    }

    // Load bot from database
    const { data: bot, error } = await supabaseAdmin
      .from('bots')
      .select('id, name, config, template_id, bot_type')
      .eq('id', botId)
      .single();

    if (error || !bot) {
      logger.error({ botId, error }, 'Failed to load bot');
      return null;
    }

    // Check if bot has template configuration
    if (!bot.config || !bot.config.conversation_flow) {
      logger.warn({ botId, bot_type: bot.bot_type }, 'Bot has no template configuration');
      return null;
    }

    // Extract configuration from bot.config
    const config: TemplateConfig = {
      botId: bot.id,
      botName: bot.name,
      templateId: bot.template_id,
      conversationFlow: {
        systemPrompt: bot.config.conversation_flow.systemPrompt || '',
        welcomeMessage: bot.config.conversation_flow.welcomeMessage || '',
        rules: bot.config.conversation_flow.rules || [],
        intents: bot.config.conversation_flow.intents || {},
        handoffConditions: bot.config.conversation_flow.handoffConditions || [],
      },
      fieldValues: bot.config.field_values || {},
      variables: extractVariables(bot.config.field_values || {}),
    };

    // Cache the configuration
    configCache.set(botId, { config, timestamp: Date.now() });

    logger.info({
      botId,
      templateId: bot.template_id,
      intentCount: Object.keys(config.conversationFlow.intents).length,
      ruleCount: config.conversationFlow.rules.length
    }, 'Template config loaded from database');

    return config;

  } catch (error) {
    logger.error({ botId, error }, 'Error loading template config');
    return null;
  }
}

/**
 * Extract and format variables for replacement
 * Converts field_values object to simple key-value string map
 *
 * Handles:
 * - Arrays → comma-separated strings
 * - Objects → JSON strings
 * - Null/undefined → empty strings
 * - Numbers → strings
 *
 * @param fieldValues - Raw field values from bot configuration
 * @returns Map of variable names to string values
 *
 * @example
 * const variables = extractVariables({
 *   business_name: 'Cape Town Cabs',
 *   vehicle_types: ['Sedan', 'SUV'],
 *   base_rate: 50
 * });
 * // Returns: {
 * //   business_name: 'Cape Town Cabs',
 * //   vehicle_types: 'Sedan, SUV',
 * //   base_rate: '50'
 * // }
 */
export function extractVariables(fieldValues: Record<string, any>): Record<string, string> {
  const variables: Record<string, string> = {};

  Object.entries(fieldValues).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      variables[key] = '';
    } else if (Array.isArray(value)) {
      // Convert arrays to comma-separated strings
      variables[key] = value.join(', ');
    } else if (typeof value === 'object') {
      // Convert objects to JSON string
      variables[key] = JSON.stringify(value);
    } else {
      // Convert everything else to string
      variables[key] = String(value);
    }
  });

  return variables;
}

/**
 * Replace {{variable}} placeholders in text with actual values
 *
 * Uses global regex replacement to handle multiple occurrences
 * of the same variable. Placeholders that don't match any variable
 * are left unchanged.
 *
 * @param text - Text containing {{variable}} placeholders
 * @param variables - Map of variable names to replacement values
 * @returns Text with variables replaced
 *
 * @example
 * const text = 'Welcome to {{business_name}}! We serve {{service_area}}.';
 * const variables = {
 *   business_name: 'Cape Town Cabs',
 *   service_area: 'Cape Town CBD'
 * };
 * const result = replaceVariables(text, variables);
 * // Returns: 'Welcome to Cape Town Cabs! We serve Cape Town CBD.'
 */
export function replaceVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text;

  Object.entries(variables).forEach(([key, value]) => {
    // Create regex to find all {{key}} patterns
    // Use double backslashes to escape curly braces in regex
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Clear cache for a specific bot
 * Call this when bot configuration is updated
 *
 * @param botId - UUID of the bot
 *
 * @example
 * // After updating bot config
 * await supabase.from('bots').update({...}).eq('id', botId);
 * clearConfigCache(botId);
 */
export function clearConfigCache(botId: string): void {
  configCache.delete(botId);
  logger.debug({ botId }, 'Config cache cleared for bot');
}

/**
 * Clear entire cache
 * Useful for testing or system maintenance
 *
 * @example
 * clearAllConfigCache();
 */
export function clearAllConfigCache(): void {
  const cacheSize = configCache.size;
  configCache.clear();
  logger.debug({ cacheSize }, 'All config cache cleared');
}

/**
 * Get cache statistics
 * Useful for monitoring cache performance
 *
 * @returns Cache statistics object
 */
export function getCacheStats() {
  return {
    size: configCache.size,
    entries: Array.from(configCache.entries()).map(([botId, { timestamp }]) => ({
      botId,
      age: Date.now() - timestamp,
      ttl: CACHE_TTL
    }))
  };
}
