-- Test script for bot_templates table
-- Run these queries in Supabase SQL Editor to verify the table works

-- 1. Insert a test template
INSERT INTO bot_templates (
  name,
  vertical,
  tier,
  description,
  tagline,
  icon,
  required_fields,
  conversation_flow,
  example_prompts,
  integrations,
  is_published
)
VALUES (
  'Test Taxi Template',
  'taxi',
  1,
  'Book rides and get quotes',
  'Automate your taxi bookings',
  '🚕',
  '{"business_name": {"type": "text", "label": "Business Name", "required": true}}'::jsonb,
  '{"systemPrompt": "You are a taxi booking assistant", "welcomeMessage": "Welcome!"}'::jsonb,
  ARRAY['I need a ride', 'How much to the airport?'],
  ARRAY['maps', 'calendar'],
  true
);

-- 2. Query all templates
SELECT * FROM bot_templates;

-- 3. Query only published templates
SELECT id, name, vertical, tier, tagline
FROM bot_templates
WHERE is_published = true;

-- 4. Test indexes - query by vertical
SELECT * FROM bot_templates WHERE vertical = 'taxi';

-- 5. Test indexes - query by tier
SELECT * FROM bot_templates WHERE tier = 1;

-- 6. Verify updated_at trigger works
UPDATE bot_templates
SET description = 'Updated description for taxi bookings'
WHERE vertical = 'taxi';

-- Check if updated_at changed
SELECT name, created_at, updated_at
FROM bot_templates
WHERE vertical = 'taxi';

-- 7. Clean up test data (optional)
-- DELETE FROM bot_templates WHERE name = 'Test Taxi Template';
