'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Calendar,
  HelpCircle,
  CreditCard,
  Bell,
  Search,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Star
} from 'lucide-react';

/**
 * Template category icons mapping
 */
const categoryIcons: Record<string, React.ReactNode> = {
  ecommerce: <Package className="w-5 h-5" />,
  booking: <Calendar className="w-5 h-5" />,
  support: <HelpCircle className="w-5 h-5" />,
  payment: <CreditCard className="w-5 h-5" />,
  notification: <Bell className="w-5 h-5" />,
};

/**
 * Category colors for badges
 */
const categoryColors: Record<string, string> = {
  ecommerce: 'bg-blue-100 text-blue-700',
  booking: 'bg-purple-100 text-purple-700',
  support: 'bg-green-100 text-green-700',
  payment: 'bg-yellow-100 text-yellow-700',
  notification: 'bg-orange-100 text-orange-700',
};

interface WorkflowTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  triggerPhrases: string[];
  requiredIntegrations: string[];
  popularityScore: number;
  vertical?: string;
}

interface TemplateCategory {
  name: string;
  count: number;
}

interface TemplateSelectorProps {
  botId: string;
  onSelectTemplate: (template: WorkflowTemplate) => void;
  availableIntegrations?: string[];
  vertical?: string;
}

export default function TemplateSelector({
  botId,
  onSelectTemplate,
  availableIntegrations = [],
  vertical
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchTemplates = async (category?: string, search?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      params.set('limit', '20');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workflow-templates?${params}`,
        { credentials: 'include' }
      );

      if (!res.ok) throw new Error('Failed to fetch templates');

      const data = await res.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workflow-templates/categories`,
        { credentials: 'include' }
      );

      if (!res.ok) return;

      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  // Handle category filter
  const handleCategoryClick = (category: string | null) => {
    setSelectedCategory(category);
    fetchTemplates(category || undefined, searchQuery || undefined);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchTemplates(selectedCategory || undefined, query || undefined);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  // Check if user has required integrations
  const hasRequiredIntegrations = (template: WorkflowTemplate): boolean => {
    if (template.requiredIntegrations.length === 0) return true;
    return template.requiredIntegrations.every(int =>
      availableIntegrations.includes(int.toLowerCase())
    );
  };

  // Get missing integrations
  const getMissingIntegrations = (template: WorkflowTemplate): string[] => {
    return template.requiredIntegrations.filter(
      int => !availableIntegrations.includes(int.toLowerCase())
    );
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Workflow Templates</h3>
        <p className="text-sm text-gray-500 mt-1">
          Start with a pre-built template or build from scratch
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2">
        <button
          onClick={() => handleCategoryClick(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => handleCategoryClick(cat.name)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              selectedCategory === cat.name
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {categoryIcons[cat.name]}
            <span className="capitalize">{cat.name}</span>
            <span className="text-xs opacity-60">({cat.count})</span>
          </button>
        ))}
      </div>

      {/* Templates List */}
      <div className="max-h-96 overflow-y-auto">
        {error && (
          <div className="p-4 text-center text-red-500">
            <AlertCircle className="w-5 h-5 mx-auto mb-2" />
            {error}
          </div>
        )}

        {!error && templates.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No templates found</p>
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="mt-2 text-sm text-blue-500 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {templates.map((template) => {
          const hasIntegrations = hasRequiredIntegrations(template);
          const missingIntegrations = getMissingIntegrations(template);

          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[template.category] || 'bg-gray-100 text-gray-600'}`}>
                      {template.category}
                    </span>
                    {template.popularityScore >= 50 && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        Popular
                      </span>
                    )}
                  </div>

                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {template.name}
                  </h4>

                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Integration Status */}
                  {template.requiredIntegrations.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      {hasIntegrations ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Ready to use
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Needs: {missingIntegrations.join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <p className="text-xs text-gray-500 text-center">
          Or describe what you want and I'll build it from scratch
        </p>
      </div>
    </div>
  );
}
