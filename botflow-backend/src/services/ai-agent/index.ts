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
 * - PatternLearningService: Learns from successful workflows (Week 4)
 * - ErrorRecoveryService: AI-powered error detection and auto-fix (Week 4)
 * - VersionManager: Workflow versioning and undo/redo (Week 4)
 * - SuggestionEngine: Context-aware suggestions (Week 4)
 * - PerformanceCache: Caching for improved response times (Week 4)
 */

// Export core services (Week 1-3)
export { IntentParser, getIntentParser, resetIntentParser } from './intent-parser.js';
export { ContextManager, getContextManager, resetContextManager } from './context-manager.js';
export { WorkflowGenerator, getWorkflowGenerator, resetWorkflowGenerator } from './workflow-generator.js';
export { ConversationEngine, getConversationEngine, resetConversationEngine } from './conversation-engine.js';
export { TemplateLibraryService, getTemplateLibrary, resetTemplateLibrary } from './template-library.js';
export { TemplateMatcherService, getTemplateMatcher, resetTemplateMatcher } from './template-matcher.js';

// Export Week 4 services
export {
  PatternLearningService,
  getPatternLearningService,
  resetPatternLearningService
} from './pattern-learning.js';

export type {
  WorkflowPattern,
  SuccessLogEntry,
  MetricsUpdate,
  PatternSuggestion,
  PatternAnalytics
} from './pattern-learning.js';

export {
  ErrorRecoveryService,
  getErrorRecoveryService,
  resetErrorRecoveryService
} from './error-recovery.js';

export type {
  ErrorType,
  RecoverySuggestion,
  ValidationResult,
  AutoFixResult,
  ErrorLogEntry
} from './error-recovery.js';

export {
  VersionManager,
  getVersionManager,
  resetVersionManager
} from './version-manager.js';

export type {
  WorkflowVersion,
  WorkflowDiff,
  VersionedContext
} from './version-manager.js';

export {
  SuggestionEngine,
  getSuggestionEngine,
  resetSuggestionEngine
} from './suggestion-engine.js';

export type {
  Suggestion,
  SuggestionCategory,
  IntegrationRecommendation,
  ImprovementSuggestion
} from './suggestion-engine.js';

export {
  PerformanceCache,
  getPerformanceCache,
  resetPerformanceCache
} from './performance-cache.js';

export type {
  CacheType,
  CacheMetadata,
  CacheStats,
  PerformanceMetrics
} from './performance-cache.js';

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
