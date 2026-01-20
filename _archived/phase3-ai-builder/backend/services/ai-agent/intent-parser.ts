/**
 * Intent Parser Service (Phase 3 Week 1)
 *
 * Parses natural language messages to extract user intent for workflow building.
 * Uses GPT-4 for semantic understanding with structured output.
 *
 * Responsibilities:
 * - Parse user messages to identify workflow intent
 * - Extract entities (services, actions, data types)
 * - Detect required integrations
 * - Generate clarifying questions when intent is unclear
 * - Handle South African business context
 */

import OpenAI from 'openai';
import {
  ParsedIntent,
  ExtractedEntity,
  Requirement,
  AgentQuestion,
  ConversationContext
} from '../../types/ai-agent.js';
import { getNodeLibrary } from '../node-library.js';
import { createNodeLibrarySummary } from '../../prompts/bot-builder-prompts.js';

/**
 * Configuration for the Intent Parser
 */
interface IntentParserConfig {
  model: string;
  temperature: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: IntentParserConfig = {
  model: 'gpt-4o',
  temperature: 0.3,
  maxRetries: 2
};

/**
 * System prompt for intent parsing
 */
const INTENT_PARSER_SYSTEM_PROMPT = `You are an expert workflow intent analyzer for BotFlow, a WhatsApp automation platform for South African businesses.

Your job is to analyze user messages and extract their intent for building WhatsApp bots.

## Context
- BotFlow helps South African businesses automate WhatsApp conversations
- Users describe what they want their bot to do in natural language
- You extract structured intent that can be used to generate workflows

## Output Format
Always respond with valid JSON matching this structure:

{
  "action": "create|modify|explain|deploy|delete|undo|help|unknown",
  "workflowType": "string or null (e.g., order_tracking, booking, faq)",
  "entities": [
    {
      "type": "service|action|data|condition|time|location|number|custom",
      "value": "extracted value",
      "originalText": "text from message",
      "confidence": 0.0-1.0,
      "startIndex": 0,
      "endIndex": 0
    }
  ],
  "integrations": ["list of detected integrations needed"],
  "requirements": [
    {
      "id": "req_1",
      "category": "trigger|action|condition|integration|data|response",
      "description": "what is needed",
      "priority": "required|optional|nice-to-have",
      "suggestedNode": "node type if applicable",
      "configHints": {}
    }
  ],
  "confidence": 0.0-1.0,
  "needsClarification": true|false,
  "clarificationQuestions": [
    {
      "id": "q_1",
      "text": "question text",
      "type": "open|choice|confirm|multiselect",
      "options": ["option1", "option2"],
      "required": true|false,
      "context": "why we're asking"
    }
  ]
}

## South African Context
- Understand local services: Takealot, Checkers, Discovery Health, FNB, Vodacom, MTN
- Local payment: PayFast, Yoco, iKhokha, Paystack, SnapScan
- Shipping: The Courier Guy, Pargo, Aramex SA
- Business types: spaza shops, taxi services (minibus), township businesses
- Load shedding awareness: backup plans, offline modes
- Currency: South African Rand (ZAR/R)
- Languages: English, Afrikaans, Zulu, Xhosa

## Integration Detection
Detect when users mention these services (even indirectly):
- E-commerce: Shopify, WooCommerce, OpenCart, Magento
- Payments: PayFast, Paystack, Yoco, iKhokha, Stripe
- Shipping: The Courier Guy, ShipLogic, Pargo
- Calendar: Google Calendar, iCal
- Database: MySQL, PostgreSQL, Supabase
- Email: SendGrid, SMTP
- SMS: Clickatell, BulkSMS

## Workflow Type Detection
Common workflow types:
- order_tracking: Track orders, check delivery status
- booking: Appointments, reservations, scheduling
- faq: Answer common questions
- payment: Process payments, send payment links
- support: Customer service, ticket creation
- notification: Send alerts, reminders
- lead_capture: Collect customer information
- product_inquiry: Product information, stock check

## Confidence Scoring
- 1.0: Crystal clear intent with all details
- 0.8-0.9: Clear intent, minor details missing
- 0.6-0.7: Intent understood but needs clarification
- 0.4-0.5: Ambiguous, multiple interpretations possible
- 0.0-0.3: Very unclear, need more information

Set needsClarification=true when confidence < 0.7`;

/**
 * Intent Parser Service
 */
export class IntentParser {
  private openai: OpenAI;
  private config: IntentParserConfig;

