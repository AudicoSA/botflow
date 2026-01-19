/**
 * Test Helpers for AI Agent Integration Tests
 *
 * Provides utilities for creating test servers, auth tokens, and mocks
 */

import { vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import type { Blueprint, BlueprintNode, BlueprintEdge } from '../../types/workflow.js';
import type { ParsedIntent, ConversationContext, WorkflowTemplate } from '../../types/ai-agent.js';

// JWT secret for test tokens
const TEST_JWT_SECRET = 'test-jwt-secret-for-testing-only';

/**
 * Create a test Fastify server with authentication
 */
export async function createTestServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Register JWT
  await app.register(import('@fastify/jwt'), {
    secret: TEST_JWT_SECRET
  });

  // Add authenticate decorator
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Add user decorator for authenticated routes
  app.decorateRequest('user', null);

  // Register AI agent routes
  const aiAgentRoutes = await import('../../routes/ai-agent.js');
  await app.register(aiAgentRoutes.default, { prefix: '/api/bots' });

  await app.ready();
  return app;
}

/**
 * Create an authentication token for testing
 */
export function createAuthToken(payload: {
  userId: string;
  orgId: string;
}): string {
  return jwt.sign(
    { id: payload.userId, organization_id: payload.orgId },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabase() {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis()
  };
}

/**
 * Create a mock OpenAI client
 */
export function createMockOpenAI() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                action: 'create',
                workflowType: 'order_tracking',
                entities: [],
                integrations: ['shopify'],
                requirements: [],
                confidence: 0.85,
                needsClarification: false
              })
            }
          }]
        })
      }
    }
  };
}

// Test fixtures
export const mockBlueprint: Blueprint = {
  bot_id: 'test-bot-123',
  version: '1.0.0',
  name: 'Test Workflow',
  description: 'Test description',
  nodes: [
    {
      id: 'trigger-1',
      type: 'whatsapp_trigger',
      position: { x: 200, y: 50 },
      data: { label: 'Message Received' },
      config: { match_type: 'any' }
    },
    {
      id: 'action-1',
      type: 'send_message',
      position: { x: 200, y: 150 },
      data: { label: 'Send Response' },
      config: { message: 'Hello!' }
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
  userPreferences: {
    language: 'en',
    technicalLevel: 'beginner'
  },
  availableIntegrations: [
    { slug: 'shopify', name: 'Shopify', category: 'ecommerce', isEnabled: true, hasCredentials: true }
  ],
  history: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000)
};

export const mockWorkflowTemplate: WorkflowTemplate = {
  id: 'template-123',
  slug: 'order-tracking',
  name: 'Order Tracking Template',
  category: 'ecommerce',
  description: 'Track customer orders from your e-commerce store',
  triggerPhrases: ['track order', 'order status', 'where is my order'],
  requiredIntegrations: ['shopify'],
  blueprint: mockBlueprint,
  variables: [
    {
      name: 'storeName',
      type: 'string',
      label: 'Store Name',
      required: true
    }
  ],
  configurableFields: [],
  popularityScore: 50,
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * Wait for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock bot for testing
 */
export function createMockBot(overrides: Partial<{
  id: string;
  user_id: string;
  organization_id: string;
}> = {}) {
  return {
    id: overrides.id || 'bot-123',
    user_id: overrides.user_id || 'user-123',
    organization_id: overrides.organization_id || 'org-123',
    name: 'Test Bot',
    workflow_nodes: [],
    workflow_edges: [],
    workflow_variables: {},
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
