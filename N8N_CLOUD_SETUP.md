# n8n Cloud Setup - Complete! ✅

## What You Have

✅ **n8n Cloud Instance**: https://botflowsa.app.n8n.cloud  
✅ **Access Token**: Configured in BotFlow backend  
✅ **Account**: admin@botflow.co.za

---

## Next Steps

### 1. Run Database Migration (2 minutes)

1. **Open Supabase SQL Editor**:  
   https://supabase.com/dashboard/project/ajtnixmnfuqtrgrakxss/sql

2. **Copy and run this SQL**:

```sql
-- n8n Integration Database Schema
-- Add tables to support n8n workflow management

-- Store n8n workflow references for each bot
CREATE TABLE IF NOT EXISTS bot_workflows (
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
CREATE TABLE IF NOT EXISTS user_integrations (
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
CREATE TABLE IF NOT EXISTS workflow_executions (
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
CREATE INDEX IF NOT EXISTS idx_bot_workflows_bot_id ON bot_workflows(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_workflows_n8n_workflow_id ON bot_workflows(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at DESC);

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
```

3. **Click "Run"**  
4. **Verify**: You should see "Success. No rows returned"

---

### 2. Test Backend Connection (1 minute)

Restart your backend to test the n8n connection:

```bash
# Stop the current backend (Ctrl+C in the terminal)
# Then restart:
cd botflow-backend
npm run dev
```

**Look for**: `✅ n8n connection test: OK` in the logs

---

## What's Configured

Your `botflow-backend/.env` now has:

```env
N8N_API_URL=https://botflowsa.app.n8n.cloud/api/v1
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
N8N_WEBHOOK_URL=https://botflowsa.app.n8n.cloud/webhook
```

---

## Why n8n Cloud is Better

✅ **Fully managed** - No server maintenance  
✅ **Always online** - No downtime  
✅ **Auto-updates** - Latest features automatically  
✅ **Public webhooks** - Works with WhatsApp immediately  
✅ **Free tier** - Perfect for development

---

## Next: Create Your First Bot!

Once the migration is done and backend is connected, we'll:

1. ✅ Create booking bot UI in dashboard
2. ✅ Generate first n8n workflow
3. ✅ Test with WhatsApp messages
4. ✅ See it all working end-to-end!

**You're almost there!** 🚀
