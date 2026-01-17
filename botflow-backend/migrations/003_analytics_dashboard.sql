-- Migration 003: Analytics Dashboard & Metrics
-- Phase 2 Week 5: Real-time monitoring and analytics
-- Created: 2026-01-17

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Table 1: conversation_metrics
-- Stores detailed metrics per conversation
-- ========================================

CREATE TABLE IF NOT EXISTS conversation_metrics (
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

-- Indexes for conversation_metrics
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_conversation ON conversation_metrics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_bot ON conversation_metrics(bot_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_org ON conversation_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_started_at ON conversation_metrics(started_at);
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_status ON conversation_metrics(resolution_status);

-- RLS for conversation_metrics
ALTER TABLE conversation_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's conversation metrics" ON conversation_metrics;
CREATE POLICY "Users can view their org's conversation metrics"
  ON conversation_metrics FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert their org's conversation metrics" ON conversation_metrics;
CREATE POLICY "Users can insert their org's conversation metrics"
  ON conversation_metrics FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update their org's conversation metrics" ON conversation_metrics;
CREATE POLICY "Users can update their org's conversation metrics"
  ON conversation_metrics FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- ========================================
-- Table 2: bot_performance_metrics
-- Aggregated daily metrics per bot
-- ========================================

CREATE TABLE IF NOT EXISTS bot_performance_metrics (
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

-- Indexes for bot_performance_metrics
CREATE INDEX IF NOT EXISTS idx_bot_perf_metrics_bot ON bot_performance_metrics(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_perf_metrics_org ON bot_performance_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_bot_perf_metrics_date ON bot_performance_metrics(date);

-- RLS for bot_performance_metrics
ALTER TABLE bot_performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's bot performance metrics" ON bot_performance_metrics;
CREATE POLICY "Users can view their org's bot performance metrics"
  ON bot_performance_metrics FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role can manage bot performance metrics" ON bot_performance_metrics;
CREATE POLICY "Service role can manage bot performance metrics"
  ON bot_performance_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- Table 3: usage_analytics
-- High-level usage analytics aggregated by hour
-- ========================================

CREATE TABLE IF NOT EXISTS usage_analytics (
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

-- Indexes for usage_analytics
CREATE INDEX IF NOT EXISTS idx_usage_analytics_org ON usage_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_hour ON usage_analytics(hour);

-- RLS for usage_analytics
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's usage analytics" ON usage_analytics;
CREATE POLICY "Users can view their org's usage analytics"
  ON usage_analytics FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role can manage usage analytics" ON usage_analytics;
CREATE POLICY "Service role can manage usage analytics"
  ON usage_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- Helper Function 1: Calculate Response Time Percentiles
-- ========================================

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

-- ========================================
-- Helper Function 2: Get Bot Performance Summary
-- ========================================

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
    COALESCE(SUM(bpm.total_conversations), 0)::BIGINT,
    COALESCE(SUM(bpm.total_messages), 0)::BIGINT,
    COALESCE(AVG(bpm.avg_response_time_ms), 0)::INTEGER,
    COALESCE(AVG(bpm.success_rate), 0),
    COALESCE(SUM(bpm.total_cost_usd), 0)
  FROM bot_performance_metrics bpm
  WHERE bpm.bot_id = p_bot_id
    AND bpm.date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Helper Function 3: Get Organization Analytics Summary
-- ========================================

CREATE OR REPLACE FUNCTION get_organization_analytics_summary(
  p_organization_id UUID,
  p_start_hour TIMESTAMPTZ,
  p_end_hour TIMESTAMPTZ
)
RETURNS TABLE (
  total_messages_sent BIGINT,
  total_messages_received BIGINT,
  total_conversations_started BIGINT,
  total_api_calls BIGINT,
  total_tokens_used BIGINT,
  total_cost_usd DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ua.messages_sent), 0)::BIGINT,
    COALESCE(SUM(ua.messages_received), 0)::BIGINT,
    COALESCE(SUM(ua.conversations_started), 0)::BIGINT,
    COALESCE(SUM(ua.api_calls_made), 0)::BIGINT,
    COALESCE(SUM(ua.tokens_used), 0)::BIGINT,
    COALESCE(SUM(ua.estimated_cost_usd), 0)
  FROM usage_analytics ua
  WHERE ua.organization_id = p_organization_id
    AND ua.hour BETWEEN p_start_hour AND p_end_hour;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Helper Function 4: Update Conversation Metrics
-- Automatically calculates and updates metrics for a conversation
-- ========================================

CREATE OR REPLACE FUNCTION update_conversation_metrics(
  p_conversation_id UUID
)
RETURNS void AS $$
DECLARE
  v_bot_id UUID;
  v_organization_id UUID;
  v_started_at TIMESTAMPTZ;
  v_ended_at TIMESTAMPTZ;
  v_total_messages INTEGER;
  v_user_messages INTEGER;
  v_bot_messages INTEGER;
  v_avg_response_time INTEGER;
  v_percentiles RECORD;
BEGIN
  -- Get conversation details
  SELECT bot_id, c.organization_id, c.created_at
  INTO v_bot_id, v_organization_id, v_started_at
  FROM conversations c
  WHERE c.id = p_conversation_id;

  -- Count messages
  SELECT COUNT(*),
         COUNT(CASE WHEN direction = 'inbound' THEN 1 END),
         COUNT(CASE WHEN direction = 'outbound' THEN 1 END),
         AVG(response_time_ms)::INTEGER
  INTO v_total_messages, v_user_messages, v_bot_messages, v_avg_response_time
  FROM messages
  WHERE conversation_id = p_conversation_id;

  -- Get response time percentiles
  SELECT * INTO v_percentiles
  FROM calculate_response_time_percentiles(p_conversation_id);

  -- Get latest message time as ended_at
  SELECT MAX(created_at) INTO v_ended_at
  FROM messages
  WHERE conversation_id = p_conversation_id;

  -- Insert or update conversation metrics
  INSERT INTO conversation_metrics (
    conversation_id,
    bot_id,
    organization_id,
    started_at,
    ended_at,
    duration_seconds,
    total_messages,
    user_messages,
    bot_messages,
    avg_response_time_ms,
    p50_response_time_ms,
    p95_response_time_ms,
    p99_response_time_ms
  ) VALUES (
    p_conversation_id,
    v_bot_id,
    v_organization_id,
    v_started_at,
    v_ended_at,
    EXTRACT(EPOCH FROM (v_ended_at - v_started_at))::INTEGER,
    v_total_messages,
    v_user_messages,
    v_bot_messages,
    v_avg_response_time,
    v_percentiles.p50,
    v_percentiles.p95,
    v_percentiles.p99
  )
  ON CONFLICT (conversation_id)
  DO UPDATE SET
    ended_at = EXCLUDED.ended_at,
    duration_seconds = EXCLUDED.duration_seconds,
    total_messages = EXCLUDED.total_messages,
    user_messages = EXCLUDED.user_messages,
    bot_messages = EXCLUDED.bot_messages,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    p50_response_time_ms = EXCLUDED.p50_response_time_ms,
    p95_response_time_ms = EXCLUDED.p95_response_time_ms,
    p99_response_time_ms = EXCLUDED.p99_response_time_ms,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Add response_time_ms column to messages table if it doesn't exist
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'response_time_ms'
  ) THEN
    ALTER TABLE messages ADD COLUMN response_time_ms INTEGER;
    CREATE INDEX idx_messages_response_time ON messages(response_time_ms);
  END IF;
END $$;

-- ========================================
-- Migration Complete
-- ========================================

COMMENT ON TABLE conversation_metrics IS 'Phase 2 Week 5: Detailed metrics per conversation for analytics';
COMMENT ON TABLE bot_performance_metrics IS 'Phase 2 Week 5: Daily aggregated metrics per bot';
COMMENT ON TABLE usage_analytics IS 'Phase 2 Week 5: Hourly organization-wide usage analytics';
