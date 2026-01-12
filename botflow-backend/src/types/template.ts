/**
 * Template System Type Definitions
 *
 * These types define the structure for vertical templates that power
 * the BotFlow template marketplace. Each template represents a specific
 * business vertical (taxi, restaurant, salon, etc.) and contains all
 * the configuration needed to instantiate a working bot.
 */

/**
 * Field type definition for template forms
 * Used to generate dynamic onboarding forms
 */
export interface TemplateField {
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'time' | 'json';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[]; // For select/multiselect
  };
  helpText?: string;
  defaultValue?: any;
}

/**
 * Collection of fields required for a template
 * Key = field name, Value = field definition
 */
export interface TemplateFields {
  [fieldName: string]: TemplateField;
}

/**
 * Conversation flow configuration
 * Defines how the AI bot behaves and responds
 */
export interface ConversationFlow {
  systemPrompt: string; // Main AI instruction
  welcomeMessage?: string; // First message to customer
  exampleConversations?: Array<{
    customer: string;
    bot: string;
  }>;
  rules?: string[]; // Behavioral rules
  intents?: {
    [intentName: string]: {
      triggers: string[]; // Keywords/phrases
      response: string; // How to handle
    };
  };
  handoffConditions?: string[]; // When to escalate to human
}

/**
 * Complete bot template definition
 * Matches the database schema in bot_templates table
 */
export interface BotTemplate {
  id: string;
  name: string;
  vertical: string;
  tier: 1 | 2 | 3;
  description: string;
  tagline: string;
  icon: string;
  required_fields: TemplateFields;
  conversation_flow: ConversationFlow;
  example_prompts: string[];
  integrations: string[];
  is_published: boolean;
  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Data required to instantiate a bot from a template
 * This is what users provide during the onboarding flow
 */
export interface TemplateInstantiationData {
  template_id: string;
  organization_id: string;
  whatsapp_account_id: string;
  bot_name: string;
  field_values: Record<string, any>; // User-provided data matching required_fields
}

/**
 * Result of template instantiation
 */
export interface TemplateInstantiationResult {
  bot: {
    id: string;
    name: string;
    organization_id: string;
    whatsapp_account_id: string;
    task_type: string;
    configuration: Record<string, any>;
    is_active: boolean;
  };
  template: BotTemplate;
}

/**
 * Template creation payload (for admin use)
 */
export interface CreateTemplatePayload {
  name: string;
  vertical: string;
  tier: 1 | 2 | 3;
  description: string;
  tagline?: string;
  icon?: string;
  required_fields: TemplateFields;
  conversation_flow: ConversationFlow;
  example_prompts?: string[];
  integrations?: string[];
  is_published?: boolean;
}

/**
 * Template update payload (for admin use)
 */
export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  tagline?: string;
  icon?: string;
  required_fields?: TemplateFields;
  conversation_flow?: ConversationFlow;
  example_prompts?: string[];
  integrations?: string[];
  is_published?: boolean;
  version?: number;
}
