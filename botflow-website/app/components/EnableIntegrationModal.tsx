'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ValidationResult } from './ValidationResult';

interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description?: string;
  icon_url?: string;
  requires_auth: boolean;
  auth_type?: string;
  is_n8n_node?: boolean;
  setup_instructions?: {
    steps: string[];
    required_fields?: string[];
    required_scopes?: string[];
  };
  credential_schema?: {
    type: string;
    required?: string[];
    properties?: Record<string, {
      type: string;
      title?: string;
      description?: string;
      placeholder?: string;
      default?: any;
      format?: string;
    }>;
  };
}

interface ValidationResultType {
  valid: boolean;
  message: string;
  details?: Record<string, any>;
}

interface BotIntegration {
  id: string;
  bot_id: string;
  integration_id: string;
  status: string;
  credentials_encrypted?: string;
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
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [loadingBots, setLoadingBots] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResultType | null>(null);
  const [existingIntegration, setExistingIntegration] = useState<BotIntegration | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // Fetch user's bots
  useEffect(() => {
    fetchBots();
  }, []);

  // Check if integration already exists when bot selection changes
  useEffect(() => {
    if (selectedBotId) {
      checkExistingIntegration();
    }
  }, [selectedBotId]);

  const fetchBots = async () => {
    try {
      const data = await api.getBots();
      setBots(data.bots || []);
      if (data.bots?.length > 0) {
        setSelectedBotId(data.bots[0].id); // Select first bot by default
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    } finally {
      setLoadingBots(false);
    }
  };

  const checkExistingIntegration = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('botflow_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(
        `${apiUrl}/api/marketplace/bots/${selectedBotId}/integrations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const existing = data.integrations?.find(
          (i: any) => i.integration_id === integration.id || i.integration_slug === integration.slug
        );
        setExistingIntegration(existing || null);
        setIsUpdateMode(!!existing);
      }
    } catch (err) {
      console.error('Failed to check existing integration:', err);
    }
  };

  // Get required fields - prefer credential_schema if available
  const hasCredentialSchema = !!integration.credential_schema?.properties;
  const schemaProperties = integration.credential_schema?.properties || {};
  const schemaRequired = integration.credential_schema?.required || [];

  // Get field names - either from credential_schema or setup_instructions
  const requiredFields = hasCredentialSchema
    ? Object.keys(schemaProperties)
    : (integration.setup_instructions?.required_fields || []);
  const steps = integration.setup_instructions?.steps || [];

  // Initialize default values from credential_schema
  useEffect(() => {
    if (hasCredentialSchema && Object.keys(credentials).length === 0) {
      const defaults: Record<string, string> = {};
      for (const [key, field] of Object.entries(schemaProperties)) {
        if (field.default !== undefined) {
          defaults[key] = String(field.default);
        }
      }
      if (Object.keys(defaults).length > 0) {
        setCredentials(defaults);
      }
    }
  }, [hasCredentialSchema]);

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    // Clear validation when credentials change
    if (validationResult) {
      setValidationResult(null);
    }
  };

  const handleValidateCredentials = async () => {
    setIsValidating(true);
    setValidationResult(null);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('botflow_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(
        `${apiUrl}/api/marketplace/${integration.slug}/validate-credentials`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credentials }),
        }
      );

      const result = await response.json();
      setValidationResult(result);
    } catch (err) {
      setValidationResult({
        valid: false,
        message: 'Failed to validate credentials. Please check your network connection.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!selectedBotId) {
        throw new Error('Please select a bot');
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('botflow_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      if (isUpdateMode && existingIntegration) {
        // Update existing integration
        const response = await fetch(
          `${apiUrl}/api/marketplace/bot-integrations/${existingIntegration.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              credentials,
              configuration: {},
            }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to update integration');
        }
      } else {
        // Enable new integration
        const response = await fetch(`${apiUrl}/api/marketplace/${integration.slug}/enable`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            bot_id: selectedBotId,
            credentials,
            configuration: {},
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to enable integration');
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (!selectedBotId) return false;
    if (!integration.requires_auth) return true;
    // Check only required fields from schema, or all fields if using legacy setup_instructions
    const fieldsToCheck = hasCredentialSchema ? schemaRequired : requiredFields;
    return fieldsToCheck.every(field => credentials[field]?.trim());
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
                    {isUpdateMode ? 'Update' : 'Enable'} {integration.name}
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
            {/* Update Mode Banner */}
            {isUpdateMode && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Integration already enabled</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Enter new credentials below to update. Use "Test Credentials" to verify before saving.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bot Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Bot
              </label>
              {loadingBots ? (
                <div className="text-sm text-gray-500">Loading bots...</div>
              ) : bots.length === 0 ? (
                <div className="text-sm text-red-600">
                  No bots found. Please create a bot first.
                </div>
              ) : (
                <select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

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
                <h4 className="text-sm font-semibold text-gray-700">
                  {integration.auth_type === 'database' ? 'Database Connection:' : 'Credentials:'}
                </h4>
                {requiredFields.map((field) => {
                  const fieldSchema = schemaProperties[field];
                  const fieldTitle = fieldSchema?.title || field.replace(/_/g, ' ');
                  const fieldDescription = fieldSchema?.description;
                  const fieldPlaceholder = fieldSchema?.placeholder || `Enter ${fieldTitle.toLowerCase()}`;
                  const isPassword = fieldSchema?.format === 'password' ||
                    field.includes('secret') || field.includes('key') ||
                    field.includes('token') || field.includes('password');
                  const isNumber = fieldSchema?.type === 'number';
                  const isBoolean = fieldSchema?.type === 'boolean';
                  const isRequired = schemaRequired.includes(field);

                  return (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {fieldTitle}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {fieldDescription && (
                        <p className="text-xs text-gray-500 mb-1">{fieldDescription}</p>
                      )}
                      {isBoolean ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={credentials[field] === 'true'}
                            onChange={(e) => handleInputChange(field, e.target.checked ? 'true' : 'false')}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Enable</span>
                        </label>
                      ) : (
                        <input
                          type={isPassword ? 'password' : isNumber ? 'number' : 'text'}
                          value={credentials[field] || ''}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={fieldPlaceholder}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Test Credentials Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleValidateCredentials}
                    disabled={isValidating || !(hasCredentialSchema ? schemaRequired : requiredFields).every(field => credentials[field]?.trim())}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isValidating || !(hasCredentialSchema ? schemaRequired : requiredFields).every(field => credentials[field]?.trim())
                        ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {isValidating ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Validating...
                      </span>
                    ) : (
                      'Test Credentials'
                    )}
                  </button>
                </div>

                {/* Validation Result */}
                {validationResult && (
                  <div className="pt-2">
                    <ValidationResult result={validationResult} />
                  </div>
                )}
              </div>
            )}

            {/* n8n Integration Info */}
            {integration.is_n8n_node && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-800">Powered by n8n</p>
                    <p className="text-sm text-orange-700 mt-1">
                      This integration runs through n8n workflow automation, giving you advanced customization options.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Database Integration Info */}
            {integration.auth_type === 'database' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Direct Database Connection</p>
                    <p className="text-sm text-purple-700 mt-1">
                      This integration connects directly to your database for real-time data sync. Make sure your database allows remote connections.
                    </p>
                  </div>
                </div>
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
              {loading
                ? (isUpdateMode ? 'Updating...' : 'Enabling...')
                : (isUpdateMode ? 'Update Credentials' : 'Enable Integration')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
