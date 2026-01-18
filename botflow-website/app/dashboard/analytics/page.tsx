'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MetricCard } from '@/app/components/analytics/MetricCard';
import { AnalyticsFilters } from '@/app/components/analytics/AnalyticsFilters';
import { ResponseTimeChart } from '@/app/components/analytics/ResponseTimeChart';
import { MessageVolumeChart } from '@/app/components/analytics/MessageVolumeChart';

interface Bot {
  id: string;
  name: string;
}

interface FilterOptions {
  dateRange: 'today' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
  botId?: string;
  status?: 'all' | 'active' | 'resolved' | 'escalated';
  searchQuery?: string;
}

export default function AnalyticsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    totalMessages: 0,
    avgResponseTime: 0,
    successRate: 0
  });
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    dateRange: '7days',
    status: 'all'
  });

  // Convert dateRange to period format for API
  const getPeriodFromDateRange = (dateRange: string): '24h' | '7d' | '30d' => {
    switch (dateRange) {
      case 'today': return '24h';
      case '7days': return '7d';
      case '30days': return '30d';
      default: return '7d';
    }
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchBots = async () => {
    try {
      const token = localStorage.getItem('botflow_token') || localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/bots`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBots(data.bots || []);
      }
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    }
  };

  const fetchMetrics = useCallback(async (filters: FilterOptions) => {
    try {
      const token = localStorage.getItem('botflow_token') || localStorage.getItem('token');

      // If a specific bot is selected, use bot-specific endpoint
      if (filters.botId) {
        // Calculate date range
        let startDate: string;
        let endDate: string = new Date().toISOString().split('T')[0];

        switch (filters.dateRange) {
          case 'today':
            startDate = endDate;
            break;
          case '7days':
            startDate = new Date(Date.now() - 7 * 24 * 3600000).toISOString().split('T')[0];
            break;
          case '30days':
            startDate = new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0];
            break;
          case 'custom':
            startDate = filters.startDate || new Date(Date.now() - 7 * 24 * 3600000).toISOString().split('T')[0];
            endDate = filters.endDate || endDate;
            break;
          default:
            startDate = new Date(Date.now() - 7 * 24 * 3600000).toISOString().split('T')[0];
        }

        const response = await fetch(
          `${apiUrl}/api/analytics/bot/${filters.botId}/performance?startDate=${startDate}&endDate=${endDate}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setMetrics({
            totalConversations: data.total_conversations || 0,
            totalMessages: data.total_messages || 0,
            avgResponseTime: data.avg_response_time_ms || 0,
            successRate: data.success_rate ? parseFloat(data.success_rate) : 0
          });
        }
      } else {
        // Use organization-wide realtime metrics
        const response = await fetch(`${apiUrl}/api/analytics/realtime`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setMetrics({
            totalConversations: data.activeConversations || 0,
            totalMessages: data.messagesPerHour || 0,
            avgResponseTime: data.avgResponseTime || 0,
            successRate: data.successRate || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchBots();
    fetchMetrics(currentFilters);
  }, []);

  const handleFilterChange = useCallback((filters: FilterOptions) => {
    setCurrentFilters(filters);
    setLoading(true);
    fetchMetrics(filters);
  }, [fetchMetrics]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                Track bot performance and customer interactions
              </p>
            </div>
            <Link
              href="/dashboard/analytics/realtime"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors gap-2 text-sm md:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Real-Time Dashboard
            </Link>
          </div>
        </div>

        {/* Filters */}
        <AnalyticsFilters onFilterChange={handleFilterChange} bots={bots} />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <MetricCard
            title="Total Conversations"
            value={metrics.totalConversations.toLocaleString()}
            icon="💬"
            color="blue"
          />
          <MetricCard
            title="Messages/Hour"
            value={metrics.totalMessages}
            icon="📨"
            color="green"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${(metrics.avgResponseTime / 1000).toFixed(1)}s`}
            icon="⚡"
            color="purple"
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics.successRate}%`}
            icon="✅"
            color="green"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <ResponseTimeChart initialPeriod={getPeriodFromDateRange(currentFilters.dateRange)} />
          <MessageVolumeChart initialPeriod={getPeriodFromDateRange(currentFilters.dateRange)} />
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Analytics Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Performance Metrics</h4>
                <p className="text-sm text-gray-600">Track response times, success rates, and customer satisfaction</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Real-Time Updates</h4>
                <p className="text-sm text-gray-600">Live conversation feed with WebSocket streaming</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">CSV Export</h4>
                <p className="text-sm text-gray-600">Download analytics data for external analysis</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Advanced Filtering</h4>
                <p className="text-sm text-gray-600">Filter by date, bot, status, and search conversations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
