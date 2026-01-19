/**
 * Conversation Engine Service (Phase 3 Week 2)
 *
 * The main orchestrator for the AI Workflow Agent.
 * Manages the conversation flow and coordinates between services.
 *
 * Responsibilities:
 * - Process user messages and route to appropriate handlers
 * - Manage conversation state transitions
 * - Generate contextual responses
 * - Coordinate between Intent Parser, Context Manager, and Workflow Generator
 * - Handle special commands and actions
 */

import OpenAI from 'openai';
import {
  ChatRequest,
  ChatResponse,
  AgentAction,
  ConversationContext,
  ConversationState,
  ParsedIntent,
  AgentQuestion,
  TemplateMatch
} from '../../types/ai-agent.js';
import { Blueprint } from '../../types/workflow.js';
import { getIntentParser, IntentParser } from './intent-parser.js';
import { getContextManager, ContextManager } from './context-manager.js';
import { getWorkflowGenerator, WorkflowGenerator } from './workflow-generator.js';
import { getTemplateMatcher, TemplateMatcherService, TemplateMatchResult } from './template-matcher.js';
import { getNodeLibrary } from '../node-library.js';
import { createNodeLibrarySummary } from '../../prompts/bot-builder-prompts.js';
import { logger } from '../../config/logger.js';

/**
 * Configuration for the Conversation Engine
 */
interface ConversationEngineConfig {
  model: string;
  temperature: number;
  maxConversationTurns: number;
}

const DEFAULT_CONFIG: ConversationEngineConfig = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxConversationTurns: 50
};

/**
 * System prompt for conversational responses
 */
const CONVERSATION_SYSTEM_PROMPT = `You are a friendly AI assistant helping South African business owners build WhatsApp bots.

## Your Role
- Help users describe what they want their bot to do
- Ask clarifying questions one at a time
- Keep responses concise and friendly
- Use simple language (no technical jargon)
- Be encouraging and supportive

## Conversation Style
- Warm and professional (like a helpful consultant)
- Use South African English naturally
- Reference local examples when relevant (Checkers, Takealot, etc.)
- Keep messages short (2-4 sentences max)

## Guidelines
1. Ask ONE question at a time
2. Summarize what you understand before generating
3. Confirm before deploying
4. Explain complex concepts simply
5. Offer suggestions when users are stuck

## State-Specific Behavior

### gathering
Ask targeted questions to understand:
- What the bot should do
- When it should activate
- What systems it connects to
- What responses to send

### confirming
Show a summary of the workflow and ask for confirmation.
Offer options: Deploy, Modify, or Start Over.

### refining
Help the user make specific changes.
Show what changed after each modification.

### deploying
Confirm deployment and provide next steps.

### error
Apologize for issues, explain what happened, and offer to start over.

Remember: You're building a conversation, not interrogating the user!`;

/**
 * Conversation Engine Service
 */
export class ConversationEngine {
  private openai: OpenAI;
  private config: ConversationEngineConfig;
  private intentParser: IntentParser;
  private contextManager: ContextManager;
  private workflowGenerator: WorkflowGenerator;
  private templateMatcher: TemplateMatcherService;

