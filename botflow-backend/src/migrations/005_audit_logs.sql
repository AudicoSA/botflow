-- Phase 3 Week 5: Audit Logs Migration
-- Creates table for AI agent audit logging

-- ============================================================================
-- Audit Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_agent_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User context
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bot_id TEXT REFERENCES bots(id) ON DELETE SET NULL,
  session_id UUID,

  -- Action details
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',

  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  duration_ms INTEGER,

  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_timestamp
  ON ai_agent_audit_logs(organization_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp
  ON ai_agent_audit_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON ai_agent_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_bot
  ON ai_agent_audit_logs(bot_id) WHERE bot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_errors
  ON ai_agent_audit_logs(organization_id, timestamp DESC)
  WHERE success = false;

-- Partial index for recent logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent
  ON ai_agent_audit_logs(timestamp DESC)
  WHERE timestamp > NOW() - INTERVAL '7 days';

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE ai_agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their organization's logs
CREATE POLICY "Users can view own org audit logs"
  ON ai_agent_audit_logs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Only service role can insert
CREATE POLICY "Service can insert audit logs"
  ON ai_agent_audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Cleanup Function
-- ============================================================================

-- Automatically delete logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_agent_audit_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE ai_agent_audit_logs IS 'Audit trail for AI agent actions';
COMMENT ON COLUMN ai_agent_audit_logs.action IS 'Action type: chat, generate, deploy, etc.';
COMMENT ON COLUMN ai_agent_audit_logs.resource IS 'Resource type: session, workflow, template';
COMMENT ON COLUMN ai_agent_audit_logs.details IS 'Additional action-specific details (no PII)';
