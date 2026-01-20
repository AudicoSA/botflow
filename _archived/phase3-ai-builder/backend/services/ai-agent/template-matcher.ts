/**
 * Template Matcher Service (Phase 3 Week 3)
 *
 * Matches user intents to workflow templates using a weighted scoring algorithm.
 * Considers keywords, intent type, integrations, vertical, and popularity.
 */

import {
  WorkflowTemplate,
  ParsedIntent,
  TemplateMatch,
  TemplateVariable
} from '../../types/ai-agent.js';
import { Blueprint, BlueprintNode, BlueprintEdge } from '../../types/workflow.js';
import { getTemplateLibrary, TemplateLibraryService } from './template-library.js';
import { logger } from '../../config/logger.js';

/**
 * Weights for different match factors (should sum to 1.0)
 */
const MATCH_WEIGHTS = {
  keywords: 0.30,        // Trigger phrase and keyword matching
  intentType: 0.25,      // Workflow type matching
  integrations: 0.25,    // User has required integrations
  vertical: 0.15,        // Business vertical match
  popularity: 0.05       // Template popularity boost
};

/**
 * Minimum confidence threshold for template suggestions
 */
const MIN_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Template customization request
 */
export interface TemplateCustomization {
  variableValues: Record<string, unknown>;
  fieldConfig: Record<string, unknown>;
}

/**
 * Template Match Result with additional metadata
 */
export interface TemplateMatchResult extends TemplateMatch {
  requiredCustomizations: string[];
  canInstantiate: boolean;
}

/**
 * Workflow type mappings to common keywords
 */
const WORKFLOW_TYPE_KEYWORDS: Record<string, string[]> = {
  order_tracking: ['order', 'track', 'tracking', 'delivery', 'status', 'package', 'shipment', 'where is'],
  booking: ['book', 'booking', 'appointment', 'schedule', 'reserve', 'reservation', 'slot'],
  faq: ['faq', 'question', 'answer', 'help', 'support', 'info', 'information'],
  payment: ['pay', 'payment', 'invoice', 'bill', 'checkout', 'money', 'price'],
  notification: ['notify', 'notification', 'remind', 'reminder', 'alert', 'confirm', 'confirmation'],
  support: ['support', 'ticket', 'issue', 'problem', 'help', 'complaint'],
  ecommerce: ['shop', 'store', 'product', 'catalog', 'stock', 'inventory', 'buy', 'purchase']
};

/**
 * Template Matcher Service
 */
export class TemplateMatcherService {
  private templateLibrary: TemplateLibraryService;

  constructor() {
    this.templateLibrary = getTemplateLibrary();
  }

