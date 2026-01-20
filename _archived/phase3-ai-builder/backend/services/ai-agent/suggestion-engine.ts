/**
 * Suggestion Engine Service (Phase 3 Week 4)
 *
 * Generates intelligent, context-aware suggestions for the AI workflow builder.
 * Provides relevant quick replies, next steps, integration recommendations,
 * and workflow improvements based on the current conversation state.
 *
 * Responsibilities:
 * - Generate context-aware suggestions
 * - Suggest next steps based on workflow state
 * - Recommend integrations
 * - Provide improvement suggestions
 * - Adapt suggestions to user preferences
 */

import {
  ConversationContext,
  ConversationState,
  ParsedIntent,
  AvailableIntegration,
  UserPreferences
} from '../../types/ai-agent.js';
import { Blueprint } from '../../types/workflow.js';
import { getPatternLearningService } from './pattern-learning.js';

/**
 * Suggestion with context
 */
export interface Suggestion {
  text: string;
  category: SuggestionCategory;
  priority: number; // Higher = more relevant
  intent?: string; // What this suggestion is for
  context?: string; // Why this suggestion is being made
}

/**
 * Categories of suggestions
 */
export type SuggestionCategory =
  | 'quick_action'    // Common quick actions
  | 'workflow_type'   // Types of workflows to create
  | 'modification'    // Ways to modify current workflow
  | 'integration'     // Integrations to add
  | 'improvement'     // Improvements to workflow
  | 'help'            // Help and guidance
  | 'navigation';     // Navigation actions

/**
 * Integration recommendation
 */
export interface IntegrationRecommendation {
  integration: AvailableIntegration;
  reason: string;
  priority: number;
  wouldImprove: string[];
}

/**
 * Workflow improvement suggestion
 */
export interface ImprovementSuggestion {
  title: string;
  description: string;
  type: 'performance' | 'reliability' | 'user_experience' | 'functionality';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  action: string; // What the user could say to apply this
}

/**
 * Context-specific suggestion templates
 */
const STATE_SUGGESTIONS: Record<ConversationState, Array<Omit<Suggestion, 'priority'>>> = {
  idle: [
    { text: 'Track customer orders', category: 'workflow_type', intent: 'order_tracking' },
    { text: 'Book appointments', category: 'workflow_type', intent: 'booking' },
    { text: 'Answer FAQs', category: 'workflow_type', intent: 'faq' },
    { text: 'Process payments', category: 'workflow_type', intent: 'payment' },
    { text: 'Send notifications', category: 'workflow_type', intent: 'notification' },
    { text: 'Help me decide', category: 'help' }
  ],
  gathering: [
    { text: "That's all I need", category: 'quick_action' },
    { text: 'Skip this question', category: 'quick_action' },
    { text: 'Start over', category: 'navigation' },
    { text: 'What options do I have?', category: 'help' }
  ],
  confirming: [
    { text: 'Deploy it', category: 'quick_action' },
    { text: 'Show me the workflow', category: 'quick_action' },
    { text: 'Make changes', category: 'modification' },
    { text: 'Show alternatives', category: 'quick_action' },
    { text: 'Explain this workflow', category: 'help' }
  ],
  refining: [
    { text: 'Add error handling', category: 'improvement' },
    { text: 'Add another step', category: 'modification' },
    { text: 'Remove a step', category: 'modification' },
    { text: "I'm done making changes", category: 'quick_action' },
    { text: 'Undo last change', category: 'navigation' }
  ],
  deploying: [
    { text: 'Cancel deployment', category: 'navigation' }
  ],
  complete: [
    { text: 'Test it now', category: 'quick_action' },
    { text: 'Make changes', category: 'modification' },
    { text: 'Create another workflow', category: 'navigation' },
    { text: 'View documentation', category: 'help' }
  ],
  error: [
    { text: 'Try again', category: 'quick_action' },
    { text: 'Start over', category: 'navigation' },
    { text: 'Get help', category: 'help' }
  ]
};

/**
 * Vertical-specific suggestions
 */
