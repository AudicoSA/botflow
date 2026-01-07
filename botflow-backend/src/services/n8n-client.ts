/**
 * n8n API Client
 * Handles communication with n8n instance for workflow management
 */

import { FastifyBaseLogger } from 'fastify';

export interface N8nWorkflow {
    id?: string;
    name: string;
    nodes: N8nNode[];
    connections: Record<string, any>;
    active?: boolean;
    settings?: Record<string, any>;
}

export interface N8nNode {
    id: string;
    name: string;
    type: string;
    typeVersion?: number;
    position: [number, number];
    parameters: Record<string, any>;
    credentials?: Record<string, string>;
}

export interface N8nExecution {
    id: string;
    finished: boolean;
    mode: string;
    startedAt: string;
    stoppedAt?: string;
    workflowId: string;
    data: any;
}

export interface N8nCredential {
    id?: string;
    name: string;
    type: string;
    data: Record<string, any>;
}

export class N8nClient {
    private baseUrl: string;
    private apiKey: string;
    private logger: FastifyBaseLogger;

    constructor(config: { baseUrl: string; apiKey: string; logger: FastifyBaseLogger }) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.logger = config.logger;
    }

    /**
     * Create a new workflow in n8n
     */
    async createWorkflow(workflow: N8nWorkflow): Promise<N8nWorkflow> {
        try {
            const response = await fetch(`${this.baseUrl}/workflows`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': this.apiKey,
                },
                body: JSON.stringify(workflow),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to create workflow: ${error}`);
            }

            const result = await response.json() as any;
            this.logger.info({ workflowId: result.id }, 'Created n8n workflow');
            return result;
        } catch (error) {
            this.logger.error({ error }, 'Error creating n8n workflow');
            throw error;
        }
    }

    /**
     * Update an existing workflow
     */
    async updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
        try {
            const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': this.apiKey,
                },
                body: JSON.stringify(workflow),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to update workflow: ${error}`);
            }

            const result = await response.json() as any;
            this.logger.info({ workflowId }, 'Updated n8n workflow');
            return result as N8nWorkflow;
        } catch (error) {
            this.logger.error({ error, workflowId }, 'Error updating n8n workflow');
            throw error;
        }
    }

    /**
     * Get workflow details
     */
    async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
        try {
            const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
                headers: {
                    'X-N8N-API-KEY': this.apiKey,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to get workflow: ${error}`);
            }

            return await response.json() as any as N8nWorkflow;
        } catch (error) {
            this.logger.error({ error, workflowId }, 'Error getting n8n workflow');
            throw error;
        }
    }

    /**
     * Delete a workflow
     */
    async deleteWorkflow(workflowId: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
                method: 'DELETE',
                headers: {
                    'X-N8N-API-KEY': this.apiKey,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to delete workflow: ${error}`);
            }

            this.logger.info({ workflowId }, 'Deleted n8n workflow');
        } catch (error) {
            this.logger.error({ error, workflowId }, 'Error deleting n8n workflow');
            throw error;
        }
    }

    /**
     * Activate a workflow
     */
    async activateWorkflow(workflowId: string): Promise<N8nWorkflow> {
        return this.updateWorkflow(workflowId, { active: true });
    }

    /**
     * Deactivate a workflow
     */
    async deactivateWorkflow(workflowId: string): Promise<N8nWorkflow> {
        return this.updateWorkflow(workflowId, { active: false });
    }

    /**
     * Execute a workflow via webhook
     */
    async executeWorkflow(webhookPath: string, data: any): Promise<any> {
        try {
            const webhookUrl = `${this.baseUrl.replace('/api/v1', '')}/webhook/${webhookPath}`;

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to execute workflow: ${error}`);
            }

            return await response.json();
        } catch (error) {
            // Enhanced error logging
            this.logger.error({
                error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
                webhookPath
            }, 'Error executing n8n workflow');
            throw error;
        }
    }

    /**
     * Get workflow execution history
     */
    async getExecutions(workflowId: string, limit = 10): Promise<N8nExecution[]> {
        try {
            const response = await fetch(
                `${this.baseUrl}/executions?workflowId=${workflowId}&limit=${limit}`,
                {
                    headers: {
                        'X-N8N-API-KEY': this.apiKey,
                    },
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to get executions: ${error}`);
            }

            const result = await response.json() as any;
            return result.data || [];
        } catch (error) {
            this.logger.error({ error, workflowId }, 'Error getting n8n executions');
            throw error;
        }
    }

    /**
     * Create a credential in n8n
     */
    async createCredential(credential: N8nCredential): Promise<N8nCredential> {
        try {
            const response = await fetch(`${this.baseUrl}/credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': this.apiKey,
                },
                body: JSON.stringify(credential),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to create credential: ${error}`);
            }

            const result = await response.json() as any;
            this.logger.info({ credentialId: result.id }, 'Created n8n credential');
            return result as N8nCredential;
        } catch (error) {
            this.logger.error({ error }, 'Error creating n8n credential');
            throw error;
        }
    }

    /**
     * Delete a credential
     */
    async deleteCredential(credentialId: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/credentials/${credentialId}`, {
                method: 'DELETE',
                headers: {
                    'X-N8N-API-KEY': this.apiKey,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to delete credential: ${error}`);
            }

            this.logger.info({ credentialId }, 'Deleted n8n credential');
        } catch (error) {
            this.logger.error({ error, credentialId }, 'Error deleting n8n credential');
            throw error;
        }
    }

    /**
     * Test n8n connection
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/workflows`, {
                headers: {
                    'X-N8N-API-KEY': this.apiKey,
                },
            });

            return response.ok;
        } catch (error) {
            this.logger.error({ error }, 'n8n connection test failed');
            return false;
        }
    }
}
