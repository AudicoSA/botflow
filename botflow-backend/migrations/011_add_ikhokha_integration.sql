-- Migration: Add iKhokha (iK Pay) integration to marketplace
-- Created: 2026-01-18
-- Description: Add iKhokha South African payment gateway integration

-- Insert iKhokha integration into integration_marketplace
INSERT INTO integration_marketplace (
  name,
  slug,
  description,
  long_description,
  category,
  icon_url,
  is_featured,
  is_direct_integration,
  pricing_model,
  requires_auth,
  auth_type,
  supported_features,
  setup_instructions,
  documentation_url,
  created_at,
  updated_at
) VALUES (
  'iKhokha',
  'ikhokha',
  'Accept card payments, Instant EFT, and digital wallets with iKhokha iK Pay API',
  'iKhokha is a popular South African payment solution that enables businesses to accept payments through multiple channels. The iK Pay API allows you to create payment links, process card payments, Instant EFT, and digital wallets. Features include real-time webhooks, transaction history, and robust fraud detection. Perfect for South African businesses looking for a reliable, local payment gateway with competitive rates.',
  'payment',
  'https://logo.clearbit.com/ikhokha.com',
  true,
  true,
  'paid',
  true,
  'api_key',
  ARRAY[
    'Payment Links',
    'Card Payments',
    'Instant EFT',
    'Digital Wallets',
    'Webhooks',
    'Transaction History',
    'Sandbox Mode',
    'Fraud Detection',
    'ZAR Currency'
  ],
  '{
    "steps": [
      "Sign up for a merchant account on iKhokha Merchant Dashboard",
      "Navigate to iK Pay API section",
      "Generate a new API key to get Application ID and Application Secret",
      "Copy both credentials and keep the secret safe",
      "Enter credentials below to enable the integration"
    ],
    "required_fields": ["application_id", "application_secret"],
    "webhook_url": "Your webhook URL will be provided after enabling"
  }'::jsonb,
  'https://www.ikhokha.com/ik-pay-api',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  long_description = EXCLUDED.long_description,
  icon_url = EXCLUDED.icon_url,
  is_featured = EXCLUDED.is_featured,
  supported_features = EXCLUDED.supported_features,
  setup_instructions = EXCLUDED.setup_instructions,
  documentation_url = EXCLUDED.documentation_url,
  updated_at = NOW();

-- Verify the insert
SELECT id, name, slug, category, is_featured
FROM integration_marketplace
WHERE slug = 'ikhokha';
