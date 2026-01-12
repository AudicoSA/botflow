import { supabase } from '../config/supabase.js';
import { BotTemplate, TemplateInstantiationData, TemplateInstantiationResult } from '../types/template.js';

export class TemplateInstantiationService {
  /**
   * Create a bot from a template
   */
  static async instantiateBot(data: TemplateInstantiationData): Promise<TemplateInstantiationResult> {
    try {
      // 1. Fetch the template
      const { data: template, error: templateError } = await supabase
        .from('bot_templates')
        .select('*')
        .eq('id', data.template_id)
        .single();

      if (templateError || !template) {
        throw new Error('Template not found');
      }

      // 2. Validate field values against template requirements
      this.validateFieldValues(template, data.field_values);

      // 3. Generate bot configuration from template
      const botConfig = this.generateBotConfig(template, data.field_values);

      // 4. Create the bot in database
      const { data: bot, error: botError } = await supabase
        .from('bots')
        .insert({
          organization_id: data.organization_id,
          whatsapp_account_id: data.whatsapp_account_id,
          name: data.bot_name,
          description: template.description,
          task_type: template.vertical,
          is_active: true,
          configuration: botConfig,
          ai_model: 'gpt-4o',
          ai_temperature: 0.7,
          fallback_behavior: 'human_handoff',
        })
        .select()
        .single();

      if (botError) throw botError;

      return { bot, template };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate that user-provided field values match template requirements
   */
  private static validateFieldValues(template: BotTemplate, fieldValues: Record<string, any>) {
    const requiredFields = template.required_fields;

    for (const [fieldName, fieldDef] of Object.entries(requiredFields)) {
      const value = fieldValues[fieldName];

      // Check required fields
      if (fieldDef.required && (value === undefined || value === null || value === '')) {
        throw new Error(`Missing required field: ${fieldDef.label}`);
      }

      // Type validation
      if (value !== undefined && value !== null && value !== '') {
        if (fieldDef.type === 'number' && typeof value !== 'number') {
          throw new Error(`Field ${fieldDef.label} must be a number`);
        }

        // Validation rules
        if (fieldDef.validation) {
          if (fieldDef.validation.min !== undefined && value < fieldDef.validation.min) {
            throw new Error(`${fieldDef.label} must be at least ${fieldDef.validation.min}`);
          }
          if (fieldDef.validation.max !== undefined && value > fieldDef.validation.max) {
            throw new Error(`${fieldDef.label} must be at most ${fieldDef.validation.max}`);
          }

          // For select fields, validate value is in options
          if (fieldDef.type === 'select' && fieldDef.validation.options) {
            if (!fieldDef.validation.options.includes(value)) {
              throw new Error(`${fieldDef.label} must be one of: ${fieldDef.validation.options.join(', ')}`);
            }
          }

          // For multiselect fields, validate all values are in options
          if (fieldDef.type === 'multiselect' && fieldDef.validation.options) {
            if (!Array.isArray(value)) {
              throw new Error(`${fieldDef.label} must be an array`);
            }
            const invalidValues = value.filter((v: string) => !fieldDef.validation?.options?.includes(v));
            if (invalidValues.length > 0) {
              throw new Error(`${fieldDef.label} contains invalid values: ${invalidValues.join(', ')}`);
            }
          }
        }
      }
    }
  }

  /**
   * Generate bot configuration by merging template with user data
   */
  private static generateBotConfig(template: BotTemplate, fieldValues: Record<string, any>) {
    // Replace template variables in conversation flow
    const conversationFlow = JSON.parse(JSON.stringify(template.conversation_flow));

    // Replace {{variable}} placeholders with actual values
    const systemPrompt = this.replaceVariables(conversationFlow.systemPrompt, fieldValues);
    const welcomeMessage = conversationFlow.welcomeMessage
      ? this.replaceVariables(conversationFlow.welcomeMessage, fieldValues)
      : undefined;

    return {
      template_id: template.id,
      template_version: template.version,
      template_name: template.name,
      vertical: template.vertical,
      field_values: fieldValues,
      conversation_flow: {
        ...conversationFlow,
        systemPrompt,
        welcomeMessage,
      },
      integrations: template.integrations,
    };
  }

  /**
   * Replace {{variable}} placeholders in text
   */
  private static replaceVariables(text: string, values: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(values)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      // Convert arrays to comma-separated string for display
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
      result = result.replace(regex, displayValue);
    }
    return result;
  }
}
