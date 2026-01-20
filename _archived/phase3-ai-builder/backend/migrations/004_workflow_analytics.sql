-- Phase 3 Week 4: Workflow Analytics & Pattern Learning Migration
-- Creates tables for tracking workflow success and learning patterns

-- ============================================================================
-- Workflow Success Logs Table
-- ============================================================================
-- Tracks successful workflow deployments and their performance over time

CREATE TABLE IF NOT EXISTS workflow_success_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Intent that led to this workflow
  intent_signature TEXT NOT NULL,
  workflow_type TEXT,

  -- Workflow structure for pattern matching
  node_types TEXT[] DEFAULT '{}',
  node_sequence TEXT[] DEFAULT '{}',
  integrations_used TEXT[] DEFAULT '{}',
  node_count INTEGER DEFAULT 0,

  -- Original user message that created the workflow
  original_message TEXT,

  -- Success metrics (updated over time)
  messages_handled INTEGER DEFAULT 0,
  successful_completions INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  average_response_time_ms INTEGER,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'ai_agent', -- 'ai_agent', 'template', 'manual'
  template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast pattern lookup
CREATE INDEX IF NOT EXISTS idx_success_logs_intent ON workflow_success_logs(intent_signature);
CREATE INDEX IF NOT EXISTS idx_success_logs_type ON workflow_success_logs(workflow_type);
CREATE INDEX IF NOT EXISTS idx_success_logs_bot ON workflow_success_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_success_logs_org ON workflow_success_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_success_logs_node_types ON workflow_success_logs USING GIN(node_types);
CREATE INDEX IF NOT EXISTS idx_success_logs_integrations ON workflow_success_logs USING GIN(integrations_used);
CREATE INDEX IF NOT EXISTS idx_success_logs_active ON workflow_success_logs(is_active);
CREATE INDEX IF NOT EXISTS idx_success_logs_created ON workflow_success_logs(created_at DESC);

-- ============================================================================
-- Workflow Patterns View
-- ============================================================================
-- Materialized view for common patterns extracted from successful workflows

CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_patterns AS
SELECT
  intent_signature,
  workflow_type,
  node_types,
  node_sequence,
  integrations_used,
  COUNT(*) as usage_count,
  AVG(user_rating) as avg_rating,
  SUM(successful_completions)::FLOAT / NULLIF(SUM(messages_handled), 0) * 100 as success_rate,
  AVG(average_response_time_ms) as avg_response_time_ms,
  MAX(created_at) as last_used,
  MIN(created_at) as first_used
