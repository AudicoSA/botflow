import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import type { BotTemplate, TemplateField, ConversationFlow } from '../types/template.js';

/**
 * Ralph Template Assistant
 *
 * AI-powered template generator that creates bot templates from natural language.
 * Uses Claude API with tool use for template generation.
 */
export class RalphService {
  private client: Anthropic;
  private conversationHistory: Map<string, Anthropic.Messages.MessageParam[]> = new Map();

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      logger.warn('[Ralph] ANTHROPIC_API_KEY not set - Ralph will not be available');
    }
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY || 'dummy-key',
    });
  }

  /**
   * Check if Ralph is enabled
   */
  isEnabled(): boolean {
    return !!env.ANTHROPIC_API_KEY;
  }

  /**
   * Generate a template from a business description
   */
  async generateTemplate(request: {
    businessType: string;
    businessName: string;
    description: string;
    services?: string[];
    bookingRequired?: boolean;
    paymentMethods?: string[];
    additionalRequirements?: string;
  }): Promise<{
    template: BotTemplate;
    explanation: string;
    recommendedIntegrations: string[];
  }> {
    if (!this.isEnabled()) {
      throw new Error('Ralph is not enabled. Set ANTHROPIC_API_KEY in environment.');
    }

    logger.info('[Ralph] Generating template', { businessType: request.businessType });

    // Build the prompt
    const prompt = this.buildTemplateGenerationPrompt(request);

    // Call Claude with tool use
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.7,
      system: this.getSystemPrompt(),
      tools: this.getTools(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Process the response
    return this.processTemplateResponse(response, request);
  }

  /**
   * Refine an existing template based on feedback
   */
  async refineTemplate(
    templateId: string,
    feedback: string
  ): Promise<BotTemplate> {
    logger.info('[Ralph] Refining template', { templateId, feedback });

    // Get existing template
    const { data: existingTemplate, error } = await supabase
      .from('bot_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !existingTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Build refinement prompt
    const prompt = `Please refine this bot template based on the following feedback:

Feedback: ${feedback}

Current Template:
${JSON.stringify(existingTemplate, null, 2)}

Please generate an improved version of the template.`;

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.7,
      system: this.getSystemPrompt(),
      tools: this.getTools(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const result = this.processTemplateResponse(response, {
      businessType: existingTemplate.vertical,
      businessName: existingTemplate.name,
      description: existingTemplate.description,
    });

    return result.template;
  }

  /**
   * Chat with Ralph (general Q&A about templates)
   */
  async chat(
    sessionId: string,
    message: string
  ): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('Ralph is not enabled');
    }

    logger.info('[Ralph] Chat message', { sessionId, message });

    // Get or create conversation history
    let history = this.conversationHistory.get(sessionId) || [];

    // Add user message
    history.push({
      role: 'user',
      content: message,
    });

    // Call Claude
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: this.getChatSystemPrompt(),
      messages: history,
    });

    // Extract assistant response
    const assistantMessage = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.Messages.TextBlock).text)
      .join('\n');

    // Update history
    history.push({
      role: 'assistant',
      content: assistantMessage,
    });

    // Keep last 10 messages only
    if (history.length > 10) {
      history = history.slice(-10);
    }

    this.conversationHistory.set(sessionId, history);

    return assistantMessage;
  }

  /**
   * Clear chat session
   */
  clearChatSession(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * Get Ralph's system prompt for template generation
   * @private
   */
  private getSystemPrompt(): string {
    return `You are Ralph, BotFlow's AI Template Assistant. Your job is to generate high-quality WhatsApp bot templates for South African businesses.

You have deep knowledge of:
- The 20 existing BotFlow templates (taxi, medical, real estate, e-commerce, restaurant, salon, gym, retail, hotel, car rental, plumber, doctor, airbnb, etc.)
- South African business context (payment methods, localization, time zones)
- WhatsApp bot best practices
- Conversation design patterns
- Integration requirements

When generating templates, you must:
1. Follow the exact JSON structure of existing templates
2. Include South African localization (R for Rands, SAST timezone, SA phone format)
3. Design natural, conversational flows
4. Include appropriate intents and rules
5. Specify required fields for onboarding
6. Recommend relevant integrations
7. Consider the target vertical's specific needs

Key patterns to follow:
- systemPrompt: Clear AI instructions with personality for the vertical
- welcomeMessage: Friendly greeting mentioning business name
- intents: Cover booking, inquiry, status, pricing, location, emergency
- rules: Professional tone, data collection, handoff conditions
- required_fields: Minimum needed for bot to function
- handoffConditions: When to escalate to human (complex requests, angry sentiment)

South African specifics:
- Currency: R (not ZAR)
- Emergency numbers: 10177 (ambulance), 10111 (police), 112 (general)
- Timezone: Africa/Johannesburg (SAST)
- Payment methods: PayFast, Yoco, Ozow (prefer SA over international)
- Load shedding awareness for relevant verticals
- Local terms: braai (BBQ), robot (traffic light), bakkie (pickup truck)

Always generate complete, production-ready templates that can be used immediately.`;
  }

  /**
   * Get chat system prompt
   * @private
   */
  private getChatSystemPrompt(): string {
    return `You are Ralph, BotFlow's helpful AI assistant. You help users understand bot templates, integrations, and best practices for WhatsApp automation in South Africa.

Be friendly, concise, and practical. Provide actionable advice.`;
  }

  /**
   * Get available tools for Ralph
   * @private
   */
  private getTools(): Anthropic.Messages.Tool[] {
    return [
      {
        name: 'generate_template',
        description: 'Generate a complete bot template JSON for a specific business vertical',
        input_schema: {
          type: 'object',
          properties: {
            vertical: {
              type: 'string',
              description: 'The business vertical slug (e.g., car_wash, pharmacy, bakery)',
            },
            name: {
              type: 'string',
              description: 'Template display name (e.g., "Car Wash & Detailing")',
            },
            description: {
              type: 'string',
              description: 'Short description of what this template does',
            },
            tagline: {
              type: 'string',
              description: 'Catchy one-liner for marketing',
            },
            icon: {
              type: 'string',
              description: 'Emoji icon for the template',
            },
            tier: {
              type: 'number',
              description: 'Priority tier: 1 (high), 2 (medium), 3 (nice-to-have)',
            },
            required_fields: {
              type: 'array',
              description: 'Array of field definitions for onboarding',
              items: {
                type: 'object',
              },
            },
            conversation_flow: {
              type: 'object',
              description: 'AI behavior configuration with systemPrompt, intents, rules',
            },
            example_prompts: {
              type: 'array',
              description: 'Example user messages for this bot',
              items: {
                type: 'string',
              },
            },
            required_integrations: {
              type: 'array',
              description: 'List of integration categories needed',
              items: {
                type: 'string',
              },
            },
          },
          required: [
            'vertical',
            'name',
            'description',
            'tagline',
            'tier',
            'required_fields',
            'conversation_flow',
          ],
        },
      },
    ];
  }

  /**
   * Build template generation prompt
   * @private
   */
  private buildTemplateGenerationPrompt(request: {
    businessType: string;
    businessName: string;
    description: string;
    services?: string[];
    bookingRequired?: boolean;
    paymentMethods?: string[];
    additionalRequirements?: string;
  }): string {
    return `Please generate a complete bot template for the following business:

Business Type: ${request.businessType}
Business Name: ${request.businessName}
Description: ${request.description}
${request.services ? `Services Offered: ${request.services.join(', ')}` : ''}
${request.bookingRequired !== undefined ? `Booking Required: ${request.bookingRequired ? 'Yes' : 'No'}` : ''}
${request.paymentMethods ? `Payment Methods: ${request.paymentMethods.join(', ')}` : ''}
${request.additionalRequirements ? `Additional Requirements: ${request.additionalRequirements}` : ''}

Please use the generate_template tool to create a complete, production-ready template following BotFlow's standards.

The template should:
1. Have a professional, friendly tone appropriate for ${request.businessType}
2. Include all necessary intents (booking, inquiry, pricing, location, etc.)
3. Specify required fields for onboarding (business name, location, hours, etc.)
4. Include South African localization
5. Recommend appropriate integrations
6. Define clear handoff conditions

Make it conversational and natural, like a real receptionist or customer service agent would speak.`;
  }

  /**
   * Process Claude's response and extract template
   * @private
   */
  private processTemplateResponse(
    response: Anthropic.Messages.Message,
    request: any
  ): {
    template: BotTemplate;
    explanation: string;
    recommendedIntegrations: string[];
  } {
    // Find tool use in response
    const toolUse = response.content.find(
      (block) => block.type === 'tool_use'
    ) as Anthropic.Messages.ToolUseBlock | undefined;

    if (!toolUse || toolUse.name !== 'generate_template') {
      throw new Error('Claude did not generate a template');
    }

    const templateData = toolUse.input as any;

    // Find text explanation
    const textBlocks = response.content.filter(
      (block) => block.type === 'text'
    ) as Anthropic.Messages.TextBlock[];
    const explanation = textBlocks.map((block) => block.text).join('\n\n');

    // Build full template object
    const template: any = {
      vertical: templateData.vertical,
      name: templateData.name,
      description: templateData.description,
      tagline: templateData.tagline || `Automate your ${request.businessType} customer service`,
      icon: templateData.icon || '🤖',
      tier: templateData.tier || 3,
      category: this.categorizeVertical(templateData.vertical),
      required_fields: templateData.required_fields || [],
      conversation_flow: templateData.conversation_flow || {},
      example_prompts: templateData.example_prompts || [
        'I need help',
        'What are your prices?',
        'Where are you located?',
      ],
      integrations: templateData.required_integrations || [],
      is_published: false, // Needs review before publishing
      created_by: 'ralph',
      version: 1,
    };

    return {
      template,
      explanation,
      recommendedIntegrations: template.integrations,
    };
  }

  /**
   * Categorize vertical into BotFlow category
   * @private
   */
  private categorizeVertical(vertical: string): string {
    const categoryMap: Record<string, string> = {
      // Service businesses
      taxi: 'transportation',
      car_wash: 'automotive',
      car_rental: 'automotive',
      plumber: 'home_services',
      cleaning: 'home_services',
      mechanic: 'automotive',

      // Health & wellness
      medical: 'healthcare',
      doctor: 'healthcare',
      dentist: 'healthcare',
      pharmacy: 'healthcare',
      veterinarian: 'healthcare',
      gym: 'fitness',
      salon: 'beauty',

      // Hospitality
      restaurant: 'food_beverage',
      hotel: 'hospitality',
      airbnb: 'hospitality',

      // Professional services
      real_estate: 'professional_services',
      lawyer: 'professional_services',
      accountant: 'professional_services',
      tutor: 'education',
      travel_agency: 'professional_services',

      // Retail & E-commerce
      retail: 'retail',
      ecommerce: 'ecommerce',
    };

    return categoryMap[vertical] || 'general';
  }
}

// Singleton instance
export const ralphService = new RalphService();