  constructor(config: Partial<ConversationEngineConfig> = {}) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for Conversation Engine');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.intentParser = getIntentParser();
    this.contextManager = getContextManager();
    this.workflowGenerator = getWorkflowGenerator();
    this.templateMatcher = getTemplateMatcher();
  }

  /**
   * Process a user message and return a response
   *
   * @param request - Chat request with message and optional session ID
   * @param userId - User ID
   * @param botId - Bot ID
   * @param organizationId - Organization ID
   * @returns Chat response with message, actions, and state
   */
  async processMessage(
    request: ChatRequest,
    userId: string,
    botId: string,
    organizationId: string
  ): Promise<ChatResponse> {
    // Get or create session
    const context = await this.contextManager.getOrCreateSession(
      request.sessionId,
      userId,
      botId,
      organizationId
    );

    // Add user message to history
    this.contextManager.addMessage(context, 'user', request.message);

    try {
      // Check for quick commands first
      const quickIntent = this.intentParser.quickDetect(request.message);
      if (quickIntent) {
        return this.handleQuickCommand(quickIntent, context);
      }

      // Parse the full intent
      const intent = await this.intentParser.parse(request.message, context);

      // Add intent to message metadata
      context.history[context.history.length - 1].metadata = { intent };

      // Route based on intent action and current state
      const response = await this.routeIntent(intent, context);

      // Add assistant response to history
      this.contextManager.addMessage(context, 'assistant', response.message, {
        workflow: response.workflow,
        action: response.actions[0]?.type
      });

      // Save context
      await this.contextManager.updateSession(context);

      return response;
    } catch (error) {
      // Log the actual error for debugging
      const errorDetails = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error({ error: errorDetails, stack: errorStack }, 'AI Agent conversation error');

      // Handle errors gracefully with more specific message
      const errorMessage = process.env.NODE_ENV === 'development'
        ? `I ran into a problem: ${errorDetails}. Could you try rephrasing what you want your bot to do?`
        : 'I ran into a problem processing that. Could you try rephrasing what you want your bot to do?';

      this.contextManager.addMessage(context, 'assistant', errorMessage);
      this.contextManager.transitionState(context, 'error');
      await this.contextManager.updateSession(context);

      return {
        message: errorMessage,
        sessionId: context.sessionId,
        state: 'error',
        actions: [
          { type: 'reset', label: 'Start Over' }
        ],
        suggestions: [
          'Start over with a new bot',
          'Tell me what went wrong'
        ]
      };
    }
  }

  /**
   * Handle quick commands (help, undo, deploy, etc.)
   */
  private async handleQuickCommand(
    intent: Partial<ParsedIntent>,
    context: ConversationContext
  ): Promise<ChatResponse> {
    switch (intent.action) {
      case 'help':
        return this.generateHelpResponse(context);

      case 'undo':
        return this.handleUndo(context);

      case 'deploy':
        return this.handleDeployRequest(context);

      case 'delete':
        return this.handleReset(context);

      default:
        return this.generateConversationalResponse(context, 'Continue helping the user.');
    }
  }

  /**
   * Route intent to appropriate handler based on action and state
   */
  private async routeIntent(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    // Handle based on current state and intent
    switch (context.state) {
      case 'idle':
        return this.handleIdleState(intent, context);

      case 'gathering':
        return this.handleGatheringState(intent, context);

      case 'confirming':
        return this.handleConfirmingState(intent, context);

      case 'refining':
        return this.handleRefiningState(intent, context);

      case 'error':
        return this.handleErrorState(intent, context);

      case 'complete':
        return this.handleCompleteState(intent, context);

      default:
        return this.generateConversationalResponse(context);
    }
  }

  /**
   * Handle idle state - start of conversation
   */
  private async handleIdleState(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    // Store any requirements from the intent
    this.extractAndStoreRequirements(intent, context);

    // Transition to gathering
    this.contextManager.transitionState(context, 'gathering');

    // Try to find matching templates first
    try {
      const availableIntegrations = context.availableIntegrations
        .filter(i => i.isEnabled)
        .map(i => i.slug);

      const templateMatches = await this.templateMatcher.findMatches(
        intent,
        availableIntegrations,
        context.userPreferences.vertical,
        3
      );

      // If we found good template matches, suggest them
      if (templateMatches.length > 0 && templateMatches[0].score >= 0.5) {
        return this.handleTemplateMatches(templateMatches, intent, context);
      }
    } catch (error) {
      // Log but continue - template matching is not critical
      logger.warn({ error }, 'Template matching failed, continuing with AI generation');
    }

    // If we have enough info, try to generate
    if (intent.confidence >= 0.8 && !intent.needsClarification) {
      return this.attemptGeneration(intent, context);
    }

    // Otherwise, ask questions
    return this.generateQuestionResponse(intent, context);
  }

  /**
   * Handle template matches - present options to user
   */
  private handleTemplateMatches(
    matches: TemplateMatchResult[],
    intent: ParsedIntent,
    context: ConversationContext
  ): ChatResponse {
    const bestMatch = matches[0];
    const template = bestMatch.template;

    // Build the response message
    let message = `I found a template that matches what you're looking for!\n\n`;
    message += `📦 **${template.name}**\n`;
    message += `${template.description}\n\n`;

    // Show what's needed
    if (template.requiredIntegrations.length > 0) {
      const hasAll = bestMatch.missingIntegrations.length === 0;
      if (hasAll) {
        message += `✅ You have all required integrations\n`;
      } else {
        message += `⚠️ Needs: ${bestMatch.missingIntegrations.join(', ')}\n`;
      }
    }

    message += `\nWould you like to:\n`;
    message += `1. **Use this template** (quick setup)\n`;
    message += `2. **Customize it** (make changes before deploying)\n`;
    message += `3. **Build from scratch** (I'll create a custom workflow)\n`;

    // Store the template match in context for later use
    this.contextManager.addRequirement(
      context,
      'suggestedTemplate',
      { matches, selectedIndex: null },
      'inferred',
      bestMatch.score
    );

    return {
      message,
      sessionId: context.sessionId,
      state: 'gathering',
      actions: [
        { type: 'suggest', label: 'Use Template', data: { templateSlug: template.slug } },
        { type: 'modify', label: 'Customize' },
        { type: 'reset', label: 'Build from Scratch' }
      ],
      suggestions: [
        'Use this template',
        'Customize it',
        'Build from scratch'
      ]
    };
  }

  /**
   * Handle gathering state - collecting requirements
   */
  private async handleGatheringState(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    // Store new requirements
    this.extractAndStoreRequirements(intent, context);

    // Check if user is responding to a template suggestion
    const templateSuggestion = context.gatheredRequirements.find(r => r.key === 'suggestedTemplate');
    if (templateSuggestion) {
      const response = await this.handleTemplateResponse(intent.rawMessage, templateSuggestion.value, context);
      if (response) {
        return response;
      }
    }

    // Check if we have enough to generate
    const canGenerate = this.hasEnoughRequirements(context);

    if (canGenerate && !intent.needsClarification) {
      return this.attemptGeneration(intent, context);
    }

    // Continue gathering
    return this.generateQuestionResponse(intent, context);
  }

  /**
   * Handle user response to template suggestion
   */
  private async handleTemplateResponse(
    message: string,
    templateData: { matches: TemplateMatchResult[]; selectedIndex: number | null },
    context: ConversationContext
  ): Promise<ChatResponse | null> {
    const msgLower = message.toLowerCase();
    const bestMatch = templateData.matches[0];

    // Check if user wants to use the template
    if (msgLower.includes('use') || msgLower.includes('template') || msgLower.includes('1') || msgLower.includes('yes')) {
      return this.handleTemplateInstantiation(bestMatch, context);
    }

    // Check if user wants to customize
    if (msgLower.includes('customize') || msgLower.includes('2') || msgLower.includes('change')) {
      return this.handleTemplateCustomization(bestMatch, context);
    }

    // Check if user wants to build from scratch
    if (msgLower.includes('scratch') || msgLower.includes('3') || msgLower.includes('custom') || msgLower.includes('no')) {
      // Remove the template suggestion and continue with normal flow
      context.gatheredRequirements = context.gatheredRequirements.filter(r => r.key !== 'suggestedTemplate');
      return null; // Fall through to normal gathering flow
    }

    // User might be providing variable values for template customization
    return null;
  }

  /**
   * Handle template instantiation
   */
  private async handleTemplateInstantiation(
    match: TemplateMatchResult,
    context: ConversationContext
  ): Promise<ChatResponse> {
    const template = match.template;

    // Check if we need variable values
    const requiredVars = template.variables.filter(v => v.required);
    if (requiredVars.length > 0) {
      // Collect variable values
      const firstVar = requiredVars[0];
      return {
        message: `Great choice! To set up the **${template.name}** template, I need a bit of info.\n\n${firstVar.description || firstVar.label}\n\nPlease provide: **${firstVar.label}**`,
        sessionId: context.sessionId,
        state: 'gathering',
        actions: [],
        questions: [{
          id: firstVar.name,
          text: firstVar.description || `What is your ${firstVar.label}?`,
          type: 'open',
          required: true
        }]
      };
    }

    // No variables needed - instantiate directly
    try {
      const workflow = await this.templateMatcher.customizeTemplate(template, {
        variableValues: {},
        fieldConfig: {}
      });

      this.contextManager.updateWorkflow(context, workflow, false);
      this.contextManager.transitionState(context, 'confirming');

      // Remove the template suggestion
      context.gatheredRequirements = context.gatheredRequirements.filter(r => r.key !== 'suggestedTemplate');

      return {
        message: `✅ I've created your **${template.name}** workflow with ${workflow.nodes.length} steps!\n\nTake a look and let me know if you'd like to make any changes before deploying.`,
        sessionId: context.sessionId,
        state: 'confirming',
        workflow,
        actions: [
          { type: 'deploy', label: 'Deploy Now' },
          { type: 'modify', label: 'Make Changes' },
          { type: 'explain', label: 'Explain Steps' }
        ],
        suggestions: [
          'Deploy it',
          'Show me how it works',
          'Make a change'
        ]
      };
    } catch (error) {
      logger.error({ error, template: template.slug }, 'Failed to instantiate template');
      return {
        message: `I had trouble setting up that template. Let's build one from scratch instead - what should your bot do?`,
        sessionId: context.sessionId,
        state: 'gathering',
        actions: []
      };
    }
  }

  /**
   * Handle template customization request
   */
  private handleTemplateCustomization(
    match: TemplateMatchResult,
    context: ConversationContext
  ): ChatResponse {
    const template = match.template;

    return {
      message: `I'll help you customize the **${template.name}** template.\n\nWhat would you like to change? You can:\n• Add more steps\n• Change the messages\n• Add error handling\n• Connect different integrations\n\nJust describe what you want!`,
      sessionId: context.sessionId,
      state: 'refining',
      workflow: template.blueprint,
      actions: [
        { type: 'deploy', label: 'Deploy As-Is' },
        { type: 'reset', label: 'Start Over' }
      ]
    };
  }

  /**
   * Handle confirming state - user reviewing workflow
   */
  private async handleConfirmingState(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    const message = intent.rawMessage.toLowerCase();

    // Check for approval
    if (this.isApproval(message)) {
      return this.handleDeployRequest(context);
    }

    // Check for rejection/modification request
    if (this.isRejection(message) || intent.action === 'modify') {
      this.contextManager.transitionState(context, 'refining');
      return {
        message: "No problem! What would you like to change? You can say things like:\n• \"Add a step to send an email\"\n• \"Change the welcome message\"\n• \"Remove the payment step\"",
        sessionId: context.sessionId,
        state: 'refining',
        workflow: context.currentWorkflow || undefined,
        actions: [
          { type: 'reset', label: 'Start Over' }
        ],
        suggestions: [
          'Add error handling',
          'Change the response messages',
          'Add another step'
        ]
      };
    }

    // User might be asking to change something specific
    if (context.currentWorkflow && intent.requirements.length > 0) {
      return this.handleRefiningState(intent, context);
    }

    // Unclear response
    return {
      message: "Would you like me to deploy this workflow, or would you like to make changes first?",
      sessionId: context.sessionId,
      state: 'confirming',
      workflow: context.currentWorkflow || undefined,
      actions: [
        { type: 'deploy', label: 'Deploy Now' },
        { type: 'modify', label: 'Make Changes' },
        { type: 'reset', label: 'Start Over' }
      ]
    };
  }

  /**
   * Handle refining state - making changes to workflow
   */
  private async handleRefiningState(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    if (!context.currentWorkflow) {
      this.contextManager.transitionState(context, 'gathering');
      return this.generateQuestionResponse(intent, context);
    }

    // Refine the workflow
    const result = await this.workflowGenerator.refineWorkflow(
      context.currentWorkflow,
      intent.rawMessage,
      context
    );

    if (result.success && result.workflow) {
      this.contextManager.updateWorkflow(context, result.workflow, true);
      this.contextManager.transitionState(context, 'confirming');

      return {
        message: `Done! I've updated the workflow. ${result.explanation}\n\nHere's the updated version. Ready to deploy?`,
        sessionId: context.sessionId,
        state: 'confirming',
        workflow: result.workflow,
        actions: [
          { type: 'deploy', label: 'Deploy Now' },
          { type: 'modify', label: 'Make More Changes' },
          { type: 'undo', label: 'Undo Change' }
        ],
        suggestions: [
          'Looks good, deploy it',
          'Make another change',
          'Undo that change'
        ]
      };
    }

    // Refinement failed
    return {
      message: `I had trouble making that change: ${result.errors.join(', ')}. Could you describe what you want differently?`,
      sessionId: context.sessionId,
      state: 'refining',
      workflow: context.currentWorkflow,
      actions: [
        { type: 'reset', label: 'Start Over' }
      ]
    };
  }

  /**
   * Handle error state
   */
  private async handleErrorState(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    // User wants to start over
    if (intent.action === 'create' || this.isApproval(intent.rawMessage.toLowerCase())) {
      this.contextManager.transitionState(context, 'idle');
      context.gatheredRequirements = [];
      context.currentWorkflow = null;

      return {
        message: "Let's start fresh! What would you like your WhatsApp bot to do?",
        sessionId: context.sessionId,
        state: 'idle',
        actions: [],
        suggestions: [
          'Track customer orders',
          'Book appointments',
          'Answer common questions',
          'Process payments'
        ]
      };
    }

    return this.generateConversationalResponse(context);
  }

  /**
   * Handle complete state - workflow deployed
   */
  private async handleCompleteState(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    // User wants to make changes to deployed workflow
    if (intent.action === 'modify') {
      this.contextManager.transitionState(context, 'refining');
      return this.handleRefiningState(intent, context);
    }

    // User wants to create a new workflow
    if (intent.action === 'create') {
      return this.handleReset(context);
    }

    return {
      message: "Your workflow is live and running! Would you like to make changes to it, or create a new workflow?",
      sessionId: context.sessionId,
      state: 'complete',
      workflow: context.currentWorkflow || undefined,
      actions: [
        { type: 'modify', label: 'Modify Workflow' },
        { type: 'reset', label: 'Create New Workflow' }
      ]
    };
  }

  /**
   * Attempt to generate a workflow from current context
   */
  private async attemptGeneration(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    // Add any additional requirements from intent
    this.extractAndStoreRequirements(intent, context);

    // Generate workflow
    const result = await this.workflowGenerator.generateFromIntent(intent, context);

    if (result.success && result.workflow) {
      this.contextManager.updateWorkflow(context, result.workflow, false);
      this.contextManager.transitionState(context, 'confirming');

      const nodeCount = result.workflow.nodes.length;
      const explanation = result.explanation;

      return {
        message: `I've created a workflow for you with ${nodeCount} steps. ${explanation}\n\nTake a look and let me know if this is what you had in mind!`,
        sessionId: context.sessionId,
        state: 'confirming',
        workflow: result.workflow,
        actions: [
          { type: 'deploy', label: 'Deploy Now' },
          { type: 'modify', label: 'Make Changes' },
          { type: 'explain', label: 'Explain This' }
        ],
        suggestions: [
          'Deploy this workflow',
          'Add error handling',
          'Explain how it works'
        ]
      };
    }

    // Generation failed - need more info
    const errorMsg = result.errors.length > 0
      ? `I need a bit more info: ${result.errors[0]}`
      : "I need a bit more information to build your workflow.";

    return {
      message: errorMsg,
      sessionId: context.sessionId,
      state: 'gathering',
      actions: [],
      questions: intent.clarificationQuestions
    };
  }

  /**
   * Generate a question response
   */
  private async generateQuestionResponse(
    intent: ParsedIntent,
    context: ConversationContext
  ): Promise<ChatResponse> {
    // Use AI to generate a natural question
    const response = await this.generateConversationalResponse(
      context,
      `The user wants to build a workflow. Based on their input and the gathered requirements, ask ONE clarifying question to better understand what they need. Current intent confidence: ${intent.confidence}`
    );

    // Add suggested questions
    if (intent.clarificationQuestions && intent.clarificationQuestions.length > 0) {
      response.questions = intent.clarificationQuestions;
    }

    return response;
  }

  /**
   * Generate a conversational response using GPT-4
   */
  private async generateConversationalResponse(
    context: ConversationContext,
    instruction?: string
  ): Promise<ChatResponse> {
    const nodeLibrary = await getNodeLibrary();
    const nodeSummary = createNodeLibrarySummary(nodeLibrary.listNodes());

    // Build conversation history for GPT
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: CONVERSATION_SYSTEM_PROMPT + `\n\nAvailable Node Types:\n${nodeSummary}\n\nCurrent State: ${context.state}`
      }
    ];

    // Add conversation history
    const recentHistory = this.contextManager.getRelevantHistory(context, 10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'system' ? 'system' : msg.role,
        content: msg.content
      });
    }

    // Add instruction if provided
    if (instruction) {
      messages.push({
        role: 'system',
        content: `Instruction: ${instruction}`
      });
    }

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: 300
    });

    const messageContent = response.choices[0].message.content || "How can I help you build your WhatsApp bot?";

    return {
      message: messageContent,
      sessionId: context.sessionId,
      state: context.state,
      workflow: context.currentWorkflow || undefined,
      actions: this.getStateActions(context.state),
      suggestions: this.getStateSuggestions(context.state)
    };
  }

  /**
   * Generate help response
   */
  private generateHelpResponse(context: ConversationContext): ChatResponse {
    return {
      message: `I'm here to help you build WhatsApp bots without coding! Here's what I can do:

📝 **Create Workflows** - Describe what you want and I'll build it
✏️ **Modify** - Say "add a step" or "change the message"
↩️ **Undo** - Go back to a previous version
🚀 **Deploy** - Launch your bot when it's ready

Just describe what you want your bot to do in plain English, like:
• "Track orders from my Shopify store"
• "Book appointments for my salon"
• "Answer FAQs about my restaurant"

What would you like to create?`,
      sessionId: context.sessionId,
      state: context.state,
      actions: [],
      suggestions: [
        'Track customer orders',
        'Book appointments',
        'Answer FAQs',
        'Process payments'
      ]
    };
  }

  /**
   * Handle undo command
   */
  private handleUndo(context: ConversationContext): ChatResponse {
    const hadWorkflow = !!context.currentWorkflow;
    this.contextManager.undoWorkflow(context);

    if (context.previousWorkflows.length === 0 && !context.currentWorkflow) {
      return {
        message: hadWorkflow
          ? "I've undone the last change. You're back to the start - what would you like to build?"
          : "Nothing to undo! Let's start fresh - what would you like your bot to do?",
        sessionId: context.sessionId,
        state: 'gathering',
        actions: []
      };
    }

    return {
      message: "Done! I've reverted to the previous version of your workflow.",
      sessionId: context.sessionId,
      state: 'confirming',
      workflow: context.currentWorkflow || undefined,
      actions: [
        { type: 'deploy', label: 'Deploy This Version' },
        { type: 'undo', label: 'Undo Again' },
        { type: 'modify', label: 'Make Changes' }
      ]
    };
  }

  /**
   * Handle deploy request
   */
  private handleDeployRequest(context: ConversationContext): ChatResponse {
    if (!context.currentWorkflow) {
      return {
        message: "I don't have a workflow ready to deploy yet. Let's build one first - what should your bot do?",
        sessionId: context.sessionId,
        state: 'gathering',
        actions: []
      };
    }

    this.contextManager.transitionState(context, 'deploying');

    // In a real implementation, this would actually deploy to n8n
    // For now, we simulate success
    this.contextManager.transitionState(context, 'complete');

    return {
      message: `🚀 Your workflow is now live!\n\nYour bot is ready to receive messages. Test it by sending a message to your WhatsApp number.\n\nWorkflow: ${context.currentWorkflow.name}\nNodes: ${context.currentWorkflow.nodes.length}`,
      sessionId: context.sessionId,
      state: 'complete',
      workflow: context.currentWorkflow,
      actions: [
        { type: 'modify', label: 'Make Changes' },
        { type: 'reset', label: 'Create Another Bot' }
      ]
    };
  }

  /**
   * Handle reset/start over
   */
  private async handleReset(context: ConversationContext): Promise<ChatResponse> {
    // Clear context but keep session
    context.gatheredRequirements = [];
    context.currentWorkflow = null;
    context.previousWorkflows = [];
    context.pendingQuestions = [];
    this.contextManager.transitionState(context, 'idle');

    await this.contextManager.updateSession(context);

    return {
      message: "Let's start fresh! What would you like your new WhatsApp bot to do?",
      sessionId: context.sessionId,
      state: 'idle',
      actions: [],
      suggestions: [
        'Track customer orders',
        'Book appointments',
        'Answer common questions',
        'Process payments'
      ]
    };
  }

  /**
   * Extract and store requirements from intent
   */
  private extractAndStoreRequirements(
    intent: ParsedIntent,
    context: ConversationContext
  ): void {
    // Store workflow type
    if (intent.workflowType) {
      this.contextManager.addRequirement(context, 'workflowType', intent.workflowType, 'inferred', intent.confidence);
    }

    // Store integrations
    if (intent.integrations.length > 0) {
      this.contextManager.addRequirement(context, 'integrations', intent.integrations, 'inferred', intent.confidence);
    }

    // Store entities
    for (const entity of intent.entities) {
      if (entity.confidence > 0.6) {
        this.contextManager.addRequirement(context, entity.type, entity.value, 'explicit', entity.confidence);
      }
    }

    // Store requirements
    for (const req of intent.requirements) {
      this.contextManager.addRequirement(context, req.id, req, 'explicit', 1.0);
    }
  }

  /**
   * Check if we have enough requirements to generate
   */
  private hasEnoughRequirements(context: ConversationContext): boolean {
    const hasWorkflowType = context.gatheredRequirements.some(r => r.key === 'workflowType');
    const hasTrigger = context.gatheredRequirements.some(r =>
      r.key === 'trigger' || (r.value?.category === 'trigger')
    );
    const hasAction = context.gatheredRequirements.some(r =>
      r.key === 'action' || (r.value?.category === 'action')
    );

    return (hasWorkflowType && (hasTrigger || hasAction)) || context.gatheredRequirements.length >= 3;
  }

  /**
   * Check if message is an approval
   */
  private isApproval(message: string): boolean {
    const approvals = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'deploy', 'looks good', 'perfect', 'great', 'do it', 'go ahead', 'confirm', 'approved'];
    return approvals.some(a => message.includes(a));
  }

  /**
   * Check if message is a rejection
   */
  private isRejection(message: string): boolean {
    const rejections = ['no', 'nope', 'change', 'modify', 'different', 'wrong', 'not quite', 'actually'];
    return rejections.some(r => message.includes(r));
  }

  /**
   * Get actions for current state
   */
  private getStateActions(state: ConversationState): AgentAction[] {
    switch (state) {
      case 'confirming':
        return [
          { type: 'deploy', label: 'Deploy' },
          { type: 'modify', label: 'Modify' },
          { type: 'reset', label: 'Start Over' }
        ];
      case 'refining':
        return [
          { type: 'undo', label: 'Undo' },
          { type: 'reset', label: 'Start Over' }
        ];
      case 'complete':
        return [
          { type: 'modify', label: 'Modify' },
          { type: 'reset', label: 'New Bot' }
        ];
      default:
        return [];
    }
  }

  /**
   * Get suggestions for current state
   */
  private getStateSuggestions(state: ConversationState): string[] {
    switch (state) {
      case 'idle':
      case 'gathering':
        return [
          'Track orders',
          'Book appointments',
          'Answer FAQs',
          'Send reminders'
        ];
      case 'confirming':
        return [
          'Deploy it',
          'Add error handling',
          'Change the messages'
        ];
      case 'refining':
        return [
          'Add a step',
          'Remove a step',
          'Change the message'
        ];
      default:
        return [];
    }
  }
}

// Singleton instance
let instance: ConversationEngine | null = null;

/**
 * Get the ConversationEngine singleton
 */
export function getConversationEngine(): ConversationEngine {
  if (!instance) {
    instance = new ConversationEngine();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetConversationEngine(): void {
  instance = null;
}
