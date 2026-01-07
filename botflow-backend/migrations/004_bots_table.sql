-- Bots Table Migration
-- Create table for storing user bots

CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_id TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('active', 'inactive', 'draft')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_template_id ON bots(template_id);
CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
CREATE INDEX IF NOT EXISTS idx_bots_created_at ON bots(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_bots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bots_updated_at
  BEFORE UPDATE ON bots
  FOR EACH ROW
  EXECUTE FUNCTION update_bots_updated_at();

-- Comments
COMMENT ON TABLE bots IS 'User-created WhatsApp bots';
COMMENT ON COLUMN bots.template_id IS 'Template used to create the bot (booking_bot, transport_bot, etc.)';
COMMENT ON COLUMN bots.config IS 'Bot configuration (welcome message, settings, etc.)';
COMMENT ON COLUMN bots.status IS 'Bot status (active, inactive, draft)';
