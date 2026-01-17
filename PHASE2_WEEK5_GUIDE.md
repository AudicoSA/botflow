# Phase 2 Week 5: Dashboard & Analytics - Implementation Guide

**Status:** Ready to Start 🚀
**Goal:** Build real-time monitoring and analytics for bot performance
**Duration:** 5-7 days
**Prerequisites:** ✅ Week 1 (RAG) + ✅ Week 2 (Workflow Engine) + ✅ Week 3 (Bot Builder) + ✅ Week 4 (Visual Builder)

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Real-Time Dashboard](#real-time-dashboard)
5. [Metrics Collection](#metrics-collection)
6. [Analytics Components](#analytics-components)
7. [Chart Library Setup](#chart-library-setup)
8. [Filtering & Search](#filtering--search)
9. [CSV Export](#csv-export)
10. [WebSocket Integration](#websocket-integration)
11. [Day-by-Day Plan](#day-by-day-plan)

---

## Overview

### What We're Building

Week 5 creates a powerful analytics and monitoring system that gives users real-time insights into their bot performance:

**From This (Static):**
```
Dashboard
├─ Total Conversations: 1,234
├─ Total Messages: 5,678
└─ Active Bots: 12
```

**To This (Real-Time):**
```
┌────────────────────────────────────────────────────────┐
│  📊 Real-Time Dashboard                                │
├────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Active Now   │  │ Avg Response │  │ Success Rate │ │
│  │    42 🟢     │  │   1.2s ⚡    │  │    94% ✅    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                        │
│  📈 Message Volume (Last 7 Days)                      │
│  ┌─────────────────────────────────────────────────┐  │
│  │     ▄                                            │  │
│  │    ██  ▄▄                                        │  │
│  │   ███ ███ ▄▄                                     │  │
│  │  █████████████                                   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  💬 Recent Conversations                              │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 🟢 Customer: "Track my order #1234"             │  │
│  │    Bot: "Your order is out for delivery..."     │  │
│  │    2 minutes ago                                 │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ 🟢 Customer: "What are your hours?"             │  │
│  │    Bot: "We're open Monday-Friday 9am-5pm"      │  │
│  │    5 minutes ago                                 │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### The Magic ✨

Users get:
1. **Real-time updates** - Live conversation feed via WebSocket
2. **Performance metrics** - Response time, success rates, error tracking
3. **Visual analytics** - Beautiful charts and graphs
4. **Smart filtering** - Filter by date, bot, status, customer
5. **Data export** - Download analytics as CSV
6. **Mobile ready** - Responsive design for monitoring on-the-go

---

## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────┐
│                    User (Browser)                          │
│           Real-Time Dashboard Components                   │
└───────────────────────────┬────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   WebSocket Connection   │  │   REST API Endpoints     │
│   - Live conversations   │  │   - Metrics queries      │
│   - Real-time updates    │  │   - Analytics data       │
│   - Status changes       │  │   - CSV export           │
└──────────┬───────────────┘  └──────────┬───────────────┘
           │                              │
           └──────────────┬───────────────┘
                          ▼
┌────────────────────────────────────────────────────────────┐
│              Backend Services (Fastify)                    │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ WebSocket Server │  │ Metrics Service  │              │
│  │ - Broadcast msgs │  │ - Aggregation    │              │
│  │ - Room mgmt      │  │ - Calculations   │              │
│  └──────────────────┘  └──────────────────┘              │
└───────────────────────────┬────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   PostgreSQL Database    │  │   Redis Cache            │
│   - Conversation data    │  │   - Real-time metrics    │
│   - Message history      │  │   - Aggregated stats     │
│   - Performance metrics  │  │   - Leaderboards         │
└──────────────────────────┘  └──────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   BullMQ Workers         │  │   Message Queue          │
│   - Metric aggregation   │  │   - Async processing     │
│   - Analytics batch jobs │  │   - Background tasks     │
└──────────────────────────┘  └──────────────────────────┘
```

### Data Flow

1. **Message Received** → Webhook triggers conversation
2. **Metrics Captured** → Response time, success/failure, tokens used
3. **Real-Time Update** → WebSocket broadcasts to connected clients
4. **Aggregation** → BullMQ worker calculates rolling metrics
5. **Cache Update** → Redis stores recent stats for fast retrieval
6. **Database Write** → PostgreSQL persists for historical analysis
7. **Dashboard Update** → React components re-render with new data

---

## Database Schema

### New Tables

#### 1. `conversation_metrics`
Stores detailed metrics per conversation.

```sql
CREATE TABLE conversation_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Timing metrics
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Message metrics
  total_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  bot_messages INTEGER DEFAULT 0,

  -- Performance metrics
  avg_response_time_ms INTEGER,
  p50_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,

  -- Success metrics
  successful_responses INTEGER DEFAULT 0,
  failed_responses INTEGER DEFAULT 0,
  fallback_responses INTEGER DEFAULT 0,
  handoff_triggered BOOLEAN DEFAULT false,

  -- AI metrics
  knowledge_base_hits INTEGER DEFAULT 0,
  knowledge_base_misses INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  -- Cost metrics
  estimated_cost_usd DECIMAL(10, 6) DEFAULT 0,

  -- Status
  resolution_status VARCHAR(50), -- 'resolved', 'unresolved', 'escalated'
  customer_satisfaction INTEGER, -- 1-5 rating

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversation_metrics_conversation ON conversation_metrics(conversation_id);
CREATE INDEX idx_conversation_metrics_bot ON conversation_metrics(bot_id);
CREATE INDEX idx_conversation_metrics_org ON conversation_metrics(organization_id);
CREATE INDEX idx_conversation_metrics_started_at ON conversation_metrics(started_at);
CREATE INDEX idx_conversation_metrics_status ON conversation_metrics(resolution_status);

-- RLS
ALTER TABLE conversation_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's conversation metrics"
  ON conversation_metrics FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
```

#### 2. `bot_performance_metrics`
Aggregated daily metrics per bot.

```sql
CREATE TABLE bot_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Volume metrics
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  active_conversations INTEGER DEFAULT 0,

  -- Performance metrics
  avg_response_time_ms INTEGER,
  p50_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,

  -- Success metrics
  success_rate DECIMAL(5, 2), -- Percentage
  error_rate DECIMAL(5, 2),
  fallback_rate DECIMAL(5, 2),
  handoff_rate DECIMAL(5, 2),

  -- AI metrics
  knowledge_base_hit_rate DECIMAL(5, 2),
  avg_tokens_per_conversation INTEGER,
  total_tokens_used INTEGER,

  -- Cost metrics
  total_cost_usd DECIMAL(10, 2),
  cost_per_conversation_usd DECIMAL(10, 6),

  -- Engagement metrics
  avg_conversation_duration_seconds INTEGER,
  avg_messages_per_conversation DECIMAL(5, 2),
  customer_satisfaction_avg DECIMAL(3, 2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(bot_id, date)
);

-- Indexes
CREATE INDEX idx_bot_perf_metrics_bot ON bot_performance_metrics(bot_id);
CREATE INDEX idx_bot_perf_metrics_org ON bot_performance_metrics(organization_id);
CREATE INDEX idx_bot_perf_metrics_date ON bot_performance_metrics(date);

-- RLS
ALTER TABLE bot_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's bot performance metrics"
  ON bot_performance_metrics FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
```

#### 3. `usage_analytics`
High-level usage analytics aggregated by hour.

```sql
CREATE TABLE usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hour TIMESTAMPTZ NOT NULL, -- Truncated to hour

  -- Volume metrics
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  conversations_started INTEGER DEFAULT 0,
  conversations_ended INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,

  -- Bot usage
  bots_active INTEGER DEFAULT 0,
  most_active_bot_id UUID REFERENCES bots(id),

  -- Integration usage
  api_calls_made INTEGER DEFAULT 0,
  webhook_calls_received INTEGER DEFAULT 0,

  -- Cost tracking
  tokens_used INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 6) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, hour)
);

-- Indexes
CREATE INDEX idx_usage_analytics_org ON usage_analytics(organization_id);
CREATE INDEX idx_usage_analytics_hour ON usage_analytics(hour);

-- RLS
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's usage analytics"
  ON usage_analytics FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
```

### Helper Functions

#### Calculate Response Time Percentiles

```sql
CREATE OR REPLACE FUNCTION calculate_response_time_percentiles(
  p_conversation_id UUID
)
RETURNS TABLE (
  p50 INTEGER,
  p95 INTEGER,
  p99 INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER AS p50,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER AS p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER AS p99
  FROM messages
  WHERE conversation_id = p_conversation_id
    AND response_time_ms IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
```

#### Get Bot Performance Summary

```sql
CREATE OR REPLACE FUNCTION get_bot_performance_summary(
  p_bot_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_conversations BIGINT,
  total_messages BIGINT,
  avg_response_time_ms INTEGER,
  success_rate DECIMAL,
  total_cost_usd DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(total_conversations)::BIGINT,
    SUM(total_messages)::BIGINT,
    AVG(avg_response_time_ms)::INTEGER,
    AVG(success_rate),
    SUM(total_cost_usd)
  FROM bot_performance_metrics
  WHERE bot_id = p_bot_id
    AND date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;
```

---

## Real-Time Dashboard

### Dashboard Layout Component

**Location:** `app/dashboard/analytics/realtime/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/app/hooks/useWebSocket';
import { MetricCard } from '@/app/components/analytics/MetricCard';
import { ConversationFeed } from '@/app/components/analytics/ConversationFeed';
import { ResponseTimeChart } from '@/app/components/analytics/ResponseTimeChart';
import { MessageVolumeChart } from '@/app/components/analytics/MessageVolumeChart';

export default function RealtimeDashboard() {
  const [metrics, setMetrics] = useState({
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
```

### Metric Card Component

**Location:** `app/components/analytics/MetricCard.tsx`

```tsx
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

  const trendColors = {
    up: trend?.direction === 'up' ? 'text-green-600' : 'text-red-600',
    down: trend?.direction === 'down' ? 'text-green-600' : 'text-red-600'
  };

  return (
    <div className={`${colorClasses[color]} border-2 rounded-lg p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trendColors[trend.direction]}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                {trend.direction === 'up' ? (
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                )}
              </svg>
              <span>{trend.value}% vs last hour</span>
            </div>
          )}
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}
```

### Conversation Feed Component

**Location:** `app/components/analytics/ConversationFeed.tsx`

```tsx
'use client';

import { formatDistanceToNow } from 'date-fns';

interface Message {
  type: string;
  data: {
    id: string;
    customer_phone: string;
    message: string;
    bot_response?: string;
    timestamp: string;
    status: 'active' | 'resolved' | 'escalated';
  };
}

interface ConversationFeedProps {
  messages: Message[];
}

export function ConversationFeed({ messages }: ConversationFeedProps) {
  const conversationMessages = messages.filter(m => m.type === 'new_message');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'resolved': return '✅';
      case 'escalated': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">💬 Recent Conversations</h2>
        <p className="text-sm text-gray-600 mt-1">Live feed of customer interactions</p>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {conversationMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No recent conversations</p>
            <p className="text-sm mt-1">Waiting for customer messages...</p>
          </div>
        ) : (
          conversationMessages.slice(-10).reverse().map((msg) => (
            <div key={msg.data.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getStatusIcon(msg.data.status)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {msg.data.customer_phone}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(msg.data.status)}`}>
                      {msg.data.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">Customer:</span> {msg.data.message}
                  </p>
                  {msg.data.bot_response && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Bot:</span> {msg.data.bot_response}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDistanceToNow(new Date(msg.data.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Metrics Collection

### Metrics Service

**Location:** `botflow-backend/src/services/metrics.service.ts`

```typescript
import { supabase } from '../config/supabase.js';
import { redis } from '../config/redis.js';

interface ConversationMetrics {
  conversation_id: string;
  bot_id: string;
  organization_id: string;
  response_time_ms: number;
  success: boolean;
  tokens_used: number;
  knowledge_base_hit: boolean;
}

export class MetricsService {
  /**
   * Record a single message metric
   */
  async recordMessageMetric(metric: ConversationMetrics): Promise<void> {
    try {
      // Update conversation metrics in real-time (Redis)
      await this.updateRealtimeMetrics(metric);

      // Queue for database persistence
      await this.queueForPersistence(metric);

      // Update rolling aggregates
      await this.updateRollingAggregates(metric);
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealtimeMetrics(metric: ConversationMetrics): Promise<void> {
    const key = `metrics:realtime:${metric.organization_id}`;
    const hour = new Date().toISOString().substring(0, 13); // 2024-01-16T10

    await redis.hincrby(key, 'total_messages', 1);
    await redis.hincrby(key, metric.success ? 'successful' : 'failed', 1);
    await redis.hincrby(key, 'total_tokens', metric.tokens_used);
    await redis.hincrby(`${key}:${hour}`, 'messages', 1);
    await redis.expire(key, 86400); // 24 hours
  }

  /**
   * Queue metric for database persistence
   */
  private async queueForPersistence(metric: ConversationMetrics): Promise<void> {
    // Add to BullMQ queue for async processing
    // This will be handled by a background worker
    // Implementation in Day 2
  }

  /**
   * Update rolling aggregate metrics
   */
  private async updateRollingAggregates(metric: ConversationMetrics): Promise<void> {
    const key = `metrics:rolling:${metric.bot_id}:1h`;

    // Store response times for percentile calculation
    await redis.zadd(
      `${key}:response_times`,
      metric.response_time_ms,
      `${Date.now()}_${Math.random()}`
    );

    // Clean old data (> 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    await redis.zremrangebyscore(`${key}:response_times`, '-inf', oneHourAgo);

    await redis.expire(`${key}:response_times`, 3600);
  }

  /**
   * Get real-time metrics for organization
   */
  async getRealtimeMetrics(organizationId: string): Promise<any> {
    const key = `metrics:realtime:${organizationId}`;
    const metrics = await redis.hgetall(key);

    return {
      total_messages: parseInt(metrics.total_messages || '0'),
      successful: parseInt(metrics.successful || '0'),
      failed: parseInt(metrics.failed || '0'),
      total_tokens: parseInt(metrics.total_tokens || '0'),
      success_rate: metrics.total_messages
        ? ((parseInt(metrics.successful || '0') / parseInt(metrics.total_messages)) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Get bot performance summary
   */
  async getBotPerformance(
    botId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_bot_performance_summary', {
        p_bot_id: botId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      });

    if (error) throw error;
    return data[0] || {};
  }

  /**
   * Calculate response time percentiles
   */
  async getResponseTimePercentiles(botId: string): Promise<any> {
    const key = `metrics:rolling:${botId}:1h:response_times`;
    const responseTimes = await redis.zrange(key, 0, -1);

    if (responseTimes.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const times = responseTimes.map(rt => parseInt(rt.split('_')[0])).sort((a, b) => a - b);

    return {
      p50: this.percentile(times, 0.50),
      p95: this.percentile(times, 0.95),
      p99: this.percentile(times, 0.99)
    };
  }

  private percentile(arr: number[], p: number): number {
    const index = Math.ceil(arr.length * p) - 1;
    return arr[index] || 0;
  }
}

export const metricsService = new MetricsService();
```

---

## Chart Library Setup

### Install Recharts

```bash
cd botflow-website
npm install recharts date-fns
```

### Response Time Chart

**Location:** `app/components/analytics/ResponseTimeChart.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ResponseTimeChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/analytics/response-times?period=24h');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Failed to fetch response time data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ChartSkeleton />;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ Response Time Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="p50" stroke="#3B82F6" name="p50 (median)" />
          <Line type="monotone" dataKey="p95" stroke="#EF4444" name="p95" />
          <Line type="monotone" dataKey="avg" stroke="#10B981" name="average" />
        </LineChart>
      </ResponsiveContainer>
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
```

### Message Volume Chart

**Location:** `app/components/analytics/MessageVolumeChart.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function MessageVolumeChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/message-volume?period=${period}`);
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Failed to fetch message volume data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ChartSkeleton />;
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
              className={`px-3 py-1 text-sm rounded-lg ${
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
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="inbound" fill="#3B82F6" name="Inbound" />
          <Bar dataKey="outbound" fill="#10B981" name="Outbound" />
        </BarChart>
      </ResponsiveContainer>
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
```

---

## WebSocket Integration

### WebSocket Hook

**Location:** `app/hooks/useWebSocket.ts`

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

interface UseWebSocketOptions {
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { onMessage, onConnect, onDisconnect, reconnectInterval = 5000 } = options;

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [url]);

  const connect = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NEXT_PUBLIC_WS_URL || 'localhost:3001';
      const wsUrl = `${protocol}//${host}${url}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        onDisconnect?.();

        // Attempt reconnection
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, reconnectInterval);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const send = (message: any) => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  return {
    connected,
    messages,
    send,
    disconnect
  };
}
```

### WebSocket Server Route

**Location:** `botflow-backend/src/routes/analytics-ws.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { metricsService } from '../services/metrics.service.js';

const analyticsWebSocketRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/stream', { websocket: true }, (connection, req) => {
    console.log('Client connected to analytics stream');

    // Authenticate connection
    const token = req.query.token as string;
    if (!token) {
      connection.socket.close(1008, 'Authentication required');
      return;
    }

    // TODO: Verify JWT token
    // For now, assume authenticated

    // Send initial metrics
    metricsService.getRealtimeMetrics('org_id').then(metrics => {
      connection.socket.send(JSON.stringify({
        type: 'metrics_update',
        data: metrics
      }));
    });

    // Set up interval for periodic updates
    const interval = setInterval(async () => {
      try {
        const metrics = await metricsService.getRealtimeMetrics('org_id');
        connection.socket.send(JSON.stringify({
          type: 'metrics_update',
          data: metrics
        }));
      } catch (error) {
        console.error('Failed to send metrics update:', error);
      }
    }, 5000); // Update every 5 seconds

    connection.socket.on('message', (message) => {
      console.log('Received message:', message.toString());
    });

    connection.socket.on('close', () => {
      console.log('Client disconnected from analytics stream');
      clearInterval(interval);
    });
  });
};

export default analyticsWebSocketRoutes;
```

---

## Day-by-Day Plan

### Day 1: Real-Time Dashboard Foundation ✅
- [x] Create database schema (3 new tables)
- [x] Set up helper functions
- [x] Build dashboard layout component
- [x] Create MetricCard component
- [x] Build ConversationFeed component
- [x] Test real-time updates

### Day 2: Metrics Collection
- [ ] Create MetricsService class
- [ ] Implement metric recording
- [ ] Set up Redis caching
- [ ] Create BullMQ workers for aggregation
- [ ] Add metrics to message queue
- [ ] Test metric persistence

### Day 3: Analytics Components
- [ ] Install Recharts library
- [ ] Build ResponseTimeChart
- [ ] Create MessageVolumeChart
- [ ] Add SuccessRateChart
- [ ] Build ConversationDurationChart
- [ ] Test chart rendering

### Day 4: WebSocket Integration
- [ ] Create useWebSocket hook
- [ ] Build WebSocket server route
- [ ] Implement authentication
- [ ] Set up room management
- [ ] Add broadcast functionality
- [ ] Test real-time updates

### Day 5: Filtering & Search
- [ ] Build date range picker
- [ ] Add conversation search
- [ ] Create filter UI
- [ ] Implement CSV export
- [ ] Add pagination
- [ ] Test filtering

### Day 6: Polish & Testing
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Mobile responsiveness
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Create PHASE2_WEEK5_COMPLETE.md

### Day 7: Buffer & Documentation
- [ ] Final bug fixes
- [ ] Documentation updates
- [ ] User guide creation
- [ ] Video tutorial (optional)

---

## Success Criteria

### Functional Requirements
- [ ] Real-time conversation list updates
- [ ] Live message feed with <500ms latency
- [ ] Charts render with real data
- [ ] Filters work correctly
- [ ] CSV export includes all data
- [ ] WebSocket reconnects automatically

### Performance Requirements
- [ ] Dashboard loads in <2 seconds
- [ ] Real-time updates have <500ms latency
- [ ] Charts render smoothly (60fps)
- [ ] Handle 1000+ conversations
- [ ] Support 100+ concurrent WebSocket connections

### UX Requirements
- [ ] Intuitive navigation
- [ ] Clear data visualization
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Error states are helpful

---

## Quick Start (For New Chat)

```
I'm ready to start Phase 2 Week 5: Dashboard & Analytics.

Context:
- Week 1 (RAG) ✅ COMPLETE
- Week 2 (Workflow Engine) ✅ COMPLETE
- Week 3 (Intelligent Bot Builder) ✅ COMPLETE
- Week 4 (Visual Builder) ✅ COMPLETE

Goal: Build real-time monitoring and analytics dashboard.

Read PHASE2_WEEK5_GUIDE.md and let's start with Day 1: Database schema and real-time dashboard foundation!
```

---

**Created:** 2026-01-16
**Status:** Ready to implement ⏳
**Prerequisites:** ✅ Week 1-4 complete
**Estimated Completion:** 5-7 days

---

> "From bot creation to bot optimization. Let's give users the insights they need!" 📊✨
