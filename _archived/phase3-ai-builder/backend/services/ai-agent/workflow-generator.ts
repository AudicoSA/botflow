/**
 * Workflow Generator Service (Phase 3 Week 1)
 *
 * Generates complete workflows from parsed intents.
 * Uses GPT-4 with structured output and the node library.
 *
 * Responsibilities:
 * - Generate Blueprint JSON from parsed intent
 * - Refine existing workflows based on modifications
 * - Validate generated workflows
 * - Suggest optimizations and alternatives
 * - Handle error recovery and auto-fixes
 */

import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import {
  ParsedIntent,
  GenerationResult,
  WorkflowModification,
  AutoFixSuggestion,
  ValidationIssue,
  ConversationContext
} from '../../types/ai-agent.js';
import { Blueprint, BlueprintNode, BlueprintEdge, ValidationResult } from '../../types/workflow.js';
import { getNodeLibrary, NodeLibrary } from '../node-library.js';
import { WorkflowCompiler } from '../workflow-compiler.js';
import { createNodeLibrarySummary, getBlueprintSchema } from '../../prompts/bot-builder-prompts.js';

/**
 * Configuration for the Workflow Generator
 */
interface WorkflowGeneratorConfig {
  model: string;
  temperature: number;
  maxRetries: number;
  enableAutoFix: boolean;
}

const DEFAULT_CONFIG: WorkflowGeneratorConfig = {
  model: 'gpt-4o',
  temperature: 0.2,
  maxRetries: 2,
  enableAutoFix: true
};

/**
 * System prompt for workflow generation
 */
const WORKFLOW_GENERATOR_SYSTEM_PROMPT = `You are an expert workflow compiler for BotFlow, a WhatsApp automation platform.

Your job is to generate valid Blueprint JSON workflows from analyzed user intents.

## Blueprint Structure
A Blueprint consists of:
- bot_id: UUID of the bot
- version: Semantic version (e.g., "1.0.0")
- name: Human-readable name
- description: What the workflow does
- nodes: Array of workflow nodes
- edges: Array of connections between nodes
- variables: Dictionary of workflow variables
- credentials: Array of required credentials

## Node Structure
Each node has:
- id: Unique string ID (use "1", "2", "3", etc.)
- type: Node type from the library
- name: Human-readable name (optional)
- config: Node-specific configuration
- position: {x, y} coordinates (optional, will auto-layout)

## Edge Structure
Each edge has:
- id: Unique ID (e.g., "e1", "e2")
- source: Source node ID
- target: Target node ID
- sourceHandle: Output handle for conditional nodes ("true", "false", "success", "error")
- label: Description of the connection (optional)

## Variable Syntax
Use {{variable_name}} for dynamic values:
- {{customer_phone}} - Customer's WhatsApp number
- {{customer_message}} - Customer's message
- {{bot_id}} - Bot identifier
- {{node_X.field}} - Reference output from node X

## Generation Rules
1. ALWAYS start with a trigger node (whatsapp_trigger)
2. ALWAYS end with a response node (send_message or send_template)
3. Connect ALL nodes - no orphans
4. Use appropriate handles for conditional nodes
5. Validate all node types exist in the library
6. Include error handling for critical operations
7. Keep workflows simple and focused

## Node Types
- Triggers: whatsapp_trigger
- Actions: send_message, send_template, ask_question, delay
- Conditions: if_condition, switch
- Integrations: database_query, api_request, shopify_lookup, paystack_payment
- Utilities: set_variable, code_execution, ai_response

## South African Context
- Support Rands (R) for currency
- Consider load shedding in error messages
- Support local integrations (PayFast, Yoco, The Courier Guy)
- Be friendly but professional in message tone

Output ONLY valid JSON with no additional text.`;

/**
 * Workflow Generator Service
 */
export class WorkflowGenerator {
  private openai: OpenAI;
  private config: WorkflowGeneratorConfig;
  private compiler: WorkflowCompiler;

