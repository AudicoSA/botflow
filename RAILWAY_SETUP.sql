-- SQL script to manually set up Kenny's account in Supabase
-- Run this in the Supabase SQL Editor at: https://supabase.com/dashboard

-- Step 1: Find Kenny's user ID
-- (You'll need to replace <USER_ID> below with the actual UUID from auth.users)
SELECT id, email FROM auth.users WHERE email = 'kenny@audico.co.za';
-- Copy the user ID from the result

-- Step 2: Check if organization exists
SELECT * FROM organizations WHERE id = 'd6c7bc1b-9c84-406a-a18d-1106a25ddf6f';

-- If not exists, create it:
INSERT INTO organizations (id, name, slug, plan, created_at, updated_at)
VALUES (
    'd6c7bc1b-9c84-406a-a18d-1106a25ddf6f',
    'Kenny Organization',
    'kenny-org',
    'starter',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Check if organization membership exists
-- Replace <USER_ID> with the ID from Step 1
SELECT * FROM organization_members
WHERE user_id = 'dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6'
AND organization_id = 'd6c7bc1b-9c84-406a-a18d-1106a25ddf6f';

-- If not exists, create it:
INSERT INTO organization_members (organization_id, user_id, role, created_at, updated_at)
VALUES (
    'd6c7bc1b-9c84-406a-a18d-1106a25ddf6f',
    'dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6',
    'owner',
    NOW(),
    NOW()
)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner';

-- Step 4: Check if WhatsApp account exists
SELECT * FROM whatsapp_accounts
WHERE organization_id = 'd6c7bc1b-9c84-406a-a18d-1106a25ddf6f';

-- If not exists, create it:
INSERT INTO whatsapp_accounts (
    id,
    organization_id,
    phone_number,
    display_name,
    status,
    provider,
    created_at,
    updated_at
)
VALUES (
    '213f8716-852b-4cac-8d5b-f06c54c33dc6',
    'd6c7bc1b-9c84-406a-a18d-1106a25ddf6f',
    '+15551234567',
    'Kenny WhatsApp Business',
    'active',
    'twilio',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    status = 'active',
    provider = 'twilio',
    updated_at = NOW();

-- Step 5: Verify the setup (same query as login endpoint uses)
SELECT wa.* FROM whatsapp_accounts wa
JOIN organization_members om ON om.organization_id = wa.organization_id
WHERE om.user_id = 'dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6'
AND wa.status = 'active'
LIMIT 1;

-- Expected result: Should return 1 row with the WhatsApp account details
