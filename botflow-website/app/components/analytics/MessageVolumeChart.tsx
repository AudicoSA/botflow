'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MessageVolumeData {
  time: string;
  inbound: number;
  outbound: number;
}

export function MessageVolumeChart() {
  const [data, setData] = useState<MessageVolumeData[]>([]);
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

      const response = await fetch(`/api/analytics/message-volume?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch message volume data');
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Failed to fetch message volume data:', error);
      setError('Failed to load chart data');
      // Set mock data for demo purposes
      setData(generateMockData(period));
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (period: string): MessageVolumeData[] => {
    const points = period === '24h' ? 24 : period === '7d' ? 7 : 30;
    return Array.from({ length: points }, (_, i) => ({
      time: period === '24h'
        ? `${i}:00`
        : period === '7d'
        ? `Day ${i + 1}`
        : `${i + 1}`,
      inbound: Math.round(Math.random() * 100 + 50),
      outbound: Math.round(Math.random() * 100 + 50)
    }));
  };

  if (loading) {
    return <ChartSkeleton />;
  }

  if (error && data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Message Volume</h3>
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
        <h3 className="text-lg font-bold text-gray-900">📈 Message Volume</h3>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No message volume data available</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
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
            <Bar
              dataKey="inbound"
              fill="#3B82F6"
              name="Inbound"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="outbound"
              fill="#10B981"
              name="Outbound"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Summary Stats */}
      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Inbound</p>
            <p className="text-lg font-bold text-blue-600">
              {data.reduce((sum, d) => sum + d.inbound, 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Outbound</p>
            <p className="text-lg font-bold text-green-600">
              {data.reduce((sum, d) => sum + d.outbound, 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Messages</p>
            <p className="text-lg font-bold text-gray-900">
              {data.reduce((sum, d) => sum + d.inbound + d.outbound, 0).toLocaleString()}
            </p>
          </div>
        </div>
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
