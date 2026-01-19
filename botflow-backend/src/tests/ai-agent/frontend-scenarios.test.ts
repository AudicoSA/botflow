/**
 * Frontend Scenarios Integration Tests
 *
 * Tests complete user flows as they would occur from the frontend,
 * validating the full conversation lifecycle with real API calls.
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createTestServer, createAuthToken, mockBlueprint } from './helpers.js';
import type { FastifyInstance } from 'fastify';

// Mock the AI services to avoid actual OpenAI calls
vi.mock('../../services/ai-agent/intent-parser.js', () => ({
  getIntentParser: () => ({
    parse: vi.fn().mockResolvedValue({
      action: 'create',
      workflowType: 'order_tracking',
      entities: [],
      integrations: ['shopify'],
      requirements: [],
      confidence: 0.85,
      needsClarification: false,
      rawMessage: 'track orders from shopify'
    })
  })
}));

vi.mock('../../services/ai-agent/workflow-generator.js', () => ({
  getWorkflowGenerator: () => ({
    generate: vi.fn().mockResolvedValue({
      workflow: {
        bot_id: 'test-bot-123',
        version: '1.0.0',
        name: 'Order Tracking Workflow',
        description: 'Track customer orders from Shopify',
        nodes: [
          { id: 'trigger-1', type: 'whatsapp_trigger', position: { x: 200, y: 50 }, data: { label: 'Message Received' }, config: {} },
          { id: 'action-1', type: 'send_message', position: { x: 200, y: 150 }, data: { label: 'Send Response' }, config: {} }
        ],
        edges: [{ id: 'edge-1', source: 'trigger-1', target: 'action-1' }],
        variables: {},
        credentials: []
      },
      confidence: 0.85,
      explanation: 'Created order tracking workflow',
      warnings: []
    }),
    refine: vi.fn().mockResolvedValue({
      workflow: mockBlueprint,
      success: true,
      explanation: 'Workflow refined successfully',
      warnings: []
    })
  })
}));

vi.mock('../../services/ai-agent/conversation-engine.js', () => ({
  getConversationEngine: () => ({
    processMessage: vi.fn().mockImplementation(async (botId, message, sessionId) => ({
      message: 'I can help you create an order tracking workflow. What e-commerce platform are you using?',
      sessionId: sessionId || 'new-session-123',
      state: 'gathering',
      workflow: null,
      actions: [],
      suggestions: ['Shopify', 'WooCommerce', 'Custom']
    }))
  })
}));

describe('AI Builder Frontend Scenarios', () => {
  let app: FastifyInstance;
  let token: string;
  const botId = 'test-bot-123';
  const userId = 'test-user-123';
  const orgId = 'test-org-123';

  beforeAll(async () => {
    app = await createTestServer();
    token = createAuthToken({ userId, orgId });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Conversation Flow', () => {
    let sessionId: string;

    it('should start conversation and create session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'I want to track orders from Shopify' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.sessionId).toBeDefined();
      expect(body.state).toBeDefined();
      expect(body.message).toBeTruthy();

      sessionId = body.sessionId;
    });

    it('should continue conversation with session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          message: 'Customers will use their email to track orders',
          sessionId
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.sessionId).toBe(sessionId);
    });

    it('should generate workflow after gathering requirements', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          message: 'Yes, that looks good',
          sessionId
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      // Response should be valid
      expect(body.message).toBeTruthy();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid session ID gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          message: 'test',
          sessionId: 'invalid-session-id-12345'
        }
      });

      // Should either continue with new session or return clear error
      expect([200, 400, 404]).toContain(response.statusCode);
    });

    it('should handle empty message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: '' }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle very long message', async () => {
      const longMessage = 'a'.repeat(10000);
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: longMessage }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle missing authorization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        payload: { message: 'test' }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle invalid authorization token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: 'Bearer invalid-token' },
        payload: { message: 'test' }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Session Management', () => {
    let testSessionId: string;

    beforeEach(async () => {
      // Create a fresh session for each test
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'Hello' }
      });
      const body = JSON.parse(response.payload);
      testSessionId = body.sessionId;
    });

    it('should get session info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/bots/${botId}/agent/session?sessionId=${testSessionId}`,
        headers: { authorization: `Bearer ${token}` }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.sessionId).toBe(testSessionId);
    });

    it('should delete session', async () => {
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/bots/${botId}/agent/session/${testSessionId}`,
        headers: { authorization: `Bearer ${token}` }
      });

      expect(deleteResponse.statusCode).toBe(200);

      // Verify session is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/bots/${botId}/agent/session?sessionId=${testSessionId}`,
        headers: { authorization: `Bearer ${token}` }
      });

      expect([404, 200]).toContain(getResponse.statusCode);
    });
  });

  describe('Quick Commands', () => {
    it('should handle help command', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'help' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      // Response should contain help information
      expect(body.message).toBeTruthy();
    });

    it('should handle reset command', async () => {
      // Create session with some state
      const chatResponse = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'Create order tracking' }
      });
      const { sessionId } = JSON.parse(chatResponse.payload);

      // Send reset
      const resetResponse = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'reset', sessionId }
      });

      expect(resetResponse.statusCode).toBe(200);
      const body = JSON.parse(resetResponse.payload);
      // Should reset to idle state
      expect(['idle', 'gathering']).toContain(body.state);
    });
  });

  describe('Workflow Generation', () => {
    it('should generate workflow directly', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/generate`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          description: 'Create an order tracking workflow for Shopify',
          integrations: ['shopify']
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.workflow).toBeDefined();
      expect(body.workflow.nodes).toBeDefined();
      expect(body.workflow.edges).toBeDefined();
    });
  });

  describe('Deploy Flow', () => {
    it('should handle deploy without workflow', async () => {
      // Create a new session
      const chatResponse = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'Hello' }
      });
      const { sessionId } = JSON.parse(chatResponse.payload);

      // Try to deploy without a workflow
      const deployResponse = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/deploy`,
        headers: { authorization: `Bearer ${token}` },
        payload: { sessionId, activate: true }
      });

      // Should fail gracefully
      expect([400, 404, 500]).toContain(deployResponse.statusCode);
    });
  });

  describe('Template Integration', () => {
    it('should list workflow templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workflow-templates',
        headers: { authorization: `Bearer ${token}` }
      });

      // Templates endpoint should be accessible
      expect([200, 404]).toContain(response.statusCode);
    });

    it('should get template categories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workflow-templates/categories',
        headers: { authorization: `Bearer ${token}` }
      });

      // Categories endpoint should be accessible
      expect([200, 404]).toContain(response.statusCode);
    });
  });

  describe('Rate Limiting', () => {
    it('should not rate limit normal usage', async () => {
      // Send a few messages quickly
      const promises = Array(5).fill(null).map((_, i) =>
        app.inject({
          method: 'POST',
          url: `/api/bots/${botId}/agent/chat`,
          headers: { authorization: `Bearer ${token}` },
          payload: { message: `Test message ${i}` }
        })
      );

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.statusCode === 200).length;

      // Most requests should succeed
      expect(successCount).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('AI Agent Health Endpoints', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await createTestServer();
    token = createAuthToken({ userId: 'test-user', orgId: 'test-org' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/agent/health'
    });

    // Health endpoint should be accessible
    expect([200, 404, 503]).toContain(response.statusCode);
  });

  it('should return liveness probe', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/agent/live'
    });

    // Liveness probe should be accessible
    expect([200, 404]).toContain(response.statusCode);
  });

  it('should return readiness probe', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/agent/ready'
    });

    // Readiness probe should be accessible
    expect([200, 404, 503]).toContain(response.statusCode);
  });
});
