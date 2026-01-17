'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EnableIntegrationModal } from '../../../components/EnableIntegrationModal';

interface Integration {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  long_description?: string;
  icon_url?: string;
  requires_auth: boolean;
  auth_type?: string;
  pricing_model: string;
  is_featured: boolean;
  is_direct_integration: boolean;
  recommended_for_verticals: string[];
  supported_features: string[];
  setup_instructions?: any;
  documentation_url?: string;
}

export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEnableModal, setShowEnableModal] = useState(false);

  useEffect(() => {
    fetchIntegration();
  }, [slug]);

  const fetchIntegration = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/marketplace/${slug}`);
      if (!response.ok) throw new Error('Integration not found');
      const data = await response.json();
      setIntegration(data);
    } catch (error) {
      console.error('Failed to fetch integration:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Integration Not Found</h2>
          <p className="text-gray-600 mb-4">The integration you're looking for doesn't exist.</p>
          <Link
            href="/dashboard/marketplace"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              {integration.icon_url && (
                <img
                  src={integration.icon_url}
                  alt={integration.name}
                  className="w-20 h-20 rounded-xl object-contain"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {integration.name}
                </h1>
                <p className="text-lg text-gray-600 mb-4">{integration.description}</p>
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                    {integration.category}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 capitalize">
                    {integration.pricing_model}
                  </span>
                  {integration.is_featured && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      ⭐ Featured
                    </span>
                  )}
                  {integration.is_direct_integration && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      ⚡ Direct Integration
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowEnableModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Enable Integration
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed">
                {integration.long_description || integration.description}
              </p>
            </div>

            {/* Features */}
            {integration.supported_features && integration.supported_features.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Supported Features</h2>
                <div className="grid grid-cols-2 gap-3">
                  {integration.supported_features.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 capitalize">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            {integration.setup_instructions && integration.setup_instructions.steps && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Setup Instructions</h2>
                <ol className="space-y-3">
                  {integration.setup_instructions.steps.map((step: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 pt-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{integration.category}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Pricing</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{integration.pricing_model}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Authentication</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">
                    {integration.requires_auth ? integration.auth_type || 'Required' : 'Not Required'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {integration.is_direct_integration ? 'Direct Integration' : 'n8n Workflow'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Recommended For */}
            {integration.recommended_for_verticals && integration.recommended_for_verticals.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recommended For</h3>
                <div className="flex flex-wrap gap-2">
                  {integration.recommended_for_verticals.map((vertical) => (
                    <span
                      key={vertical}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 capitalize"
                    >
                      {vertical.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation */}
            {integration.documentation_url && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Resources</h3>
                <a
                  href={integration.documentation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Documentation
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Enable Modal */}
        {showEnableModal && (
          <EnableIntegrationModal
            integration={integration}
            onClose={() => setShowEnableModal(false)}
            onSuccess={() => {
              setShowEnableModal(false);
              // Show success message or redirect
            }}
          />
        )}
      </div>
    </div>
  );
}
