-- Migration 005: Seed Integration Marketplace (FIXED)
-- Phase 2: Populate marketplace with popular integrations
-- Created: 2026-01-17
-- Purpose: Fix empty marketplace search results

-- First, add missing columns to existing table
ALTER TABLE integration_marketplace
ADD COLUMN IF NOT EXISTS n8n_node_name TEXT,
ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS setup_instructions JSONB,
ADD COLUMN IF NOT EXISTS documentation_url TEXT;

-- Clear existing data (in case re-running)
TRUNCATE integration_marketplace CASCADE;

-- Seed popular integrations
INSERT INTO integration_marketplace (
  slug,
  name,
  category,
  description,
  long_description,
  icon_url,
  requires_auth,
  auth_type,
  pricing_model,
  is_featured,
  is_direct_integration,
  recommended_for_verticals,
  supported_features,
  n8n_node_name,
  popularity_score,
  setup_instructions,
  documentation_url
) VALUES

-- ============================================================================
-- CALENDAR & SCHEDULING
-- ============================================================================

('google-calendar', 'Google Calendar', 'calendar',
 'Schedule appointments and manage availability',
 'Sync your WhatsApp bot with Google Calendar to automatically schedule appointments, check availability, and send reminders. Perfect for medical practices, salons, gyms, and any appointment-based business.',
 'https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png',
 true, 'oauth2', 'free', true, true,
 ARRAY['medical', 'doctor', 'salon', 'gym', 'hotel', 'real_estate'],
 ARRAY['create_event', 'check_availability', 'send_reminders', 'update_event', 'cancel_event', 'recurring_events'],
 'n8n-nodes-base.googleCalendar', 95,
 '{"steps": ["Go to Google Cloud Console (console.cloud.google.com)", "Create a new project", "Enable Google Calendar API", "Create OAuth 2.0 credentials", "Add authorized redirect URI", "Copy Client ID and Client Secret"]}'::jsonb,
 'https://developers.google.com/calendar/api/quickstart'),

('calendly', 'Calendly', 'calendar',
 'Professional appointment scheduling',
 'Connect Calendly to let customers book appointments directly through WhatsApp. Calendly handles availability, time zones, and sends automated reminders.',
 'https://assets.calendly.com/assets/frontend/media/logo-square-cd364a3a70b605f5e97c.png',
 true, 'api_key', 'freemium', true, true,
 ARRAY['medical', 'doctor', 'salon', 'gym', 'real_estate'],
 ARRAY['create_booking', 'check_availability', 'webhook_notifications', 'event_types'],
 'n8n-nodes-base.calendly', 85,
 '{"steps": ["Log in to Calendly", "Go to Integrations & Apps", "Generate API key", "Copy API key"]}'::jsonb,
 'https://developer.calendly.com/'),

-- ============================================================================
-- E-COMMERCE
-- ============================================================================

('shopify', 'Shopify', 'ecommerce',
 'E-commerce store integration',
 'Connect your Shopify store to WhatsApp for order tracking, inventory checks, product search, and customer support. Automate order notifications and handle customer inquiries.',
 'https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/shopify-logo-primary-logo-456baa801ee66a0a435671082365958316831c9960c480451dd0330bcdae304f.svg',
 true, 'api_key', 'free', true, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['order_tracking', 'inventory_check', 'product_search', 'create_order', 'cancel_order', 'customer_lookup', 'webhook_notifications'],
 'n8n-nodes-base.shopify', 90,
 '{"steps": ["Log in to Shopify admin", "Go to Apps → Develop apps", "Create a new app", "Configure Admin API scopes (read_orders, write_orders, read_products)", "Install app and copy API credentials"]}'::jsonb,
 'https://shopify.dev/docs/apps/auth/admin-app-access-tokens'),

('woocommerce', 'WooCommerce', 'ecommerce',
 'WordPress e-commerce integration',
 'Integrate WooCommerce with WhatsApp for order management, inventory tracking, and customer notifications. Perfect for WordPress-powered online stores.',
 'https://woocommerce.com/wp-content/themes/woo/images/logo-woocommerce.svg',
 true, 'api_key', 'free', true, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['order_tracking', 'inventory_check', 'product_catalog', 'webhook_notifications', 'customer_management'],
 'n8n-nodes-base.wooCommerce', 88,
 '{"steps": ["Log in to WordPress admin", "Go to WooCommerce → Settings → Advanced → REST API", "Add key", "Choose permissions (Read/Write)", "Copy Consumer Key and Consumer Secret"]}'::jsonb,
 'https://woocommerce.github.io/woocommerce-rest-api-docs/'),

