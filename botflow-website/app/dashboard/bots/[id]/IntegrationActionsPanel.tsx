'use client';

import { useState } from 'react';

interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  trigger_keywords: string[];
  is_enabled: boolean;
  configuration: Record<string, unknown>;
}

interface IntegrationActionsPanelProps {
  botIntegrationId: string;
  integrationSlug: string;
  integrationName: string;
  onClose: () => void;
}

// Action templates per integration type
const INTEGRATION_ACTIONS: Record<string, IntegrationAction[]> = {
  'payfast': [
    {
      id: 'create_payment',
      name: 'Create Payment Link',
      description: 'Generate a PayFast payment link when customer wants to pay',
      trigger_keywords: ['pay', 'payment', 'checkout', 'buy'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'check_payment',
      name: 'Check Payment Status',
      description: 'Verify if a payment was successful',
      trigger_keywords: ['paid', 'payment status', 'confirm payment'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'paystack': [
    {
      id: 'create_payment',
      name: 'Create Payment Link',
      description: 'Generate a Paystack payment link',
      trigger_keywords: ['pay', 'payment', 'checkout', 'buy'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'verify_payment',
      name: 'Verify Payment',
      description: 'Verify a Paystack transaction',
      trigger_keywords: ['verify', 'confirm', 'receipt'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'yoco': [
    {
      id: 'create_payment',
      name: 'Create Payment Link',
      description: 'Generate a Yoco payment link',
      trigger_keywords: ['pay', 'payment', 'checkout', 'buy'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'shopify': [
    {
      id: 'search_products',
      name: 'Search Products',
      description: 'Search for products in your Shopify store',
      trigger_keywords: ['product', 'item', 'search', 'find', 'looking for'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'check_order',
      name: 'Check Order Status',
      description: 'Look up order status by order number',
      trigger_keywords: ['order', 'tracking', 'delivery', 'shipment'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'check_inventory',
      name: 'Check Inventory',
      description: 'Check if a product is in stock',
      trigger_keywords: ['stock', 'available', 'inventory'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'woocommerce': [
    {
      id: 'search_products',
      name: 'Search Products',
      description: 'Search for products in your WooCommerce store',
      trigger_keywords: ['product', 'item', 'search', 'find', 'looking for'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'check_order',
      name: 'Check Order Status',
      description: 'Look up order status by order number',
      trigger_keywords: ['order', 'tracking', 'delivery', 'shipment'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'courier-guy': [
    {
      id: 'get_quote',
      name: 'Get Shipping Quote',
      description: 'Calculate shipping cost for a delivery',
      trigger_keywords: ['shipping', 'delivery cost', 'quote', 'how much to ship'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'track_shipment',
      name: 'Track Shipment',
      description: 'Track a package by waybill number',
      trigger_keywords: ['track', 'where is my', 'package', 'waybill'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'shiplogic': [
    {
      id: 'get_quote',
      name: 'Get Shipping Quote',
      description: 'Calculate shipping rates',
      trigger_keywords: ['shipping', 'delivery cost', 'quote'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'track_shipment',
      name: 'Track Shipment',
      description: 'Track a package',
      trigger_keywords: ['track', 'where is my', 'package'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'google-calendar': [
    {
      id: 'check_availability',
      name: 'Check Availability',
      description: 'Check available time slots for booking',
      trigger_keywords: ['available', 'free', 'slots', 'when can'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'create_booking',
      name: 'Create Booking',
      description: 'Book an appointment on the calendar',
      trigger_keywords: ['book', 'appointment', 'schedule', 'reserve'],
      is_enabled: false,
      configuration: {},
    },
    {
      id: 'cancel_booking',
      name: 'Cancel Booking',
      description: 'Cancel an existing booking',
      trigger_keywords: ['cancel', 'reschedule', 'change appointment'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'ical-sync': [
    {
      id: 'check_availability',
      name: 'Check Property Availability',
      description: 'Check if property is available for dates',
      trigger_keywords: ['available', 'book', 'dates', 'stay'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'clickatell': [
    {
      id: 'send_sms',
      name: 'Send SMS',
      description: 'Send an SMS notification',
      trigger_keywords: ['sms', 'text', 'notify'],
      is_enabled: false,
      configuration: {},
    },
  ],
  'bulksms': [
    {
      id: 'send_sms',
      name: 'Send SMS',
      description: 'Send an SMS notification',
      trigger_keywords: ['sms', 'text', 'notify'],
      is_enabled: false,
      configuration: {},
    },
  ],
};

export function IntegrationActionsPanel({
  botIntegrationId,
  integrationSlug,
  integrationName,
  onClose,
}: IntegrationActionsPanelProps) {
  const [actions, setActions] = useState<IntegrationAction[]>(
    INTEGRATION_ACTIONS[integrationSlug] || []
  );
  const [saving, setSaving] = useState(false);

  const toggleAction = (actionId: string) => {
    setActions(prev =>
      prev.map(action =>
        action.id === actionId
          ? { ...action, is_enabled: !action.is_enabled }
          : action
      )
    );
  };

  const updateKeywords = (actionId: string, keywords: string) => {
    setActions(prev =>
      prev.map(action =>
        action.id === actionId
          ? { ...action, trigger_keywords: keywords.split(',').map(k => k.trim()).filter(Boolean) }
          : action
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('botflow_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Save action configuration to bot_integrations.configuration
      const response = await fetch(
        `${apiUrl}/api/marketplace/bot-integrations/${botIntegrationId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            configuration: {
              actions: actions.filter(a => a.is_enabled),
            },
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to save actions');

      alert('Actions saved successfully!');
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (actions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">{integrationName} Actions</h3>
            <p className="text-gray-600">
              No pre-configured actions available for this integration yet.
              Actions will be available in the visual workflow builder.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Configure {integrationName} Actions
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enable actions and configure when they should trigger based on customer messages.
            </p>
          </div>

          {/* Actions List */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`border rounded-lg p-4 ${
                    action.is_enabled ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={action.is_enabled}
                          onChange={() => toggleAction(action.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <h4 className="font-medium text-gray-900">{action.name}</h4>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 ml-6">{action.description}</p>
                    </div>
                  </div>

                  {action.is_enabled && (
                    <div className="mt-3 ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trigger Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={action.trigger_keywords.join(', ')}
                        onChange={(e) => updateKeywords(action.id, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., pay, payment, checkout"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Bot will trigger this action when customer message contains these keywords
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save Actions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
