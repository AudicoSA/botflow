-- Migration 013: Add actions configuration to bot_integrations
-- This adds support for configuring which actions an integration can perform
-- and what keywords should trigger those actions

-- Add actions configuration to bot_integrations
ALTER TABLE bot_integrations
ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb;

-- Add index for actions
CREATE INDEX IF NOT EXISTS idx_bot_integrations_actions
ON bot_integrations USING GIN (actions);

-- Add comment
COMMENT ON COLUMN bot_integrations.actions IS 'Configured actions for this integration with trigger keywords';

-- Example actions structure:
-- [
--   {
--     "id": "create_payment",
--     "name": "Create Payment Link",
--     "description": "Generate a PayFast payment link",
--     "trigger_keywords": ["pay", "payment", "checkout"],
--     "is_enabled": true,
--     "configuration": {}
--   }
-- ]
