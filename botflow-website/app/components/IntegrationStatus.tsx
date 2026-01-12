'use client';

type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

interface IntegrationStatusProps {
  status: IntegrationStatus;
  className?: string;
}

const statusConfig: Record<IntegrationStatus, { label: string; color: string; icon: string }> = {
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✓',
  },
  inactive: {
    label: 'Inactive',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '○',
  },
  error: {
    label: 'Error',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '✕',
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⋯',
  },
};

export function IntegrationStatus({ status, className = '' }: IntegrationStatusProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}
