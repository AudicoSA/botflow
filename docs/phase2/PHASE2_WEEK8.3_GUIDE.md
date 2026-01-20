# Phase 2 Week 8.3: Bot Integrations Tab & Workflow Builder Foundation

**Status:** Ready for Implementation
**Created:** 2026-01-18
**Purpose:** Build the missing UI to connect enabled integrations to bot behavior

---

## Executive Summary

Week 8.1-8.2 built the Integration Marketplace backend and enable/disable flow. However, users cannot:
1. See which integrations are enabled on their bot from the bot editor
2. Build workflows that use those integrations
3. Configure how integrations respond to customer messages

**Week 8.3 Goal:** Bridge this gap by adding an Integrations tab to the bot editor and laying the foundation for the visual workflow builder.

---

## Current State Analysis

### What Exists ✅

```
Backend (90% Complete):
├── integration_marketplace table with 20+ integrations
├── bot_integrations table storing enabled integrations
├── Credential validation service (11 validators)
├── API endpoints for enable/disable/update
├── Encrypted credential storage
└── Integration logs table

Frontend (30% Complete):
├── Marketplace browse page (/dashboard/marketplace)
├── EnableIntegrationModal (enable + update modes)
├── ValidationResult component
├── N8nBadge component
└── BlueprintPreview (read-only workflow visualization)
```

### What's Missing ❌

```
Bot Editor Integrations:
├── ❌ Integrations tab in bot detail page
├── ❌ List of enabled integrations per bot
├── ❌ Integration status indicators
├── ❌ Quick enable from bot editor
└── ❌ Integration configuration per bot

Workflow Builder:
├── ❌ Interactive drag-drop canvas
├── ❌ Node palette with integration nodes
├── ❌ Node configuration panels
├── ❌ Credential selector
├── ❌ Workflow save/deploy
└── ❌ Workflow testing
```

---

## Week 8.3 Deliverables

### Phase A: Bot Integrations Tab (Days 1-2)

Add a fourth tab to the bot editor showing enabled integrations.

### Phase B: Integration Actions Panel (Days 3-4)

Allow users to configure what each integration does for this bot.

### Phase C: Workflow Builder Foundation (Days 5-7)

Create the basic interactive workflow builder with drag-drop nodes.

---

## Phase A: Bot Integrations Tab

### A1. Create BotIntegrationsTab Component

