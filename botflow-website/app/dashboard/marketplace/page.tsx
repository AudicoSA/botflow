'use client';

import { useState, useEffect } from 'react';
import { IntegrationCard } from '../../components/IntegrationCard';
import { CategoryFilter } from '../../components/CategoryFilter';
import { SearchBar } from '../../components/SearchBar';
import { EnableIntegrationModal } from '../../components/EnableIntegrationModal';

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
}

const categories = [
  { id: 'all', label: 'All', icon: '🔌' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'payment', label: 'Payment', icon: '💳' },
  { id: 'crm', label: 'CRM', icon: '👥' },
  { id: 'communication', label: 'Communication', icon: '💬' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'productivity', label: 'Productivity', icon: '⚡' },
  { id: 'specialized', label: 'Specialized', icon: '🎯' },
];

export default function MarketplacePage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [filteredIntegrations, setFilteredIntegrations] = useState<Integration[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showEnableModal, setShowEnableModal] = useState(false);

  // Fetch integrations
  useEffect(() => {
    fetchIntegrations();
  }, []);

  // Filter integrations when category or search changes
  useEffect(() => {
    filterIntegrations();
  }, [selectedCategory, searchQuery, integrations]);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/marketplace?per_page=100');
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterIntegrations = () => {
    let filtered = integrations;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(int => int.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(int =>
        int.name.toLowerCase().includes(query) ||
        int.description.toLowerCase().includes(query)
      );
    }

    setFilteredIntegrations(filtered);
  };

  const handleEnableIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowEnableModal(true);
  };

  const handleCloseModal = () => {
    setShowEnableModal(false);
    setSelectedIntegration(null);
  };

  const featuredIntegrations = filteredIntegrations.filter(int => int.is_featured);
  const regularIntegrations = filteredIntegrations.filter(int => !int.is_featured);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Integration Marketplace
          </h1>
          <p className="text-gray-600">
            Connect your WhatsApp bot to 400+ apps and services. Choose from pre-configured integrations or build custom workflows.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search integrations..."
          />
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{integrations.length}</div>
            <div className="text-gray-600">Total Integrations</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {integrations.filter(i => i.is_featured).length}
            </div>
            <div className="text-gray-600">Featured</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              {integrations.filter(i => i.pricing_model === 'free').length}
            </div>
            <div className="text-gray-600">Free</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredIntegrations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No integrations found</p>
            <p className="text-gray-400 mt-2">Try adjusting your filters or search query</p>
          </div>
        )}

        {/* Featured Integrations */}
        {!loading && featuredIntegrations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">⭐</span>
              Featured Integrations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredIntegrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onEnable={() => handleEnableIntegration(integration)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Integrations */}
        {!loading && regularIntegrations.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedCategory === 'all' ? 'All Integrations' : `${categories.find(c => c.id === selectedCategory)?.label} Integrations`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularIntegrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onEnable={() => handleEnableIntegration(integration)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Enable Integration Modal */}
        {showEnableModal && selectedIntegration && (
          <EnableIntegrationModal
            integration={selectedIntegration}
            onClose={handleCloseModal}
            onSuccess={() => {
              handleCloseModal();
              // Optionally refresh or show success message
            }}
          />
        )}
      </div>
    </div>
  );
}
