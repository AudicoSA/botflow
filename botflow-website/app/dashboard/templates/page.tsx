'use client';

import { useState, useEffect } from 'react';
import { TemplateCard } from '@/app/components/TemplateCard';
import { TemplatePreviewModal } from '@/app/components/TemplatePreviewModal';
import { TemplateCardSkeleton } from '@/app/components/TemplateCardSkeleton';

interface Template {
  id: string;
  name: string;
  vertical: string;
  tier: number;
  description: string;
  tagline: string;
  icon: string;
  is_published: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [filterTier, setFilterTier] = useState<number | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates`);

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setError('Unable to load templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = filterTier
    ? templates.filter(t => t.tier === filterTier)
    : templates;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TemplateCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-semibold mb-2">⚠️ Error Loading Templates</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchTemplates}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Bot Template</h1>
        <p className="text-gray-600">
          Select a template designed for your industry and get your bot running in minutes.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilterTier(null)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
            !filterTier
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          All Templates ({templates.length})
        </button>
        <button
          onClick={() => setFilterTier(1)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
            filterTier === 1
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          🔥 Popular ({templates.filter(t => t.tier === 1).length})
        </button>
        <button
          onClick={() => setFilterTier(2)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
            filterTier === 2
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          💼 Business ({templates.filter(t => t.tier === 2).length})
        </button>
        <button
          onClick={() => setFilterTier(3)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
            filterTier === 3
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          🎯 Professional ({templates.filter(t => t.tier === 3).length})
        </button>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => setSelectedTemplate(template)}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSelect={(templateId) => {
            window.location.href = `/dashboard/templates/${templateId}/setup`;
          }}
        />
      )}
    </div>
  );
}
