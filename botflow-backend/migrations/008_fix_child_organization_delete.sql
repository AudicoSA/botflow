-- Migration: Fix child organization delete
-- Description: Updates the bots table foreign key to cascade deletion when an organization is deleted.

-- 1. Drop the existing foreign key constraint
ALTER TABLE bots
DROP CONSTRAINT IF EXISTS bots_organization_id_fkey;

-- 2. Add the constraint back with ON DELETE CASCADE
ALTER TABLE bots
ADD CONSTRAINT bots_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- 3. Verify other potential blocking constraints (optional but good practice)
-- Whatsapp accounts also reference organizations
ALTER TABLE whatsapp_accounts
DROP CONSTRAINT IF EXISTS whatsapp_accounts_organization_id_fkey;

ALTER TABLE whatsapp_accounts
ADD CONSTRAINT whatsapp_accounts_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- Conversations also reference organizations
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_organization_id_fkey;

ALTER TABLE conversations
ADD CONSTRAINT conversations_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;
