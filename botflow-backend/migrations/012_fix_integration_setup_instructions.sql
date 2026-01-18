-- Migration: Fix setup_instructions to include required_fields for all integrations
-- Created: 2026-01-18
-- Description: Add required_fields array to setup_instructions for integrations with credential validators
-- This is needed for the EnableIntegrationModal to show the credential input fields

-- =============================================================================
-- PAYMENT GATEWAYS
-- =============================================================================

-- PayFast - SA payment gateway
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Sign up for a PayFast merchant account at payfast.co.za',
    'Navigate to Settings > Integration in your dashboard',
    'Copy your Merchant ID and Merchant Key',
    'Optionally set a passphrase for additional security',
    'Enter your credentials below to enable the integration'
  ],
  'required_fields', ARRAY['merchant_id', 'merchant_key'],
  'optional_fields', ARRAY['passphrase']
),
updated_at = NOW()
WHERE slug = 'payfast';

-- Paystack - Pan-African payment gateway
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Sign up for a Paystack account at paystack.com',
    'Navigate to Settings > API Keys & Webhooks',
    'Copy your Secret Key (starts with sk_live_ or sk_test_)',
    'Optionally copy your Public Key for frontend integration',
    'Enter your credentials below to enable the integration'
  ],
  'required_fields', ARRAY['secret_key'],
  'optional_fields', ARRAY['public_key']
),
updated_at = NOW()
WHERE slug = 'paystack';

-- Yoco - SA card payment gateway
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Sign up for a Yoco business account at yoco.com',
    'Navigate to your Yoco Portal > Integrations > API',
    'Generate a new API key or copy your existing Secret Key',
    'The key starts with sk_ for production or sk_test_ for sandbox',
    'Enter your credentials below to enable the integration'
  ],
  'required_fields', ARRAY['secret_key']
),
updated_at = NOW()
WHERE slug = 'yoco';

-- =============================================================================
-- E-COMMERCE PLATFORMS
-- =============================================================================

-- Shopify
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Log in to your Shopify admin panel',
    'Go to Settings > Apps and sales channels > Develop apps',
    'Create a new app or use an existing one',
    'Configure Admin API access scopes (read_products, read_orders, etc.)',
    'Copy the Admin API access token (starts with shpat_)',
    'Enter your store URL and API key below'
  ],
  'required_fields', ARRAY['api_key', 'store_url'],
  'field_hints', jsonb_build_object(
    'api_key', 'Admin API access token (starts with shpat_)',
    'store_url', 'Your myshopify.com URL (e.g., yourstore.myshopify.com)'
  )
),
updated_at = NOW()
WHERE slug = 'shopify';

-- WooCommerce
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Log in to your WordPress admin panel',
    'Navigate to WooCommerce > Settings > Advanced > REST API',
    'Click "Add key" to generate new API credentials',
    'Set permissions to Read/Write for full functionality',
    'Copy your Consumer Key and Consumer Secret',
    'Enter your credentials below along with your store URL'
  ],
  'required_fields', ARRAY['consumer_key', 'consumer_secret', 'store_url'],
  'field_hints', jsonb_build_object(
    'consumer_key', 'Starts with ck_',
    'consumer_secret', 'Starts with cs_',
    'store_url', 'Your WordPress site URL (e.g., https://yourstore.com)'
  )
),
updated_at = NOW()
WHERE slug = 'woocommerce';

-- =============================================================================
-- SHIPPING & LOGISTICS - SOUTH AFRICA
-- =============================================================================

-- The Courier Guy
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Register for a business account at thecourierguy.co.za',
    'Log in to your TCG portal to find your Account Number',
    'Use your portal login password for API access',
    'Enter your credentials below to enable the integration'
  ],
  'required_fields', ARRAY['account_number', 'password'],
  'field_hints', jsonb_build_object(
    'account_number', 'Your TCG account number (found in portal)',
    'password', 'Your TCG portal login password'
  )
),
updated_at = NOW()
WHERE slug = 'courier-guy';

-- ShipLogic
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Sign up for a ShipLogic account at shiplogic.com',
    'Navigate to your account settings',
    'Generate or locate your API key',
    'Enter your API key below to enable the integration'
  ],
  'required_fields', ARRAY['api_key'],
  'field_hints', jsonb_build_object(
    'api_key', 'Your ShipLogic API key'
  )
),
updated_at = NOW()
WHERE slug = 'shiplogic';

-- =============================================================================
-- CALENDAR & SCHEDULING
-- =============================================================================

-- iCal Sync
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Get your iCal URL from your calendar provider (Google, Airbnb, Booking.com)',
    'For Google Calendar: Calendar Settings > Integrate calendar > Secret address in iCal format',
    'For Airbnb: Listing > Pricing and availability > Export calendar',
    'For Booking.com: Property > Calendar > Export',
    'You can add multiple calendar URLs separated by commas'
  ],
  'required_fields', ARRAY['ical_urls'],
  'field_hints', jsonb_build_object(
    'ical_urls', 'One or more iCal URLs (comma-separated for multiple calendars)'
  )
),
updated_at = NOW()
WHERE slug = 'ical-sync';

-- =============================================================================
-- COMMUNICATION & SMS
-- =============================================================================

-- Clickatell
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Sign up for a Clickatell account at clickatell.com',
    'Navigate to your Clickatell Portal > SMS Integration',
    'Create a new SMS Integration or use an existing one',
    'Copy your API Key from the integration settings',
    'Enter your API key below to enable the integration'
  ],
  'required_fields', ARRAY['api_key'],
  'field_hints', jsonb_build_object(
    'api_key', 'Your Clickatell API key'
  )
),
updated_at = NOW()
WHERE slug = 'clickatell';

-- BulkSMS
UPDATE integration_marketplace
SET setup_instructions = jsonb_build_object(
  'steps', ARRAY[
    'Sign up for a BulkSMS account at bulksms.com',
    'Navigate to your account settings',
    'Create API credentials (username and password)',
    'Note: These are different from your portal login credentials',
    'Enter your API credentials below to enable the integration'
  ],
  'required_fields', ARRAY['username', 'password'],
  'field_hints', jsonb_build_object(
    'username', 'Your BulkSMS API username (Token ID)',
    'password', 'Your BulkSMS API password (Token Secret)'
  )
),
updated_at = NOW()
WHERE slug = 'bulksms';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Show updated integrations
SELECT
  slug,
  name,
  setup_instructions->>'required_fields' as required_fields,
  LENGTH(setup_instructions::text) as instructions_length
FROM integration_marketplace
WHERE slug IN (
  'payfast', 'paystack', 'yoco', 'ikhokha',
  'shopify', 'woocommerce',
  'courier-guy', 'shiplogic',
  'ical-sync',
  'clickatell', 'bulksms'
)
ORDER BY slug;
