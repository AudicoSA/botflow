'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  aiAgentService,
  Blueprint,
  AgentAction,
  AgentQuestion,
} from '../services/ai-agent.service';

export type ConversationState = 'idle' | 'gathering' | 'confirming' | 'refining' | 'deploying' | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AgentAction[];
  questions?: AgentQuestion[];
  suggestions?: string[];
}

interface UseAIAgentOptions {
  botId: string;
  onWorkflowGenerated?: (workflow: Blueprint) => void;
  onDeployed?: () => void;
  onError?: (error: Error) => void;
}

interface UseAIAgentReturn {
  messages: Message[];
  workflow: Blueprint | null;
  state: ConversationState;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  selectSuggestion: (suggestion: string) => Promise<void>;
  executeAction: (action: AgentAction) => Promise<void>;
  reset: () => void;
  deploy: () => Promise<void>;
  undo: () => Promise<void>;
}

const SESSION_STORAGE_KEY = 'botflow_ai_session';

export function useAIAgent(options: UseAIAgentOptions): UseAIAgentReturn {
  const { botId, onWorkflowGenerated, onDeployed, onError } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [workflow, setWorkflow] = useState<Blueprint | null>(null);
  const [state, setState] = useState<ConversationState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messageIdCounter = useRef(0);

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return `msg_${Date.now()}_${messageIdCounter.current}`;
  }, []);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(`${SESSION_STORAGE_KEY}_${botId}`);
    if (savedSession) {
      try {
        const { sessionId: savedSessionId, messages: savedMessages, workflow: savedWorkflow, state: savedState } = JSON.parse(savedSession);
        setSessionId(savedSessionId);
        setMessages(savedMessages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })));
        setWorkflow(savedWorkflow);
        setState(savedState);
      } catch {
        // Invalid saved session, start fresh
        localStorage.removeItem(`${SESSION_STORAGE_KEY}_${botId}`);
      }
    } else {
      // Add initial welcome message
      setMessages([{
        id: generateMessageId(),
        role: 'assistant',
        content: "Hi! I'm here to help you build a WhatsApp bot workflow. Just describe what you want your bot to do, and I'll create it for you.\n\nFor example, you could say:\n- \"Track customer orders from Shopify\"\n- \"Book appointments for my salon\"\n- \"Answer FAQs about my restaurant\"",
        timestamp: new Date(),
        suggestions: [
          'Track customer orders',
          'Book appointments',
          'Answer FAQs',
          'Process payments',
        ],
      }]);
    }
  }, [botId, generateMessageId]);

  // Save session to localStorage when it changes
  useEffect(() => {
    if (sessionId && messages.length > 1) {
      localStorage.setItem(`${SESSION_STORAGE_KEY}_${botId}`, JSON.stringify({
        sessionId,
        messages,
        workflow,
        state,
      }));
    }
  }, [botId, sessionId, messages, workflow, state]);

  // Add user message to the conversation
  const addUserMessage = useCallback((content: string) => {
    const message: Message = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
    return message;
  }, [generateMessageId]);

  // Add assistant message to the conversation
  const addAssistantMessage = useCallback((
    content: string,
    options?: { actions?: AgentAction[]; questions?: AgentQuestion[]; suggestions?: string[] }
  ) => {
    const message: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      ...options,
    };
    setMessages((prev) => [...prev, message]);
    return message;
  }, [generateMessageId]);

  // Send a message to the AI agent
  const sendMessage = useCallback(async (message: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    addUserMessage(message);

    try {
      const response = await aiAgentService.chat(botId, message, sessionId || undefined);

      setSessionId(response.sessionId);
      setState(response.state);

      if (response.workflow) {
        setWorkflow(response.workflow);
        onWorkflowGenerated?.(response.workflow);
      }

      addAssistantMessage(response.message, {
        actions: response.actions,
        questions: response.questions,
        suggestions: response.suggestions,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      addAssistantMessage(`Sorry, I encountered an error: ${errorMessage}. Please try again.`);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [botId, sessionId, isLoading, addUserMessage, addAssistantMessage, onWorkflowGenerated, onError]);

  // Select a suggestion (same as sending message)
  const selectSuggestion = useCallback(async (suggestion: string) => {
    await sendMessage(suggestion);
  }, [sendMessage]);

  // Execute an action
  const executeAction = useCallback(async (action: AgentAction) => {
    switch (action.type) {
      case 'deploy':
        await deploy();
        break;
      case 'modify':
        // Just update state to refining
        setState('refining');
        addAssistantMessage("What would you like to change about the workflow?");
        break;
      case 'explain':
        if (sessionId) {
          setIsLoading(true);
          try {
            const response = await aiAgentService.explain(botId, sessionId);
            addAssistantMessage(response.explanation);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to explain workflow';
            setError(errorMessage);
            addAssistantMessage(`Sorry, I couldn't explain the workflow: ${errorMessage}`);
          } finally {
            setIsLoading(false);
          }
        }
        break;
      case 'reset':
        reset();
        break;
      case 'undo':
        await undo();
        break;
      default:
        break;
    }
  }, [botId, sessionId]);

  // Reset the conversation
  const reset = useCallback(() => {
    setMessages([{
      id: generateMessageId(),
      role: 'assistant',
      content: "I've reset our conversation. What would you like to build?",
      timestamp: new Date(),
      suggestions: [
        'Track customer orders',
        'Book appointments',
        'Answer FAQs',
        'Process payments',
      ],
    }]);
    setWorkflow(null);
    setState('idle');

    // Delete session on server if exists
    if (sessionId) {
      aiAgentService.deleteSession(botId, sessionId).catch(() => {});
    }

    setSessionId(null);
    localStorage.removeItem(`${SESSION_STORAGE_KEY}_${botId}`);
  }, [botId, sessionId, generateMessageId]);

  // Deploy the workflow
  const deploy = useCallback(async () => {
    if (!sessionId || !workflow) {
      setError('No workflow to deploy');
      return;
    }

    setIsLoading(true);
    setError(null);
    setState('deploying');

    try {
      const response = await aiAgentService.deploy(botId, sessionId, true);

      if (response.success) {
        setState('complete');
        addAssistantMessage(
          `Your workflow has been deployed and is now active! Customers can start using it right away.\n\nWhat would you like to do next?`,
          {
            actions: [
              { type: 'modify', label: 'Make Changes' },
              { type: 'reset', label: 'Build Something New' },
            ],
            suggestions: [
              'Test the workflow',
              'Make changes',
              'Build another workflow',
            ],
          }
        );
        onDeployed?.();

        // Clear saved session since we're complete
        localStorage.removeItem(`${SESSION_STORAGE_KEY}_${botId}`);
      } else {
        throw new Error('Deploy failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy workflow';
      setError(errorMessage);
      setState('confirming');
      addAssistantMessage(`Sorry, I couldn't deploy the workflow: ${errorMessage}. Please try again.`);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [botId, sessionId, workflow, addAssistantMessage, onDeployed, onError]);

  // Undo last change
  const undo = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      // Send undo command to chat
      const response = await aiAgentService.chat(botId, 'undo', sessionId);

      setState(response.state);
      if (response.workflow) {
        setWorkflow(response.workflow);
        onWorkflowGenerated?.(response.workflow);
      }

      addAssistantMessage(response.message, {
        actions: response.actions,
        suggestions: response.suggestions,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to undo';
      setError(errorMessage);
      addAssistantMessage(`Sorry, I couldn't undo: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [botId, sessionId, addAssistantMessage, onWorkflowGenerated]);

  return {
    messages,
    workflow,
    state,
    sessionId,
    isLoading,
    error,
    sendMessage,
    selectSuggestion,
    executeAction,
    reset,
    deploy,
    undo,
  };
}
