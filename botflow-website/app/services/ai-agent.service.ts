/**
 * AI Agent API Service
 *
 * Handles all API calls to the AI workflow builder agent.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch with timeout handling
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
};

/**
 * Fetch with retry logic for transient failures
 */
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries: number = 3,
  backoffMs: number = 1000,
  timeoutMs: number = 30000
): Promise<Response> => {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      // Retry on 5xx errors
      if (response.status >= 500 && attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry on timeout or client errors
      if (lastError.message.includes('timed out') || lastError.message.includes('HTTP 4')) {
        throw lastError;
      }

      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
};

interface ChatResponse {
  message: string;
  sessionId: string;
  state: 'idle' | 'gathering' | 'confirming' | 'refining' | 'deploying' | 'complete' | 'error';
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
   * Check backend health before starting conversation
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_URL}/api/agent/health`,
        {
          method: 'GET',
          headers: getAuthHeaders()
        },
        5000 // Quick timeout for health check
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Send a chat message to the AI agent
   */
  async chat(botId: string, message: string, sessionId?: string): Promise<ChatResponse> {
    const response = await fetchWithRetry(
      `${API_URL}/api/bots/${botId}/agent/chat`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, sessionId }),
      },
      3, // retries
      1000, // backoff
      30000 // timeout for chat
    );
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
    const response = await fetchWithRetry(
      `${API_URL}/api/bots/${botId}/agent/generate`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ description, ...options }),
      },
      3,
      1000,
      60000 // Longer timeout for generation
    );
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
    const response = await fetchWithRetry(
      `${API_URL}/api/bots/${botId}/agent/refine`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId, modifications }),
      },
      3,
      1000,
      45000 // Medium timeout for refinement
    );
    return handleResponse(response);
  },

  /**
   * Deploy the workflow from a session
   */
  async deploy(botId: string, sessionId: string, activate: boolean = true): Promise<DeployResponse> {
    const response = await fetchWithRetry(
      `${API_URL}/api/bots/${botId}/agent/deploy`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId, activate }),
      },
      2, // Fewer retries for deploy
      2000,
      30000
    );
    return handleResponse<DeployResponse>(response);
  },

  /**
   * Get session information
   */
  async getSession(botId: string, sessionId: string): Promise<SessionInfo> {
    const response = await fetchWithTimeout(
      `${API_URL}/api/bots/${botId}/agent/session?sessionId=${sessionId}`,
      { headers: getAuthHeaders() },
      10000
    );
    return handleResponse<SessionInfo>(response);
  },

  /**
   * Delete a session
   */
  async deleteSession(botId: string, sessionId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetchWithTimeout(
      `${API_URL}/api/bots/${botId}/agent/session/${sessionId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      },
      10000
    );
    return handleResponse(response);
  },

  /**
   * Get workflow explanation
   */
  async explain(botId: string, sessionId: string): Promise<ExplainResponse> {
    const response = await fetchWithRetry(
      `${API_URL}/api/bots/${botId}/agent/explain?sessionId=${sessionId}`,
      { headers: getAuthHeaders() },
      2,
      1000,
      30000
    );
    return handleResponse<ExplainResponse>(response);
  },

  /**
   * Get AI agent usage statistics
   */
  async getStats(botId: string): Promise<{ activeSessions: number; totalSessions: number }> {
    const response = await fetchWithTimeout(
      `${API_URL}/api/bots/${botId}/agent/stats`,
      { headers: getAuthHeaders() },
      10000
    );
    return handleResponse(response);
  },
};