**File:** `botflow-website/app/dashboard/bots/[id]/BotIntegrationsTab.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { EnableIntegrationModal } from '@/app/components/EnableIntegrationModal';

interface BotIntegration {
  id: string;
  bot_id: string;
  integration_id: string;
  status: 'active' | 'error' | 'disabled';
  last_synced_at: string | null;
  sync_count: number;
  error_message: string | null;
  created_at: string;
  integration: {
    id: string;
    name: string;
    slug: string;
    icon_url: string;
    category: string;
    description: string;
  };
}

interface MarketplaceIntegration {
  id: string;
  name: string;
  slug: string;
  icon_url: string;
  category: string;
  description: string;
  requires_auth: boolean;
  is_featured: boolean;
  recommended_for_verticals: string[];
}

interface BotIntegrationsTabProps {
  botId: string;
  botVertical?: string;
}

export function BotIntegrationsTab({ botId, botVertical }: BotIntegrationsTabProps) {
  const [enabledIntegrations, setEnabledIntegrations] = useState<BotIntegration[]>([]);
  const [recommendedIntegrations, setRecommendedIntegrations] = useState<MarketplaceIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<MarketplaceIntegration | null>(null);
  const [showEnableModal, setShowEnableModal] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, [botId]);

  const fetchIntegrations = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('botflow_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Fetch enabled integrations for this bot
      const enabledRes = await fetch(
        `${apiUrl}/api/marketplace/bots/${botId}/integrations`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!enabledRes.ok) throw new Error('Failed to fetch enabled integrations');
      const enabledData = await enabledRes.json();
      setEnabledIntegrations(enabledData.integrations || []);

      // Fetch recommended integrations
      const recommendedRes = await fetch(
        `${apiUrl}/api/marketplace/recommended/${botId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (recommendedRes.ok) {
        const recommendedData = await recommendedRes.json();
        // Filter out already enabled integrations
        const enabledIds = new Set(enabledData.integrations?.map((i: BotIntegration) => i.integration_id));
        setRecommendedIntegrations(
          (recommendedData.integrations || []).filter((i: MarketplaceIntegration) => !enabledIds.has(i.id))
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disable this integration?')) return;

    try {
      const token = localStorage.getItem('botflow_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const res = await fetch(
        `${apiUrl}/api/marketplace/bot-integrations/${integrationId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to disable integration');

      // Refresh the list
      fetchIntegrations();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleEnableClick = (integration: MarketplaceIntegration) => {
    setSelectedIntegration(integration);
    setShowEnableModal(true);
  };

  const handleEnableSuccess = () => {
    setShowEnableModal(false);
    setSelectedIntegration(null);
    fetchIntegrations();
  };

  const getStatusBadge = (status: string, errorMessage: string | null) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-green-500"></span>
            Active
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={errorMessage || ''}>
            <span className="w-2 h-2 mr-1.5 rounded-full bg-red-500"></span>
            Error
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-gray-500"></span>
            Disabled
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchIntegrations}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enabled Integrations Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Enabled Integrations ({enabledIntegrations.length})
          </h3>
          <a
            href="/dashboard/marketplace"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Browse Marketplace
          </a>
        </div>

        {enabledIntegrations.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h4 className="mt-4 text-lg font-medium text-gray-900">No integrations enabled</h4>
            <p className="mt-2 text-sm text-gray-500">
              Connect your bot to external services like payment gateways, shipping providers, and more.
            </p>
            <a
              href="/dashboard/marketplace"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Integrations
            </a>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {enabledIntegrations.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {item.integration?.icon_url ? (
                    <img
                      src={item.integration.icon_url}
                      alt={item.integration.name}
                      className="w-10 h-10 rounded-lg object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).className = 'hidden';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-xl">🔌</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{item.integration?.name || 'Unknown'}</h4>
                      {getStatusBadge(item.status, item.error_message)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {item.integration?.category} • Last synced: {formatDate(item.last_synced_at)}
                    </p>
                    {item.error_message && (
                      <p className="text-sm text-red-600 mt-1">{item.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (item.integration) {
                        setSelectedIntegration(item.integration as any);
                        setShowEnableModal(true);
                      }
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDisable(item.id)}
                    className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Integrations Section */}
      {recommendedIntegrations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recommended for Your Bot
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedIntegrations.slice(0, 4).map((integration) => (
              <div
                key={integration.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {integration.icon_url ? (
                      <img
                        src={integration.icon_url}
                        alt={integration.name}
                        className="w-10 h-10 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <span className="text-xl">🔌</span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{integration.name}</h4>
                      <p className="text-xs text-gray-500">{integration.category}</p>
                    </div>
                  </div>
                  {integration.is_featured && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Featured
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{integration.description}</p>
                <button
                  onClick={() => handleEnableClick(integration)}
                  className="mt-3 w-full px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  Enable
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integration Usage Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-900">How Integrations Work</h4>
            <p className="mt-1 text-sm text-blue-800">
              Enabled integrations store your credentials securely. To use them in your bot's conversation flow,
              you'll need to configure workflow actions that reference these integrations.
            </p>
            <p className="mt-2 text-sm text-blue-700">
              <strong>Coming Soon:</strong> Visual workflow builder to connect integrations to your bot's responses.
            </p>
          </div>
        </div>
      </div>

      {/* Enable Integration Modal */}
      {showEnableModal && selectedIntegration && (
        <EnableIntegrationModal
          integration={selectedIntegration as any}
          onClose={() => {
            setShowEnableModal(false);
            setSelectedIntegration(null);
          }}
          onSuccess={handleEnableSuccess}
        />
      )}
    </div>
  );
}
```

### A2. Update Bot Detail Page

**File:** `botflow-website/app/dashboard/bots/[id]/page.tsx`

Add the Integrations tab to the existing page.

**Changes needed:**

1. Import the new component:
```tsx
import { BotIntegrationsTab } from './BotIntegrationsTab';
```

2. Add to tabs array:
```tsx
const tabs = [
  { id: 'general', label: 'General Settings' },
  { id: 'brain', label: 'Brain & Intelligence' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'integrations', label: 'Integrations' },  // ADD THIS
];
```

3. Add tab content:
```tsx
{activeTab === 'integrations' && (
  <BotIntegrationsTab
    botId={bot.id}
    botVertical={bot.vertical}
  />
)}
```

### A3. Backend: Add Integration Details to Bot Integrations Response

**File:** `botflow-backend/src/services/integration-marketplace.service.ts`

Update `getBotIntegrations` to include integration details:

```typescript
async getBotIntegrations(botId: string): Promise<BotIntegration[]> {
  const { data, error } = await supabaseAdmin
    .from('bot_integrations')
    .select(`
      *,
      integration:integration_marketplace(
        id, name, slug, icon_url, category, description
      )
    `)
    .eq('bot_id', botId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get bot integrations: ${error.message}`);
  }

  return data as BotIntegration[];
}
```

---

## Phase B: Integration Actions Panel

### B1. Create IntegrationActionsPanel Component

This panel shows what actions an integration can perform and lets users configure triggers.

**File:** `botflow-website/app/dashboard/bots/[id]/IntegrationActionsPanel.tsx`

```tsx
'use client';

import { useState } from 'react';

interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  trigger_keywords: string[];
  is_enabled: boolean;
  configuration: Record<string, any>;
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
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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
```

---

## Phase C: Workflow Builder Foundation

### C1. Create WorkflowBuilder Component

**File:** `botflow-website/app/dashboard/bots/[id]/workflow/page.tsx`

```tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowToolbar } from './WorkflowToolbar';
import { TriggerNode, ActionNode, ConditionNode, IntegrationNode } from './CustomNodes';

// Custom node types
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  integration: IntegrationNode,
};