const VERTICAL_SUGGESTIONS: Record<string, Array<Omit<Suggestion, 'priority'>>> = {
  ecommerce: [
    { text: 'Track orders', category: 'workflow_type', intent: 'order_tracking' },
    { text: 'Check stock availability', category: 'workflow_type', intent: 'inventory' },
    { text: 'Send shipping updates', category: 'workflow_type', intent: 'notification' },
    { text: 'Process refunds', category: 'workflow_type', intent: 'payment' }
  ],
  salon: [
    { text: 'Book appointments', category: 'workflow_type', intent: 'booking' },
    { text: 'Send appointment reminders', category: 'workflow_type', intent: 'notification' },
    { text: 'Check availability', category: 'workflow_type', intent: 'availability' },
    { text: 'Handle cancellations', category: 'workflow_type', intent: 'booking' }
  ],
  restaurant: [
    { text: 'Take reservations', category: 'workflow_type', intent: 'booking' },
    { text: 'Show menu', category: 'workflow_type', intent: 'faq' },
    { text: 'Take orders', category: 'workflow_type', intent: 'order' },
    { text: 'Answer dietary questions', category: 'workflow_type', intent: 'faq' }
  ],
  taxi: [
    { text: 'Book a ride', category: 'workflow_type', intent: 'booking' },
    { text: 'Get fare estimate', category: 'workflow_type', intent: 'quote' },
    { text: 'Track driver location', category: 'workflow_type', intent: 'tracking' },
    { text: 'Handle complaints', category: 'workflow_type', intent: 'support' }
  ],
  medical: [
    { text: 'Book appointments', category: 'workflow_type', intent: 'booking' },
    { text: 'Send appointment reminders', category: 'workflow_type', intent: 'notification' },
    { text: 'Handle emergencies', category: 'workflow_type', intent: 'emergency' },
    { text: 'Answer health FAQs', category: 'workflow_type', intent: 'faq' }
  ],
  hotel: [
    { text: 'Check room availability', category: 'workflow_type', intent: 'availability' },
    { text: 'Book rooms', category: 'workflow_type', intent: 'booking' },
    { text: 'Handle check-in/check-out', category: 'workflow_type', intent: 'process' },
    { text: 'Answer amenity questions', category: 'workflow_type', intent: 'faq' }
  ]
};

/**
 * Integration suggestions by workflow type
 */
const INTEGRATION_BY_WORKFLOW: Record<string, string[]> = {
  order_tracking: ['shopify', 'woocommerce', 'courier-guy', 'shiplogic'],
  booking: ['google-calendar', 'ical-sync'],
  payment: ['payfast', 'yoco', 'paystack', 'ikhokha'],
  faq: [], // Uses knowledge base, no external integration
  notification: ['clickatell', 'bulksms'],
  inventory: ['shopify', 'woocommerce']
};

/**
 * Suggestion Engine Service
 */
export class SuggestionEngine {