  constructor(config: Partial<WorkflowGeneratorConfig> = {}) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for Workflow Generator');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.compiler = new WorkflowCompiler();
  }

  /**
   * Generate a workflow from parsed intent
   *
   * @param intent - Parsed user intent
   * @param context - Conversation context
   * @returns Generation result with workflow and metadata
   */
  async generateFromIntent(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const nodeLibrary = await getNodeLibrary();
      const nodes = nodeLibrary.listNodes();

      // Build the generation prompt
      const prompt = this.buildGenerationPrompt(intent, context, nodes);

      let workflow: Blueprint | null = null;
      let lastError: Error | null = null;

      // Try to generate with retries
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          const response = await this.openai.chat.completions.create({
            model: this.config.model,
            messages: [
              { role: 'system', content: WORKFLOW_GENERATOR_SYSTEM_PROMPT },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: this.config.temperature
          });

          const content = response.choices[0].message.content;
          if (!content) {
            throw new Error('OpenAI returned empty response');
          }

          const parsed = JSON.parse(content);
          workflow = this.normalizeWorkflow(parsed, context.botId);
          break;
        } catch (error) {
          lastError = error as Error;
          if (attempt < this.config.maxRetries) {
            await this.delay(1000 * (attempt + 1));
          }
        }
      }

      if (!workflow) {
        return {
          success: false,
          workflow: null,
          confidence: 0,
          explanation: 'Failed to generate workflow',
          warnings: [],
          errors: [lastError?.message || 'Unknown error'],
          processingTimeMs: Date.now() - startTime
        };
      }

      // Validate the generated workflow
      const validation = this.validateWorkflow(workflow, nodeLibrary);

      // Auto-fix if enabled and there are issues
      if (this.config.enableAutoFix && validation.errors.length > 0) {
        workflow = await this.autoFixWorkflow(workflow, validation.errors, nodeLibrary);
      }

      // Re-validate after fixes
      const finalValidation = this.validateWorkflow(workflow, nodeLibrary);

      // Calculate confidence
      const confidence = this.calculateConfidence(workflow, finalValidation, intent);

      // Generate explanation
      const explanation = this.generateExplanation(workflow);

      return {
        success: finalValidation.errors.length === 0,
        workflow,
        confidence,
        explanation,
        warnings: finalValidation.warnings.map(w => w.message),
        errors: finalValidation.errors.map(e => e.message),
        processingTimeMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        workflow: null,
        confidence: 0,
        explanation: 'Error during workflow generation',
        warnings: [],
        errors: [(error as Error).message],
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Refine an existing workflow based on modifications
   *
   * @param workflow - Current workflow
   * @param modification - Modification request in natural language
   * @param context - Conversation context
   * @returns Updated workflow
   */
  async refineWorkflow(
    workflow: Blueprint,
    modification: string,
    context: ConversationContext
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const nodeLibrary = await getNodeLibrary();
      const nodes = nodeLibrary.listNodes();

      const prompt = `## Current Workflow
${JSON.stringify(workflow, null, 2)}

## User's Modification Request
"${modification}"

## Available Node Types
${createNodeLibrarySummary(nodes)}

## Task
Modify the workflow according to the user's request. Return the COMPLETE updated workflow JSON.
Keep all existing functionality unless explicitly asked to remove it.

Rules:
1. Preserve existing node IDs when possible
2. Add new nodes with sequential IDs
3. Update edges to maintain connectivity
4. Keep the workflow valid and functional`;

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: WORKFLOW_GENERATOR_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: this.config.temperature
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      const parsed = JSON.parse(content);
      const updatedWorkflow = this.normalizeWorkflow(parsed, context.botId);

      // Validate
      const validation = this.validateWorkflow(updatedWorkflow, nodeLibrary);
      const confidence = this.calculateConfidence(updatedWorkflow, validation);

      return {
        success: validation.errors.length === 0,
        workflow: updatedWorkflow,
        confidence,
        explanation: `Modified workflow: ${modification}`,
        warnings: validation.warnings.map(w => w.message),
        errors: validation.errors.map(e => e.message),
        processingTimeMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        workflow,
        confidence: 0,
        explanation: 'Error during workflow refinement',
        warnings: [],
        errors: [(error as Error).message],
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Explain a workflow in natural language
   *
   * @param workflow - Workflow to explain
   * @returns Human-readable explanation
   */
  async explainWorkflow(workflow: Blueprint): Promise<string> {
    const prompt = `Explain this WhatsApp bot workflow in simple terms that a non-technical business owner would understand.

Workflow:
${JSON.stringify(workflow, null, 2)}

Provide:
1. A brief overview (2-3 sentences)
2. Step-by-step explanation of what happens
3. Any important notes or limitations

Keep it friendly and use South African English.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a friendly bot assistant explaining workflows to South African business owners.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5
      });

      return response.choices[0].message.content || this.generateExplanation(workflow);
    } catch {
      return this.generateExplanation(workflow);
    }
  }

  /**
   * Build the generation prompt
   */
  private buildGenerationPrompt(
    intent: ParsedIntent,
    context: ConversationContext,
    nodes: any[]
  ): string {
    let prompt = `## Task
Generate a complete Blueprint JSON workflow based on the analyzed intent.

## Bot Information
- Bot ID: ${context.botId}
- Organization: ${context.organizationId}
`;

    if (context.userPreferences.vertical) {
      prompt += `- Business Type: ${context.userPreferences.vertical}\n`;
    }

    // Add available integrations
    const enabledIntegrations = context.availableIntegrations
      .filter(i => i.isEnabled)
      .map(i => i.name);
    if (enabledIntegrations.length > 0) {
      prompt += `- Available Integrations: ${enabledIntegrations.join(', ')}\n`;
    }

    // Add gathered requirements
    if (context.gatheredRequirements.length > 0) {
      prompt += `\n## Gathered Requirements\n`;
      context.gatheredRequirements.forEach(req => {
        prompt += `- ${req.key}: ${JSON.stringify(req.value)}\n`;
      });
    }

    // Add the intent
    prompt += `\n## Analyzed Intent
${JSON.stringify(intent, null, 2)}

## Available Node Types
${createNodeLibrarySummary(nodes)}

## Blueprint Schema
${getBlueprintSchema()}

Generate the workflow JSON now.`;

    return prompt;
  }

  /**
   * Normalize workflow structure
   */
  private normalizeWorkflow(parsed: any, botId: string): Blueprint {
    // Handle nested structure if returned
    const workflow = parsed.blueprint || parsed;

    return {
      bot_id: workflow.bot_id || botId,
      version: workflow.version || '1.0.0',
      name: workflow.name || 'Generated Workflow',
      description: workflow.description || '',
      nodes: this.normalizeNodes(workflow.nodes || []),
      edges: this.normalizeEdges(workflow.edges || []),
      variables: workflow.variables || {},
      credentials: workflow.credentials || []
    };
  }

  /**
   * Normalize nodes array
   */
  private normalizeNodes(nodes: any[]): BlueprintNode[] {
    return nodes.map((node, index) => ({
      id: String(node.id || index + 1),
      type: node.type || 'send_message',
      name: node.name,
      config: node.config || {},
      position: node.position || { x: 100, y: 100 + index * 100 }
    }));
  }

  /**
   * Normalize edges array
   */
  private normalizeEdges(edges: any[]): BlueprintEdge[] {
    return edges.map((edge, index) => ({
      id: edge.id || `e${index + 1}`,
      source: String(edge.source),
      target: String(edge.target),
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label
    }));
  }

  /**
   * Validate a workflow
   */
  private validateWorkflow(workflow: Blueprint, nodeLibrary: NodeLibrary): {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Check for trigger node
    const hasTrigger = workflow.nodes.some(n =>
      n.type === 'whatsapp_trigger' || n.type.includes('trigger')
    );
    if (!hasTrigger) {
      errors.push({
        type: 'error',
        code: 'MISSING_TRIGGER',
        message: 'Workflow must have a trigger node'
      });
    }

    // Check for response node
    const hasResponse = workflow.nodes.some(n =>
      n.type === 'send_message' || n.type === 'send_template' || n.type.includes('send')
    );
    if (!hasResponse) {
      warnings.push({
        type: 'warning',
        code: 'MISSING_RESPONSE',
        message: 'Workflow should have at least one response node'
      });
    }

    // Validate each node
    for (const node of workflow.nodes) {
      if (!nodeLibrary.hasNode(node.type)) {
        errors.push({
          type: 'error',
          code: 'INVALID_NODE_TYPE',
          message: `Unknown node type: ${node.type}`,
          nodeId: node.id
        });
      }
    }

    // Check for orphan nodes
    const connectedNodes = new Set<string>();
    for (const edge of workflow.edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    // First node (trigger) doesn't need incoming edge
    const triggerNode = workflow.nodes.find(n =>
      n.type === 'whatsapp_trigger' || n.type.includes('trigger')
    );

    for (const node of workflow.nodes) {
      if (node.id !== triggerNode?.id && !connectedNodes.has(node.id)) {
        warnings.push({
          type: 'warning',
          code: 'ORPHAN_NODE',
          message: `Node "${node.name || node.id}" is not connected`,
          nodeId: node.id
        });
      }
    }

    // Check for invalid edge references
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    for (const edge of workflow.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          type: 'error',
          code: 'INVALID_EDGE_SOURCE',
          message: `Edge references non-existent source node: ${edge.source}`
        });
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          type: 'error',
          code: 'INVALID_EDGE_TARGET',
          message: `Edge references non-existent target node: ${edge.target}`
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Auto-fix common workflow issues
   */
  private async autoFixWorkflow(
    workflow: Blueprint,
    errors: ValidationIssue[],
    nodeLibrary: NodeLibrary
  ): Promise<Blueprint> {
    const fixed = { ...workflow };

    for (const error of errors) {
      switch (error.code) {
        case 'MISSING_TRIGGER':
          // Add a default trigger
          fixed.nodes.unshift({
            id: '0',
            type: 'whatsapp_trigger',
            name: 'Start',
            config: { match_type: 'any' }
          });
          // Connect to first node if exists
          if (fixed.nodes.length > 1) {
            fixed.edges.unshift({
              id: 'e0',
              source: '0',
              target: fixed.nodes[1].id
            });
          }
          break;

        case 'INVALID_NODE_TYPE':
          // Replace unknown node with a placeholder
          const nodeIndex = fixed.nodes.findIndex(n => n.id === error.nodeId);
          if (nodeIndex !== -1) {
            fixed.nodes[nodeIndex] = {
              ...fixed.nodes[nodeIndex],
              type: 'send_message',
              config: {
                message: `[Placeholder: ${fixed.nodes[nodeIndex].type} was not recognized]`
              }
            };
          }
          break;

        case 'INVALID_EDGE_SOURCE':
        case 'INVALID_EDGE_TARGET':
          // Remove invalid edges
          fixed.edges = fixed.edges.filter(e =>
            fixed.nodes.some(n => n.id === e.source) &&
            fixed.nodes.some(n => n.id === e.target)
          );
          break;
      }
    }

    return fixed;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    workflow: Blueprint,
    validation: { errors: ValidationIssue[]; warnings: ValidationIssue[] },
    intent?: ParsedIntent
  ): number {
    let score = 1.0;

    // Deduct for validation errors
    score -= Math.min(validation.errors.length * 0.2, 0.8);

    // Deduct for warnings
    score -= Math.min(validation.warnings.length * 0.05, 0.2);

    // Deduct for missing description
    if (!workflow.description) {
      score -= 0.05;
    }

    // Deduct for very simple workflows
    if (workflow.nodes.length < 2) {
      score -= 0.2;
    }

    // Boost for matching intent
    if (intent && intent.confidence > 0.8) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate a simple explanation for a workflow
   */
  private generateExplanation(workflow: Blueprint): string {
    const nodeCount = workflow.nodes.length;
    const triggerNode = workflow.nodes.find(n =>
      n.type === 'whatsapp_trigger' || n.type.includes('trigger')
    );

    let explanation = `This workflow has ${nodeCount} step${nodeCount === 1 ? '' : 's'}. `;

    if (triggerNode) {
      const matchType = triggerNode.config?.match_type || 'any message';
      explanation += `It starts when a customer sends ${matchType}. `;
    }

    // Summarize main actions
    const actions = workflow.nodes
      .filter(n => !n.type.includes('trigger'))
      .slice(0, 3)
      .map(n => n.name || n.type.replace(/_/g, ' '));

    if (actions.length > 0) {
      explanation += `Main actions: ${actions.join(', ')}.`;
    }

    return explanation;
  }

  /**
   * Delay for the specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance: WorkflowGenerator | null = null;

/**
 * Get the WorkflowGenerator singleton
 */
export function getWorkflowGenerator(): WorkflowGenerator {
  if (!instance) {
    instance = new WorkflowGenerator();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetWorkflowGenerator(): void {
  instance = null;
}
