'use client';

interface Template {
  id: string;
  name: string;
  vertical: string;
  description: string;
  tagline: string;
  icon: string;
  tier: number;
}

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const tierLabels = {
    1: { label: 'Popular', color: 'bg-blue-100 text-blue-800' },
    2: { label: 'Business', color: 'bg-purple-100 text-purple-800' },
    3: { label: 'Professional', color: 'bg-green-100 text-green-800' },
  };

  const tierInfo = tierLabels[template.tier as keyof typeof tierLabels];

  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer bg-white group"
    >
      {/* Icon and Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{template.icon}</div>
        {tierInfo && (
          <span className={`${tierInfo.color} text-xs px-2 py-1 rounded font-medium`}>
            {tierInfo.label}
          </span>
        )}
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition">
        {template.name}
      </h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {template.tagline}
      </p>

      {/* Action Button */}
      <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium">
        View Details →
      </button>
    </div>
  );
}