-- ============================================================================
-- PAYMENT PROCESSING
-- ============================================================================

('stripe', 'Stripe', 'payment',
 'Accept payments via WhatsApp',
 'Process payments securely through Stripe directly in your WhatsApp conversations. Create payment links, process refunds, and manage subscriptions.',
 'https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg',
 true, 'api_key', 'free', true, true,
 ARRAY['ecommerce', 'retail', 'gym', 'salon', 'restaurant'],
 ARRAY['create_payment_link', 'process_payment', 'refund', 'subscription_management', 'customer_management', 'webhook_notifications'],
 'n8n-nodes-base.stripe', 92,
 '{"steps": ["Log in to Stripe Dashboard", "Go to Developers → API keys", "Copy Secret key (starts with sk_)"]}'::jsonb,
 'https://stripe.com/docs/api'),

('paystack', 'Paystack', 'payment',
 'South African payment gateway',
 'Accept payments from South African customers with Paystack integration. Supports card payments, EFT, and mobile money.',
 'https://paystack.com/assets/img/logo/logo.svg',
 true, 'api_key', 'free', true, true,
 ARRAY['ecommerce', 'retail', 'gym', 'salon', 'restaurant'],
 ARRAY['create_payment', 'verify_payment', 'refund', 'webhook_notifications', 'transaction_history'],
 'n8n-nodes-base.paystack', 80,
 '{"steps": ["Log in to Paystack", "Go to Settings → API Keys & Webhooks", "Copy Secret Key"]}'::jsonb,
 'https://paystack.com/docs/api/'),

-- ============================================================================
-- CRM
-- ============================================================================

('hubspot', 'HubSpot', 'crm',
 'Customer relationship management',
 'Sync WhatsApp conversations with HubSpot CRM for unified customer data. Create contacts, update deals, and log all interactions automatically.',
 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
 true, 'oauth2', 'freemium', true, true,
 ARRAY['real_estate', 'gym', 'salon', 'all'],
 ARRAY['create_contact', 'update_contact', 'create_deal', 'log_activity', 'sync_conversations', 'task_management'],
 'n8n-nodes-base.hubspot', 87,
 '{"steps": ["Log in to HubSpot", "Go to Settings → Integrations → Private Apps", "Create private app", "Grant required scopes", "Copy access token"]}'::jsonb,
 'https://developers.hubspot.com/'),

