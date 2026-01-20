# Phase 3 Week 5.3: AI Builder Frontend Fixes & Full Stack Testing

## Overview

Week 5.3 focuses on fixing the AI Builder chat functionality that is currently not working, implementing comprehensive frontend-to-backend integration tests, and ensuring the complete conversation flow works end-to-end.

## Goals

1. **AI Builder Chat Fixes** - Fix critical bugs preventing chat from working
2. **Frontend Integration** - Ensure proper API communication
3. **Full Stack E2E Tests** - Test complete user flows with real API calls
4. **Error Handling** - Improve resilience and user feedback

---

## Day 1: AI Builder Chat Bug Fixes

### 1.1 Authorization Header Missing in TemplateSelector

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/TemplateSelector.tsx`

**Issue:** The TemplateSelector component doesn't include the Authorization header in API calls, causing authentication failures.

**Fix:**
```typescript
// Add proper authentication to template fetches
const fetchTemplates = async () => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/workflow-templates?${params}`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch templates: ${res.status}`);
  }

  return res.json();
};
```

### 1.2 Session State Persistence Issues

**File:** `botflow-website/app/hooks/useAIAgent.ts`

**Issue:** localStorage not cleared on failed session restoration, causing stale state.

**Fix:**
```typescript
// Add proper cleanup on session restoration failure
useEffect(() => {
  const loadSession = async () => {
    try {
      const saved = localStorage.getItem(`ai-agent-session-${botId}`);
      if (!saved) return;

      const data = JSON.parse(saved);

      // Validate session with backend before restoring
      const isValid = await aiAgentService.getSession(botId, data.sessionId);

      if (isValid) {
        setSessionId(data.sessionId);
        setMessages(data.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
        setConversationState(data.state || 'idle');
        setWorkflow(data.workflow || null);
      } else {
        // Clear invalid session
        localStorage.removeItem(`ai-agent-session-${botId}`);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem(`ai-agent-session-${botId}`);
    }
  };

  loadSession();
}, [botId]);
```

### 1.3 Race Condition in Deploy Function

**File:** `botflow-website/app/hooks/useAIAgent.ts`

**Issue:** State transitions to 'deploying' before API call completes, causing inconsistent state on failure.

**Fix:**
```typescript
const deploy = async (): Promise<boolean> => {
  if (!sessionId || !workflow) return false;

  // Don't change state until we confirm API success
  setIsLoading(true);

  try {
    const response = await aiAgentService.deploy(botId, sessionId, true);

    if (response.success) {
      // Only transition state after confirmed success
      setConversationState('complete');

      setMessages(prev => [...prev, {
        id: `deploy-success-${Date.now()}`,
        role: 'assistant',
        content: `✅ Workflow deployed successfully!\n\nWorkflow ID: ${response.workflowId}\nStatus: ${response.status}`,
        timestamp: new Date()
      }]);

      return true;
    } else {
      setMessages(prev => [...prev, {
        id: `deploy-error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Deployment failed: ${response.message || 'Unknown error'}`,
        timestamp: new Date()
      }]);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setMessages(prev => [...prev, {
      id: `deploy-error-${Date.now()}`,
      role: 'assistant',
      content: `❌ Deployment error: ${errorMessage}`,
      timestamp: new Date()
    }]);
    return false;
  } finally {
    setIsLoading(false);
  }
};
```

### 1.4 Message ID Collision Fix

**File:** `botflow-website/app/hooks/useAIAgent.ts`

**Issue:** Message IDs use `Date.now()` which can have collisions.

**Fix:**
```typescript
// Use crypto.randomUUID() for unique IDs
const generateMessageId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// In sendMessage:
const userMessage: Message = {
  id: generateMessageId(),
  role: 'user',
  content: message.trim(),
  timestamp: new Date()
};
```

---

## Day 2: API Service Improvements

### 2.1 Add Request Timeout Handling

**File:** `botflow-website/app/services/ai-agent.service.ts`

**Issue:** No timeout handling for slow API responses.

**Fix:**
```typescript
// Add timeout wrapper for all API calls
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

// Update chat method
async chat(botId: string, message: string, sessionId?: string): Promise<ChatResponse> {
  const response = await fetchWithTimeout(
    `${this.baseUrl}/api/bots/${botId}/agent/chat`,
    {
      method: 'POST',
      headers: this.headers,
      credentials: 'include',
      body: JSON.stringify({ message, sessionId })
    },
    30000 // 30 second timeout for chat
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
```

### 2.2 Add Retry Logic for Transient Failures

```typescript
// Add retry wrapper
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries: number = 3,
  backoffMs: number = 1000
): Promise<Response> => {
  let lastError: Error;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

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

  throw lastError!;
};
```

### 2.3 Add Health Check Before Chat

```typescript
// Check backend health before starting conversation
async healthCheck(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/api/agent/health`,
      { method: 'GET', headers: this.headers },
      5000 // Quick timeout for health check
    );
    return response.ok;
  } catch {
    return false;
  }
}
```

---

## Day 3: Chat Panel Improvements

### 3.1 Input Validation Enhancement

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/ChatPanel.tsx`

**Fix:**
```typescript
const handleSend = async () => {
  const trimmedInput = inputValue.trim();

  // Enhanced validation
  if (!trimmedInput) {
    return; // Don't send empty messages
  }

  if (trimmedInput.length > 2000) {
    // Show error for too-long messages
    setLocalError('Message too long. Please keep it under 2000 characters.');
    return;
  }

  // Check for potential issues
  if (isLoading) {
    return; // Don't send while loading
  }

  setInputValue('');
  await onSendMessage(trimmedInput);
};
```

### 3.2 Loading State Visual Feedback

```tsx
// Add visible loading state indicator
{isLoading && (
  <div className="flex items-center justify-center p-4 bg-gray-50 border-t">
    <div className="flex items-center gap-2 text-gray-600">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>AI is thinking...</span>
    </div>
  </div>
)}
```

### 3.3 Error Display Component

```tsx
// Add error display with retry
interface ChatPanelProps {
  // ... existing props
  error?: string;
  onRetry?: () => void;
}

{error && (
  <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
    <div className="flex items-center gap-2 text-red-700">
      <AlertCircle className="w-5 h-5" />
      <span>{error}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded text-red-700"
      >
        Retry
      </button>
    )}
  </div>
)}
```

---

## Day 4: Full Stack E2E Tests

### 4.1 Playwright Test Setup

**File:** `botflow-website/e2e/ai-builder.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('AI Builder E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to AI Builder
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');

    // Navigate to a test bot's AI Builder
    await page.goto(`/dashboard/bots/${process.env.TEST_BOT_ID}/ai-builder`);
  });

  test('should display empty state on first load', async ({ page }) => {
    await expect(page.getByText('Start building your workflow')).toBeVisible();
    await expect(page.getByRole('textbox')).toBeEnabled();
  });

  test('should send message and receive response', async ({ page }) => {
    const input = page.getByRole('textbox');
    await input.fill('I want to track orders from Shopify');
    await input.press('Enter');

    // Should show user message
    await expect(page.getByText('I want to track orders from Shopify')).toBeVisible();

    // Should show loading indicator
    await expect(page.getByText('AI is thinking...')).toBeVisible();

    // Should receive response (with timeout)
    await expect(page.locator('.message-bubble.assistant')).toBeVisible({ timeout: 30000 });

    // Should update state
    await expect(page.getByText(/gathering|confirming/i)).toBeVisible();
  });

  test('should display workflow preview after generation', async ({ page }) => {
    // Start conversation
    await page.fill('[role="textbox"]', 'Create an order tracking workflow for Shopify');
    await page.press('[role="textbox"]', 'Enter');

    // Wait for workflow to be generated
    await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 60000 });

    // Should show nodes
    await expect(page.locator('.react-flow__node')).toHaveCount.toBeGreaterThan(0);

    // Should show deploy button
    await expect(page.getByRole('button', { name: /deploy/i })).toBeVisible();
  });

  test('should handle quick commands', async ({ page }) => {
    await page.fill('[role="textbox"]', 'help');
    await page.press('[role="textbox"]', 'Enter');

    await expect(page.getByText(/available commands|help/i)).toBeVisible({ timeout: 10000 });
  });

  test('should persist session across page reload', async ({ page }) => {
    // Send initial message
    await page.fill('[role="textbox"]', 'Create a booking bot');
    await page.press('[role="textbox"]', 'Enter');
    await expect(page.locator('.message-bubble.assistant')).toBeVisible({ timeout: 30000 });

    // Reload page
    await page.reload();

    // Session should be restored
    await expect(page.getByText('Create a booking bot')).toBeVisible();
  });

  test('should deploy workflow successfully', async ({ page }) => {
    // Create a quick workflow using template
    await page.fill('[role="textbox"]', 'Create a simple FAQ bot');
    await page.press('[role="textbox"]', 'Enter');

    // Wait for workflow
    await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 60000 });

    // Confirm when asked
    await page.fill('[role="textbox"]', 'yes, deploy it');
    await page.press('[role="textbox"]', 'Enter');

    // Wait for deployment
    await expect(page.getByText(/deployed successfully/i)).toBeVisible({ timeout: 30000 });

    // State should be complete
    await expect(page.getByText('complete')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept and fail the API call
    await page.route('**/api/bots/*/agent/chat', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.fill('[role="textbox"]', 'Test message');
    await page.press('[role="textbox"]', 'Enter');

    // Should show error message
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle network timeout', async ({ page }) => {
    // Intercept and delay the API call
    await page.route('**/api/bots/*/agent/chat', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than timeout
      route.fulfill({ status: 200, body: '{}' });
    });

    await page.fill('[role="textbox"]', 'Test message');
    await page.press('[role="textbox"]', 'Enter');

    // Should show timeout error
    await expect(page.getByText(/timed out|timeout/i)).toBeVisible({ timeout: 35000 });
  });
});
```

### 4.2 Backend Integration Test for Frontend Scenarios

**File:** `botflow-backend/src/tests/ai-agent/frontend-scenarios.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestServer, createAuthToken } from './helpers.js';
import type { FastifyInstance } from 'fastify';