interface WorkflowBuilderProps {
  params: { id: string };
}

export default function WorkflowBuilder({ params }: WorkflowBuilderProps) {
  const botId = params.id;
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: { label: 'WhatsApp Message', triggerType: 'whatsapp_message' },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const nodeData = JSON.parse(event.dataTransfer.getData('nodeData') || '{}');

      if (!type || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 75,
        y: event.clientY - reactFlowBounds.top - 25,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: nodeData.label || type, ...nodeData },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('botflow_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const blueprint = {
        name: 'Main Workflow',
        bot_id: botId,
        version: '1.0',
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
      };

      const response = await fetch(`${apiUrl}/api/bots/${botId}/workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blueprint }),
      });

      if (!response.ok) throw new Error('Failed to save workflow');

      alert('Workflow saved successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) =>
      eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
    setSelectedNode(null);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <WorkflowToolbar
        onSave={handleSave}
        isSaving={isSaving}
        botId={botId}
      />

      <div className="flex-1 flex">
        {/* Node Palette */}
        <NodePalette botId={botId} />

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <Background />
            <MiniMap />
            <Panel position="top-right">
              <div className="bg-white px-3 py-1.5 rounded shadow text-sm text-gray-600">
                Nodes: {nodes.length} | Connections: {edges.length}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNode(null)}
            botId={botId}
          />
        )}
      </div>
    </div>
  );
}
```

### C2. Create NodePalette Component

**File:** `botflow-website/app/dashboard/bots/[id]/workflow/NodePalette.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';

interface NodeType {
  type: string;
  label: string;
  category: string;
  icon: string;
  color: string;
  description: string;
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
        const nodes: NodeType[] = (data.integrations || []).map((int: any) => ({
          type: 'integration',
          label: int.integration?.name || 'Integration',
          category: 'integrations',
          icon: '🔌',
          color: 'bg-orange-500',
          description: `Use ${int.integration?.name} integration`,
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
    { id: 'triggers', label: 'Triggers', icon: '⚡' },
    { id: 'actions', label: 'Actions', icon: '▶️' },
    { id: 'logic', label: 'Logic', icon: '🔀' },
    { id: 'integrations', label: 'Integrations', icon: '🔌' },
    { id: 'utilities', label: 'Utilities', icon: '🛠️' },
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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Node Palette</h3>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {categories.map((category) => {
          const categoryNodes = filteredNodes.filter(
            (node) => node.category === category.id
          );
          if (categoryNodes.length === 0) return null;

          return (
            <div key={category.id} className="mb-2">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
              >
                <span>
                  {category.icon} {category.label}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${
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
                <div className="mt-1 space-y-1">
                  {categoryNodes.map((node, index) => (
                    <div
                      key={`${node.type}-${index}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 active:cursor-grabbing"
                    >
                      <span
                        className={`w-6 h-6 ${node.color} rounded flex items-center justify-center text-white text-xs`}
                      >
                        {node.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {node.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredNodes.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No nodes match your search
          </p>
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
```

### C3. Create Custom Node Components

**File:** `botflow-website/app/dashboard/bots/[id]/workflow/CustomNodes.tsx`

```tsx
'use client';

import { Handle, Position } from 'reactflow';

interface NodeProps {
  data: any;
  selected: boolean;
}

export function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-md bg-green-50 border-2 ${
        selected ? 'border-green-500' : 'border-green-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <div>
          <div className="text-sm font-semibold text-green-900">{data.label}</div>
          <div className="text-xs text-green-600">Trigger</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
}

export function ActionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-md bg-blue-50 border-2 ${
        selected ? 'border-blue-500' : 'border-blue-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500"
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">▶️</span>
        <div>
          <div className="text-sm font-semibold text-blue-900">{data.label}</div>
          <div className="text-xs text-blue-600">Action</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  );
}

export function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-md bg-yellow-50 border-2 ${
        selected ? 'border-yellow-500' : 'border-yellow-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-yellow-500"
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">🔀</span>
        <div>
          <div className="text-sm font-semibold text-yellow-900">{data.label}</div>
          <div className="text-xs text-yellow-600">Condition</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: '25%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: '75%' }}
        className="w-3 h-3 bg-red-500"
      />
    </div>
  );
}

export function IntegrationNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-md bg-orange-50 border-2 ${
        selected ? 'border-orange-500' : 'border-orange-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-orange-500"
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">🔌</span>
        <div>
          <div className="text-sm font-semibold text-orange-900">{data.label}</div>
          <div className="text-xs text-orange-600">Integration</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-orange-500"
      />
    </div>
  );
}
```

### C4. Create NodeConfigPanel Component

**File:** `botflow-website/app/dashboard/bots/[id]/workflow/NodeConfigPanel.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Node } from 'reactflow';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onClose: () => void;
  botId: string;
}

