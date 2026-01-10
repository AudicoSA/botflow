-- Migration 007: Add Twilio support to whatsapp_accounts

-- Start transaction
BEGIN;

-- 1. Add provider column (default to 'bird' for existing rows if any, or 'meta')
ALTER TABLE whatsapp_accounts
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'bird' CHECK (provider IN ('meta', 'bird', 'twilio'));

-- 2. Add Twilio specific columns
ALTER TABLE whatsapp_accounts
ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT, -- In production this should be encrypted
ADD COLUMN IF NOT EXISTS twilio_phone_number_sid TEXT; -- Optional, might not be needed if we use Account SID

-- 3. Update existing rows to have provider='bird' (just in case)
UPDATE whatsapp_accounts SET provider = 'bird' WHERE provider IS NULL;

COMMIT;
