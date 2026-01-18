/**
 * Type definitions for the AI Workflow Agent (Phase 3)
 *
 * These types define the structure of:
 * - Conversation context and state management
 * - Intent parsing and workflow generation
 * - Template matching and instantiation
 * - Session management
 */

import { Blueprint, BlueprintNode, BlueprintEdge, NodeDefinition } from './workflow.js';

// ============================================================================
// Conversation State Types
// ============================================================================

/**
 * Conversation states for the AI agent
 */
export type ConversationState =
  | 'idle'           // Waiting for user input
  | 'gathering'      // Collecting requirements through questions
  | 'confirming'     // Showing preview, awaiting user approval
  | 'refining'       // User requested changes to workflow
  | 'deploying'      // Building and activating workflow
  | 'complete'       // Workflow is live
  | 'error';         // Error state

/**
 * Action types returned by the AI agent
 */
export type AgentActionType =
  | 'preview'        // Show workflow preview
  | 'deploy'         // Deploy workflow to bot
  | 'modify'         // Modify existing workflow
  | 'explain'        // Explain workflow or concept
  | 'suggest'        // Suggest improvements
  | 'undo'           // Undo last change
  | 'reset';         // Reset conversation

/**
 * User message in the conversation
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: ParsedIntent;
    workflow?: Blueprint;
    action?: AgentActionType;
  };
}

/**
 * Question asked by the AI agent
 */
export interface AgentQuestion {
  id: string;
  text: string;
  type: 'open' | 'choice' | 'confirm' | 'multiselect';
  options?: string[];
  required: boolean;
  context?: string; // Why we're asking this
}

/**
 * User preferences for the conversation
 */
export interface UserPreferences {
  vertical?: string;           // Business vertical (taxi, salon, restaurant, etc.)
  language?: 'en' | 'af';      // Preferred language
  technicalLevel?: 'beginner' | 'intermediate' | 'advanced';
  previousWorkflows?: string[]; // IDs of workflows they've created
}

/**
 * Full conversation context
 */
export interface ConversationContext {
  sessionId: string;
  botId: string;
  userId: string;
  organizationId: string;
  state: ConversationState;
  currentWorkflow: Blueprint | null;
  previousWorkflows: Blueprint[]; // For undo functionality
  gatheredRequirements: GatheredRequirement[];
  pendingQuestions: AgentQuestion[];
  userPreferences: UserPreferences;
  availableIntegrations: AvailableIntegration[];
  history: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // Session expiration
}

/**
 * A requirement gathered from the user
 */
export interface GatheredRequirement {
  key: string;
  value: any;
  source: 'explicit' | 'inferred'; // User stated it or AI inferred
  confidence: number; // 0-1
  timestamp: Date;
}

/**
 * Available integration for the user
 */
export interface AvailableIntegration {
  slug: string;
  name: string;
  category: string;
  isEnabled: boolean;
  hasCredentials: boolean;
}

// ============================================================================
// Intent Parsing Types
// ============================================================================

/**
 * Entity extracted from user message
 */
export interface ExtractedEntity {
  type: 'service' | 'action' | 'data' | 'condition' | 'time' | 'location' | 'number' | 'custom';
  value: string;
  originalText: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Requirement extracted from intent
 */
export interface Requirement {
  id: string;
  category: 'trigger' | 'action' | 'condition' | 'integration' | 'data' | 'response';
  description: string;
  priority: 'required' | 'optional' | 'nice-to-have';
  suggestedNode?: string;
  configHints?: Record<string, any>;
}

/**
 * Parsed intent from user message
 */
export interface ParsedIntent {
  action: 'create' | 'modify' | 'explain' | 'deploy' | 'delete' | 'undo' | 'help' | 'unknown';
  workflowType?: string;           // e.g., 'order_tracking', 'booking', 'faq'
  entities: ExtractedEntity[];
  integrations: string[];          // Detected integrations needed
  requirements: Requirement[];
  confidence: number;              // 0-1
  needsClarification: boolean;
  clarificationQuestions?: AgentQuestion[];
  rawMessage: string;
  context?: {
    previousIntent?: ParsedIntent;
    workflowContext?: Blueprint;
  };
}

// ============================================================================
// Workflow Generation Types
// ============================================================================

/**
 * Modification request for existing workflow
 */
export interface WorkflowModification {
  type: 'add_node' | 'remove_node' | 'update_node' | 'add_edge' | 'remove_edge' | 'update_config' | 'replace_workflow';
  targetId?: string;          // Node or edge ID to modify
  data?: any;                 // New data for the modification
  description: string;        // Human-readable description
  position?: 'before' | 'after' | 'replace'; // For add operations
  referenceNodeId?: string;   // Reference node for positioning
}

/**
 * Result of workflow generation
 */
export interface GenerationResult {
  success: boolean;
  workflow: Blueprint | null;
  confidence: number;
  explanation: string;
  alternatives?: Blueprint[];
  warnings: string[];
  errors: string[];
  processingTimeMs: number;
}

/**
 * Auto-fix suggestion for workflow issues
 */
export interface AutoFixSuggestion {
  issueType: string;
  description: string;
  fix: WorkflowModification;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
}

/**
 * Validation issue found in workflow
 */
export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  nodeId?: string;
  field?: string;
  suggestion?: AutoFixSuggestion;
}