  /**
   * Find matching templates for a parsed intent
   *
   * @param intent - Parsed user intent
   * @param availableIntegrations - Integrations the user has enabled
   * @param vertical - User's business vertical
   * @param limit - Maximum number of matches to return
   */
  async findMatches(
    intent: ParsedIntent,
    availableIntegrations: string[] = [],
    vertical?: string,
    limit = 5
  ): Promise<TemplateMatchResult[]> {
    try {
      // Get all public templates
      const { items: templates } = await this.templateLibrary.getTemplates({
        limit: 100,
        isPublic: true
      });

      if (templates.length === 0) {
        logger.warn('No templates found in library');
        return [];
      }

      // Score each template
      const scored = templates.map(template => ({
        template,
        ...this.calculateMatchScore(template, intent, availableIntegrations, vertical)
      }));

      // Filter by minimum threshold and sort by score
      const matches = scored
        .filter(s => s.score >= MIN_CONFIDENCE_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Build match results
      return matches.map(m => this.buildMatchResult(m.template, m, availableIntegrations));
    } catch (error) {
      logger.error({ error, intent }, 'Error finding template matches');
      return [];
    }
  }

  /**
   * Find the best matching template for an intent
   */
  async findBestMatch(
    intent: ParsedIntent,
    availableIntegrations: string[] = [],
    vertical?: string
  ): Promise<TemplateMatchResult | null> {
    const matches = await this.findMatches(intent, availableIntegrations, vertical, 1);
    return matches[0] || null;
  }

  /**
   * Calculate match score for a template against an intent
   */
  private calculateMatchScore(
    template: WorkflowTemplate,
    intent: ParsedIntent,
    availableIntegrations: string[],
    vertical?: string
  ): {
    score: number;
    keywordScore: number;
    intentScore: number;
    integrationScore: number;
    verticalScore: number;
    popularityScore: number;
    matchedPhrases: string[];
    reasoning: string;
  } {
    // 1. Keyword matching (30%)
    const keywordResult = this.calculateKeywordScore(template, intent);

    // 2. Intent type matching (25%)
    const intentScore = this.calculateIntentTypeScore(template, intent);

    // 3. Integration matching (25%)
    const integrationScore = this.calculateIntegrationScore(template, availableIntegrations);

    // 4. Vertical matching (15%)
    const verticalScore = this.calculateVerticalScore(template, vertical);

    // 5. Popularity (5%)
    const popularityScore = this.calculatePopularityScore(template);

    // Weighted total
    const score =
      keywordResult.score * MATCH_WEIGHTS.keywords +
      intentScore * MATCH_WEIGHTS.intentType +
      integrationScore * MATCH_WEIGHTS.integrations +
      verticalScore * MATCH_WEIGHTS.vertical +
      popularityScore * MATCH_WEIGHTS.popularity;

    // Build reasoning
    const reasons: string[] = [];
    if (keywordResult.score > 0.5) reasons.push(`Matches keywords: ${keywordResult.matchedPhrases.join(', ')}`);
    if (intentScore > 0.5) reasons.push(`Matches workflow type`);
    if (integrationScore === 1) reasons.push(`You have all required integrations`);
    else if (integrationScore < 1) reasons.push(`Some integrations may be needed`);
    if (verticalScore > 0) reasons.push(`Designed for your business type`);

    return {
      score,
      keywordScore: keywordResult.score,
      intentScore,
      integrationScore,
      verticalScore,
      popularityScore,
      matchedPhrases: keywordResult.matchedPhrases,
      reasoning: reasons.join('. ') || 'General match based on description'
    };
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordScore(
    template: WorkflowTemplate,
    intent: ParsedIntent
  ): { score: number; matchedPhrases: string[] } {
    const message = intent.rawMessage.toLowerCase();
    const matchedPhrases: string[] = [];

    // Check trigger phrases (exact or fuzzy match)
    for (const phrase of template.triggerPhrases) {
      const phraseLower = phrase.toLowerCase();
      if (message.includes(phraseLower)) {
        matchedPhrases.push(phrase);
      }
    }

    // Also extract keywords from the message
    const messageWords = message.split(/\s+/).filter(w => w.length > 2);

    // Check keywords in template
    for (const keyword of (template as any).keywords || []) {
      const keywordLower = keyword.toLowerCase();
      if (messageWords.includes(keywordLower) || message.includes(keywordLower)) {
        if (!matchedPhrases.includes(keyword)) {
          matchedPhrases.push(keyword);
        }
      }
    }

    // Also check entities from intent
    for (const entity of intent.entities) {
      const entityValue = entity.value.toLowerCase();
      if (template.triggerPhrases.some(p => p.toLowerCase().includes(entityValue))) {
        matchedPhrases.push(entity.value);
      }
    }

    // Calculate score based on number of matches
    const maxPossible = template.triggerPhrases.length + ((template as any).keywords?.length || 0);
    const score = maxPossible > 0 ? Math.min(matchedPhrases.length / Math.max(maxPossible * 0.3, 1), 1) : 0;

    return { score, matchedPhrases: Array.from(new Set(matchedPhrases)) };
  }

  /**
   * Calculate intent type match score
   */
  private calculateIntentTypeScore(
    template: WorkflowTemplate,
    intent: ParsedIntent
  ): number {
    if (!intent.workflowType) return 0.3; // Neutral score if no type detected

    // Direct category match
    if (template.category === intent.workflowType) {
      return 1.0;
    }

    // Check if workflow type maps to template category
    const workflowTypeKeywords = WORKFLOW_TYPE_KEYWORDS[intent.workflowType] || [];
    const templateName = template.name.toLowerCase();
    const templateDesc = template.description.toLowerCase();

    for (const keyword of workflowTypeKeywords) {
      if (templateName.includes(keyword) || templateDesc.includes(keyword)) {
        return 0.7;
      }
    }

    // Partial match based on category similarity
    const categoryMap: Record<string, string[]> = {
      ecommerce: ['order_tracking', 'payment', 'notification'],
      booking: ['booking', 'notification'],
      support: ['faq', 'support'],
      payment: ['payment', 'ecommerce'],
      notification: ['booking', 'order_tracking', 'payment']
    };

    const relatedTypes = categoryMap[template.category] || [];
    if (relatedTypes.includes(intent.workflowType)) {
      return 0.5;
    }

    return 0.1;
  }

  /**
   * Calculate integration match score
   */
  private calculateIntegrationScore(
    template: WorkflowTemplate,
    availableIntegrations: string[]
  ): number {
    if (template.requiredIntegrations.length === 0) {
      return 1.0; // No integrations required
    }

    const availableSet = new Set(availableIntegrations.map(i => i.toLowerCase()));
    const matched = template.requiredIntegrations.filter(
      int => availableSet.has(int.toLowerCase())
    );

    return matched.length / template.requiredIntegrations.length;
  }

  /**
   * Calculate vertical match score
   */
  private calculateVerticalScore(
    template: WorkflowTemplate,
    vertical?: string
  ): number {
    if (!template.vertical || !vertical) {
      return 0.5; // Neutral if no vertical specified
    }

    if (template.vertical.toLowerCase() === vertical.toLowerCase()) {
      return 1.0;
    }

    // Related verticals
    const relatedVerticals: Record<string, string[]> = {
      ecommerce: ['retail', 'shop', 'store'],
      restaurant: ['food', 'cafe', 'catering'],
      salon: ['beauty', 'spa', 'wellness'],
      medical: ['doctor', 'clinic', 'healthcare'],
      taxi: ['transport', 'shuttle', 'logistics'],
      hotel: ['airbnb', 'guesthouse', 'accommodation']
    };

    const related = relatedVerticals[template.vertical.toLowerCase()] || [];
    if (related.includes(vertical.toLowerCase())) {
      return 0.7;
    }

    return 0.2;
  }

  /**
   * Calculate popularity score (normalized 0-1)
   */
  private calculatePopularityScore(template: WorkflowTemplate): number {
    // Normalize popularity to 0-1 (assuming max score is 100)
    return Math.min(template.popularityScore / 100, 1);
  }

  /**
   * Build a full match result with customization requirements
   */
  private buildMatchResult(
    template: WorkflowTemplate,
    scoreData: {
      score: number;
      matchedPhrases: string[];
      reasoning: string;
    },
    availableIntegrations: string[]
  ): TemplateMatchResult {
    // Find missing integrations
    const availableSet = new Set(availableIntegrations.map(i => i.toLowerCase()));
    const missingIntegrations = template.requiredIntegrations.filter(
      int => !availableSet.has(int.toLowerCase())
    );

    // Find required customizations (variables that are required)
    const requiredCustomizations = template.variables
      .filter(v => v.required)
      .map(v => v.label || v.name);

    return {
      template,
      score: scoreData.score,
      matchedPhrases: scoreData.matchedPhrases,
      missingIntegrations,
      reasoning: scoreData.reasoning,
      requiredCustomizations,
      canInstantiate: missingIntegrations.length === 0
    };
  }

  /**
   * Customize a template with user-provided values
   *
   * @param template - The template to customize
   * @param customization - Values for variables and field config
   */
  async customizeTemplate(
    template: WorkflowTemplate,
    customization: TemplateCustomization
  ): Promise<Blueprint> {
    // Deep clone the blueprint
    const blueprint: Blueprint = JSON.parse(JSON.stringify(template.blueprint));

    // Replace variable placeholders in node configurations
    for (const node of blueprint.nodes) {
      this.replaceVariablesInNode(node, customization.variableValues);
    }

    // Apply field configurations
    if (customization.fieldConfig) {
      this.applyFieldConfig(blueprint, customization.fieldConfig);
    }

    // Update workflow name if customized
    if (customization.variableValues.workflowName) {
      blueprint.name = String(customization.variableValues.workflowName);
    }

    return blueprint;
  }

  /**
   * Replace variable placeholders in a node
   */
  private replaceVariablesInNode(
    node: BlueprintNode,
    values: Record<string, unknown>
  ): void {
    if (!node.config) return;

    // Convert node config to string and replace {{variable}} patterns
    const configStr = JSON.stringify(node.config);
    const replaced = configStr.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = values[varName];
      if (value === undefined) return match;
      return String(value);
    });

    try {
      node.config = JSON.parse(replaced);
    } catch (e) {
      logger.warn({ node: node.id }, 'Failed to parse replaced node config');
    }
  }

