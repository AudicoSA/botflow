'use client';

import { Message } from '../../../../hooks/useAIAgent';
import { AgentAction } from '../../../../services/ai-agent.service';

interface MessageBubbleProps {
  message: Message;
  onExecuteAction: (action: AgentAction) => Promise<void>;
}

export function MessageBubble({ message, onExecuteAction }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';
  const formattedTime = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format message content with markdown-like styling
  const formatContent = (content: string) => {
    // Split by double newlines for paragraphs
    const paragraphs = content.split('\n\n');

    return paragraphs.map((paragraph, pIndex) => {
      // Handle lists
      if (paragraph.includes('\n-') || paragraph.startsWith('-')) {
        const lines = paragraph.split('\n');
        const listItems: string[] = [];
        let currentItem = '';

        lines.forEach((line) => {
          if (line.startsWith('-')) {
            if (currentItem) listItems.push(currentItem);
            currentItem = line.substring(1).trim();
          } else if (line.trim()) {
            if (currentItem) {
              currentItem += ' ' + line.trim();
            } else {
              // Non-list line before any list items
              return (
                <p key={`${pIndex}-pre`} className="mb-2">
                  {line}
                </p>
              );
            }
          }
        });
        if (currentItem) listItems.push(currentItem);

        return (
          <ul key={pIndex} className="list-disc list-inside space-y-1 my-2">
            {listItems.map((item, iIndex) => (
              <li key={iIndex} className="text-sm">
                {item}
              </li>
            ))}
          </ul>
        );
      }

      // Handle numbered lists
      if (/^\d+\./.test(paragraph)) {
        const lines = paragraph.split('\n');
        return (
          <ol key={pIndex} className="list-decimal list-inside space-y-1 my-2">
            {lines.map((line, lIndex) => {
              const match = line.match(/^\d+\.\s*(.*)$/);
              if (match) {
                return (
                  <li key={lIndex} className="text-sm">
                    {match[1]}
                  </li>
                );
              }
              return (
                <span key={lIndex} className="text-sm">
                  {line}
                </span>
              );
            })}
          </ol>
        );
      }

      // Regular paragraph with line breaks
      return (
        <p key={pIndex} className="mb-2 last:mb-0">
          {paragraph.split('\n').map((line, lIndex) => (
            <span key={lIndex}>
              {line}
              {lIndex < paragraph.split('\n').length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    });
  };

  return (
    <div className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0 ${
          isAssistant
            ? 'bg-gradient-to-br from-violet-500 to-purple-600'
            : 'bg-gradient-to-br from-blue-500 to-blue-600'
        }`}
      >
        {isAssistant ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col ${isAssistant ? '' : 'items-end'}`}>
        <div
          className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
            isAssistant
              ? 'bg-gray-100 rounded-2xl rounded-bl-md text-gray-800'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl rounded-br-md text-white'
          }`}
        >
          {formatContent(message.content)}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-1 px-1">{formattedTime}</span>

        {/* Inline actions for this message */}
        {isAssistant && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onExecuteAction(action)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  action.type === 'deploy'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : action.type === 'modify'
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
