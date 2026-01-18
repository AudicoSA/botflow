/**
 * AI Agent API Service
 *
 * Handles all API calls to the AI workflow builder agent.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ChatResponse {
  message: string;
  sessionId: string;
  state: 'idle' | 'gathering' | 'confirming' | 'refining' | 'deploying' | 'complete';
  workflow?: Blueprint;
  actions: AgentAction[];
  suggestions?: string[];
  questions?: AgentQuestion[];
}

interface GenerateResponse {
  workflow: Blueprint;
  confidence: number;
  explanation: string;
  warnings: string[];
  processingTimeMs?: number;
}

interface DeployResponse {
  success: boolean;
  workflowId: string;
  status: 'active' | 'inactive';
  message: string;
}

interface SessionInfo {
  sessionId: string;
  state: string;
  hasWorkflow: boolean;
  messageCount: number;
  createdAt: string;
}

interface ExplainResponse {
  explanation: string;
  workflow: Blueprint;
}

export interface AgentAction {
  type: 'deploy' | 'modify' | 'explain' | 'reset' | 'undo';
  label: string;
  data?: unknown;
}

export interface AgentQuestion {
  id: string;
  text: string;
  type: 'choice' | 'text' | 'number';
  options?: string[];
  required: boolean;
}

export interface Blueprint {
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'integration';
  position: { x: number; y: number };
  data: {
    label: string;
    [key: string]: unknown;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('botflow_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const aiAgentService = {
  /**
   * Send a chat message to the AI agent
   */
  async chat(botId: string, message: string, sessionId?: string): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/api/bots/${botId}/agent/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, sessionId }),
    });
    return handleResponse<ChatResponse>(response);
  },

  /**
   * Generate a workflow directly from a description
   */
  async generate(
    botId: string,
    description: string,
    options?: { integrations?: string[]; template?: string; vertical?: string }
  ): Promise<GenerateResponse> {
    const response = await fetch(`${API_URL}/api/bots/${botId}/agent/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ description, ...options }),
    });
    return handleResponse<GenerateResponse>(response);
  },

  /**
   * Refine an existing workflow with modifications
   */
  async refine(
    botId: string,
    sessionId: string,
    modifications: string
  ): Promise<{ workflow: Blueprint; success: boolean; explanation: string; warnings: string[]; errors: string[] }> {
    const response = await fetch(`${API_URL}/api/bots/${botId}/agent/refine`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sessionId, modifications }),
    });
    return handleResponse(response);
  },

  /**
   * Deploy the workflow from a session
   */
  async deploy(botId: string, sessionId: string, activate: boolean = true): Promise<DeployResponse> {
    const response = await fetch(`${API_URL}/api/bots/${botId}/agent/deploy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sessionId, activate }),
    });
    return handleResponse<DeployResponse>(response);
  },

  /**
   * Get session information
   */
  async getSession(botId: string, sessionId: string): Promise<SessionInfo> {
    const response = await fetch(`${API_URL}/api/bots/${botId}/agent/session?sessionId=${sessionId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<SessionInfo>(response);
  },

  /**
   * Delete a session
   */
  async deleteSession(botId: string, sessionId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/bots/${botId}/agent/session/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get workflow explanation
   */
  async explain(botId: string, sessionId: string): Promise<ExplainResponse> {
    const response = await fetch(`${API_URL}/api/bots/${botId}/agent/explain?sessionId=${sessionId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ExplainResponse>(response);
  },

  /**
   * Get AI agent usage statistics
   */
  async getStats(botId: string): Promise<{ activeSessions: number; totalSessions: number }> {
    const response = await fetch(`${API_URL}/api/bots/${botId}/agent/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};
