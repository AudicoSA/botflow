'use client';

import React from 'react';
import { AgentAction } from '../../../../services/ai-agent.service';

interface SuggestedActionsProps {
  suggestions: string[];
  actions: AgentAction[];
  onSelectSuggestion: (suggestion: string) => Promise<void>;
  onExecuteAction: (action: AgentAction) => Promise<void>;
}

export function SuggestedActions({
  suggestions,
  actions,
  onSelectSuggestion,
  onExecuteAction,
}: SuggestedActionsProps) {
  if (suggestions.length === 0 && actions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelectSuggestion(suggestion)}
              className="px-3 py-1.5 text-sm font-medium bg-white text-gray-700 border border-gray-200 rounded-full hover:bg-gray-100 hover:border-gray-300 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {actions.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${suggestions.length > 0 ? 'mt-3' : ''}`}>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => onExecuteAction(action)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                action.type === 'deploy'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : action.type === 'modify'
                  ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  : action.type === 'explain'
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : action.type === 'undo'
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : action.type === 'reset'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getActionIcon(action.type)}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getActionIcon(type: AgentAction['type']): React.ReactNode {
  switch (type) {
    case 'deploy':
      return (
        <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'modify':
      return (
        <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'explain':
      return (
        <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'undo':
      return (
        <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      );
    case 'reset':
      return (
        <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    default:
      return null;
  }
}
