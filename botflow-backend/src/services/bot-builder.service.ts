/**
 * Bot Builder Service
 *
 * GPT-4 powered natural language → Blueprint JSON conversion
 *
 * Features:
 * - Intent analysis from user descriptions
 * - Blueprint generation with validation
 * - Optimization suggestions
 * - Conversational bot building
 * - Node recommendations
 */

import OpenAI from 'openai';
import { Blueprint } from '../types/workflow.js';
import { getNodeLibrary } from './node-library.js';
import { WorkflowCompiler } from './workflow-compiler.js';
import {
  PROMPTS,
  fillPromptTemplate,
  createNodeLibrarySummary,
  getBlueprintSchema
} from '../prompts/bot-builder-prompts.js';

/**
 * Intent Analysis - Extracted workflow requirements
 */
export interface IntentAnalysis {
  trigger: {
    type: 'keyword' | 'any_message' | 'webhook' | 'schedule';
    description: string;
    suggested_node: string;
    config_hints?: Record<string, any>;
  };
  steps: Array<{
    action: string;
    description: string;
    suggested_node: string;
    config_hints?: Record<string, any>;
  }>;
  conditions: Array<{
    condition: string;
    true_path: string;
    false_path: string;
  }>;
  integrations: Array<{
    service: string;
    purpose: string;
  }>;
  variables: string[];
}

/**
 * Blueprint Generation Result
 */
export interface BlueprintGenerationResult {
  blueprint: Blueprint;
  confidence: number; // 0-1 (how confident we are in the Blueprint)
  warnings: string[];
  suggestions: string[];
}

/**
 * Conversational Builder Response
 */
export interface ConversationalResponse {
  response: string;
  intent?: IntentAnalysis;
  blueprint?: Blueprint;
  complete: boolean;
}

/**
 * Bot Builder Service - GPT-4 powered workflow generation
 */
