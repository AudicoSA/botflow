// Integration Marketplace Types

export type IntegrationCategory =
  | 'calendar'
  | 'payment'
  | 'crm'
  | 'communication'
  | 'ecommerce'
  | 'analytics'
  | 'productivity'
  | 'specialized';

export type AuthType = 'oauth' | 'api_key' | 'basic' | 'none';

export type PricingModel = 'free' | 'freemium' | 'paid';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export type IntegrationEventType = 'sync' | 'webhook' | 'error' | 'api_call';

export type IntegrationEventStatus = 'success' | 'failure' | 'pending';

export interface SetupInstructions {
  steps: string[];
  required_fields?: string[];
  required_scopes?: string[];
  optional_fields?: string[];
  help_url?: string;
}

export interface Integration {
  id: string;
  name: string;
  slug: string;
  category: IntegrationCategory;
  description: string;
  long_description?: string;
  icon_url?: string;
  requires_auth: boolean;
  auth_type?: AuthType;
  n8n_workflow_template?: Record<string, any>;
  recommended_for_verticals: string[];
  pricing_model: PricingModel;
  popularity_score: number;
  is_featured: boolean;
  is_direct_integration: boolean;
  documentation_url?: string;
  setup_instructions?: SetupInstructions;
  webhook_url?: string;
  supported_features: string[];
  created_at: string;
  updated_at: string;
}

export interface BotIntegration {
  id: string;
  bot_id: string;
  integration_id: string;
  n8n_workflow_id?: string;
  credentials?: Record<string, any>;
  configuration?: Record<string, any>;
  status: IntegrationStatus;
  error_message?: string;
  last_synced_at?: string;
  sync_count: number;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  bot_integration_id: string;
  event_type: IntegrationEventType;
  status: IntegrationEventStatus;
  message?: string;
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  error_details?: Record<string, any>;
  duration_ms?: number;
  created_at: string;
}

// API Request/Response Types

export interface ListIntegrationsQuery {
  category?: IntegrationCategory;
  search?: string;
  vertical?: string;
  featured?: boolean;
  page?: number;
  per_page?: number;
}

export interface ListIntegrationsResponse {
  integrations: Integration[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface EnableIntegrationRequest {
  bot_id: string;
  credentials?: Record<string, any>;
  configuration?: Record<string, any>;
}

export interface EnableIntegrationResponse {
  bot_integration: BotIntegration;
  message: string;
}

export interface UpdateIntegrationRequest {
  credentials?: Record<string, any>;
  configuration?: Record<string, any>;
  status?: IntegrationStatus;
}

export interface IntegrationWithStatus extends Integration {
  enabled: boolean;
  bot_integration_id?: string;
  bot_integration_status?: IntegrationStatus;
}

export interface RecommendedIntegrationsResponse {
  integrations: IntegrationWithStatus[];
  vertical: string;
}

// n8n Workflow Types

export interface N8nWorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

export interface N8nWorkflowConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8nWorkflow {
  name: string;
  nodes: N8nWorkflowNode[];
  connections: Record<string, Record<string, N8nWorkflowConnection[][]>>;
  active: boolean;
  settings?: Record<string, any>;
}

export interface N8nCreateWorkflowResponse {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Integration Template Data (for seeding)

export interface IntegrationTemplateData {
  name: string;
  slug: string;
  category: IntegrationCategory;
  description: string;
  long_description?: string;
  icon_url?: string;
  requires_auth: boolean;
  auth_type?: AuthType;
  n8n_workflow_template?: N8nWorkflow;
  recommended_for_verticals: string[];
  pricing_model?: PricingModel;
  is_featured?: boolean;
  documentation_url?: string;
  setup_instructions?: SetupInstructions;
  webhook_url?: string;
  supported_features?: string[];
}
