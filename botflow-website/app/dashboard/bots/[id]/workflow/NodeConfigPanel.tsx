'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
  botId: string;
}

interface IntegrationAction {
  id: string;
  name: string;
}

// Integration actions mapping
const INTEGRATION_ACTIONS: Record<string, IntegrationAction[]> = {
  'payfast': [
    { id: 'create_payment', name: 'Create Payment Link' },
    { id: 'check_payment', name: 'Check Payment Status' },
  ],
  'paystack': [
    { id: 'create_payment', name: 'Create Payment Link' },
    { id: 'verify_payment', name: 'Verify Payment' },
  ],
  'yoco': [
    { id: 'create_payment', name: 'Create Payment Link' },
  ],
  'shopify': [
    { id: 'search_products', name: 'Search Products' },
    { id: 'check_order', name: 'Check Order Status' },
    { id: 'check_inventory', name: 'Check Inventory' },
  ],
  'woocommerce': [
    { id: 'search_products', name: 'Search Products' },
    { id: 'check_order', name: 'Check Order Status' },
  ],
  'courier-guy': [
    { id: 'get_quote', name: 'Get Shipping Quote' },
    { id: 'track_shipment', name: 'Track Shipment' },
  ],
  'shiplogic': [
    { id: 'get_quote', name: 'Get Shipping Quote' },
    { id: 'track_shipment', name: 'Track Shipment' },
  ],
  'google-calendar': [
    { id: 'check_availability', name: 'Check Availability' },
    { id: 'create_booking', name: 'Create Booking' },
    { id: 'cancel_booking', name: 'Cancel Booking' },
  ],
  'ical-sync': [
    { id: 'check_availability', name: 'Check Property Availability' },
  ],
};

export function NodeConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const [label, setLabel] = useState(node.data.label || '');
  const [message, setMessage] = useState(node.data.message || '');
  const [condition, setCondition] = useState(node.data.condition || '');
  const [keywords, setKeywords] = useState(node.data.keywords || '');
  const [selectedAction, setSelectedAction] = useState(node.data.action || '');
  const [delay, setDelay] = useState(node.data.delay || 1);
  const [variableName, setVariableName] = useState(node.data.variableName || '');
  const [variableValue, setVariableValue] = useState(node.data.variableValue || '');

  useEffect(() => {
    setLabel(node.data.label || '');
    setMessage(node.data.message || '');
    setCondition(node.data.condition || '');
    setKeywords(node.data.keywords || '');
    setSelectedAction(node.data.action || '');
    setDelay(node.data.delay || 1);
    setVariableName(node.data.variableName || '');
    setVariableValue(node.data.variableValue || '');
  }, [node.id, node.data]);

  const handleSave = () => {
    const updateData: Record<string, unknown> = { label };

    if (node.type === 'action') {
      if (node.data.label === 'Send Reply' || node.data.label === 'Ask Question' || node.data.label === 'AI Response') {
        updateData.message = message;
      }
      if (node.data.label === 'Delay') {
        updateData.delay = delay;
      }
      if (node.data.label === 'Set Variable') {
        updateData.variableName = variableName;
        updateData.variableValue = variableValue;
      }
    }

    if (node.type === 'condition') {
      updateData.condition = condition;
      if (node.data.label === 'Keyword Match') {
        updateData.keywords = keywords;
      }
    }

    if (node.type === 'integration') {
      updateData.action = selectedAction;
    }

    onUpdate(updateData);
  };

  const getNodeTypeColor = () => {
    switch (node.type) {
      case 'trigger': return 'bg-green-100 text-green-800';
      case 'action': return 'bg-blue-100 text-blue-800';
      case 'condition': return 'bg-yellow-100 text-yellow-800';
      case 'integration': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const integrationSlug = node.data.integrationSlug as string;
  const availableActions = INTEGRATION_ACTIONS[integrationSlug] || [];

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="font-semibold text-gray-900">Configure Node</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Node Type Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getNodeTypeColor()}`}>
            {node.type ? node.type.charAt(0).toUpperCase() + node.type.slice(1) : 'Node'}
          </span>
          <span className="text-xs text-gray-400 font-mono">{node.id}</span>
        </div>

        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Node Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Trigger-specific */}
        {node.type === 'trigger' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              This trigger will start the workflow when a WhatsApp message is received.
            </p>
          </div>
        )}

        {/* Action-specific: Message */}
        {node.type === 'action' && (node.data.label === 'Send Reply' || node.data.label === 'Ask Question' || node.data.label === 'AI Response' || node.data.label === 'Send Menu') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {node.data.label === 'Ask Question' ? 'Question' : 'Message Template'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={node.data.label === 'AI Response'
                ? 'System instructions for AI...'
                : 'Enter the message to send. Use {{variable}} for dynamic content.'}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Variables: {`{{customer_name}}, {{order_id}}, {{amount}}`}
            </p>
          </div>
        )}

        {/* Action-specific: Delay */}
        {node.type === 'action' && node.data.label === 'Delay' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Delay (seconds)
            </label>
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value) || 1)}
              min={1}
              max={300}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Action-specific: Set Variable */}
        {node.type === 'action' && node.data.label === 'Set Variable' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Variable Name
              </label>
              <input
                type="text"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="customer_email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Value
              </label>
              <input
                type="text"
                value={variableValue}
                onChange={(e) => setVariableValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Value or {{previous_variable}}"
              />
            </div>
          </>
        )}

        {/* Condition-specific */}
        {node.type === 'condition' && (
          <>
            {node.data.label === 'Keyword Match' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Keywords (comma-separated)
                </label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="pay, payment, checkout, buy"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Matches if message contains any of these keywords
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Condition Expression
                </label>
                <textarea
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                  placeholder='message.contains("pay") OR intent == "payment"'
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Use AND, OR, contains(), equals() for conditions
                </p>
              </div>
            )}
          </>
        )}

        {/* Integration-specific */}
        {node.type === 'integration' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                Using <strong>{node.data.label}</strong> integration.
              </p>
            </div>

            {availableActions.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Action
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                >
                  <option value="">Select an action...</option>
                  {availableActions.map((action) => (
                    <option key={action.id} value={action.id}>
                      {action.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No predefined actions available. Configure in the Integrations tab.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
        <button
          onClick={handleSave}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={onDelete}
          className="w-full px-4 py-2.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