export class BotBuilderService {
  private openai: OpenAI;
  private compiler: WorkflowCompiler;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for Bot Builder Service');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.compiler = new WorkflowCompiler();
  }

  /**
   * Analyze user intent and extract workflow requirements
   *
   * @param description - Natural language bot description
   * @param botId - Bot ID for context
   * @returns Structured intent analysis
   *
   * @example
   * ```ts
   * const intent = await service.analyzeIntent(
   *   "Bot that asks for order number and looks it up in Shopify",
   *   "bot_123"
   * );
   * ```
   */
  async analyzeIntent(
    description: string,
    botId: string
  ): Promise<IntentAnalysis> {
    const nodeLibrary = getNodeLibrary();
    const nodes = nodeLibrary.listNodes();
    const nodeSummary = createNodeLibrarySummary(nodes);

    const prompt = fillPromptTemplate(PROMPTS.INTENT_ANALYSIS, {
      user_description: description,
      node_library_summary: nodeSummary
    });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a workflow analysis expert specializing in WhatsApp bot automation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3 // Low temperature for consistent analysis
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const result = JSON.parse(content);
    return result as IntentAnalysis;
  }

  /**
   * Generate Blueprint JSON from intent analysis
   *
   * @param intent - Analyzed intent
   * @param botId - Bot ID to include in Blueprint
   * @returns Blueprint with confidence score, warnings, and suggestions
   *
   * @example
   * ```ts
   * const result = await service.generateBlueprint(intent, "bot_123");
   * if (result.confidence > 0.8) {
   *   console.log("High confidence Blueprint!", result.blueprint);
   * }
   * ```
   */
  async generateBlueprint(
    intent: IntentAnalysis,
    botId: string
  ): Promise<BlueprintGenerationResult> {
    const nodeLibrary = getNodeLibrary();
    const nodes = nodeLibrary.listNodes();

    // Create detailed node information for Blueprint generation
    const nodeDetails = nodes.map(node => ({
      type: node.type,
      category: node.category,
      description: node.description,
      inputs: node.inputs.map((input: any) => ({
        name: input.name,
        type: input.type,
        required: input.required,
        description: input.description
      })),
      outputs: node.outputs
    }));

    const prompt = fillPromptTemplate(PROMPTS.BLUEPRINT_GENERATION, {
      intent_analysis: JSON.stringify(intent, null, 2),
      node_library: JSON.stringify(nodeDetails, null, 2),
      blueprint_schema: getBlueprintSchema(),
      bot_id: botId
    });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a workflow compiler. Generate valid Blueprint JSON that implements the user\'s intent.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2 // Very low temperature for consistent structure
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const result = JSON.parse(content);
    let blueprint = result.blueprint || result as Blueprint;

    // Ensure bot_id is set
    if (!blueprint.bot_id || blueprint.bot_id === '{{bot_id}}') {
      blueprint.bot_id = botId;
    }

    // Validate the generated Blueprint
    const validation = this.compiler.validate(blueprint);

    // Calculate confidence score
    const confidence = this.calculateConfidence(blueprint, validation);

    // Extract warnings from validation
    const warnings = validation.errors.map(e => e.message);

    // Generate optimization suggestions
    const suggestions = await this.generateOptimizations(blueprint);

    return {
      blueprint,
      confidence,
      warnings,
      suggestions
    };
  }

  /**
   * Generate optimization suggestions for a Blueprint
   *
   * @param blueprint - Blueprint to analyze
   * @returns List of actionable suggestions
   *
   * @example
   * ```ts
   * const suggestions = await service.generateOptimizations(blueprint);
   * suggestions.forEach(s => console.log(s));
   * ```
   */
  async generateOptimizations(blueprint: Blueprint): Promise<string[]> {
    const prompt = fillPromptTemplate(PROMPTS.OPTIMIZATION, {
      blueprint: JSON.stringify(blueprint, null, 2)
    });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a workflow optimization expert. Provide specific, actionable improvements.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return [];
    }

    // Parse suggestions from response
    // Look for numbered list items (1., 2., 3., etc.)
    const suggestions = content
      .split('\n')
      .filter(line => line.trim().match(/^\d+\./))
      .map(line => line.trim());

    return suggestions;
  }

  /**
   * Interactive conversational bot building
   *
   * @param messages - Conversation history
   * @param botId - Bot ID for context
   * @returns Assistant response with optional intent/blueprint if complete
   *
   * @example
   * ```ts
   * const result = await service.conversationalBuilder([
   *   { role: 'user', content: 'I want to make a bot for my store' }
   * ], 'bot_123');
   *
   * if (result.complete) {
   *   console.log('Bot ready!', result.blueprint);
   * } else {
   *   console.log('Next question:', result.response);
   * }
   * ```
   */
  async conversationalBuilder(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    botId: string
  ): Promise<ConversationalResponse> {
    const nodeLibrary = getNodeLibrary();
    const nodes = nodeLibrary.listNodes();
    const nodeSummary = createNodeLibrarySummary(nodes);

    const systemPrompt = fillPromptTemplate(PROMPTS.CONVERSATIONAL_BUILDER, {
      node_library_summary: nodeSummary
    });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const assistantMessage = content;

    // Check if we have enough information to generate
    // Heuristic: At least 3 user messages with sufficient detail
    const userMessages = messages.filter(m => m.role === 'user');
    const totalWords = userMessages
      .map(m => m.content.split(/\s+/).length)
      .reduce((a, b) => a + b, 0);

    const hasEnoughInfo = userMessages.length >= 3 && totalWords >= 30;

    // Check if assistant said they're ready to generate
    const readyToGenerate = assistantMessage.toLowerCase().includes('generating') ||
                           assistantMessage.toLowerCase().includes('i have everything');

    if (hasEnoughInfo || readyToGenerate) {
      try {
        // Extract description from conversation
        const description = userMessages
          .map(m => m.content)
          .join('\n');

        const intent = await this.analyzeIntent(description, botId);
        const result = await this.generateBlueprint(intent, botId);

        return {
          response: assistantMessage,
          intent,
          blueprint: result.blueprint,
          complete: true
        };
      } catch (error) {
        // If generation fails, continue conversation
        return {
          response: assistantMessage,
          complete: false
        };
      }
    }

    return {
      response: assistantMessage,
      complete: false
    };
  }

  /**
   * Calculate confidence score for generated Blueprint
   *
   * Score based on:
   * - Validation errors (major penalty)
   * - Validation warnings (minor penalty)
   * - Missing descriptions (minor penalty)
   * - Workflow complexity (too simple = penalty)
   *
   * @param blueprint - Blueprint to score
   * @param validation - Validation result
   * @returns Confidence score 0-1
   */
  private calculateConfidence(blueprint: Blueprint, validation: any): number {
    let score = 1.0;

    // Deduct for validation errors
    score -= Math.min(validation.errors.length * 0.2, 0.8); // Max 0.8 penalty

    // Deduct for warnings
    score -= Math.min(validation.warnings.length * 0.1, 0.3); // Max 0.3 penalty

    // Deduct for missing description
    if (!blueprint.description || blueprint.description.trim() === '') {
      score -= 0.05;
    }

    // Deduct for too-simple workflows (likely incomplete)
    if (blueprint.nodes.length < 2) {
      score -= 0.3;
    }

    // Deduct if no edges (disconnected workflow)
    if (blueprint.edges.length === 0 && blueprint.nodes.length > 1) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }
}

/**
 * Singleton instance
 */
let instance: BotBuilderService | null = null;

/**
 * Get Bot Builder Service singleton
 *
 * @returns BotBuilderService instance
 *
 * @example
 * ```ts
 * const service = getBotBuilderService();
 * const intent = await service.analyzeIntent('...', 'bot_123');
 * ```
 */
export function getBotBuilderService(): BotBuilderService {
  if (!instance) {
    instance = new BotBuilderService();
  }
  return instance;
}
