'use client';

import { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Blueprint, WorkflowNode, WorkflowEdge } from '../../../../services/ai-agent.service';
import { TriggerNode, ActionNode, ConditionNode, IntegrationNode } from '../workflow/CustomNodes';
import { ConversationState } from '../../../../hooks/useAIAgent';

interface WorkflowPreviewProps {
  workflow: Blueprint;
  state: ConversationState;
  onDeploy: () => Promise<boolean>;
  onModify: () => void;
  isDeploying: boolean;
}

// Custom node types matching the visual builder
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  integration: IntegrationNode,
};

// Convert Blueprint nodes to React Flow nodes with auto-layout
function convertToReactFlowNodes(nodes: WorkflowNode[]): Node[] {
  // If nodes already have positions, use them
  const hasPositions = nodes.some((n) => n.position && n.position.x !== 0);

  if (hasPositions) {
    return nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }));
  }

  // Auto-layout: arrange nodes vertically
  const VERTICAL_SPACING = 120;
  const START_X = 200;
  const START_Y = 50;

  return nodes.map((node, index) => ({
    id: node.id,
    type: node.type,
    position: {
      x: START_X,
      y: START_Y + index * VERTICAL_SPACING,
    },
    data: node.data,
  }));
}

// Convert Blueprint edges to React Flow edges
function convertToReactFlowEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
  }));
}

function WorkflowCanvas({ workflow, state }: { workflow: Blueprint; state: ConversationState }) {
  const initialNodes = useMemo(() => convertToReactFlowNodes(workflow.nodes), [workflow.nodes]);
  const initialEdges = useMemo(() => convertToReactFlowEdges(workflow.edges), [workflow.edges]);

  const [nodes] = useNodesState(initialNodes);
  const [edges] = useEdgesState(initialEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={true}
      zoomOnScroll={true}
      defaultEdgeOptions={{
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }}
    >
      <Controls showInteractive={false} />
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <MiniMap
        nodeColor={(node) => {
          switch (node.type) {
            case 'trigger':
              return '#22c55e';
            case 'action':
              return '#3b82f6';
            case 'condition':
              return '#eab308';
            case 'integration':
              return '#f97316';
            default:
              return '#94a3b8';
          }
        }}
        maskColor="rgba(0, 0, 0, 0.1)"
        style={{ borderRadius: '0.5rem' }}
      />
    </ReactFlow>
  );
}

export function WorkflowPreview({
  workflow,
  state,
  onDeploy,
  onModify,
  isDeploying,
}: WorkflowPreviewProps) {
  const handleDeploy = useCallback(async () => {
    await onDeploy();
  }, [onDeploy]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{workflow.name || 'Generated Workflow'}</h2>
            <p className="text-xs text-gray-500">
              {workflow.nodes.length} nodes, {workflow.edges.length} connections
            </p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            state === 'complete'
              ? 'bg-green-100 text-green-700'
              : state === 'confirming'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {state === 'complete' ? 'Deployed' : state === 'confirming' ? 'Ready to Deploy' : 'Preview'}
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <WorkflowCanvas workflow={workflow} state={state} />
        </ReactFlowProvider>
      </div>

      {/* Workflow Summary */}
      <div className="border-t border-gray-200 bg-white">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Workflow Steps</h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {workflow.nodes.map((node, index) => (
              <div key={node.id} className="flex items-center text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mr-2 ${
                  node.type === 'trigger' ? 'bg-green-100 text-green-700' :
                  node.type === 'action' ? 'bg-blue-100 text-blue-700' :
                  node.type === 'condition' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {index + 1}
                </span>
                <span className="text-gray-700">{node.data.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {state !== 'complete' && (
          <div className="px-4 py-3 border-t border-gray-200 flex gap-3">
            <button
              onClick={handleDeploy}
              disabled={isDeploying || state === 'deploying'}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              {isDeploying ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deploying...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Deploy Workflow
                </>
              )}
            </button>
            <button
              onClick={onModify}
              disabled={isDeploying}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Modify
            </button>
          </div>
        )}

        {/* Deployed state */}
        {state === 'complete' && (
          <div className="px-4 py-3 border-t border-gray-200 bg-green-50">
            <div className="flex items-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Workflow is live and active!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