  /**
   * Generate context-aware suggestions
   */
  async generateSuggestions(
    context: ConversationContext,
    intent?: ParsedIntent,
    limit: number = 6
  ): Promise<string[]> {
    const suggestions: Suggestion[] = [];

    // 1. Add state-based suggestions
    const stateSuggestions = STATE_SUGGESTIONS[context.state] || [];
    for (const s of stateSuggestions) {
      suggestions.push({ ...s, priority: 50 });
    }

    // 2. Add vertical-specific suggestions (higher priority)
    if (context.userPreferences?.vertical && context.state === 'idle') {
      const verticalSuggestions = VERTICAL_SUGGESTIONS[context.userPreferences.vertical] || [];
      for (const s of verticalSuggestions) {
        suggestions.push({ ...s, priority: 70 });
      }
    }

    // 3. Add pattern-based suggestions if we have an intent
    if (intent) {
      try {
        const patternService = getPatternLearningService();
        const patternSuggestions = await patternService.suggestFromPatterns(intent, { limit: 3 });

        for (const ps of patternSuggestions) {
          suggestions.push({
            text: `${ps.pattern.workflowType?.replace(/_/g, ' ')} (proven pattern)`,
            category: 'workflow_type',
            priority: 80, // High priority for proven patterns
            intent: ps.pattern.workflowType,
            context: `${ps.pattern.usageCount} uses, ${Math.round(ps.pattern.successRate)}% success`
          });
        }
      } catch {
        // Pattern learning not available
      }
    }

    // 4. Add workflow-specific suggestions
    if (context.currentWorkflow) {
      const workflowSuggestions = this.getWorkflowSuggestions(context.currentWorkflow);
      for (const s of workflowSuggestions) {
        suggestions.push({ ...s, priority: 60 });
      }
    }

    // 5. Add integration suggestions if relevant
    if (context.state === 'confirming' || context.state === 'refining') {
      const integrationSuggestions = this.suggestIntegrations(context);
      for (const s of integrationSuggestions.slice(0, 2)) {
        suggestions.push({
          text: `Add ${s.integration.name} integration`,
          category: 'integration',
          priority: 55,
          context: s.reason
        });
      }
    }

    // Remove duplicates and sort by priority
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
    const sortedSuggestions = uniqueSuggestions.sort((a, b) => b.priority - a.priority);

    // Return top suggestions as strings
    return sortedSuggestions.slice(0, limit).map(s => s.text);
  }

