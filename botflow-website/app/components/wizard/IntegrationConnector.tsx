'use client';

import { useState } from 'react';

interface Integration {
  service: string;
  name: string;
  icon: string;
  required: boolean;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'url';
    placeholder: string;
    help?: string;
  }>;
}

interface IntegrationConnectorProps {
  integrations: Integration[];
  data: Record<string, any>;
  updateData: (data: any) => void;
}

export function IntegrationConnector({
  integrations,
  data,
  updateData
}: IntegrationConnectorProps) {
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: 'success' | 'error'; message?: string }>>({});

  const handleFieldChange = (service: string, field: string, value: string) => {
    updateData({
      ...data,
      [service]: {
        ...data[service],
        [field]: value
      }
    });

    // Clear test results when credentials change
    if (testResults[service]) {
      const newResults = { ...testResults };
      delete newResults[service];
      setTestResults(newResults);
    }
  };

  const testConnection = async (service: string) => {
    setTestingService(service);

    try {
      const response = await fetch(`/api/integrations/${service}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data[service])
      });

      const result = await response.json();

      setTestResults(prev => ({
        ...prev,
        [service]: {
          status: result.success ? 'success' : 'error',
          message: result.message || (result.success ? 'Connection successful!' : 'Connection failed')
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [service]: {
          status: 'error',
          message: 'Failed to test connection. Please check your internet connection.'
        }
      }));
    } finally {
      setTestingService(null);
    }
  };

  const isServiceConnected = (service: string): boolean => {
    return testResults[service]?.status === 'success';
  };

  const canTestService = (integration: Integration): boolean => {
    const serviceData = data[integration.service];
    if (!serviceData) return false;

    // Check if all required fields are filled
    return integration.fields.every(field => {
      const value = serviceData[field.name];
      return value && value.trim() !== '';
    });
  };

  if (integrations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No integrations required
        </h3>
        <p className="text-gray-600">
          This bot template doesn't require any external service connections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {integrations.map(integration => (
        <div
          key={integration.service}
          className={`border-2 rounded-lg p-6 transition-all ${
            isServiceConnected(integration.service)
              ? 'border-green-500 bg-green-50'
              : integration.required
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{integration.icon}</span>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {integration.name}
                  {integration.required && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                      Required
                    </span>
                  )}
                </h3>
                {testResults[integration.service] && (
                  <p className={`text-sm flex items-center gap-1 ${
                    testResults[integration.service].status === 'success'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {testResults[integration.service].status === 'success' ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    {testResults[integration.service].message}
                  </p>
                )}
              </div>
            </div>

            {isServiceConnected(integration.service) && (
              <span className="text-green-600">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {integration.fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={data[integration.service]?.[field.name] || ''}
                  onChange={e => handleFieldChange(integration.service, field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isServiceConnected(integration.service)}
                />
                {field.help && (
                  <p className="text-sm text-gray-500 mt-1">{field.help}</p>
                )}
              </div>
            ))}
          </div>

          {/* Test Button */}
          <div className="mt-4">
            {isServiceConnected(integration.service) ? (
              <button
                onClick={() => {
                  const newResults = { ...testResults };
                  delete newResults[integration.service];
                  setTestResults(newResults);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Update Credentials
              </button>
            ) : (
              <button
                onClick={() => testConnection(integration.service)}
                disabled={!canTestService(integration) || testingService === integration.service}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testingService === integration.service ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Test Connection
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error Message */}
          {testResults[integration.service]?.status === 'error' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                {testResults[integration.service].message}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Summary */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-gray-900">Connection Status</h4>
            <p className="text-sm text-gray-600">
              {integrations.filter(i => isServiceConnected(i.service)).length} of {integrations.length} integrations connected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
