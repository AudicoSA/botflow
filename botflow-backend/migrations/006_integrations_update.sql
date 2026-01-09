-- Migration 006: Update integrations table for Phase 2 (n8n syncing)

-- 1. Add n8n_credential_id to integrations
ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS n8n_credential_id TEXT;

-- 2. Add status column (more descriptive than is_active)
ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'connected', 'error'));

-- 3. Add helper comment
COMMENT ON COLUMN integrations.n8n_credential_id IS 'The ID of the credential created in the n8n instance';