export function NodeConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
  botId,
}: NodeConfigPanelProps) {
  const [label, setLabel] = useState(node.data.label || '');
  const [message, setMessage] = useState(node.data.message || '');
  const [condition, setCondition] = useState(node.data.condition || '');

  const handleSave = () => {
    onUpdate({
      label,
      message,
      condition,
    });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Configure Node</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node Type Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            node.type === 'trigger' ? 'bg-green-100 text-green-800' :
            node.type === 'action' ? 'bg-blue-100 text-blue-800' :
            node.type === 'condition' ? 'bg-yellow-100 text-yellow-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {node.type?.charAt(0).toUpperCase() + node.type?.slice(1)}
          </span>
          <span className="text-sm text-gray-500">ID: {node.id}</span>
        </div>

        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Node Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action-specific: Message */}
        {node.type === 'action' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Template
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the message to send. Use {{variable}} for dynamic content."
            />
            <p className="mt-1 text-xs text-gray-500">
              Available variables: {`{{customer_name}}, {{order_id}}, {{amount}}`}
            </p>
          </div>
        )}

        {/* Condition-specific */}
        {node.type === 'condition' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition Expression
            </label>
            <textarea
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='message.contains("pay") OR intent == "payment"'
            />
            <p className="mt-1 text-xs text-gray-500">
              Use AND, OR, contains(), equals() for conditions
            </p>
          </div>
        )}

        {/* Integration-specific */}
        {node.type === 'integration' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                This node uses the <strong>{node.data.label}</strong> integration.
                Configure the action below.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={node.data.action || ''}
                onChange={(e) => onUpdate({ action: e.target.value })}
              >
                <option value="">Select an action...</option>
                <option value="create_payment">Create Payment Link</option>
                <option value="check_order">Check Order Status</option>
                <option value="search_products">Search Products</option>
                <option value="get_quote">Get Shipping Quote</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={handleSave}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Save Changes
        </button>
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
```

### C5. Create WorkflowToolbar Component

**File:** `botflow-website/app/dashboard/bots/[id]/workflow/WorkflowToolbar.tsx`

```tsx
'use client';

import Link from 'next/link';

interface WorkflowToolbarProps {
  onSave: () => void;
  isSaving: boolean;
  botId: string;
}

export function WorkflowToolbar({ onSave, isSaving, botId }: WorkflowToolbarProps) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/bots/${botId}`}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Bot
        </Link>
        <div className="h-6 w-px bg-gray-300"></div>
        <h1 className="text-lg font-semibold text-gray-900">Workflow Builder</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Test Workflow
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSaving ? 'Saving...' : 'Save Workflow'}
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
        >
          Deploy
        </button>
      </div>
    </div>
  );
}
```

---

## Database Migrations

### Migration 013: Add workflow configuration to bot_integrations

**File:** `botflow-backend/migrations/013_add_integration_actions.sql`

```sql
-- Add actions configuration to bot_integrations
ALTER TABLE bot_integrations
ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb;

-- Add index for actions
CREATE INDEX IF NOT EXISTS idx_bot_integrations_actions
ON bot_integrations USING GIN (actions);

-- Add comment
COMMENT ON COLUMN bot_integrations.actions IS 'Configured actions for this integration with trigger keywords';
```

---

## API Updates

### Update marketplace.ts to return integration details

**File:** `botflow-backend/src/routes/marketplace.ts`

Add endpoint to get bot integrations with full details:

```typescript
/**
 * GET /api/marketplace/bots/:botId/integrations
 * Get all enabled integrations for a bot with full integration details
 */
fastify.get(
  '/bots/:botId/integrations',
  {
    onRequest: [fastify.authenticate],
  },
  async (request, reply) => {
    try {
      const { botId } = request.params as { botId: string };

      const { data, error } = await supabaseAdmin
        .from('bot_integrations')
        .select(`
          *,
          integration:integration_marketplace(
            id, name, slug, icon_url, category, description,
            requires_auth, setup_instructions, supported_features
          )
        `)
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get bot integrations: ${error.message}`);
      }

      return reply.send({ integrations: data || [] });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to get bot integrations',
        message: error.message,
      });
    }
  }
);
```

---

## Testing Checklist

### Phase A Tests
- [ ] Bot detail page shows 4 tabs including "Integrations"
- [ ] Integrations tab loads enabled integrations for the bot
- [ ] Empty state shows when no integrations enabled
- [ ] Can disable an integration from the tab
- [ ] Recommended integrations appear (filtered by enabled)
- [ ] Can enable integration directly from recommendations
- [ ] Edit button opens EnableIntegrationModal in update mode
- [ ] Integration status badges display correctly (active/error/disabled)

### Phase B Tests
- [ ] Actions panel opens for integrations with defined actions
- [ ] Can toggle actions on/off
- [ ] Can edit trigger keywords
- [ ] Save updates the bot_integrations.configuration
- [ ] Actions show for PayFast, Paystack, Shopify, Courier Guy, Google Calendar

### Phase C Tests
- [ ] Workflow builder page loads at /dashboard/bots/[id]/workflow
- [ ] Node palette shows base nodes + integration nodes
- [ ] Can drag nodes onto canvas
- [ ] Nodes connect via edges
- [ ] Can select and configure nodes
- [ ] Can delete nodes
- [ ] Save workflow stores to database
- [ ] Integration nodes show enabled integrations from this bot

---

## Dependencies to Install

```bash
cd botflow-website
npm install reactflow
```

---

## File Structure Summary

```
botflow-website/app/dashboard/bots/[id]/
├── page.tsx                    # MODIFY - Add integrations tab
├── BotIntegrationsTab.tsx      # NEW - Integrations list component
├── IntegrationActionsPanel.tsx # NEW - Actions configuration modal
├── KnowledgeBaseTab.tsx        # EXISTS - No changes
└── workflow/
    ├── page.tsx                # NEW - Workflow builder page
    ├── NodePalette.tsx         # NEW - Draggable node list
    ├── NodeConfigPanel.tsx     # NEW - Node configuration sidebar
    ├── CustomNodes.tsx         # NEW - Custom ReactFlow node components
    └── WorkflowToolbar.tsx     # NEW - Save/deploy toolbar

botflow-backend/
├── migrations/
│   └── 013_add_integration_actions.sql  # NEW - Actions column
└── src/routes/
    └── marketplace.ts          # MODIFY - Add integration details to response
```

---

## Implementation Order

1. **Day 1:** Create BotIntegrationsTab component, update bot detail page
2. **Day 2:** Backend API update, test integrations tab end-to-end
3. **Day 3:** Create IntegrationActionsPanel, migration 013
4. **Day 4:** Test actions panel, integrate with existing modals
5. **Day 5:** Install ReactFlow, create basic workflow builder page
6. **Day 6:** Create NodePalette and CustomNodes components
7. **Day 7:** Create NodeConfigPanel, test full workflow builder

---

## Success Criteria

- [ ] Users can see enabled integrations on their bot's edit page
- [ ] Users can enable/disable integrations from the bot edit page
- [ ] Users can configure integration actions with trigger keywords
- [ ] Users can access a visual workflow builder for their bot
- [ ] Workflow builder shows integration nodes for enabled integrations
- [ ] Users can create and save basic workflows

---

**Created:** 2026-01-18
**Author:** Claude Code
**Status:** Ready for Implementation

---

> "Week 8.3 bridges the gap between enabling integrations and actually using them in your bot!"
