import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env.js';

/**
 * n8n Workflow Types
 */
export interface N8nWorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
}

export interface N8nWorkflowConnection {
  main: Array<Array<{ node: string; type: string; index: number }>>;
}

export interface N8nWorkflow {
  name: string;
  nodes: N8nWorkflowNode[];
  connections: Record<string, N8nWorkflowConnection>;
  active: boolean;
  settings?: {
    timezone?: string;
    saveExecutionProgress?: boolean;
    saveManualExecutions?: boolean;
  };
}

export interface N8nWorkflowExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  data?: Record<string, any>;
}

export interface WorkflowInstantiationOptions {
  botId: string;
  organizationId: string;
  credentials: Record<string, any>;
  webhookUrl?: string;
}

/**
 * n8n Workflow Service
 *
 * Manages n8n workflow lifecycle: create, activate, deactivate, delete, and monitor.
 * Handles credential injection and dynamic configuration.
 */
export class N8nWorkflowService {
  private client: AxiosInstance;
  private enabled: boolean;

  constructor() {
    this.enabled = !!(env.N8N_API_URL && env.N8N_API_KEY);

    if (this.enabled) {
      this.client = axios.create({
        baseURL: env.N8N_API_URL,
        headers: {
          'X-N8N-API-KEY': env.N8N_API_KEY!,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    } else {
      // Mock client for development without n8n
      this.client = axios.create();
    }
  }

  /**
   * Check if n8n is configured and available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create a workflow in n8n from a template
   * @param template - n8n workflow template
   * @param options - Bot ID, organization ID, credentials
   * @returns n8n workflow ID
   */
  async createWorkflow(
    template: N8nWorkflow,
    options: WorkflowInstantiationOptions
  ): Promise<string> {
    if (!this.enabled) {
      throw new Error('n8n integration not configured. Set N8N_API_URL and N8N_API_KEY.');
    }

    try {
      // Clone template and inject bot-specific configuration
      const workflow = this.instantiateTemplate(template, options);

      const response = await this.client.post('/workflows', workflow);

      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to create n8n workflow: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get workflow details
   * @param workflowId - n8n workflow ID
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    if (!this.enabled) {
      throw new Error('n8n integration not configured');
    }

    try {
      const response = await this.client.get(`/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get n8n workflow: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Update workflow configuration
   * @param workflowId - n8n workflow ID
   * @param updates - Partial workflow updates
   */
  async updateWorkflow(
    workflowId: string,
    updates: Partial<N8nWorkflow>
  ): Promise<void> {
    if (!this.enabled) {
      throw new Error('n8n integration not configured');
    }

    try {
      await this.client.patch(`/workflows/${workflowId}`, updates);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to update n8n workflow: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Activate a workflow
   * @param workflowId - n8n workflow ID
   */
  async activateWorkflow(workflowId: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('n8n integration not configured');
    }

    try {
      await this.client.patch(`/workflows/${workflowId}`, { active: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to activate n8n workflow: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Deactivate a workflow
   * @param workflowId - n8n workflow ID
   */
  async deactivateWorkflow(workflowId: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('n8n integration not configured');
    }

    try {
      await this.client.patch(`/workflows/${workflowId}`, { active: false });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to deactivate n8n workflow: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Delete a workflow
   * @param workflowId - n8n workflow ID
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('n8n integration not configured');
    }

    try {
      await this.client.delete(`/workflows/${workflowId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to delete n8n workflow: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get workflow executions
   * @param workflowId - n8n workflow ID
   * @param limit - Number of executions to retrieve
   */
  async getWorkflowExecutions(
    workflowId: string,
    limit = 10
  ): Promise<N8nWorkflowExecution[]> {
    if (!this.enabled) {
      throw new Error('n8n integration not configured');
    }

    try {
      const response = await this.client.get('/executions', {
        params: {
          workflowId,
          limit,
        },
      });

      return response.data.data || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get workflow executions: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Test workflow health
   * @param workflowId - n8n workflow ID
   * @returns Health status
   */
  async checkWorkflowHealth(workflowId: string): Promise<{
    active: boolean;
    lastExecution?: string;
    errorRate: number;
  }> {
    if (!this.enabled) {
      return { active: false, errorRate: 0 };
    }

    try {
      const workflow = await this.getWorkflow(workflowId);
      const executions = await this.getWorkflowExecutions(workflowId, 10);

      const failedExecutions = executions.filter(
        (e) => e.finished && e.data?.resultData?.error
      );

      return {
        active: workflow.active,
        lastExecution: executions[0]?.startedAt,
        errorRate: executions.length > 0 ? failedExecutions.length / executions.length : 0,
      };
    } catch (error) {
      throw new Error(`Failed to check workflow health: ${error}`);
    }
  }

  /**
   * Instantiate a template with bot-specific configuration
   * @private
   */
  private instantiateTemplate(
    template: N8nWorkflow,
    options: WorkflowInstantiationOptions
  ): N8nWorkflow {
    const workflow = JSON.parse(JSON.stringify(template)); // Deep clone

    // Update workflow name
    workflow.name = `${template.name} (Bot ${options.botId})`;

    // Inject credentials and configuration into nodes
    workflow.nodes = workflow.nodes.map((node) => {
      // Replace bot_id placeholder in webhook paths
      if (node.parameters?.path) {
        node.parameters.path = node.parameters.path.replace(
          '{{bot_id}}',
          options.botId
        );
      }

      // Inject credentials
      if (node.credentials) {
        Object.keys(node.credentials).forEach((credKey) => {
          const credPlaceholder = node.credentials![credKey];
          if (typeof credPlaceholder === 'object' && credPlaceholder.id) {
            // Replace credential ID placeholder with actual credential
            const credType = credPlaceholder.id.replace('{{credentials.', '').replace('}}', '');
            if (options.credentials[credType]) {
              node.credentials![credKey].id = options.credentials[credType];
            }
          }
        });
      }

      // Inject organization/bot context
      if (node.parameters?.additionalFields) {
        node.parameters.additionalFields = this.replaceVariables(
          node.parameters.additionalFields,
          options
        );
      }

      return node;
    });

    return workflow;
  }

  /**
   * Replace variables in object
   * @private
   */
  private replaceVariables(
    obj: Record<string, any>,
    options: WorkflowInstantiationOptions
  ): Record<string, any> {
    const replacements: Record<string, string> = {
      '{{bot_id}}': options.botId,
      '{{organization_id}}': options.organizationId,
      '{{webhook_url}}': options.webhookUrl || '',
    };

    const result = JSON.parse(JSON.stringify(obj));

    Object.keys(result).forEach((key) => {
      if (typeof result[key] === 'string') {
        Object.keys(replacements).forEach((placeholder) => {
          result[key] = result[key].replace(placeholder, replacements[placeholder]);
        });
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = this.replaceVariables(result[key], options);
      }
    });

    return result;
  }
}

// Singleton instance
export const n8nWorkflowService = new N8nWorkflowService();