// ============================================================================
// Template Types
// ============================================================================

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select type
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

/**
 * Configurable field in a template
 */
export interface ConfigurableField {
  key: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'boolean' | 'json';
  label: string;
  description?: string;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  dependsOn?: {
    field: string;
    value: any;
  };
}

/**
 * Template category
 */
export type TemplateCategory =
  | 'ecommerce'
  | 'booking'
  | 'support'
  | 'payment'
  | 'notification'
  | 'custom';

/**
 * Workflow template definition
 */
export interface WorkflowTemplate {
  id: string;
  slug: string;
  name: string;
  category: TemplateCategory;
  description: string;
  triggerPhrases: string[];        // Phrases that trigger this template
  requiredIntegrations: string[];  // Integrations needed
  blueprint: Blueprint;            // The actual workflow
  variables: TemplateVariable[];   // Variables to fill in
  configurableFields: ConfigurableField[];
  vertical?: string;               // Optional vertical specialization
  popularityScore: number;         // For ranking
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template match result
 */
export interface TemplateMatch {
  template: WorkflowTemplate;
  score: number;                   // 0-1 match score
  matchedPhrases: string[];        // Which trigger phrases matched
  missingIntegrations: string[];   // Integrations not available
  reasoning: string;               // Why this template was matched
}

/**
 * Template instantiation request
 */
export interface TemplateInstantiationRequest {
  templateId: string;
  values: Record<string, any>;     // Variable values
  configuration: Record<string, any>; // Field configurations
  customizations?: WorkflowModification[]; // Additional modifications
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Chat request to the AI agent
 */
export interface ChatRequest {
  message: string;
  sessionId?: string;              // Continue existing session
}

/**
 * Chat response from the AI agent
 */
export interface ChatResponse {
  message: string;
  sessionId: string;
  state: ConversationState;
  workflow?: Blueprint;
  actions: AgentAction[];
  suggestions?: string[];          // Quick reply suggestions
  questions?: AgentQuestion[];     // Follow-up questions
}

/**
 * Action available to the user
 */
export interface AgentAction {
  type: AgentActionType;
  label: string;
  data?: any;
  disabled?: boolean;
  tooltip?: string;
}

/**
 * Generate workflow request
 */
export interface GenerateRequest {
  description: string;
  integrations?: string[];
  template?: string;               // Optional template slug to use
  vertical?: string;               // Business vertical for context
}

/**
 * Generate workflow response
 */
export interface GenerateResponse {
  workflow: Blueprint;
  confidence: number;
  explanation: string;
  warnings: string[];
  suggestedTemplates?: TemplateMatch[];
}

/**
 * Refine workflow request
 */
export interface RefineRequest {
  sessionId: string;
  modifications: string;           // Natural language modifications
}

/**
 * Refine workflow response
 */
export interface RefineResponse {
  workflow: Blueprint;
  changes: WorkflowModification[];
  explanation: string;
}

/**
 * Deploy workflow request
 */
export interface DeployRequest {
  workflow: Blueprint;
  activate: boolean;
}

/**
 * Deploy workflow response
 */
export interface DeployResponse {
  success: boolean;
  workflowId: string;
  webhookUrl?: string;
  status: 'active' | 'inactive';
  message?: string;
}

/**
 * Session info response
 */
export interface SessionInfo {
  sessionId: string;
  botId: string;
  state: ConversationState;
  messageCount: number;
  currentWorkflow: Blueprint | null;
  createdAt: Date;
  expiresAt: Date;
}

// ============================================================================
// Node Matching Types
// ============================================================================

/**
 * Node match result from intent analysis
 */
export interface NodeMatch {
  node: NodeDefinition;
  confidence: number;
  reasoning: string;
  suggestedConfig: Record<string, any>;
  position?: number;               // Suggested position in workflow
}

/**
 * Pattern recognized in user intent
 */
export interface RecognizedPattern {
  pattern: string;                 // Pattern name (e.g., 'order_tracking', 'appointment_booking')
  confidence: number;
  nodeSequence: string[];          // Suggested node types in order
  description: string;
}

// All types are exported at their definition above
