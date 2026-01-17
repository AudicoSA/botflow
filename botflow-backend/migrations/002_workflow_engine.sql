/**
 * Migration 002: Workflow Engine (Phase 2 Week 2 Day 5)
 *
 * This migration creates tables for the Dynamic Workflow Engine:
 * - workflow_versions: Stores Blueprint JSON and compiled n8n workflows
 * - workflow_credentials: Encrypted credentials for integrations
 *
 * Features:
 * - Version tracking with rollback capability
 * - Credential encryption at rest
 * - Audit logging (created_by, deployed_at)
 * - RLS policies for multi-tenancy
 */

-- ============================================================================
-- Table: workflow_versions
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- Workflow data
  blueprint JSONB NOT NULL,              -- Original Blueprint JSON
  n8n_workflow JSONB NOT NULL,           -- Compiled n8n workflow
  n8n_workflow_id VARCHAR(100),          -- n8n's internal workflow ID

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'failed')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES organization_members(id),
  deployed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Constraints
  CONSTRAINT workflow_versions_bot_version_unique UNIQUE(bot_id, version)
);

-- Indexes for performance
CREATE INDEX idx_workflow_versions_bot ON workflow_versions(bot_id);
CREATE INDEX idx_workflow_versions_status ON workflow_versions(status);
CREATE INDEX idx_workflow_versions_created_at ON workflow_versions(created_at DESC);

-- Comments
COMMENT ON TABLE workflow_versions IS 'Stores workflow versions with Blueprint and compiled n8n workflows';
COMMENT ON COLUMN workflow_versions.blueprint IS 'User-friendly Blueprint JSON (input)';
COMMENT ON COLUMN workflow_versions.n8n_workflow IS 'Compiled n8n workflow JSON (output)';
COMMENT ON COLUMN workflow_versions.status IS 'draft: not deployed, active: running in n8n, archived: replaced, failed: deployment error';

-- ============================================================================
-- Table: workflow_credentials
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Service identification
  service VARCHAR(50) NOT NULL,          -- 'shopify', 'paystack', 'whatsapp', etc.
  name VARCHAR(100) NOT NULL,            -- User-friendly name

  -- Encrypted credentials
  credentials_encrypted TEXT NOT NULL,   -- AES-256 encrypted JSON

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT workflow_credentials_bot_service_unique UNIQUE(bot_id, service)
);

-- Indexes
CREATE INDEX idx_workflow_credentials_bot ON workflow_credentials(bot_id);
CREATE INDEX idx_workflow_credentials_org ON workflow_credentials(organization_id);
CREATE INDEX idx_workflow_credentials_service ON workflow_credentials(service);

-- Comments
COMMENT ON TABLE workflow_credentials IS 'Encrypted credentials for workflow integrations';
COMMENT ON COLUMN workflow_credentials.credentials_encrypted IS 'AES-256 encrypted JSON containing API keys, tokens, etc.';

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_credentials ENABLE ROW LEVEL SECURITY;

-- workflow_versions policies
CREATE POLICY workflow_versions_select_policy ON workflow_versions
  FOR SELECT
  USING (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN whatsapp_accounts wa ON b.whatsapp_account_id = wa.id
      WHERE wa.organization_id = (SELECT auth.uid()::uuid)
    )
  );

CREATE POLICY workflow_versions_insert_policy ON workflow_versions
  FOR INSERT
  WITH CHECK (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN whatsapp_accounts wa ON b.whatsapp_account_id = wa.id
      WHERE wa.organization_id = (SELECT auth.uid()::uuid)
    )
  );

CREATE POLICY workflow_versions_update_policy ON workflow_versions
  FOR UPDATE
  USING (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN whatsapp_accounts wa ON b.whatsapp_account_id = wa.id
      WHERE wa.organization_id = (SELECT auth.uid()::uuid)
    )
  );

CREATE POLICY workflow_versions_delete_policy ON workflow_versions
  FOR DELETE
  USING (
    bot_id IN (
      SELECT b.id FROM bots b
      JOIN whatsapp_accounts wa ON b.whatsapp_account_id = wa.id
      WHERE wa.organization_id = (SELECT auth.uid()::uuid)
    )
  );

