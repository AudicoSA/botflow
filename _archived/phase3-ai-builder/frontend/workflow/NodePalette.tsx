'use client';

import { useState, useEffect } from 'react';

interface NodeType {
  type: string;
  label: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  integrationId?: string;
  integrationSlug?: string;
}

const BASE_NODES: NodeType[] = [
  // Triggers
  {
    type: 'trigger',
    label: 'WhatsApp Message',
    category: 'triggers',
    icon: '💬',
    color: 'bg-green-500',
    description: 'Triggered when a message is received',
  },
  {
    type: 'trigger',
    label: 'Keyword Trigger',
    category: 'triggers',
    icon: '🔑',
    color: 'bg-green-500',
    description: 'Triggered when specific keywords are detected',
  },
  // Actions
  {
    type: 'action',
    label: 'Send Reply',
    category: 'actions',
    icon: '📤',
    color: 'bg-blue-500',
    description: 'Send a WhatsApp message',
  },
  {
    type: 'action',
    label: 'Ask Question',
    category: 'actions',
    icon: '❓',
    color: 'bg-purple-500',
    description: 'Ask customer a question and wait for response',
  },
  {
    type: 'action',
    label: 'Send Menu',
    category: 'actions',
    icon: '📋',
    color: 'bg-blue-500',
    description: 'Send a menu with options to choose from',
  },
  {
    type: 'action',
    label: 'AI Response',
    category: 'actions',
    icon: '🤖',
    color: 'bg-indigo-500',
    description: 'Generate AI-powered response',
  },
  // Logic
  {
    type: 'condition',
    label: 'If Condition',
    category: 'logic',
    icon: '🔀',
    color: 'bg-yellow-500',
    description: 'Branch based on condition',
  },
  {
    type: 'condition',
    label: 'Keyword Match',
    category: 'logic',
    icon: '🔍',
    color: 'bg-yellow-500',
    description: 'Check if message contains keywords',
  },
  {
    type: 'condition',
    label: 'Intent Detection',
    category: 'logic',
    icon: '🎯',
    color: 'bg-yellow-500',
    description: 'Detect user intent using AI',
  },
  // Utilities
  {
    type: 'action',
    label: 'Set Variable',
    category: 'utilities',
    icon: '📝',
    color: 'bg-gray-500',
    description: 'Store a value for later use',
  },
  {
    type: 'action',
    label: 'Delay',
    category: 'utilities',
    icon: '⏱️',
    color: 'bg-gray-500',
    description: 'Wait before continuing',
  },
  {
    type: 'action',
    label: 'Handoff to Human',
    category: 'utilities',
    icon: '👤',
    color: 'bg-red-500',
    description: 'Transfer to human agent',
  },
  {
    type: 'action',
    label: 'End Conversation',
    category: 'utilities',
    icon: '🛑',
    color: 'bg-red-500',
    description: 'End the current conversation flow',
  },
];

interface NodePaletteProps {
  botId: string;
}

export function NodePalette({ botId }: NodePaletteProps) {
  const [integrationNodes, setIntegrationNodes] = useState<NodeType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'triggers',
    'actions',
    'logic',
    'integrations',
    'utilities',
  ]);

  useEffect(() => {
    fetchIntegrationNodes();
  }, [botId]);

  const fetchIntegrationNodes = async () => {
    try {
      const token = localStorage.getItem('botflow_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(
        `${apiUrl}/api/marketplace/bots/${botId}/integrations`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const nodes: NodeType[] = (data.integrations || []).map((int: {
          id: string;
          integration?: {
            name?: string;
            slug?: string;
          };
        }) => ({
          type: 'integration',
          label: int.integration?.name || 'Integration',
          category: 'integrations',
          icon: '🔌',
          color: 'bg-orange-500',
          description: `Use ${int.integration?.name || 'integration'} actions`,
          integrationId: int.id,
          integrationSlug: int.integration?.slug,
        }));
        setIntegrationNodes(nodes);
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    }
  };

  const allNodes = [...BASE_NODES, ...integrationNodes];

  const filteredNodes = searchTerm
    ? allNodes.filter(
        (node) =>
          node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allNodes;

  const categories = [
    { id: 'triggers', label: 'Triggers', icon: '⚡', description: 'Start your workflow' },
    { id: 'actions', label: 'Actions', icon: '▶️', description: 'Do something' },
    { id: 'logic', label: 'Logic', icon: '🔀', description: 'Make decisions' },
    { id: 'integrations', label: 'Integrations', icon: '🔌', description: 'Connect services' },
    { id: 'utilities', label: 'Utilities', icon: '🛠️', description: 'Helper tools' },
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const onDragStart = (event: React.DragEvent, node: NodeType) => {
    event.dataTransfer.setData('application/reactflow', node.type);
    event.dataTransfer.setData('nodeData', JSON.stringify(node));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Node Palette</h3>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {categories.map((category) => {
          const categoryNodes = filteredNodes.filter(
            (node) => node.category === category.id
          );
          if (categoryNodes.length === 0) return null;

          return (
            <div key={category.id} className="mb-3">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{category.icon}</span>
                  <span>{category.label}</span>
                  <span className="text-xs text-gray-400 font-normal">
                    ({categoryNodes.length})
                  </span>
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedCategories.includes(category.id) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {expandedCategories.includes(category.id) && (
                <div className="mt-1 space-y-1 pl-1">
                  {categoryNodes.map((node, index) => (
                    <div
                      key={`${node.type}-${node.label}-${index}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 hover:shadow-sm active:cursor-grabbing transition-all group"
                    >
                      <span
                        className={`w-8 h-8 ${node.color} rounded-lg flex items-center justify-center text-white text-sm shadow-sm`}
                      >
                        {node.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {node.label}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {node.description}
                        </p>
                      </div>
                      <svg
                        className="w-4 h-4 text-gray-300 group-hover:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredNodes.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="mx-auto w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No nodes match your search</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Drag nodes to the canvas to build your workflow
        </p>
      </div>
    </div>
  );
}