  /**
   * Suggest next steps based on current workflow
   */
  suggestNextSteps(workflow: Blueprint): string[] {
    const suggestions: string[] = [];

    // Analyze workflow completeness
    const hasTrigger = workflow.nodes.some(n => n.type === 'trigger');
    const hasAction = workflow.nodes.some(n => n.type === 'action');
    const hasCondition = workflow.nodes.some(n => n.type === 'condition');
    const hasIntegration = workflow.nodes.some(n => n.type === 'integration');
    const hasResponse = workflow.nodes.some(
      n => n.type === 'action' && (n.data?.actionType === 'send_message' || n.data?.actionType === 'ai_response')
    );

    // Missing essentials
    if (!hasTrigger) {
      suggestions.push('Add a trigger to start the workflow');
    }
    if (!hasResponse) {
      suggestions.push('Add a response to reply to customers');
    }

    // Enhancements
    if (!hasCondition && workflow.nodes.length >= 3) {
      suggestions.push('Add a condition to handle different scenarios');
    }
    if (!hasIntegration) {
      suggestions.push('Connect an integration for more functionality');
    }

    // Advanced suggestions based on workflow size
    if (workflow.nodes.length >= 5) {
      const hasErrorHandling = workflow.edges.some(e => e.sourceHandle === 'error');
      if (!hasErrorHandling) {
        suggestions.push('Add error handling for reliability');
      }
    }

    // If workflow seems complete
    if (hasTrigger && hasResponse && workflow.nodes.length >= 3) {
      suggestions.push('Deploy the workflow');
      suggestions.push('Test the workflow');
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Suggest integrations based on workflow type
   */
  suggestIntegrations(
    context: ConversationContext,
    limit: number = 5
  ): IntegrationRecommendation[] {
    const recommendations: IntegrationRecommendation[] = [];

    // Determine workflow type from context
    const workflowType = this.detectWorkflowType(context);
    const suggestedIntegrationSlugs = INTEGRATION_BY_WORKFLOW[workflowType] || [];

    // Filter to available integrations
    for (const slug of suggestedIntegrationSlugs) {
      const integration = context.availableIntegrations.find(i => i.slug === slug);

      if (integration && !integration.isEnabled) {
        recommendations.push({
          integration,
          reason: this.getIntegrationReason(integration, workflowType),
          priority: integration.hasCredentials ? 90 : 60,
          wouldImprove: this.getImprovements(integration, workflowType)
        });
      }
    }

    // Sort by priority and return
    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, limit);
  }

  /**
   * Generate improvement suggestions for a workflow
   */
  generateImprovements(workflow: Blueprint): ImprovementSuggestion[] {
    const improvements: ImprovementSuggestion[] = [];

    // Check for missing error handling
    const hasIntegrations = workflow.nodes.some(n => n.type === 'integration');
    const hasErrorHandling = workflow.edges.some(e => e.sourceHandle === 'error');

    if (hasIntegrations && !hasErrorHandling) {
      improvements.push({
        title: 'Add Error Handling',
        description: 'Your workflow uses integrations that could fail. Add error responses to handle failures gracefully.',
        type: 'reliability',
        effort: 'low',
        impact: 'high',
        action: 'Add error handling'
      });
    }

    // Check for missing confirmation
    const hasPayment = workflow.nodes.some(
      n => n.type === 'integration' && ['payfast', 'yoco', 'paystack'].includes(n.data?.integration as string)
    );
    const hasConfirmation = workflow.nodes.some(
      n => n.type === 'condition' && (n.data?.label as string)?.toLowerCase().includes('confirm')
    );

    if (hasPayment && !hasConfirmation) {
      improvements.push({
        title: 'Add Payment Confirmation',
        description: 'Ask customers to confirm before processing payments.',
        type: 'user_experience',
        effort: 'low',
        impact: 'high',
        action: 'Add confirmation before payment'
      });
    }

    // Check for response time optimization
    const nodeCount = workflow.nodes.length;
    if (nodeCount > 8) {
      improvements.push({
        title: 'Simplify Workflow',
        description: 'Your workflow has many steps. Consider combining some steps for faster responses.',
        type: 'performance',
        effort: 'medium',
        impact: 'medium',
        action: 'Simplify the workflow'
      });
    }

    // Check for missing logging/analytics
    const hasLogging = workflow.nodes.some(
      n => n.data?.label && (n.data.label as string).toLowerCase().includes('log')
    );

    if (!hasLogging && workflow.nodes.length >= 5) {
      improvements.push({
        title: 'Add Analytics Tracking',
        description: 'Track workflow usage to understand how customers interact with your bot.',
        type: 'functionality',
        effort: 'low',
        impact: 'medium',
        action: 'Add analytics tracking'
      });
    }

    // Check for personalization
    const hasPersonalization = workflow.nodes.some(
      n => n.data?.label && (n.data.label as string).toLowerCase().includes('name')
    );

    if (!hasPersonalization) {
      improvements.push({
        title: 'Add Personalization',
        description: 'Use the customer\'s name in responses for a more personal touch.',
        type: 'user_experience',
        effort: 'low',
        impact: 'medium',
        action: 'Add personalization'
      });
    }

    return improvements;
  }

  /**
   * Generate suggestions adapted to user's technical level
   */
  adaptToUserLevel(
    suggestions: string[],
    preferences: UserPreferences
  ): string[] {
    const level = preferences.technicalLevel || 'beginner';

    if (level === 'beginner') {
      // Simplify technical terms
      return suggestions.map(s => this.simplifyForBeginner(s));
    }

    if (level === 'advanced') {
      // Add technical details
      return suggestions.map(s => this.enhanceForAdvanced(s));
    }

    return suggestions;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get workflow-specific suggestions
   */
  private getWorkflowSuggestions(workflow: Blueprint): Array<Omit<Suggestion, 'priority'>> {
    const suggestions: Array<Omit<Suggestion, 'priority'>> = [];
    const nodeTypes = new Set(workflow.nodes.map(n => n.type));

    // Suggest missing common elements
    if (!nodeTypes.has('condition')) {
      suggestions.push({
        text: 'Add a condition to branch the flow',
        category: 'modification'
      });
    }

    // Suggest based on existing integrations
    const integrations = workflow.nodes
      .filter(n => n.type === 'integration')
      .map(n => n.data?.integration as string);

    if (integrations.includes('shopify') && !integrations.includes('courier-guy')) {
      suggestions.push({
        text: 'Add shipping tracking with Courier Guy',
        category: 'integration'
      });
    }

    return suggestions;
  }

  /**
   * Remove duplicate suggestions
   */
  private deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Set<string>();
    const unique: Suggestion[] = [];

    for (const s of suggestions) {
      const key = s.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    return unique;
  }

  /**
   * Detect workflow type from context
   */
  private detectWorkflowType(context: ConversationContext): string {
    // Check gathered requirements
    const typeReq = context.gatheredRequirements.find(r => r.key === 'workflowType');
    if (typeReq) return typeReq.value;

    // Check current workflow
    if (context.currentWorkflow) {
      const integrations = context.currentWorkflow.nodes
        .filter(n => n.type === 'integration')
        .map(n => n.data?.integration as string);

      // Infer type from integrations
      if (integrations.some(i => ['shopify', 'woocommerce'].includes(i))) {
        return 'order_tracking';
      }
      if (integrations.some(i => ['google-calendar', 'ical-sync'].includes(i))) {
        return 'booking';
      }
      if (integrations.some(i => ['payfast', 'yoco', 'paystack'].includes(i))) {
        return 'payment';
      }
    }

    // Default
    return 'unknown';
  }

  /**
   * Get reason for suggesting an integration
   */
  private getIntegrationReason(integration: AvailableIntegration, workflowType: string): string {
    const reasons: Record<string, Record<string, string>> = {
      order_tracking: {
        shopify: 'Connect your Shopify store to let customers track orders',
        woocommerce: 'Connect your WooCommerce store for order data',
        'courier-guy': 'Add real-time shipping tracking',
        shiplogic: 'Get shipping rates and tracking'
      },
      booking: {
        'google-calendar': 'Sync appointments with your Google Calendar',
        'ical-sync': 'Sync with any calendar that supports iCal'
      },
      payment: {
        payfast: 'Accept payments with PayFast (popular in SA)',
        yoco: 'Accept card payments with Yoco',
        paystack: 'Accept payments with Paystack',
        ikhokha: 'Accept payments with iKhokha'
      }
    };

    return reasons[workflowType]?.[integration.slug] || `Add ${integration.name} functionality`;
  }

  /**
   * Get improvements an integration would bring
   */
  private getImprovements(integration: AvailableIntegration, workflowType: string): string[] {
    const improvements: Record<string, string[]> = {
      shopify: ['Real-time order data', 'Product information', 'Customer history'],
      woocommerce: ['Order tracking', 'Product catalog', 'Customer data'],
      'google-calendar': ['Automatic booking', 'Availability checking', 'Reminder sync'],
      'ical-sync': ['Calendar integration', 'Double-booking prevention'],
      payfast: ['Secure payments', 'Payment confirmation', 'Refund handling'],
      yoco: ['Card payments', 'Payment links', 'Transaction history'],
      'courier-guy': ['Tracking updates', 'Delivery estimates', 'Shipping rates'],
      shiplogic: ['Multi-courier support', 'Rate comparison', 'Label generation']
    };

    return improvements[integration.slug] || ['Enhanced functionality'];
  }

  /**
   * Simplify suggestion for beginners
   */
  private simplifyForBeginner(suggestion: string): string {
    const simplifications: Record<string, string> = {
      'Add a condition to branch the flow': 'Add a question to handle different answers',
      'Add error handling': 'Add a message for when something goes wrong',
      'Connect an integration': 'Connect to your existing tools',
      'Deploy the workflow': 'Make it live'
    };

    return simplifications[suggestion] || suggestion;
  }

  /**
   * Enhance suggestion for advanced users
   */
  private enhanceForAdvanced(suggestion: string): string {
    const enhancements: Record<string, string> = {
      'Add error handling': 'Add error handling with retry logic',
      'Deploy the workflow': 'Deploy the workflow (activate webhook)',
      'Add analytics tracking': 'Add event logging for analytics'
    };

    return enhancements[suggestion] || suggestion;
  }
}

// Singleton instance
let instance: SuggestionEngine | null = null;

/**
 * Get the SuggestionEngine singleton
 */
export function getSuggestionEngine(): SuggestionEngine {
  if (!instance) {
    instance = new SuggestionEngine();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSuggestionEngine(): void {
  instance = null;
}
