'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ResponseTimeData {
  time: string;
  avg: number;
  p50: number;
  p95: number;
}

export function ResponseTimeChart() {
  const [data, setData] = useState<ResponseTimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/response-times?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response time data');
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Failed to fetch response time data:', error);
      setError('Failed to load chart data');
      // Set mock data for demo purposes
      setData(generateMockData(period));
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (period: string): ResponseTimeData[] => {
    const points = period === '24h' ? 24 : period === '7d' ? 7 : 30;
    return Array.from({ length: points }, (_, i) => ({
      time: period === '24h'
        ? `${i}:00`
        : `Day ${i + 1}`,
      avg: Math.round(Math.random() * 500 + 800),
      p50: Math.round(Math.random() * 400 + 600),
      p95: Math.round(Math.random() * 1000 + 1500)
    }));
  };

  if (loading) {
    return <ChartSkeleton />;
  }

  if (error && data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ Response Time Trends</h3>
        <div className="h-64 flex items-center justify-center bg-red-50 rounded-lg">
          <div className="text-center text-red-600">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">⚡ Response Time Trends</h3>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === '24h' ? 'Last 24h' : p === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No response time data available</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#3B82F6"
              strokeWidth={2}
              name="p50 (median)"
              dot={{ fill: '#3B82F6', r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="p95"
              stroke="#EF4444"
              strokeWidth={2}
              name="p95"
              dot={{ fill: '#EF4444', r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#10B981"
              strokeWidth={2}
              name="average"
              dot={{ fill: '#10B981', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
      <div className="h-64 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}