-- workflow_credentials policies
CREATE POLICY workflow_credentials_select_policy ON workflow_credentials
  FOR SELECT
  USING (organization_id = (SELECT auth.uid()::uuid));

CREATE POLICY workflow_credentials_insert_policy ON workflow_credentials
  FOR INSERT
  WITH CHECK (organization_id = (SELECT auth.uid()::uuid));

CREATE POLICY workflow_credentials_update_policy ON workflow_credentials
  FOR UPDATE
  USING (organization_id = (SELECT auth.uid()::uuid));

CREATE POLICY workflow_credentials_delete_policy ON workflow_credentials
  FOR DELETE
  USING (organization_id = (SELECT auth.uid()::uuid));

-- ============================================================================
-- Functions
-- ============================================================================

/**
 * Get the latest version number for a bot
 */
CREATE OR REPLACE FUNCTION get_latest_workflow_version(p_bot_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_latest_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0)
  INTO v_latest_version
  FROM workflow_versions
  WHERE bot_id = p_bot_id;

  RETURN v_latest_version;
END;
$$;

/**
 * Get the active workflow version for a bot
 */
CREATE OR REPLACE FUNCTION get_active_workflow_version(p_bot_id UUID)
RETURNS workflow_versions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_version workflow_versions;
BEGIN
  SELECT *
  INTO v_active_version
  FROM workflow_versions
  WHERE bot_id = p_bot_id
    AND status = 'active'
  ORDER BY version DESC
  LIMIT 1;

  RETURN v_active_version;
END;
$$;

/**
 * Activate a workflow version (and deactivate others)
 */
CREATE OR REPLACE FUNCTION activate_workflow_version(
  p_bot_id UUID,
  p_version INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deactivate all other versions
  UPDATE workflow_versions
  SET status = 'archived'
  WHERE bot_id = p_bot_id
    AND status = 'active';

  -- Activate the specified version
  UPDATE workflow_versions
  SET status = 'active',
      deployed_at = NOW()
  WHERE bot_id = p_bot_id
    AND version = p_version;

  RETURN FOUND;
END;
$$;

/**
 * Get workflow statistics for a bot
 */
CREATE OR REPLACE FUNCTION get_workflow_stats(p_bot_id UUID)
RETURNS TABLE (
  total_versions INTEGER,
  active_version INTEGER,
  latest_version INTEGER,
  total_deployments BIGINT,
  last_deployed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_versions,
    MAX(CASE WHEN status = 'active' THEN version ELSE NULL END)::INTEGER AS active_version,
    MAX(version)::INTEGER AS latest_version,
    COUNT(CASE WHEN deployed_at IS NOT NULL THEN 1 END) AS total_deployments,
    MAX(deployed_at) AS last_deployed_at
  FROM workflow_versions
  WHERE bot_id = p_bot_id;
END;
$$;

-- ============================================================================
-- Triggers
-- ============================================================================

/**
 * Update updated_at timestamp on workflow_credentials
 */
CREATE OR REPLACE FUNCTION update_workflow_credentials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workflow_credentials_updated_at_trigger
  BEFORE UPDATE ON workflow_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_credentials_updated_at();

-- ============================================================================
-- Grants (for authenticated users)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_credentials TO authenticated;

GRANT EXECUTE ON FUNCTION get_latest_workflow_version TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_workflow_version TO authenticated;
GRANT EXECUTE ON FUNCTION activate_workflow_version TO authenticated;
GRANT EXECUTE ON FUNCTION get_workflow_stats TO authenticated;

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- NOTE: This is commented out in production
-- Uncomment for local testing

/*
-- Insert a sample workflow version
INSERT INTO workflow_versions (bot_id, version, blueprint, n8n_workflow, status, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID, -- Replace with actual bot_id
  1,
  '{"bot_id": "test", "version": "1.0.0", "nodes": [], "edges": []}'::JSONB,
  '{"name": "Test Workflow", "nodes": [], "connections": {}}'::JSONB,
  'draft',
  '00000000-0000-0000-0000-000000000001'::UUID -- Replace with actual user_id
);
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Migration 002: Workflow Engine tables created successfully';
