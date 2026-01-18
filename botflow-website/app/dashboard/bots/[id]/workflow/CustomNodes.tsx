'use client';

import { Handle, Position } from 'reactflow';

interface NodeProps {
  data: {
    label: string;
    [key: string]: unknown;
  };
  selected: boolean;
}

export function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-lg bg-gradient-to-br from-green-50 to-green-100 border-2 min-w-[150px] ${
        selected ? 'border-green-500 ring-2 ring-green-200' : 'border-green-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white text-lg shadow-sm">
          ⚡
        </span>
        <div>
          <div className="text-sm font-semibold text-green-900">{data.label}</div>
          <div className="text-xs text-green-600 font-medium">Trigger</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  );
}

export function ActionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 border-2 min-w-[150px] ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-lg shadow-sm">
          ▶️
        </span>
        <div>
          <div className="text-sm font-semibold text-blue-900">{data.label}</div>
          <div className="text-xs text-blue-600 font-medium">Action</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
}

export function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-lg bg-gradient-to-br from-yellow-50 to-amber-100 border-2 min-w-[150px] ${
        selected ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-yellow-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-white"
      />
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-lg shadow-sm">
          🔀
        </span>
        <div>
          <div className="text-sm font-semibold text-yellow-900">{data.label}</div>
          <div className="text-xs text-yellow-700 font-medium">Condition</div>
        </div>
      </div>
      <div className="flex justify-between mt-3 px-2">
        <div className="flex flex-col items-center">
          <span className="text-xs text-green-600 font-medium mb-1">Yes</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            className="!relative !transform-none !w-3 !h-3 !bg-green-500 !border-2 !border-white"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-red-600 font-medium mb-1">No</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            className="!relative !transform-none !w-3 !h-3 !bg-red-500 !border-2 !border-white"
          />
        </div>
      </div>
    </div>
  );
}

export function IntegrationNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-xl shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 border-2 min-w-[150px] ${
        selected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white"
      />
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white text-lg shadow-sm">
          🔌
        </span>
        <div>
          <div className="text-sm font-semibold text-orange-900">{data.label}</div>
          <div className="text-xs text-orange-600 font-medium">Integration</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white"
      />
    </div>
  );
}
