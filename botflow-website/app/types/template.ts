/**
 * Frontend Template Types
 * Mirrors backend template types for client-side use
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
    options?: string[];
  };
  helpText?: string;
  defaultValue?: any;
}

export interface TemplateFields {
  [fieldName: string]: TemplateField;
}

export interface ConversationFlow {
  systemPrompt: string;
  welcomeMessage?: string;
  exampleConversations?: Array<{
    customer: string;
    bot: string;
  }>;
  rules?: string[];
  intents?: {
    [intentName: string]: {
      triggers: string[];
      response: string;
    };
  };
  handoffConditions?: string[];
}

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
  required_integrations?: string[];
  is_published: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}
