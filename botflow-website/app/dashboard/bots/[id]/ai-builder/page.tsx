'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAIAgent } from '../../../../hooks/useAIAgent';
import { ChatPanel } from './ChatPanel';
import { WorkflowPreview } from './WorkflowPreview';
import { EmptyState } from './EmptyState';

export default function AIBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;

  const [botName, setBotName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const {
    messages,
    workflow,
    state,
    isLoading,
    sendMessage,
    selectSuggestion,
    executeAction,
    reset,
    deploy,
  } = useAIAgent({
    botId,
    onWorkflowGenerated: (wf) => {
      console.log('Workflow generated:', wf.name);
    },
    onDeployed: () => {
      console.log('Workflow deployed!');
    },
    onError: (err) => {
      console.error('AI Agent error:', err);
    },
  });

  // Fetch bot name
  useEffect(() => {
    const fetchBot = async () => {
      try {
        const token = localStorage.getItem('botflow_token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${apiUrl}/api/bots/${botId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBotName(data.bot?.name || 'Bot');
        }
      } catch (error) {
        console.error('Failed to fetch bot:', error);
      } finally {
        setLoading(false);
      }
    };

    if (botId) {
      fetchBot();
    }
  }, [botId, router]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-gray-50 -m-4 lg:-m-8">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/bots/${botId}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back</span>
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">AI Workflow Builder</h1>
              <p className="text-xs text-gray-500">{botName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* State indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
            <div className={`w-2 h-2 rounded-full ${
              state === 'idle' ? 'bg-gray-400' :
              state === 'gathering' ? 'bg-yellow-400' :
              state === 'confirming' ? 'bg-blue-400' :
              state === 'refining' ? 'bg-orange-400' :
              state === 'deploying' ? 'bg-purple-400 animate-pulse' :
              state === 'complete' ? 'bg-green-400' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium text-gray-600 capitalize">{state}</span>
          </div>

          {/* Reset button */}
          <button
            onClick={reset}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Reset
          </button>

          {/* Visual builder link */}
          <Link
            href={`/dashboard/bots/${botId}/workflow`}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Visual Builder
          </Link>
        </div>
      </div>

      {/* Main content - Split panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Panel (50%) */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            onSelectSuggestion={selectSuggestion}
            onExecuteAction={executeAction}
          />
        </div>

        {/* Right: Workflow Preview (50%) */}
        <div className="w-1/2 flex flex-col bg-gray-50">
          {workflow ? (
            <WorkflowPreview
              workflow={workflow}
              state={state}
              onDeploy={deploy}
              onModify={() => executeAction({ type: 'modify', label: 'Modify' })}
              isDeploying={state === 'deploying'}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
