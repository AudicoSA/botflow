/**
 * Node Recommendation Engine
 *
 * Intelligent node selection based on user intent and context
 *
 * Features:
 * - Keyword-based node matching
 * - Context-aware recommendations
 * - Confidence scoring
 * - Multi-node suggestions
 */

import { IntentAnalysis } from './bot-builder.service.js';
import { getNodeLibrary } from './node-library.js';

/**
 * Node Recommendation with confidence score
 */
export interface NodeRecommendation {
  node_type: string;
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * Node Recommendation Engine
 */
export class NodeRecommendationEngine {
  /**
   * Keyword patterns for node type matching
   */
  private readonly patterns = {
    // Communication nodes
    ask_question: [/ask|prompt|question|input|collect|gather/i],
    whatsapp_reply: [/reply|send|message|respond|tell/i],
    whatsapp_template: [/template|notification|alert|broadcast/i],

    // Logic nodes
    if_condition: [/if|when|check|condition|depending|based on/i],
    switch_case: [/switch|multiple|options|choose|select/i],
    loop: [/loop|iterate|each|every|repeat|for all/i],

    // Integration nodes
    shopify_lookup: [/shopify|product|order|inventory|stock/i],
    paystack_payment: [/payment|pay|checkout|charge|money/i],
    google_sheets: [/sheet|spreadsheet|google sheet|excel/i],
    knowledge_search: [/search|find|knowledge|document|faq|article/i],
    http_request: [/api|http|call|request|webhook|external/i],
    database_query: [/database|query|sql|lookup|fetch data/i],

    // Utility nodes
    set_variable: [/set|save|store|remember|variable/i],
    delay: [/wait|delay|pause|sleep|hold/i],
    try_catch: [/error|catch|handle|fail|exception/i],
    code_function: [/custom|code|script|function|logic/i]
  };