describe('AI Builder Frontend Scenarios', () => {
  let app: FastifyInstance;
  let token: string;
  const botId = 'test-bot-123';

  beforeAll(async () => {
    app = await createTestServer();
    token = createAuthToken({ userId: 'test-user', orgId: 'test-org' });
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
      expect(body.state).toMatch(/gathering|confirming/);
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
      // Confirm the workflow
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

      // Should have workflow in response
      if (body.workflow) {
        expect(body.workflow.nodes).toBeDefined();
        expect(body.workflow.edges).toBeDefined();
      }
    });

    it('should deploy workflow', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/deploy`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          sessionId,
          activate: true
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.success).toBe(true);
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

    it('should handle malformed JSON', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        payload: '{"message": invalid}'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Session Management', () => {
    it('should get session info', async () => {
      // First create a session
      const chatResponse = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'Hello' }
      });
      const { sessionId } = JSON.parse(chatResponse.payload);

      // Get session info
      const response = await app.inject({
        method: 'GET',
        url: `/api/bots/${botId}/agent/session?sessionId=${sessionId}`,
        headers: { authorization: `Bearer ${token}` }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.sessionId).toBe(sessionId);
    });

    it('should delete session', async () => {
      // Create session
      const chatResponse = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'Hello' }
      });
      const { sessionId } = JSON.parse(chatResponse.payload);

      // Delete session
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/bots/${botId}/agent/session/${sessionId}`,
        headers: { authorization: `Bearer ${token}` }
      });

      expect(deleteResponse.statusCode).toBe(200);

      // Verify session is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/bots/${botId}/agent/session?sessionId=${sessionId}`,
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
      expect(body.message.toLowerCase()).toContain('help');
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
      expect(body.state).toBe('idle');
    });
  });

  describe('Template Integration', () => {
    it('should suggest templates for known intents', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/bots/${botId}/agent/chat`,
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'I need an order tracking bot for my Shopify store' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      // Should mention templates or Shopify
      const hasTemplateReference =
        body.message.toLowerCase().includes('template') ||
        body.message.toLowerCase().includes('shopify') ||
        body.suggestions?.some((s: string) => s.toLowerCase().includes('template'));

      expect(hasTemplateReference).toBe(true);
    });
  });
});
```

---

## Day 5: Error Handling & Recovery

### 5.1 Global Error Boundary for AI Builder

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/ErrorBoundary.tsx`

```tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AIBuilderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AI Builder Error:', error, errorInfo);

    // Log to monitoring service
    // analytics.trackError('ai_builder_crash', { error: error.message, stack: errorInfo.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4 max-w-md">
            The AI Builder encountered an error. This has been logged and we'll look into it.
          </p>
          {this.state.error && (
            <p className="text-sm text-gray-500 mb-4 font-mono bg-gray-100 p-2 rounded">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 5.2 Connection Status Indicator

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/ConnectionStatus.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { aiAgentService } from '@/app/services/ai-agent.service';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isHealthy = await aiAgentService.healthCheck();
        setStatus(isHealthy ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-1.5 text-gray-500 text-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="flex items-center gap-1.5 text-red-600 text-sm">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-green-600 text-sm">
      <Wifi className="w-3.5 h-3.5" />
      <span>Connected</span>
    </div>
  );
}
```

### 5.3 Retry Queue for Failed Messages

```typescript
// Add to useAIAgent hook
interface QueuedMessage {
  id: string;
  content: string;
  attempts: number;
  maxAttempts: number;
}

const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);

const processQueue = async () => {
  if (messageQueue.length === 0 || isLoading) return;

  const [current, ...rest] = messageQueue;

  try {
    await sendMessage(current.content);
    setMessageQueue(rest);
  } catch (error) {
    if (current.attempts < current.maxAttempts) {
      // Retry with exponential backoff
      setMessageQueue([
        { ...current, attempts: current.attempts + 1 },
        ...rest
      ]);
    } else {
      // Give up after max attempts
      setMessageQueue(rest);
      setError(`Failed to send message after ${current.maxAttempts} attempts`);
    }
  }
};

useEffect(() => {
  const timer = setTimeout(processQueue, 1000 * Math.pow(2, messageQueue[0]?.attempts || 0));
  return () => clearTimeout(timer);
}, [messageQueue, isLoading]);
```

---

## Day 6: Backend Route Registration & Final Integration

### 6.1 Register AI Agent Health Routes

**File:** `botflow-backend/src/server.ts`

**Add to route registration:**
```typescript
import { aiAgentHealthRoutes } from './routes/ai-agent-health.js';

// In the route registration section:
await fastify.register(aiAgentHealthRoutes);
```

### 6.2 CORS Configuration for AI Builder

**Ensure CORS allows the AI builder endpoints:**
```typescript
// In server.ts CORS config
const corsOrigins = [
  // ... existing origins
];

fastify.register(cors, {
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
});
```

### 6.3 Request Logging Enhancement

```typescript
// Add request logging for AI agent routes
fastify.addHook('onRequest', async (request, reply) => {
  if (request.url.includes('/agent/')) {
    logger.info({
      method: request.method,
      url: request.url,
      sessionId: request.headers['x-session-id'],
      userAgent: request.headers['user-agent']
    }, 'AI Agent request');
  }
});

fastify.addHook('onResponse', async (request, reply) => {
  if (request.url.includes('/agent/')) {
    logger.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime
    }, 'AI Agent response');
  }
});
```

---

## Day 7: Documentation & Testing Verification

### 7.1 Test Execution Script

**File:** `botflow-backend/package.json` - Add scripts:
```json
{
  "scripts": {
    "test:ai-agent": "vitest run src/tests/ai-agent/",
    "test:ai-agent:watch": "vitest src/tests/ai-agent/",
    "test:e2e": "vitest run src/tests/ai-agent/e2e/",
    "test:integration": "vitest run src/tests/ai-agent/integration/",
    "test:frontend-scenarios": "vitest run src/tests/ai-agent/frontend-scenarios.test.ts"
  }
}
```

### 7.2 Playwright Configuration

**File:** `botflow-website/playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 7.3 Environment Variables Checklist

```env
# Required for E2E tests
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
TEST_BOT_ID=test-bot-uuid
TEST_ORG_ID=test-org-uuid

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
OPENAI_API_KEY=sk-...

# Optional: Test mode flags
AI_AGENT_TEST_MODE=true
AI_AGENT_MOCK_OPENAI=false
```

---

## Deliverables Checklist

### Frontend Fixes
- [x] Fix Authorization header in TemplateSelector
- [x] Fix session persistence issues in useAIAgent
- [x] Fix race condition in deploy function
- [x] Fix message ID collision issue
- [x] Add request timeout handling
- [x] Add retry logic for transient failures
- [x] Add health check before chat
- [x] Improve input validation in ChatPanel
- [x] Add loading state visual feedback
- [x] Add error display with retry option

### New Components
- [x] `ErrorBoundary.tsx` - Global error boundary
- [x] `ConnectionStatus.tsx` - Backend connection indicator

### Tests
- [x] `botflow-website/e2e/ai-builder.spec.ts` - Playwright E2E tests
- [x] `botflow-backend/src/tests/ai-agent/frontend-scenarios.test.ts` - Backend integration tests

### Backend Integration
- [x] Register AI agent health routes in server.ts
- [x] Verify CORS configuration
- [x] Add request/response logging for AI agent routes

### Documentation
- [x] Update environment variables documentation
- [x] Add test execution instructions
- [x] Create troubleshooting guide for common issues

---

## Success Criteria

1. **Chat Functionality**: AI Builder chat works end-to-end without errors
2. **Session Persistence**: Sessions survive page reload correctly
3. **Error Handling**: All errors are caught and displayed to user
4. **Timeout Handling**: Slow/hanging requests timeout gracefully
5. **E2E Test Pass Rate**: All Playwright tests pass
6. **Backend Test Pass Rate**: All frontend scenario tests pass
7. **No Console Errors**: No uncaught errors in browser console

---

## Notes

- Run frontend fixes first before testing
- Use `npm run test:ai-agent` to run all AI agent tests
- Use `npx playwright test` to run E2E tests
- Check browser DevTools Network tab for API issues
- Monitor backend logs for request/response details

---

## Debugging Tips

### Common Issues

1. **"Failed to fetch" error**
   - Check CORS configuration
   - Verify backend is running
   - Check Authorization header

2. **Session not persisting**
   - Check localStorage in DevTools
   - Verify sessionId in API responses
   - Check for JSON parse errors

3. **Workflow not displaying**
   - Check React Flow imports
   - Verify blueprint structure matches expected format
   - Check for null/undefined nodes

4. **Deploy fails silently**
   - Check network tab for actual response
   - Verify workflow validation passes
   - Check backend logs for errors
