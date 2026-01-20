import { vi } from 'vitest';
import type { Blueprint, BlueprintNode, BlueprintEdge } from '../../types/workflow.js';
import type { ParsedIntent, ConversationContext } from '../../types/ai-agent.js';

// Mock Supabase
export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null })
};

vi.mock('../../config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase
}));

// Mock OpenAI
export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{}' } }]
      })
    }
  }
};

// Test fixtures
export const mockBlueprint: Blueprint = {
  bot_id: 'test-bot-123',
  version: '1.0.0',
  name: 'Test Workflow',
  description: 'Test description',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 200, y: 50 },
      data: { label: 'Message Received' }
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 200, y: 150 },
      data: { label: 'Send Response', actionType: 'send_message' }
    }
  ],
  edges: [{ id: 'edge-1', source: 'trigger-1', target: 'action-1' }],
  variables: {},
  credentials: []
};

export const mockIntent: ParsedIntent = {
  action: 'create',
  workflowType: 'order_tracking',
  entities: [],
  integrations: ['shopify'],
  requirements: [],
  confidence: 0.85,
  needsClarification: false,
  rawMessage: 'track orders from shopify'
};

export const mockContext: ConversationContext = {
  sessionId: 'session-123',
  botId: 'bot-123',
  userId: 'user-123',
  organizationId: 'org-123',
  state: 'idle',
  currentWorkflow: null,
  previousWorkflows: [],
  gatheredRequirements: [],
  pendingQuestions: [],
  userPreferences: {},
  availableIntegrations: [],
  history: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000)
};