  constructor(config: Partial<IntentParserConfig> = {}) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for Intent Parser');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Parse a user message to extract intent
   *
   * @param message - The user's natural language message
   * @param context - Optional conversation context for better understanding
   * @returns Parsed intent with entities, requirements, and confidence
   */
  async parse(
    message: string,
    context?: ConversationContext
  ): Promise<ParsedIntent> {
    const nodeLibrary = await getNodeLibrary();
    const nodes = nodeLibrary.listNodes();
    const nodeSummary = createNodeLibrarySummary(nodes);

    // Build context-aware prompt
    const userPrompt = this.buildUserPrompt(message, context, nodeSummary);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'system', content: INTENT_PARSER_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: this.config.temperature
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('OpenAI returned empty response');
        }

        const parsed = JSON.parse(content);
        return this.validateAndEnrich(parsed, message, context);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.maxRetries) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    // Return a fallback intent if all retries fail
    return this.createFallbackIntent(message, lastError);
  }

  /**
   * Build the user prompt with context
   */
  private buildUserPrompt(
    message: string,
    context: ConversationContext | undefined,
    nodeSummary: string
  ): string {
    let prompt = `## Available Node Types\n${nodeSummary}\n\n`;

    if (context) {
      prompt += `## Conversation Context\n`;
      prompt += `- Bot ID: ${context.botId}\n`;
      prompt += `- Current State: ${context.state}\n`;

      if (context.userPreferences.vertical) {
        prompt += `- Business Vertical: ${context.userPreferences.vertical}\n`;
      }

      if (context.availableIntegrations.length > 0) {
        const enabledIntegrations = context.availableIntegrations
          .filter(i => i.isEnabled)
          .map(i => i.name)
          .join(', ');
        prompt += `- Available Integrations: ${enabledIntegrations}\n`;
      }

      if (context.gatheredRequirements.length > 0) {
        prompt += `- Previously Gathered Requirements:\n`;
        context.gatheredRequirements.forEach(req => {
          prompt += `  - ${req.key}: ${req.value}\n`;
        });
      }

      if (context.currentWorkflow) {
        prompt += `- Has Current Workflow: Yes (${context.currentWorkflow.nodes.length} nodes)\n`;
      }

      // Include recent conversation history
      const recentHistory = context.history.slice(-6);
      if (recentHistory.length > 0) {
        prompt += `\n## Recent Conversation\n`;
        recentHistory.forEach(msg => {
          prompt += `${msg.role}: ${msg.content}\n`;
        });
      }
    }

    prompt += `\n## User Message to Analyze\n"${message}"`;

    return prompt;
  }

  /**
   * Validate and enrich the parsed intent
   */
  private validateAndEnrich(
    parsed: any,
    originalMessage: string,
    context?: ConversationContext
  ): ParsedIntent {
    // Ensure all required fields exist with defaults
    const intent: ParsedIntent = {
      action: this.validateAction(parsed.action),
      workflowType: parsed.workflowType || undefined,
      entities: this.validateEntities(parsed.entities || []),
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations : [],
      requirements: this.validateRequirements(parsed.requirements || []),
      confidence: this.clamp(parsed.confidence || 0.5, 0, 1),
      needsClarification: parsed.needsClarification ?? (parsed.confidence < 0.7),
      clarificationQuestions: this.validateQuestions(parsed.clarificationQuestions || []),
      rawMessage: originalMessage,
      context: context ? {
        previousIntent: context.history
          .filter(m => m.metadata?.intent)
          .slice(-1)[0]?.metadata?.intent,
        workflowContext: context.currentWorkflow || undefined
      } : undefined
    };

    // Add clarification questions if confidence is low but none provided
    if (intent.needsClarification && intent.clarificationQuestions.length === 0) {
      intent.clarificationQuestions = this.generateDefaultQuestions(intent);
    }

    return intent;
  }

  /**
   * Validate action type
   */
  private validateAction(action: string): ParsedIntent['action'] {
    const validActions: ParsedIntent['action'][] = [
      'create', 'modify', 'explain', 'deploy', 'delete', 'undo', 'help', 'unknown'
    ];
    return validActions.includes(action as any) ? action as ParsedIntent['action'] : 'unknown';
  }

  /**
   * Validate entities array
   */
  private validateEntities(entities: any[]): ExtractedEntity[] {
    if (!Array.isArray(entities)) return [];

    return entities
      .filter(e => e && typeof e === 'object')
      .map((e, index) => ({
        type: e.type || 'custom',
        value: String(e.value || ''),
        originalText: String(e.originalText || e.value || ''),
        confidence: this.clamp(e.confidence || 0.5, 0, 1),
        startIndex: e.startIndex ?? 0,
        endIndex: e.endIndex ?? 0
      }));
  }

  /**
   * Validate requirements array
   */
  private validateRequirements(requirements: any[]): Requirement[] {
    if (!Array.isArray(requirements)) return [];

    return requirements
      .filter(r => r && typeof r === 'object')
      .map((r, index) => ({
        id: r.id || `req_${index + 1}`,
        category: r.category || 'action',
        description: String(r.description || ''),
        priority: r.priority || 'required',
        suggestedNode: r.suggestedNode,
        configHints: r.configHints || {}
      }));
  }

  /**
   * Validate questions array
   */
  private validateQuestions(questions: any[]): AgentQuestion[] {
    if (!Array.isArray(questions)) return [];

    return questions
      .filter(q => q && typeof q === 'object' && q.text)
      .map((q, index) => ({
        id: q.id || `q_${index + 1}`,
        text: String(q.text),
        type: q.type || 'open',
        options: Array.isArray(q.options) ? q.options : undefined,
        required: q.required ?? true,
        context: q.context
      }));
  }

  /**
   * Generate default clarification questions based on intent
   */
  private generateDefaultQuestions(intent: ParsedIntent): AgentQuestion[] {
    const questions: AgentQuestion[] = [];

    // If no workflow type detected
    if (!intent.workflowType) {
      questions.push({
        id: 'q_workflow_type',
        text: 'What would you like your bot to help customers with?',
        type: 'choice',
        options: [
          'Track orders or deliveries',
          'Book appointments',
          'Answer common questions',
          'Process payments',
          'Something else'
        ],
        required: true,
        context: 'Understanding the main purpose helps me suggest the right workflow'
      });
    }

    // If create action but no trigger info
    if (intent.action === 'create') {
      const hasTriggerReq = intent.requirements.some(r => r.category === 'trigger');
      if (!hasTriggerReq) {
        questions.push({
          id: 'q_trigger',
          text: 'How should the bot start a conversation?',
          type: 'choice',
          options: [
            'When customer sends a specific keyword (e.g., "order", "book")',
            'When customer sends any message',
            'At a scheduled time',
            'I\'m not sure yet'
          ],
          required: false,
          context: 'This determines when your bot activates'
        });
      }
    }

    return questions;
  }

  /**
   * Create a fallback intent when parsing fails
   */
  private createFallbackIntent(message: string, error: Error | null): ParsedIntent {
    return {
      action: 'unknown',
      entities: [],
      integrations: [],
      requirements: [],
      confidence: 0.1,
      needsClarification: true,
      clarificationQuestions: [
        {
          id: 'q_fallback',
          text: "I'm having trouble understanding. Could you tell me more about what you'd like your bot to do?",
          type: 'open',
          required: true,
          context: error ? `Error: ${error.message}` : 'Could not parse intent'
        }
      ],
      rawMessage: message
    };
  }

  /**
   * Clamp a number between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Delay for the specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Quick intent detection for common patterns (without API call)
   * Used for fast responses to simple commands
   */
  quickDetect(message: string): Partial<ParsedIntent> | null {
    const lower = message.toLowerCase().trim();

    // Help commands
    if (lower === 'help' || lower === '/help' || lower === '?') {
      return { action: 'help', confidence: 1.0, needsClarification: false };
    }

    // Undo commands
    if (lower === 'undo' || lower === '/undo' || lower === 'go back') {
      return { action: 'undo', confidence: 1.0, needsClarification: false };
    }

    // Deploy commands
    if (lower === 'deploy' || lower === 'deploy now' || lower === 'activate') {
      return { action: 'deploy', confidence: 0.9, needsClarification: false };
    }

    // Cancel/reset commands
    if (lower === 'cancel' || lower === 'reset' || lower === 'start over') {
      return { action: 'delete', confidence: 0.9, needsClarification: false };
    }

    // Quick workflow type detection
    const workflowPatterns: Array<{ patterns: string[]; type: string }> = [
      { patterns: ['track order', 'order tracking', 'where is my order', 'delivery status'], type: 'order_tracking' },
      { patterns: ['book appointment', 'schedule', 'booking', 'reservation'], type: 'booking' },
      { patterns: ['faq', 'frequently asked', 'common questions', 'answer questions'], type: 'faq' },
      { patterns: ['payment', 'pay', 'invoice', 'billing'], type: 'payment' },
      { patterns: ['support', 'help desk', 'ticket', 'customer service'], type: 'support' },
      { patterns: ['notify', 'reminder', 'alert', 'notification'], type: 'notification' }
    ];

    for (const { patterns, type } of workflowPatterns) {
      if (patterns.some(p => lower.includes(p))) {
        return {
          action: 'create',
          workflowType: type,
          confidence: 0.7,
          needsClarification: true
        };
      }
    }

    return null;
  }
}

// Singleton instance
let instance: IntentParser | null = null;

/**
 * Get the IntentParser singleton
 */
export function getIntentParser(): IntentParser {
  if (!instance) {
    instance = new IntentParser();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetIntentParser(): void {
  instance = null;
}
