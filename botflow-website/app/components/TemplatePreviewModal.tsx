'use client';

import { useEffect, useState } from 'react';

interface Template {
  id: string;
  name: string;
  vertical: string;
  description: string;
  tagline: string;
  icon: string;
  example_prompts?: string[];
  integrations?: string[];
  required_fields?: Record<string, any>;
}

interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export function TemplatePreviewModal({
  template,
  onClose,
  onSelect
}: TemplatePreviewModalProps) {
  const [fullTemplate, setFullTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFullTemplate();
  }, [template.id]);

  const fetchFullTemplate = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/templates/${template.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch template details');
      }

      const data = await response.json();
      setFullTemplate(data.template);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch template details:', error);
      setError('Unable to load template details');
    } finally {
      setLoading(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : error ? (
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{fullTemplate.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold">{fullTemplate.name}</h2>
                    <p className="text-gray-600">{fullTemplate.tagline}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-lg mb-2">About This Template</h3>
                <p className="text-gray-700">{fullTemplate.description}</p>
              </div>

              {/* Example Prompts */}
              {fullTemplate.example_prompts && fullTemplate.example_prompts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    📱 Example Customer Messages
                  </h3>
                  <div className="space-y-2">
                    {fullTemplate.example_prompts.map((prompt: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg"
                      >
                        <span className="text-blue-600 text-xl">💬</span>
                        <span className="text-gray-700 text-sm flex-1">"{prompt}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Fields */}
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  📝 What You'll Need to Setup
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  We'll ask for these details during setup:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <ul className="space-y-2">
                    {Object.entries(fullTemplate.required_fields || {}).map(
                      ([key, field]: [string, any]) => (
                        <li key={key} className="flex items-start gap-2">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <div className="flex-1">
                            <span className="text-gray-900 font-medium">
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </span>
                            {field.helpText && (
                              <p className="text-gray-600 text-xs mt-0.5">
                                {field.helpText}
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>

              {/* Integrations */}
              {fullTemplate.integrations && fullTemplate.integrations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">🔌 Integrations</h3>
                  <div className="flex gap-2 flex-wrap">
                    {fullTemplate.integrations.map((integration: string) => (
                      <span
                        key={integration}
                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {integration}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Setup Time Estimate */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <p className="font-semibold text-green-900">
                      Setup time: ~5 minutes
                    </p>
                    <p className="text-green-700 text-sm">
                      Answer a few questions and your bot will be ready to go!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t sticky bottom-0 bg-white flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => onSelect(fullTemplate.id)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
              >
                Use This Template →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
