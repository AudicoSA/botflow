-- Migration: Add Meta WhatsApp support to whatsapp_accounts
-- Phase 4: Launch Readiness

-- Add provider column to distinguish between Bird, Twilio, and Meta
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'bird';

-- Add Meta-specific columns
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_waba_id TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_access_token TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMPTZ;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS meta_business_id TEXT;

-- Add index for quick lookup by phone_number_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_meta_phone_number_id
ON whatsapp_accounts(meta_phone_number_id)
WHERE meta_phone_number_id IS NOT NULL;

-- Add index for provider filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_provider
ON whatsapp_accounts(provider);

-- Update existing records to have 'bird' provider if they have bird_channel_id
UPDATE whatsapp_accounts
SET provider = 'bird'
WHERE bird_channel_id IS NOT NULL AND provider IS NULL;

-- Comment explaining the provider values
COMMENT ON COLUMN whatsapp_accounts.provider IS 'WhatsApp provider: bird, twilio, or meta';
COMMENT ON COLUMN whatsapp_accounts.meta_phone_number_id IS 'Meta Cloud API Phone Number ID';
COMMENT ON COLUMN whatsapp_accounts.meta_waba_id IS 'Meta WhatsApp Business Account ID';
COMMENT ON COLUMN whatsapp_accounts.meta_access_token IS 'Encrypted Meta access token for API calls';
COMMENT ON COLUMN whatsapp_accounts.meta_token_expires_at IS 'Token expiration timestamp (if applicable)';
COMMENT ON COLUMN whatsapp_accounts.meta_business_id IS 'Meta Business Portfolio ID';
