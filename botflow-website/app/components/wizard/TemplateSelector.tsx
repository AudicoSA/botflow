'use client';

import { useState, useEffect } from 'react';

interface BotTemplate {
  id: string;
  vertical: string;
  name: string;
  description: string;
  tagline: string;
  icon: string;
  tier: number;
  required_integrations?: string[];
  is_published: boolean;
}

interface TemplateSelectorProps {
  data: { selectedTemplate?: string };
  updateData: (data: any) => void;
}

export function TemplateSelector({ data, updateData }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tier1' | 'tier2' | 'tier3'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use backend URL from environment or default to localhost:3001
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/templates`);

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const result = await response.json();
      setTemplates(result.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setError('Failed to load templates. Make sure the backend server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (templateId: string) => {
    updateData({ selectedTemplate: templateId });
  };

  const filteredTemplates = templates.filter(template => {
    if (filter === 'all') return true;
    if (filter === 'tier1') return template.tier === 1;
    if (filter === 'tier2') return template.tier === 2;
    if (filter === 'tier3') return template.tier === 3;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-900">Error loading templates</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchTemplates}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Templates ({templates.length})
        </button>
        <button
          onClick={() => setFilter('tier1')}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
            filter === 'tier1'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tier 1 (High Impact)
        </button>
        <button
          onClick={() => setFilter('tier2')}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
            filter === 'tier2'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tier 2 (Specialized)
        </button>
        <button
          onClick={() => setFilter('tier3')}
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
            filter === 'tier3'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tier 3 (Niche)
        </button>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => handleSelect(template.id)}
              className={`
                p-6 rounded-lg border-2 text-left transition-all
                ${data.selectedTemplate === template.id
                  ? 'border-blue-600 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }
              `}
            >
              <div className="text-4xl mb-3">{template.icon}</div>
              <h3 className="font-bold text-lg mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{template.tagline}</p>

              {/* Tier Badge */}
              <div className="mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  template.tier === 1 ? 'bg-green-100 text-green-700' :
                  template.tier === 2 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  Tier {template.tier}
                </span>
              </div>

              {/* Required Integrations */}
              {template.required_integrations && template.required_integrations.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.required_integrations.map(integration => (
                    <span
                      key={integration}
                      className="text-xs px-2 py-1 bg-gray-100 rounded-full"
                    >
                      {integration}
                    </span>
                  ))}
                </div>
              )}

              {data.selectedTemplate === template.id && (
                <div className="mt-4 flex items-center gap-2 text-blue-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Selected</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Custom Bot Option */}
      <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
        <button
          onClick={() => handleSelect('custom')}
          className={`w-full text-left p-2 rounded ${
            data.selectedTemplate === 'custom' ? 'bg-blue-50' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">🛠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Start from Scratch</h3>
              <p className="text-sm text-gray-600">
                Use our conversational builder to create a fully custom bot
              </p>
            </div>
            {data.selectedTemplate === 'custom' && (
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
