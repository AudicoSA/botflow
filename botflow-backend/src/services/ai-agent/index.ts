/**
 * AI Agent Module (Phase 3)
 *
 * AI-powered conversational workflow builder for BotFlow.
 * Allows users to create workflows through natural language conversation.
 *
 * Components:
 * - IntentParser: Analyzes user messages to extract intent
 * - ContextManager: Manages conversation sessions and context
 * - WorkflowGenerator: Generates and refines workflows
 * - ConversationEngine: Main orchestrator for the conversation flow
 */

// Export services
export { IntentParser, getIntentParser, resetIntentParser } from './intent-parser.js';
export { ContextManager, getContextManager, resetContextManager } from './context-manager.js';
export { WorkflowGenerator, getWorkflowGenerator, resetWorkflowGenerator } from './workflow-generator.js';
export { ConversationEngine, getConversationEngine, resetConversationEngine } from './conversation-engine.js';
export { TemplateLibraryService, getTemplateLibrary, resetTemplateLibrary } from './template-library.js';
export { TemplateMatcherService, getTemplateMatcher, resetTemplateMatcher } from './template-matcher.js';

// Export template types from template-library
export type { TemplateFilterOptions, CreateTemplateData, PaginatedResult } from './template-library.js';
export type { TemplateCustomization, TemplateMatchResult } from './template-matcher.js';

// Re-export types
export type {
  // Conversation types
  ConversationState,
  AgentActionType,
  ConversationMessage,
  AgentQuestion,
  UserPreferences,
  ConversationContext,
  GatheredRequirement,
  AvailableIntegration,

  // Intent types
  ExtractedEntity,
  Requirement,
  ParsedIntent,

  // Generation types
  WorkflowModification,
  GenerationResult,
  AutoFixSuggestion,
  ValidationIssue,

  // Template types
  TemplateVariable,
  ConfigurableField,
  TemplateCategory,
  WorkflowTemplate,
  TemplateMatch,
  TemplateInstantiationRequest,

  // API types
  ChatRequest,
  ChatResponse,
  AgentAction,
  GenerateRequest,
  GenerateResponse,
  RefineRequest,
  RefineResponse,
  DeployRequest,
  DeployResponse,
  SessionInfo,

  // Node matching types
  NodeMatch,
  RecognizedPattern
} from '../../types/ai-agent.js';