('salesforce', 'Salesforce', 'crm',
 'Enterprise CRM integration',
 'Connect Salesforce to track leads, opportunities, and customer interactions from WhatsApp. Perfect for enterprise sales teams.',
 'https://www.salesforce.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg',
 true, 'oauth2', 'paid', false, true,
 ARRAY['real_estate', 'all'],
 ARRAY['create_lead', 'update_contact', 'create_opportunity', 'log_activity', 'sync_data'],
 'n8n-nodes-base.salesforce', 75,
 '{"steps": ["Log in to Salesforce", "Go to Setup → Apps → App Manager", "Create Connected App", "Enable OAuth", "Copy Consumer Key and Secret"]}'::jsonb,
 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/'),

-- ============================================================================
-- COMMUNICATION
-- ============================================================================

('slack', 'Slack', 'communication',
 'Team notifications and alerts',
 'Get WhatsApp conversation notifications in your Slack workspace. Alert your team about important messages, leads, and customer inquiries.',
 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png',
 true, 'oauth2', 'free', false, true,
 ARRAY['all'],
 ARRAY['send_message', 'send_notification', 'create_channel', 'upload_file'],
 'n8n-nodes-base.slack', 75,
 '{"steps": ["Go to api.slack.com/apps", "Create New App", "Add Bot Token Scopes (chat:write, channels:read)", "Install to Workspace", "Copy Bot User OAuth Token"]}'::jsonb,
 'https://api.slack.com/'),

('gmail', 'Gmail', 'communication',
 'Email integration',
 'Send emails from WhatsApp conversations and receive email notifications. Perfect for order confirmations, receipts, and follow-ups.',
 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
 true, 'oauth2', 'free', false, true,
 ARRAY['all'],
 ARRAY['send_email', 'read_email', 'search_email', 'attachments'],
 'n8n-nodes-base.gmail', 70,
 '{"steps": ["Go to Google Cloud Console", "Enable Gmail API", "Create OAuth 2.0 credentials", "Copy Client ID and Secret"]}'::jsonb,
 'https://developers.google.com/gmail/api/'),

-- ============================================================================
-- PRODUCTIVITY & DATA
-- ============================================================================

('wordpress', 'WordPress', 'productivity',
 'WordPress CMS integration',
 'Connect your WordPress site to create posts, manage comments, sync content, and more. Perfect for content-driven businesses.',
 'https://s.w.org/style/images/about/WordPress-logotype-wmark.png',
 true, 'api_key', 'free', true, true,
 ARRAY['all'],
 ARRAY['create_post', 'update_post', 'get_posts', 'manage_comments', 'media_upload'],
 'n8n-nodes-base.wordpress', 89,
 '{"steps": ["Log in to WordPress admin", "Go to Users → Your Profile", "Scroll to Application Passwords", "Create new password", "Copy application password"]}'::jsonb,
 'https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/'),

('google-sheets', 'Google Sheets', 'productivity',
 'Spreadsheet integration',
 'Log conversation data, track leads, manage inventory, and analyze data in Google Sheets. Automatically update rows based on WhatsApp interactions.',
 'https://www.gstatic.com/images/branding/product/2x/sheets_48dp.png',
 true, 'oauth2', 'free', true, true,
 ARRAY['all'],
 ARRAY['append_row', 'update_row', 'read_data', 'create_sheet', 'lookup_value'],
 'n8n-nodes-base.googleSheets', 93,
 '{"steps": ["Go to Google Cloud Console", "Enable Google Sheets API", "Create OAuth 2.0 credentials", "Copy Client ID and Secret"]}'::jsonb,
 'https://developers.google.com/sheets/api/'),

('airtable', 'Airtable', 'productivity',
 'Database and collaboration',
 'Store and manage WhatsApp conversation data in Airtable bases. Perfect for tracking leads, inventory, bookings, and more.',
 'https://static.airtable.com/images/favicon/favicon-32x32.png',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['create_record', 'update_record', 'read_record', 'search', 'list_records'],
 'n8n-nodes-base.airtable', 78,
 '{"steps": ["Log in to Airtable", "Go to Account → Generate API key", "Copy API key", "Find your Base ID in API documentation"]}'::jsonb,
 'https://airtable.com/developers/web/api/introduction'),

-- ============================================================================
-- ANALYTICS
-- ============================================================================

('google-analytics', 'Google Analytics', 'analytics',
 'Track bot performance',
 'Send WhatsApp bot events to Google Analytics for detailed insights. Track user behavior, conversion funnels, and ROI.',
 'https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg',
 true, 'oauth2', 'free', false, true,
 ARRAY['all'],
 ARRAY['track_event', 'track_pageview', 'track_conversion', 'custom_dimensions'],
 'n8n-nodes-base.googleAnalytics', 65,
 '{"steps": ["Go to Google Analytics", "Create property", "Get Measurement ID", "Enable Measurement Protocol API"]}'::jsonb,
 'https://developers.google.com/analytics/'),

-- ============================================================================
-- SPECIALIZED - SOUTH AFRICAN
-- ============================================================================

('shiplogic', 'ShipLogic', 'specialized',
 'South African shipping integration',
 'Track shipments and manage deliveries for South African e-commerce stores. Supports major SA couriers.',
 '/integrations/shiplogic.png',
 true, 'api_key', 'paid', false, false,
 ARRAY['ecommerce', 'retail'],
 ARRAY['track_shipment', 'create_shipment', 'get_quote', 'courier_selection'],
 'custom', 60,
 '{"steps": ["Contact ShipLogic for API access", "Request API credentials", "Configure webhook URL"]}'::jsonb,
 'https://www.shiplogic.com/');

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON integration_marketplace(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_featured ON integration_marketplace(is_featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_popularity ON integration_marketplace(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_slug ON integration_marketplace(slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_search ON integration_marketplace USING gin(to_tsvector('english', name || ' ' || description));

-- Migration completed
SELECT 'Integration marketplace seeded with ' || COUNT(*)::text || ' integrations' as result
FROM integration_marketplace;
