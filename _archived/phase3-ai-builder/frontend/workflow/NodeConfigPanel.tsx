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
  description: string;
}

// Integration actions mapping with friendly descriptions
const INTEGRATION_ACTIONS: Record<string, IntegrationAction[]> = {
  'payfast': [
    { id: 'create_payment', name: 'Create Payment Link', description: 'Send customer a link to pay' },
    { id: 'check_payment', name: 'Check Payment', description: 'Verify if payment was made' },
  ],
  'paystack': [
    { id: 'create_payment', name: 'Create Payment Link', description: 'Send customer a link to pay' },
    { id: 'verify_payment', name: 'Verify Payment', description: 'Check payment status' },
  ],
  'yoco': [
    { id: 'create_payment', name: 'Create Payment Link', description: 'Send customer a link to pay' },
  ],
  'shopify': [
    { id: 'search_products', name: 'Find Products', description: 'Search your store for items' },
    { id: 'check_order', name: 'Track Order', description: 'Check order delivery status' },
    { id: 'check_inventory', name: 'Check Stock', description: 'See if item is available' },
  ],
  'woocommerce': [
    { id: 'search_products', name: 'Find Products', description: 'Search your store for items' },
    { id: 'check_order', name: 'Track Order', description: 'Check order delivery status' },
  ],
  'courier-guy': [
    { id: 'get_quote', name: 'Get Delivery Price', description: 'Calculate shipping cost' },
    { id: 'track_shipment', name: 'Track Package', description: 'Find where package is' },
  ],
  'shiplogic': [
    { id: 'get_quote', name: 'Get Delivery Price', description: 'Calculate shipping cost' },
    { id: 'track_shipment', name: 'Track Package', description: 'Find where package is' },
  ],
  'google-calendar': [
    { id: 'check_availability', name: 'Check Free Slots', description: 'See available times' },
    { id: 'create_booking', name: 'Book Appointment', description: 'Schedule a meeting' },
    { id: 'cancel_booking', name: 'Cancel Booking', description: 'Remove an appointment' },
  ],
  'ical-sync': [
    { id: 'check_availability', name: 'Check Availability', description: 'See if dates are free' },
  ],
};

// Example messages for each action type
const MESSAGE_EXAMPLES: Record<string, { placeholder: string; example: string; tip: string }> = {
  'Send Reply': {
    placeholder: 'Type your message here...',
    example: 'Hi there! Thanks for reaching out. How can I help you today?',
    tip: 'Keep it friendly and conversational'
  },
  'Ask Question': {
    placeholder: 'Type your question here...',
    example: 'What service are you interested in?',
    tip: 'Ask one clear question at a time'
  },
  'Send Menu': {
    placeholder: 'Type your menu message here...',
    example: 'Please choose an option:\n1. Check prices\n2. Book appointment\n3. Speak to someone',
    tip: 'Number your options for easy replies'
  },
  'AI Response': {
    placeholder: 'Give the AI instructions...',
    example: 'You are a helpful assistant for our restaurant. Answer questions about our menu, hours, and location.',
    tip: 'Tell the AI what role to play and how to respond'
  },
};