  /**
   * Recommend nodes based on action description
   *
   * @param action - User's action description
   * @param context - Additional context (optional)
   * @returns Top 3 node recommendations
   *
   * @example
   * ```ts
   * const engine = new NodeRecommendationEngine();
   * const recs = engine.recommendNodes('ask for order number', {});
   * // Returns: [{ node_type: 'ask_question', confidence: 0.95, ... }]
   * ```
   */
  recommendNodes(
    action: string,
    context?: {
      intent?: IntentAnalysis;
      previousNodes?: string[];
      integrations?: string[];
    }
  ): NodeRecommendation[] {
    const recommendations: Map<string, NodeRecommendation> = new Map();

    // Keyword-based matching
    for (const [nodeType, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        if (pattern.test(action)) {
          const existing = recommendations.get(nodeType);
          const confidence = existing ? existing.confidence + 0.15 : 0.7;

          recommendations.set(nodeType, {
            node_type: nodeType,
            confidence: Math.min(confidence, 0.95),
            reasoning: `Action matches ${nodeType} pattern`
          });
        }
      }
    }

    // Context-aware boosting
    if (context) {
      this.applyContextBoost(recommendations, context);
    }

    // Sort by confidence and return top 3
    return Array.from(recommendations.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Score a specific node's relevance to intent
   *
   * @param nodeType - Node type to score
   * @param intent - Intent analysis
   * @returns Relevance score 0-10
   *
   * @example
   * ```ts
   * const score = engine.scoreNode('shopify_lookup', intent);
   * if (score > 7) console.log('Highly relevant!');
   * ```
   */
  scoreNode(nodeType: string, intent: IntentAnalysis): number {
    let score = 0;

    // Check if node is mentioned in steps
    for (const step of intent.steps) {
      if (step.suggested_node === nodeType) {
        score += 10;
      } else if (step.suggested_node?.includes(nodeType.split('_')[0])) {
        score += 3; // Partial match
      }
    }

    // Check if node matches integrations
    for (const integration of intent.integrations) {
      const serviceName = integration.service.toLowerCase();
      if (nodeType.includes(serviceName)) {
        score += 5;
      }
    }

    // Check trigger match
    if (intent.trigger.suggested_node === nodeType) {
      score += 8;
    }

    // Check conditions
    if (intent.conditions.length > 0 && nodeType === 'if_condition') {
      score += 5;
    }

    return Math.min(score, 10);
  }

  /**
   * Suggest alternative nodes for a given node type
   *
   * @param nodeType - Current node type
   * @returns Alternative node suggestions
   *
   * @example
   * ```ts
   * const alternatives = engine.suggestAlternatives('if_condition');
   * // Returns: ['switch_case', 'try_catch', ...]
   * ```
   */
  suggestAlternatives(nodeType: string): string[] {
    const alternatives: Record<string, string[]> = {
      if_condition: ['switch_case', 'try_catch'],
      switch_case: ['if_condition'],
      ask_question: ['whatsapp_reply', 'set_variable'],
      whatsapp_reply: ['whatsapp_template'],
      whatsapp_template: ['whatsapp_reply'],
      http_request: ['database_query', 'code_function'],
      database_query: ['http_request', 'knowledge_search'],
      knowledge_search: ['database_query', 'http_request'],
      loop: ['code_function'],
      code_function: ['try_catch']
    };

    return alternatives[nodeType] || [];
  }

  /**
   * Validate node selection for workflow
   *
   * @param nodes - Selected node types
   * @returns Validation result
   *
   * @example
   * ```ts
   * const validation = engine.validateNodeSelection(['whatsapp_trigger', 'ask_question']);
   * if (!validation.valid) console.log(validation.issues);
   * ```
   */
  validateNodeSelection(nodes: string[]): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for trigger node
    const hasTrigger = nodes.includes('whatsapp_trigger');
    if (!hasTrigger) {
      issues.push('Missing trigger node (whatsapp_trigger)');
      suggestions.push('Add whatsapp_trigger as the first node');
    }

    // Check for reply node
    const hasReply = nodes.some(n => n === 'whatsapp_reply' || n === 'whatsapp_template');
    if (!hasReply) {
      suggestions.push('Consider adding whatsapp_reply to respond to customers');
    }

    // Check for error handling in integration nodes
    const hasIntegrations = nodes.some(n =>
      n.includes('shopify') || n.includes('paystack') || n.includes('http')
    );
    const hasErrorHandling = nodes.includes('try_catch');

    if (hasIntegrations && !hasErrorHandling) {
      suggestions.push('Add try_catch for error handling on integration nodes');
    }

    // Check for conditions without if/switch
    const hasConditionLogic = nodes.includes('if_condition') || nodes.includes('switch_case');
    if (nodes.length > 3 && !hasConditionLogic) {
      suggestions.push('Consider adding if_condition for branching logic');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Get node category statistics
   *
   * @param nodes - List of node types
   * @returns Category distribution
   */
  getNodeCategoryStats(nodes: string[]): Record<string, number> {
    const nodeLibrary = getNodeLibrary();
    const stats: Record<string, number> = {};

    for (const nodeType of nodes) {
      const node = nodeLibrary.getNode(nodeType);
      if (node) {
        stats[node.category] = (stats[node.category] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Apply context-based confidence boosting
   */
  private applyContextBoost(
    recommendations: Map<string, NodeRecommendation>,
    context: {
      intent?: IntentAnalysis;
      previousNodes?: string[];
      integrations?: string[];
    }
  ): void {
    // Boost based on intent integrations
    if (context.intent?.integrations) {
      for (const integration of context.intent.integrations) {
        const service = integration.service.toLowerCase();
        for (const [nodeType, rec] of recommendations.entries()) {
          if (nodeType.includes(service)) {
            rec.confidence = Math.min(rec.confidence + 0.2, 0.98);
            rec.reasoning += ` (matches ${integration.service} integration)`;
          }
        }
      }
    }

    // Boost based on previous nodes (flow context)
    if (context.previousNodes) {
      const lastNode = context.previousNodes[context.previousNodes.length - 1];

      // If last node was ask_question, likely next is set_variable or if_condition
      if (lastNode === 'ask_question') {
        this.boostNode(recommendations, 'set_variable', 0.15, 'follows ask_question');
        this.boostNode(recommendations, 'if_condition', 0.1, 'validates user input');
      }

      // If last node was an integration, likely next is if_condition or whatsapp_reply
      if (lastNode.includes('shopify') || lastNode.includes('paystack') || lastNode.includes('http')) {
        this.boostNode(recommendations, 'if_condition', 0.15, 'handles integration result');
        this.boostNode(recommendations, 'whatsapp_reply', 0.1, 'sends result to customer');
      }

      // If we have conditions, boost switch_case as alternative
      if (context.intent?.conditions && context.intent.conditions.length > 2) {
        this.boostNode(recommendations, 'switch_case', 0.1, 'multiple conditions detected');
      }
    }

    // Boost error handling for integrations
    if (context.integrations && context.integrations.length > 0) {
      this.boostNode(recommendations, 'try_catch', 0.15, 'error handling for integrations');
    }
  }

  /**
   * Helper to boost a specific node's confidence
   */
  private boostNode(
    recommendations: Map<string, NodeRecommendation>,
    nodeType: string,
    boost: number,
    reason: string
  ): void {
    const existing = recommendations.get(nodeType);
    if (existing) {
      existing.confidence = Math.min(existing.confidence + boost, 0.98);
      existing.reasoning += ` + ${reason}`;
    } else {
      recommendations.set(nodeType, {
        node_type: nodeType,
        confidence: 0.6 + boost,
        reasoning: reason
      });
    }
  }
}

/**
 * Singleton instance
 */
let instance: NodeRecommendationEngine | null = null;

/**
 * Get Node Recommendation Engine singleton
 *
 * @returns NodeRecommendationEngine instance
 *
 * @example
 * ```ts
 * const engine = getNodeRecommendationEngine();
 * const recs = engine.recommendNodes('send payment link');
 * ```
 */
export function getNodeRecommendationEngine(): NodeRecommendationEngine {
  if (!instance) {
    instance = new NodeRecommendationEngine();
  }
  return instance;
}
