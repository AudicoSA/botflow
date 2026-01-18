'use client';

import { useState } from 'react';

interface N8nBadgeProps {
  tooltip?: string;
}

export function N8nBadge({ tooltip = 'Powered by n8n workflow automation' }: N8nBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg
          className="w-3 h-3 mr-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v6" />
          <path d="M12 15v6" />
          <path d="M3 12h6" />
          <path d="M15 12h6" />
          <path d="M5.64 5.64l4.24 4.24" />
          <path d="M14.12 14.12l4.24 4.24" />
          <path d="M5.64 18.36l4.24-4.24" />
          <path d="M14.12 9.88l4.24-4.24" />
        </svg>
        n8n
      </span>
      {showTooltip && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
