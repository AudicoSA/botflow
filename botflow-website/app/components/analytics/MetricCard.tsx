'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
}

export function MetricCard({ title, value, icon, trend, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200'
  };

  const getTrendColor = () => {
    if (!trend) return '';

    // For metrics where lower is better (response time, error rate)
    const lowerIsBetter = title.toLowerCase().includes('response') ||
                          title.toLowerCase().includes('error');

    if (lowerIsBetter) {
      return trend.direction === 'down' ? 'text-green-600' : 'text-red-600';
    } else {
      return trend.direction === 'up' ? 'text-green-600' : 'text-red-600';
    }
  };

  return (
    <div className={`${colorClasses[color]} border-2 rounded-lg p-6 transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor()}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                {trend.direction === 'up' ? (
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                )}
              </svg>
              <span>{Math.abs(trend.value)}% vs last hour</span>
            </div>
          )}
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}
