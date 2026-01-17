'use client';

import { useState } from 'react';

interface FilterOptions {
  dateRange: 'today' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
  botId?: string;
  status?: 'all' | 'active' | 'resolved' | 'escalated';
  searchQuery?: string;
}

interface AnalyticsFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  bots?: Array<{ id: string; name: string }>;
}

export function AnalyticsFilters({ onFilterChange, bots = [] }: AnalyticsFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: '7days',
    status: 'all'
  });

  const [showCustomDate, setShowCustomDate] = useState(false);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);

    if (key === 'dateRange' && value === 'custom') {
      setShowCustomDate(true);
    } else if (key === 'dateRange') {
      setShowCustomDate(false);
    }
  };

  const handleExportCSV = () => {
    // Trigger CSV export
    const queryParams = new URLSearchParams();
    if (filters.dateRange !== 'custom') {
      queryParams.append('period', filters.dateRange);
    } else {
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
    }
    if (filters.botId) queryParams.append('botId', filters.botId);
    if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);

    const token = localStorage.getItem('token');
    const url = `/api/analytics/export?${queryParams.toString()}`;

    // Create a temporary link to download the CSV
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analytics-${Date.now()}.csv`);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">🔍 Filters</h3>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Bot Filter */}
        {bots.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bot
            </label>
            <select
              value={filters.botId || 'all'}
              onChange={(e) => handleFilterChange('botId', e.target.value === 'all' ? undefined : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Bots</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>

        {/* Search Query */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            placeholder="Search conversations..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Custom Date Range */}
      {showCustomDate && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