FROM workflow_success_logs
WHERE is_active = true
GROUP BY intent_signature, workflow_type, node_types, node_sequence, integrations_used
HAVING COUNT(*) >= 2;

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_patterns_pk ON workflow_patterns(intent_signature, workflow_type, node_types, node_sequence, integrations_used);
CREATE INDEX IF NOT EXISTS idx_workflow_patterns_usage ON workflow_patterns(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_patterns_success ON workflow_patterns(success_rate DESC);

-- ============================================================================
-- Workflow Error Logs Table
-- ============================================================================
-- Tracks errors in workflow generation and execution for learning

CREATE TABLE IF NOT EXISTS workflow_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT,
  bot_id TEXT REFERENCES bots(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  session_id TEXT,

  -- Error details
  error_type TEXT NOT NULL, -- 'validation', 'generation', 'execution', 'integration'
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_context JSONB DEFAULT '{}',

  -- Related workflow state
  workflow_state JSONB, -- Snapshot of workflow when error occurred
  intent_signature TEXT,

  -- Resolution tracking
  was_auto_fixed BOOLEAN DEFAULT false,
  auto_fix_applied TEXT,
  was_manually_resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error analysis
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON workflow_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_code ON workflow_error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_bot ON workflow_error_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON workflow_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_auto_fixed ON workflow_error_logs(was_auto_fixed);

-- ============================================================================
-- Performance Cache Table
-- ============================================================================
-- Caches computed values for performance optimization

CREATE TABLE IF NOT EXISTS ai_agent_cache (
  cache_key TEXT PRIMARY KEY,
  cache_value JSONB NOT NULL,
  cache_type TEXT NOT NULL, -- 'intent', 'template_match', 'pattern'
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_cache_expires ON ai_agent_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_type ON ai_agent_cache(cache_type);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE workflow_success_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_cache ENABLE ROW LEVEL SECURITY;

-- Success logs: Users can view/modify their organization's logs
CREATE POLICY "Users can view own success logs"
  ON workflow_success_logs FOR SELECT
  USING (organization_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "Users can insert own success logs"
  ON workflow_success_logs FOR INSERT
  WITH CHECK (organization_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "Users can update own success logs"
  ON workflow_success_logs FOR UPDATE
  USING (organization_id = auth.uid() OR auth.uid() IS NULL);

-- Error logs: Similar access control
CREATE POLICY "Users can view own error logs"
  ON workflow_error_logs FOR SELECT
  USING (organization_id = auth.uid() OR organization_id IS NULL);

CREATE POLICY "Users can insert own error logs"
  ON workflow_error_logs FOR INSERT
  WITH CHECK (organization_id = auth.uid() OR organization_id IS NULL);

-- Cache: Accessible by the system
CREATE POLICY "Cache accessible by authenticated users"
  ON ai_agent_cache FOR ALL
  USING (true);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update timestamp trigger for success logs
CREATE OR REPLACE FUNCTION update_success_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER success_logs_updated_at
  BEFORE UPDATE ON workflow_success_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_success_logs_updated_at();

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to refresh the workflow patterns view
CREATE OR REPLACE FUNCTION refresh_workflow_patterns()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_patterns;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_agent_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to record a successful workflow deployment
CREATE OR REPLACE FUNCTION record_workflow_success(
  p_workflow_id TEXT,
  p_bot_id TEXT,
  p_organization_id UUID,
  p_intent_signature TEXT,
  p_workflow_type TEXT,
  p_node_types TEXT[],
  p_node_sequence TEXT[],
  p_integrations TEXT[],
  p_original_message TEXT,
  p_source TEXT DEFAULT 'ai_agent',
  p_template_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO workflow_success_logs (
    workflow_id,
    bot_id,
    organization_id,
    intent_signature,
    workflow_type,
    node_types,
    node_sequence,
    integrations_used,
    node_count,
    original_message,
    source,
    template_id
  )
  VALUES (
    p_workflow_id,
    p_bot_id,
    p_organization_id,
    p_intent_signature,
    p_workflow_type,
    p_node_types,
    p_node_sequence,
    p_integrations,
    array_length(p_node_types, 1),
    p_original_message,
    p_source,
    p_template_id
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update success metrics
CREATE OR REPLACE FUNCTION update_success_metrics(
  p_success_log_id UUID,
  p_messages_handled INTEGER DEFAULT 0,
  p_successful_completions INTEGER DEFAULT 0,
  p_error_count INTEGER DEFAULT 0,
  p_avg_response_time_ms INTEGER DEFAULT NULL,
  p_user_rating INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE workflow_success_logs
  SET
    messages_handled = messages_handled + p_messages_handled,
    successful_completions = successful_completions + p_successful_completions,
    error_count = error_count + p_error_count,
    average_response_time_ms = COALESCE(p_avg_response_time_ms, average_response_time_ms),
    user_rating = COALESCE(p_user_rating, user_rating),
    updated_at = NOW()
  WHERE id = p_success_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE workflow_success_logs IS 'Tracks successful workflow deployments and their performance for pattern learning';
COMMENT ON TABLE workflow_error_logs IS 'Logs errors in workflow generation and execution for learning and debugging';
COMMENT ON TABLE ai_agent_cache IS 'Performance cache for intent parsing, template matching, and patterns';
COMMENT ON MATERIALIZED VIEW workflow_patterns IS 'Aggregated view of successful workflow patterns for AI suggestions';

COMMENT ON COLUMN workflow_success_logs.intent_signature IS 'Normalized signature of the user intent that created this workflow';
COMMENT ON COLUMN workflow_success_logs.node_sequence IS 'Ordered list of node types in the workflow';
COMMENT ON COLUMN workflow_success_logs.source IS 'How the workflow was created: ai_agent, template, or manual';

COMMENT ON FUNCTION refresh_workflow_patterns() IS 'Refreshes the workflow_patterns materialized view - call periodically';
COMMENT ON FUNCTION cleanup_expired_cache() IS 'Removes expired entries from the ai_agent_cache table';