export function NodeConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const [label, setLabel] = useState(node.data.label || '');
  const [message, setMessage] = useState(node.data.message || '');
  const [keywords, setKeywords] = useState(node.data.keywords || '');
  const [selectedAction, setSelectedAction] = useState(node.data.action || '');
  const [delay, setDelay] = useState(node.data.delay || 1);
  const [menuOptions, setMenuOptions] = useState<string[]>(node.data.menuOptions || ['', '', '']);

  useEffect(() => {
    setLabel(node.data.label || '');
    setMessage(node.data.message || '');
    setKeywords(node.data.keywords || '');
    setSelectedAction(node.data.action || '');
    setDelay(node.data.delay || 1);
    setMenuOptions(node.data.menuOptions || ['', '', '']);
  }, [node.id, node.data]);

  const handleSave = () => {
    const updateData: Record<string, unknown> = { label };

    if (node.type === 'action') {
      if (['Send Reply', 'Ask Question', 'AI Response', 'Send Menu'].includes(node.data.label as string)) {
        updateData.message = message;
      }
      if (node.data.label === 'Send Menu') {
        updateData.menuOptions = menuOptions.filter(opt => opt.trim());
      }
      if (node.data.label === 'Delay') {
        updateData.delay = delay;
      }
    }

    if (node.type === 'condition') {
      if (node.data.label === 'Keyword Match') {
        updateData.keywords = keywords;
      }
    }

    if (node.type === 'integration') {
      updateData.action = selectedAction;
    }

    onUpdate(updateData);
  };

  const getNodeTypeInfo = () => {
    switch (node.type) {
      case 'trigger': return { color: 'bg-green-100 text-green-800', icon: '⚡', label: 'Trigger' };
      case 'action': return { color: 'bg-blue-100 text-blue-800', icon: '▶️', label: 'Action' };
      case 'condition': return { color: 'bg-yellow-100 text-yellow-800', icon: '🔀', label: 'Decision' };
      case 'integration': return { color: 'bg-orange-100 text-orange-800', icon: '🔌', label: 'Integration' };
      default: return { color: 'bg-gray-100 text-gray-800', icon: '📦', label: 'Node' };
    }
  };

  const nodeInfo = getNodeTypeInfo();
  const integrationSlug = node.data.integrationSlug as string;
  const availableActions = INTEGRATION_ACTIONS[integrationSlug] || [];
  const messageExample = MESSAGE_EXAMPLES[node.data.label as string];

  const updateMenuOption = (index: number, value: string) => {
    const newOptions = [...menuOptions];
    newOptions[index] = value;
    setMenuOptions(newOptions);
  };

  const addMenuOption = () => {
    if (menuOptions.length < 10) {
      setMenuOptions([...menuOptions, '']);
    }
  };

  const removeMenuOption = (index: number) => {
    if (menuOptions.length > 2) {
      setMenuOptions(menuOptions.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${nodeInfo.color}`}>
            {nodeInfo.icon}
          </span>
          <span className="font-semibold text-gray-900">{node.data.label}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Trigger Info */}
        {node.type === 'trigger' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-1">When does this run?</h4>
            <p className="text-sm text-green-700">
              This starts automatically when a customer sends your bot a WhatsApp message.
            </p>
          </div>
        )}

        {/* Send Reply / Ask Question / AI Response */}
        {node.type === 'action' && messageExample && node.data.label !== 'Send Menu' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {node.data.label === 'Ask Question' ? 'Your Question' : 'Your Message'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                placeholder={messageExample.placeholder}
              />
            </div>

            {/* Helpful tip */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> {messageExample.tip}
              </p>
            </div>

            {/* Example */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Example:</p>
              <p className="text-sm text-gray-700 italic">&quot;{messageExample.example}&quot;</p>
            </div>
          </div>
        )}

        {/* Send Menu - Simplified */}
        {node.type === 'action' && node.data.label === 'Send Menu' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Menu Introduction
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                placeholder="Please choose an option:"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Menu Options
              </label>
              <div className="space-y-2">
                {menuOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateMenuOption(index, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${index + 1}`}
                    />
                    {menuOptions.length > 2 && (
                      <button
                        onClick={() => removeMenuOption(index)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {menuOptions.length < 10 && (
                <button
                  onClick={addMenuOption}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another option
                </button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> Customers can reply with the number (1, 2, 3...) to select an option.
              </p>
            </div>
          </div>
        )}

        {/* Delay */}
        {node.type === 'action' && node.data.label === 'Delay' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wait Time
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={delay}
                  onChange={(e) => setDelay(parseInt(e.target.value) || 1)}
                  min={1}
                  max={300}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                />
                <span className="text-gray-600">seconds</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                The bot will pause for this long before continuing. Useful for making conversations feel more natural.
              </p>
            </div>
          </div>
        )}

        {/* Handoff to Human */}
        {node.type === 'action' && node.data.label === 'Handoff to Human' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-1">Transfer to Staff</h4>
            <p className="text-sm text-yellow-700">
              When the flow reaches this point, the conversation will be handed over to your team for personal assistance.
            </p>
          </div>
        )}

        {/* End Conversation */}
        {node.type === 'action' && node.data.label === 'End Conversation' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-1">End Chat</h4>
            <p className="text-sm text-red-700">
              This ends the current conversation flow. The customer can start a new chat anytime.
            </p>
          </div>
        )}

        {/* Keyword Match */}
        {node.type === 'condition' && node.data.label === 'Keyword Match' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Look for these words
              </label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                placeholder="price, cost, how much"
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate words with commas
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
              <p className="text-xs text-yellow-700">
                <strong>How it works:</strong> If the customer&apos;s message contains any of these words, the &quot;Yes&quot; path runs. Otherwise, the &quot;No&quot; path runs.
              </p>
            </div>
          </div>
        )}

        {/* If Condition / Intent Detection */}
        {node.type === 'condition' && (node.data.label === 'If Condition' || node.data.label === 'Intent Detection') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-1">
              {node.data.label === 'Intent Detection' ? 'AI-Powered Detection' : 'Custom Condition'}
            </h4>
            <p className="text-sm text-yellow-700">
              {node.data.label === 'Intent Detection'
                ? 'The AI will understand what the customer wants and route them appropriately.'
                : 'Create custom logic to route customers based on their responses.'}
            </p>
          </div>
        )}

        {/* Integration */}
        {node.type === 'integration' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                Connected to <strong>{node.data.label}</strong>
              </p>
            </div>

            {availableActions.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What should it do?
                </label>
                <div className="space-y-2">
                  {availableActions.map((action) => (
                    <label
                      key={action.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAction === action.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="integration-action"
                        value={action.id}
                        checked={selectedAction === action.id}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{action.name}</p>
                        <p className="text-xs text-gray-500">{action.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No actions available yet. Configure in the Integrations tab.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
        <button
          onClick={handleSave}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onDelete}
          className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
