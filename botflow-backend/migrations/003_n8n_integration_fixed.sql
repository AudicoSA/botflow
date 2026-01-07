-- n8n Integration Database Schema (Fixed)
-- This version handles existing tables properly

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS user_integrations CASCADE;
DROP TABLE IF EXISTS bot_workflows CASCADE;

-- Store n8n workflow references for each bot
CREATE TABLE bot_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL,
  n8n_workflow_id TEXT NOT NULL,
  n8n_webhook_path TEXT NOT NULL,
  n8n_webhook_url TEXT NOT NULL,
  workflow_config JSONB,
  template_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store user integration credentials (references to n8n credentials)
CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  integration_name TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  n8n_credential_id TEXT NOT NULL,
  credential_metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, integration_name)
);

-- Track workflow executions for analytics
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES bot_workflows(id) ON DELETE CASCADE,
  n8n_execution_id TEXT,
  input_data JSONB,
  output_data JSONB,
  status TEXT CHECK (status IN ('success', 'error', 'running', 'waiting')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_bot_workflows_bot_id ON bot_workflows(bot_id);
CREATE INDEX idx_bot_workflows_n8n_workflow_id ON bot_workflows(n8n_workflow_id);
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_created_at ON workflow_executions(created_at DESC);

-- Add updated_at trigger for bot_workflows
CREATE OR REPLACE FUNCTION update_bot_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bot_workflows_updated_at
  BEFORE UPDATE ON bot_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_workflows_updated_at();

-- Add updated_at trigger for user_integrations
CREATE OR REPLACE FUNCTION update_user_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_integrations_updated_at();

-- Comments for documentation
COMMENT ON TABLE bot_workflows IS 'Stores references to n8n workflows for each bot';
COMMENT ON TABLE user_integrations IS 'Stores user integration credentials (references to n8n credentials)';
COMMENT ON TABLE workflow_executions IS 'Tracks workflow execution history for analytics';

COMMENT ON COLUMN bot_workflows.n8n_workflow_id IS 'ID of the workflow in n8n';
COMMENT ON COLUMN bot_workflows.n8n_webhook_path IS 'Webhook path for triggering the workflow';
COMMENT ON COLUMN bot_workflows.workflow_config IS 'Original template configuration used to generate the workflow';
COMMENT ON COLUMN user_integrations.n8n_credential_id IS 'ID of the credential stored in n8n';
COMMENT ON COLUMN user_integrations.credential_metadata IS 'Display metadata (email, name, etc.) for UI';
