'use client';

import { useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

interface BlueprintNode {
  id: string;
  type: string;
  name?: string;
  config: Record<string, any>;
}

interface BlueprintEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

interface BlueprintPreviewProps {
  blueprint: {
    nodes: BlueprintNode[];
    edges: BlueprintEdge[];
  };
  onNodeClick?: (node: BlueprintNode) => void;
}

export function BlueprintPreview({ blueprint, onNodeClick }: BlueprintPreviewProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (!blueprint || !blueprint.nodes) return;

    // Convert Blueprint nodes to ReactFlow nodes
    const flowNodes: Node[] = blueprint.nodes.map((node, index) => ({
      id: node.id,
      type: 'default',
      position: { x: 250, y: index * 150 }, // Simple vertical layout
      data: {
        label: (
          <div className="p-2">
            <div className="font-bold text-sm flex items-center gap-2">
              <span>{getNodeIcon(node.type)}</span>
              <span>{node.name || formatNodeType(node.type)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{getNodeDescription(node)}</div>
          </div>
        )
      },
      style: {
        background: getNodeColor(node.type),
        border: '2px solid #E5E7EB',
        borderRadius: '8px',
        padding: '10px',
        width: 280,
        cursor: onNodeClick ? 'pointer' : 'default'
      }
    }));

    const flowEdges: Edge[] = blueprint.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: true,
      style: { stroke: '#6B7280', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6B7280'
      },
      label: edge.condition,
      labelStyle: { fontSize: 10, fill: '#4B5563' },
      labelBgStyle: { fill: '#F3F4F6' }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [blueprint, onNodeClick]);

  const getNodeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      whatsapp_trigger: '📱',
      whatsapp_reply: '💬',
      ask_question: '❓',
      if_condition: '🔀',
      shopify_lookup: '🛍️',
      woocommerce_lookup: '🛒',
      knowledge_search: '🧠',
      http_request: '🌐',
      database_query: '🗄️',
      paystack_payment: '💳',
      delay: '⏰',
      loop: '🔁',
      set_variable: '📝',
      send_email: '📧',
      calendar_booking: '📅',
      handoff_to_human: '👤',
      end: '🏁'
    };
    return icons[type] || '⚙️';
  };

  const getNodeColor = (type: string): string => {
    const colors: Record<string, string> = {
      whatsapp_trigger: '#DBEAFE', // blue
      whatsapp_reply: '#DBEAFE',
      ask_question: '#FEF3C7', // yellow
      if_condition: '#FCE7F3', // pink
      shopify_lookup: '#D1FAE5', // green
      woocommerce_lookup: '#D1FAE5',
      knowledge_search: '#E0E7FF', // indigo
      http_request: '#FED7AA', // orange
      database_query: '#DDD6FE', // purple
      paystack_payment: '#BBF7D0', // green
      delay: '#E5E7EB', // gray
      loop: '#FED7AA',
      set_variable: '#FEF3C7',
      send_email: '#BFDBFE',
      calendar_booking: '#DDD6FE',
      handoff_to_human: '#FED7AA',
      end: '#D1FAE5'
    };
    return colors[type] || '#F3F4F6';
  };

  const formatNodeType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getNodeDescription = (node: BlueprintNode): string => {
    const { type, config } = node;

    if (type === 'whatsapp_trigger' && config.keyword) {
      return `Trigger: "${config.keyword}"`;
    }
    if (type === 'whatsapp_trigger' && config.trigger_type === 'any_message') {
      return 'Trigger: Any customer message';
    }
    if (type === 'whatsapp_reply' && config.message) {
      const message = config.message.substring(0, 40);
      return `"${message}${config.message.length > 40 ? '...' : ''}"`;
    }
    if (type === 'ask_question' && config.question) {
      return config.question.substring(0, 40) + '...';
    }
    if (type === 'if_condition' && config.condition) {
      return `If ${config.condition}`;
    }
    if (type === 'knowledge_search' && config.query) {
      return `Search: "${config.query.substring(0, 30)}..."`;
    }
    if (type === 'http_request' && config.url) {
      return `${config.method || 'GET'} ${config.url.substring(0, 30)}...`;
    }
    if (type === 'delay' && config.duration) {
      return `Wait ${config.duration}`;
    }
    if (type === 'shopify_lookup' && config.action) {
      return `Action: ${config.action}`;
    }
    if (type === 'woocommerce_lookup' && config.action) {
      return `Action: ${config.action}`;
    }
    if (type === 'paystack_payment' && config.amount) {
      return `Amount: R${config.amount}`;
    }

    return formatNodeType(type);
  };

  const handleNodeClick = (_: any, node: Node) => {
    if (onNodeClick && blueprint.nodes) {
      const blueprintNode = blueprint.nodes.find(n => n.id === node.id);
      if (blueprintNode) {
        onNodeClick(blueprintNode);
      }
    }
  };

  if (!blueprint || !blueprint.nodes || blueprint.nodes.length === 0) {
    return (
      <div className="w-full h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No workflow to preview
          </h3>
          <p className="text-gray-600">
            Complete the previous steps to generate your bot workflow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workflow Stats */}
      <div className="flex gap-4">
        <div className="flex-1 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">{blueprint.nodes.length}</div>
          <div className="text-sm text-blue-700">Workflow Steps</div>
        </div>
        <div className="flex-1 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-2xl font-bold text-green-900">{blueprint.edges.length}</div>
          <div className="text-sm text-green-700">Connections</div>
        </div>
        <div className="flex-1 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-2xl font-bold text-purple-900">
            {new Set(blueprint.nodes.map(n => n.type)).size}
          </div>
          <div className="text-sm text-purple-700">Node Types</div>
        </div>
      </div>

      {/* ReactFlow Diagram */}
      <div className="w-full h-[600px] border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#9CA3AF" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const blueprintNode = blueprint.nodes.find(n => n.id === node.id);
              return blueprintNode ? getNodeColor(blueprintNode.type) : '#F3F4F6';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3">Node Types</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { type: 'whatsapp_trigger', label: 'Trigger' },
            { type: 'whatsapp_reply', label: 'Reply' },
            { type: 'ask_question', label: 'Question' },
            { type: 'if_condition', label: 'Condition' },
            { type: 'knowledge_search', label: 'Knowledge' },
            { type: 'http_request', label: 'API Call' },
            { type: 'database_query', label: 'Database' },
            { type: 'delay', label: 'Delay' }
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: getNodeColor(type) }}
              />
              <span className="text-xs text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Help Text */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Preview Mode</h4>
            <p className="text-sm text-yellow-800">
              This is a read-only preview of your bot workflow. Use the controls to zoom and pan.
              Click nodes for more details (if enabled).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
