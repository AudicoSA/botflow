'use client';

import { useState } from 'react';

interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description?: string;
  icon_url?: string;
  requires_auth: boolean;
  auth_type?: string;
  setup_instructions?: {
    steps: string[];
    required_fields?: string[];
    required_scopes?: string[];
  };
}

interface EnableIntegrationModalProps {
  integration: Integration;
  onClose: () => void;
  onSuccess: () => void;
}

export function EnableIntegrationModal({ integration, onClose, onSuccess }: EnableIntegrationModalProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Get required fields from setup instructions
  const requiredFields = integration.setup_instructions?.required_fields || [];
  const steps = integration.setup_instructions?.steps || [];

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const handleEnable = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Get actual bot ID from context/state
      const botId = 'demo-bot-id';

      const response = await fetch(`http://localhost:3001/api/marketplace/${integration.slug}/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add actual auth token
          // 'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bot_id: botId,
          credentials,
          configuration: {},
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to enable integration');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (!integration.requires_auth) return true;
    return requiredFields.every(field => credentials[field]?.trim());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {integration.icon_url && (
                  <img
                    src={integration.icon_url}
                    alt={integration.name}
                    className="w-10 h-10 rounded-lg object-contain"
                  />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Enable {integration.name}
                  </h3>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4 max-h-96 overflow-y-auto">
            {/* Steps */}
            {steps.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Setup Instructions:</h4>
                <ol className="space-y-2">
                  {steps.map((step, index) => (
                    <li
                      key={index}
                      className={`flex items-start text-sm ${
                        index === currentStep ? 'text-blue-600 font-medium' : 'text-gray-600'
                      }`}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                        index === currentStep
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Credentials Form */}
            {integration.requires_auth && requiredFields.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Credentials:</h4>
                {requiredFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {field.replace(/_/g, ' ')}
                    </label>
                    <input
                      type={field.includes('secret') || field.includes('key') || field.includes('token') ? 'password' : 'text'}
                      value={credentials[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* OAuth Integration */}
            {integration.auth_type === 'oauth' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  This integration uses OAuth authentication. You'll be redirected to authorize access after clicking "Enable".
                </p>
              </div>
            )}

            {/* No Auth Required */}
            {!integration.requires_auth && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  No authentication required. This integration will be enabled immediately.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEnable}
              disabled={loading || !isFormValid()}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                loading || !isFormValid()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Enabling...' : 'Enable Integration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
