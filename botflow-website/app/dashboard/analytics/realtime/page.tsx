'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { MetricCard } from '@/app/components/analytics/MetricCard';
import { ConversationFeed } from '@/app/components/analytics/ConversationFeed';
import { ResponseTimeChart } from '@/app/components/analytics/ResponseTimeChart';
import { MessageVolumeChart } from '@/app/components/analytics/MessageVolumeChart';

interface RealtimeMetrics {
  activeConversations: number;
  avgResponseTime: number;
  successRate: number;
  messagesPerHour: number;
}

export default function RealtimeDashboard() {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    activeConversations: 0,
    avgResponseTime: 0,
    successRate: 0,
    messagesPerHour: 0
  });

  const { connected, messages } = useWebSocket('/api/analytics/stream');

  useEffect(() => {
    // Update metrics from WebSocket
    if (messages.length > 0) {
      const latest = messages[messages.length - 1];
      if (latest.type === 'metrics_update') {
        setMetrics(latest.data);
      }
    }
  }, [messages]);

  // Fetch initial metrics
  useEffect(() => {
    const fetchInitialMetrics = async () => {
      try {
        const response = await fetch('/api/analytics/realtime');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Failed to fetch initial metrics:', error);
      }
    };

    fetchInitialMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Real-Time Dashboard</h1>
              <p className="text-gray-600 mt-1">Live bot performance and analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Now"
            value={metrics.activeConversations}
            icon="🟢"
            trend={{ value: 12, direction: 'up' }}
            color="green"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${(metrics.avgResponseTime / 1000).toFixed(1)}s`}
            icon="⚡"
            trend={{ value: 5, direction: 'down' }}
            color="blue"
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics.successRate}%`}
            icon="✅"
            trend={{ value: 2, direction: 'up' }}
            color="green"
          />
          <MetricCard
            title="Messages/Hour"
            value={metrics.messagesPerHour}
            icon="💬"
            trend={{ value: 8, direction: 'up' }}
            color="purple"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ResponseTimeChart />
          <MessageVolumeChart />
        </div>

        {/* Conversation Feed */}
        <ConversationFeed messages={messages} />
      </div>
    </div>
  );
}
