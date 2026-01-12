'use client';

import Link from 'next/link';

interface Integration {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon_url?: string;
  pricing_model: string;
  is_featured: boolean;
  is_direct_integration: boolean;
  supported_features: string[];
}

interface IntegrationCardProps {
  integration: Integration;
  onEnable: () => void;
  isEnabled?: boolean;
}

const categoryColors: Record<string, string> = {
  calendar: 'bg-blue-100 text-blue-800',
  payment: 'bg-green-100 text-green-800',
  crm: 'bg-purple-100 text-purple-800',
  communication: 'bg-yellow-100 text-yellow-800',
  ecommerce: 'bg-pink-100 text-pink-800',
  analytics: 'bg-indigo-100 text-indigo-800',
  productivity: 'bg-orange-100 text-orange-800',
  specialized: 'bg-red-100 text-red-800',
};

const pricingBadge: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'bg-green-100 text-green-800' },
  freemium: { label: 'Freemium', color: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', color: 'bg-gray-100 text-gray-800' },
};

export function IntegrationCard({ integration, onEnable, isEnabled = false }: IntegrationCardProps) {
  const categoryColor = categoryColors[integration.category] || 'bg-gray-100 text-gray-800';
  const pricing = pricingBadge[integration.pricing_model] || pricingBadge.free;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 relative group">
      {/* Featured Badge */}
      {integration.is_featured && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⭐ Featured
          </span>
        </div>
      )}

      {/* Direct Integration Badge */}
      {integration.is_direct_integration && (
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ⚡ Direct
          </span>
        </div>
      )}

      {/* Icon and Name */}
      <div className="flex items-start space-x-4 mb-4">
        <div className="flex-shrink-0">
          {integration.icon_url ? (
            <img
              src={integration.icon_url}
              alt={integration.name}
              className="w-12 h-12 rounded-lg object-contain"
              onError={(e) => {
                // Fallback to emoji if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl ${integration.icon_url ? 'hidden' : ''}`}>
            🔌
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {integration.name}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryColor}`}>
              {integration.category}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${pricing.color}`}>
              {pricing.label}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {integration.description}
      </p>

      {/* Features */}
      {integration.supported_features && integration.supported_features.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {integration.supported_features.slice(0, 4).map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
              >
                {feature}
              </span>
            ))}
            {integration.supported_features.length > 4 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                +{integration.supported_features.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
        {isEnabled ? (
          <button
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm cursor-not-allowed"
            disabled
          >
            ✓ Enabled
          </button>
        ) : (
          <button
            onClick={onEnable}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            Enable
          </button>
        )}
        <Link
          href={`/dashboard/marketplace/${integration.slug}`}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          Details
        </Link>
      </div>
    </div>
  );
}
