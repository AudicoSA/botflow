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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`Error: ${errorMessage}`);
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
                      <span className="text-xl">&#128268;</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{item.integration?.name || 'Unknown'}</h4>
                      {getStatusBadge(item.status, item.error_message)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {item.integration?.category} - Last synced: {formatDate(item.last_synced_at)}
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
                        setSelectedIntegration(item.integration as MarketplaceIntegration);
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
                        <span className="text-xl">&#128268;</span>
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
              Enabled integrations store your credentials securely. To use them in your bot&apos;s conversation flow,
              you&apos;ll need to configure workflow actions that reference these integrations.
            </p>
            <a
              href={`/dashboard/bots/${botId}/workflow`}
              className="mt-2 inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              Open Workflow Builder
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Enable Integration Modal */}
      {showEnableModal && selectedIntegration && (
        <EnableIntegrationModal
          integration={{
            id: selectedIntegration.id,
            name: selectedIntegration.name,
            slug: selectedIntegration.slug,
            description: selectedIntegration.description,
            icon_url: selectedIntegration.icon_url,
            requires_auth: selectedIntegration.requires_auth,
          }}
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
