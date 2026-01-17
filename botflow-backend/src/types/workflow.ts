/**
 * Type definitions for the Dynamic Workflow Engine (Phase 2 Week 2)
 *
 * These types define the structure of:
 * - Blueprint JSON (user-defined workflow configuration)
 * - Node Library (reusable workflow building blocks)
 * - n8n Workflows (generated output)
 */

// ============================================================================
// Blueprint Types (User Input)
// ============================================================================

/**
 * Blueprint JSON - The high-level workflow definition created by users
 * This gets compiled into an n8n workflow
 */
export interface Blueprint {
  bot_id: string;
  version: string;
  name: string;
  description?: string;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  variables: Record<string, string>;
  credentials: BlueprintCredential[];
}

/**
 * A node in the Blueprint (simplified, user-friendly representation)
 */
export interface BlueprintNode {
  id: string;
  type: string; // e.g., 'whatsapp_trigger', 'shopify_lookup', 'paystack_link'
  name?: string;
  config: Record<string, any>; // Node-specific configuration
  position?: { x: number; y: number }; // Optional manual positioning
}

/**
 * An edge connecting two nodes in the Blueprint
 */
export interface BlueprintEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  sourceHandle?: string; // For conditional branching
  targetHandle?: string;
  label?: string;
}

/**
 * Credential configuration for external services
 */
export interface BlueprintCredential {
  service: string; // 'shopify', 'paystack', 'whatsapp', etc.
  credential_id: string; // Reference to workflow_credentials table
}

// ============================================================================
// Node Library Types (System Definitions)
// ============================================================================

/**
 * Node Definition - Defines how a Blueprint node maps to n8n
 */
export interface NodeDefinition {
  id: string;
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  icon?: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  n8n_type: string; // The actual n8n node type (e.g., 'n8n-nodes-base.webhook')
  n8n_template: any; // Base n8n node structure (parameters, credentials, etc.)
  validation_rules?: ValidationRule[];
}

export type NodeCategory = 'trigger' | 'action' | 'condition' | 'integration' | 'utility';

/**
 * Input configuration for a node
 */
export interface NodeInput {
  name: string;
  type: InputType;
  label: string;
  description?: string;
  required: boolean;
  default_value?: any;
  options?: string[]; // For select/multiselect
  validation?: ValidationRule[];
}

export type InputType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'code'
  | 'credential';

/**
 * Output configuration for a node
 */
export interface NodeOutput {
  name: string;
  type: string; // Data type produced
  description?: string;
}

/**
 * Validation rule for input values
 */
export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'required' | 'enum';
  value: any;
  message?: string;
}

// ============================================================================
// n8n Workflow Types (Compiled Output)
// ============================================================================

/**
 * n8n Workflow structure (what gets deployed to n8n)
 */
export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active: boolean;
  settings?: {
    timezone?: string;
    saveExecutionProgress?: boolean;
    saveManualExecutions?: boolean;
  };
  staticData?: any;
}

/**
 * A single node in an n8n workflow
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  webhookId?: string;
  disabled?: boolean;
  notes?: string;
}

/**
 * Connection structure in n8n (adjacency list)
 */
export interface N8nConnections {
  [nodeId: string]: {
    [outputType: string]: Array<Array<{
      node: string;
      type: string;
      index: number;
    }>>;
  };
}

// ============================================================================
// Workflow Versioning Types
// ============================================================================

/**
 * Database record for a workflow version
 */
export interface WorkflowVersion {
  id: string;
  bot_id: string;
  version: number;
  blueprint: Blueprint;
  n8n_workflow: N8nWorkflow;
  n8n_workflow_id?: string; // n8n's internal ID
  status: WorkflowStatus;
  created_at: Date;
  created_by: string;
  deployed_at?: Date;
  error_message?: string;
}

export type WorkflowStatus = 'draft' | 'active' | 'archived' | 'failed';

/**
 * Workflow credential record (encrypted)
 */
export interface WorkflowCredential {
  id: string;
  bot_id: string;
  service: string;
  credentials: Record<string, any>; // Encrypted in database
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Compilation Types
// ============================================================================

/**
 * Result of Blueprint validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  node_id?: string;
  field?: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  node_id?: string;
  message: string;
}

/**
 * Result of workflow compilation
 */
export interface CompilationResult {
  success: boolean;
  workflow?: N8nWorkflow;
  validation: ValidationResult;
  stats: {
    node_count: number;
    edge_count: number;
    compilation_time_ms: number;
  };
}

/**
 * Options for the workflow compiler
 */
export interface CompilerOptions {
  validate_only?: boolean; // Dry-run mode
  auto_layout?: boolean; // Auto-position nodes
  optimize?: boolean; // Optimize workflow structure
}

// ============================================================================
// Variable Injection Types
// ============================================================================

/**
 * Variables available for injection
 */
export interface WorkflowVariables {
  bot: Record<string, any>; // Bot configuration
  user: Record<string, any>; // Current user context
  conversation: Record<string, any>; // Conversation context
  custom: Record<string, any>; // User-defined variables
  credentials: Record<string, string>; // Credential references
}

/**
 * Token replacement context
 */
export interface InjectionContext {
  variables: WorkflowVariables;
  credentials: Map<string, WorkflowCredential>;
  environment: 'production' | 'staging' | 'development';
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  // Blueprint types
  Blueprint,
  BlueprintNode,
  BlueprintEdge,
  BlueprintCredential,

  // Node Library types
  NodeDefinition,
  NodeCategory,
  NodeInput,
  NodeOutput,
  InputType,
  ValidationRule,

  // n8n types
  N8nWorkflow,
  N8nNode,
  N8nConnections,

  // Versioning types
  WorkflowVersion,
  WorkflowStatus,
  WorkflowCredential,

  // Compilation types
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CompilationResult,
  CompilerOptions,

  // Injection types
  WorkflowVariables,
  InjectionContext
};