  /**
   * Apply field configuration to blueprint
   */
  private applyFieldConfig(
    blueprint: Blueprint,
    config: Record<string, unknown>
  ): void {
    // Apply global configs to relevant nodes
    for (const [key, value] of Object.entries(config)) {
      switch (key) {
        case 'response_style':
          // Update message nodes with style preference
          for (const node of blueprint.nodes) {
            if (node.type === 'action' && node.config?.actionType === 'send_message') {
              node.config.style = value;
            }
          }
          break;

        case 'error_handling':
          // Add error handling configuration to blueprint variables
          blueprint.variables['_errorHandling'] = String(value);
          break;

        default:
          // Store custom config in blueprint variables
          blueprint.variables[`_config_${key}`] = String(value);
      }
    }
  }

  /**
   * Validate that all required variables have values
   */
  validateCustomization(
    template: WorkflowTemplate,
    customization: TemplateCustomization
  ): { valid: boolean; missing: string[]; errors: string[] } {
    const missing: string[] = [];
    const errors: string[] = [];

    for (const variable of template.variables) {
      const value = customization.variableValues[variable.name];

      // Check required
      if (variable.required && (value === undefined || value === null || value === '')) {
        missing.push(variable.label || variable.name);
        continue;
      }

      // Skip validation if no value
      if (value === undefined || value === null) continue;

      // Type validation
      if (variable.validation) {
        const { pattern, min, max, message } = variable.validation;

        if (pattern && typeof value === 'string') {
          const regex = new RegExp(pattern);
          if (!regex.test(value)) {
            errors.push(message || `${variable.label || variable.name} has invalid format`);
          }
        }

        if (min !== undefined && typeof value === 'number') {
          if (value < min) {
            errors.push(`${variable.label || variable.name} must be at least ${min}`);
          }
        }

        if (max !== undefined && typeof value === 'number') {
          if (value > max) {
            errors.push(`${variable.label || variable.name} must be at most ${max}`);
          }
        }
      }
    }

    return {
      valid: missing.length === 0 && errors.length === 0,
      missing,
      errors
    };
  }

  /**
   * Get templates that match a specific integration
   */
  async getTemplatesForIntegration(
    integrationSlug: string,
    limit = 5
  ): Promise<WorkflowTemplate[]> {
    try {
      const { items } = await this.templateLibrary.getTemplates({
        limit: 100,
        isPublic: true
      });

      return items
        .filter(t =>
          t.requiredIntegrations.some(
            i => i.toLowerCase() === integrationSlug.toLowerCase()
          )
        )
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, limit);
    } catch (error) {
      logger.error({ error, integrationSlug }, 'Error getting templates for integration');
      return [];
    }
  }
}

// Singleton instance
let instance: TemplateMatcherService | null = null;

/**
 * Get the TemplateMatcherService singleton
 */
export function getTemplateMatcher(): TemplateMatcherService {
  if (!instance) {
    instance = new TemplateMatcherService();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetTemplateMatcher(): void {
  instance = null;
}
