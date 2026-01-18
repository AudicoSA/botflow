-- Migration 015: Add More Integrations
-- Expand marketplace to 130+ integrations
-- Created: 2026-01-18

-- =============================================================================
-- ADDITIONAL CRM INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

-- CRM
('zoho-crm', 'Zoho CRM', 'crm',
 'Complete CRM for growing businesses',
 'Manage leads, contacts, deals and customer interactions. Popular in South Africa for its affordability.',
 'https://www.zoho.com/favicon.ico',
 true, 'oauth2', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['leads', 'contacts', 'deals', 'tasks', 'notes', 'campaigns'],
 'n8n-nodes-base.zoho', 82,
 '{"steps": ["Go to Zoho API Console", "Create Server-based Application", "Get Client ID and Secret"]}'::jsonb,
 'https://www.zoho.com/crm/developer/docs/api/'),

('freshsales', 'Freshsales', 'crm',
 'AI-powered CRM by Freshworks',
 'Smart CRM with AI lead scoring and built-in communication tools.',
 'https://www.freshworks.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['leads', 'contacts', 'deals', 'sequences', 'tasks'],
 'n8n-nodes-base.freshsales', 75,
 '{"steps": ["Go to Settings > API Settings", "Generate API key"]}'::jsonb,
 'https://developers.freshworks.com/crm/'),

('copper', 'Copper CRM', 'crm',
 'CRM built for Google Workspace',
 'Seamlessly integrates with Gmail and Google apps for effortless contact management.',
 'https://www.copper.com/favicon.ico',
 true, 'api_key', 'paid', false, true,
 ARRAY['all'],
 ARRAY['contacts', 'companies', 'opportunities', 'tasks', 'activities'],
 'n8n-nodes-base.copper', 68,
 '{"steps": ["Go to Settings > Integrations > API Keys", "Create new API key"]}'::jsonb,
 'https://developer.copper.com/'),

('close', 'Close CRM', 'crm',
 'CRM built for sales teams',
 'Sales-focused CRM with built-in calling, email, and SMS.',
 'https://close.com/favicon.ico',
 true, 'api_key', 'paid', false, true,
 ARRAY['real_estate', 'all'],
 ARRAY['leads', 'contacts', 'calls', 'emails', 'tasks', 'sequences'],
 'n8n-nodes-base.close', 65,
 '{"steps": ["Go to Settings > API", "Generate API key"]}'::jsonb,
 'https://developer.close.com/')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ADDITIONAL E-COMMERCE INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

('bigcommerce', 'BigCommerce', 'ecommerce',
 'Enterprise ecommerce platform',
 'Powerful ecommerce for growing businesses with B2B and B2C capabilities.',
 'https://www.bigcommerce.com/favicon.ico',
 true, 'api_key', 'paid', false, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['products', 'orders', 'customers', 'inventory', 'shipping'],
 'n8n-nodes-base.bigCommerce', 72,
 '{"steps": ["Go to Advanced Settings > API Accounts", "Create V2/V3 API Account"]}'::jsonb,
 'https://developer.bigcommerce.com/'),

('magento', 'Magento / Adobe Commerce', 'ecommerce',
 'Enterprise-grade ecommerce',
 'Powerful open-source ecommerce platform for large catalogs and complex businesses.',
 'https://magento.com/favicon.ico',
 true, 'api_key', 'paid', false, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['products', 'orders', 'customers', 'inventory', 'categories'],
 'n8n-nodes-base.magento', 70,
 '{"steps": ["Go to System > Integrations", "Create new integration", "Get API credentials"]}'::jsonb,
 'https://developer.adobe.com/commerce/'),

('prestashop', 'PrestaShop', 'ecommerce',
 'Open-source ecommerce solution',
 'Free and flexible ecommerce platform popular in Europe and Africa.',
 'https://www.prestashop.com/favicon.ico',
 true, 'api_key', 'free', false, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['products', 'orders', 'customers', 'stock', 'carriers'],
 'n8n-nodes-base.prestashop', 65,
 '{"steps": ["Go to Advanced Parameters > Webservice", "Enable webservice and create key"]}'::jsonb,
 'https://devdocs.prestashop.com/'),

('square', 'Square', 'ecommerce',
 'All-in-one commerce platform',
 'Accept payments, manage inventory, and run your business from one platform.',
 'https://squareup.com/favicon.ico',
 true, 'oauth2', 'freemium', true, true,
 ARRAY['retail', 'restaurant', 'salon'],
 ARRAY['payments', 'inventory', 'orders', 'customers', 'catalog'],
 'n8n-nodes-base.square', 85,
 '{"steps": ["Create Square Developer account", "Create application", "Get OAuth credentials"]}'::jsonb,
 'https://developer.squareup.com/'),

('ecwid', 'Ecwid', 'ecommerce',
 'Easy ecommerce for any website',
 'Add a store to any existing website or sell on multiple channels.',
 'https://www.ecwid.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['products', 'orders', 'customers', 'inventory', 'categories'],
 'custom', 60,
 '{"steps": ["Go to Settings > API", "Get secret API token"]}'::jsonb,
 'https://api-docs.ecwid.com/')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ADDITIONAL COMMUNICATION INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

('intercom', 'Intercom', 'communication',
 'Customer messaging platform',
 'Live chat, bots, and customer support all in one platform.',
 'https://www.intercom.com/favicon.ico',
 true, 'api_key', 'paid', true, true,
 ARRAY['all'],
 ARRAY['conversations', 'contacts', 'companies', 'tags', 'notes'],
 'n8n-nodes-base.intercom', 88,
 '{"steps": ["Go to Settings > Developers > Access Token", "Generate token"]}'::jsonb,
 'https://developers.intercom.com/'),

('zendesk', 'Zendesk', 'communication',
 'Customer service software',
 'Complete customer service solution with ticketing, chat, and knowledge base.',
 'https://www.zendesk.com/favicon.ico',
 true, 'api_key', 'paid', true, true,
 ARRAY['all'],
 ARRAY['tickets', 'users', 'organizations', 'comments', 'macros'],
 'n8n-nodes-base.zendesk', 90,
 '{"steps": ["Go to Admin > API > Add API token"]}'::jsonb,
 'https://developer.zendesk.com/'),

('freshdesk', 'Freshdesk', 'communication',
 'Cloud helpdesk software',
 'Affordable customer support software with powerful automation.',
 'https://www.freshdesk.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['tickets', 'contacts', 'companies', 'agents', 'canned_responses'],
 'n8n-nodes-base.freshdesk', 82,
 '{"steps": ["Go to Profile Settings > API Settings"]}'::jsonb,
 'https://developers.freshdesk.com/'),

('crisp', 'Crisp', 'communication',
 'All-in-one messaging platform',
 'Live chat, chatbot, and shared inbox for customer communication.',
 'https://crisp.chat/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['conversations', 'contacts', 'segments', 'campaigns'],
 'n8n-nodes-base.crisp', 72,
 '{"steps": ["Go to Settings > API", "Create API key"]}'::jsonb,
 'https://docs.crisp.chat/'),

('drift', 'Drift', 'communication',
 'Revenue acceleration platform',
 'Conversational marketing and sales platform with chatbots.',
 'https://www.drift.com/favicon.ico',
 true, 'oauth2', 'paid', false, true,
 ARRAY['all'],
 ARRAY['conversations', 'contacts', 'meetings', 'playbooks'],
 'n8n-nodes-base.drift', 70,
 '{"steps": ["Go to Settings > App Settings > Developer", "Create app"]}'::jsonb,
 'https://devdocs.drift.com/')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ADDITIONAL MARKETING INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

('convertkit', 'ConvertKit', 'marketing',
 'Email marketing for creators',
 'Simple email marketing platform built for bloggers, authors, and creators.',
 'https://convertkit.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['subscribers', 'tags', 'sequences', 'broadcasts', 'forms'],
 'n8n-nodes-base.convertKit', 75,
 '{"steps": ["Go to Account Settings > API", "Copy API Secret"]}'::jsonb,
 'https://developers.convertkit.com/'),

('klaviyo', 'Klaviyo', 'marketing',
 'Email & SMS marketing for ecommerce',
 'Data-driven marketing automation specifically designed for online stores.',
 'https://www.klaviyo.com/favicon.ico',
 true, 'api_key', 'freemium', true, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['profiles', 'lists', 'segments', 'campaigns', 'flows', 'metrics'],
 'n8n-nodes-base.klaviyo', 85,
 '{"steps": ["Go to Account > Settings > API Keys", "Create API key"]}'::jsonb,
 'https://developers.klaviyo.com/'),

('drip', 'Drip', 'marketing',
 'Ecommerce CRM',
 'Marketing automation built specifically for ecommerce businesses.',
 'https://www.drip.com/favicon.ico',
 true, 'api_key', 'paid', false, true,
 ARRAY['ecommerce'],
 ARRAY['subscribers', 'tags', 'campaigns', 'workflows', 'events'],
 'n8n-nodes-base.drip', 70,
 '{"steps": ["Go to Settings > API", "Generate API token"]}'::jsonb,
 'https://developer.drip.com/'),

('constant-contact', 'Constant Contact', 'marketing',
 'Email marketing made easy',
 'Simple email marketing with templates and automation.',
 'https://www.constantcontact.com/favicon.ico',
 true, 'oauth2', 'paid', false, true,
 ARRAY['all'],
 ARRAY['contacts', 'lists', 'campaigns', 'reports'],
 'custom', 72,
 '{"steps": ["Register as developer", "Create application", "Get OAuth credentials"]}'::jsonb,
 'https://developer.constantcontact.com/'),

('omnisend', 'Omnisend', 'marketing',
 'Ecommerce marketing automation',
 'Multi-channel marketing with email, SMS, push notifications and more.',
 'https://www.omnisend.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['ecommerce'],
 ARRAY['contacts', 'segments', 'campaigns', 'automation', 'sms'],
 'custom', 68,
 '{"steps": ["Go to Profile > Integrations & API > API Key"]}'::jsonb,
 'https://api-docs.omnisend.com/')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ADDITIONAL ANALYTICS INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

('mixpanel', 'Mixpanel', 'analytics',
 'Product analytics',
 'Track user behavior and measure product engagement.',
 'https://mixpanel.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['track_events', 'user_profiles', 'cohorts', 'funnels'],
 'n8n-nodes-base.mixpanel', 80,
 '{"steps": ["Go to Settings > Project Settings", "Copy Project Token and API Secret"]}'::jsonb,
 'https://developer.mixpanel.com/'),

('amplitude', 'Amplitude', 'analytics',
 'Digital analytics platform',
 'Understand user behavior across your products.',
 'https://amplitude.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['track_events', 'user_properties', 'cohorts', 'funnels'],
 'custom', 78,
 '{"steps": ["Go to Settings > Projects", "Copy API Key"]}'::jsonb,
 'https://developers.amplitude.com/'),

('heap', 'Heap', 'analytics',
 'Automatic event tracking',
 'Capture every user interaction without code.',
 'https://heap.io/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['events', 'users', 'segments', 'funnels'],
 'custom', 70,
 '{"steps": ["Go to Account > Privacy & Security", "Get API key"]}'::jsonb,
 'https://developers.heap.io/'),

('hotjar', 'Hotjar', 'analytics',
 'Behavior analytics and feedback',
 'Heatmaps, recordings, and user feedback tools.',
 'https://www.hotjar.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['heatmaps', 'recordings', 'surveys', 'feedback'],
 'custom', 75,
 '{"steps": ["Go to Settings > API", "Create API key"]}'::jsonb,
 'https://developer.hotjar.com/')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ADDITIONAL PRODUCTIVITY INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

('todoist', 'Todoist', 'productivity',
 'Task management app',
 'Simple and powerful to-do list and task manager.',
 'https://todoist.com/favicon.ico',
 true, 'oauth2', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['tasks', 'projects', 'labels', 'comments', 'sections'],
 'n8n-nodes-base.todoist', 78,
 '{"steps": ["Go to Settings > Integrations", "Create new app"]}'::jsonb,
 'https://developer.todoist.com/'),

('clickup', 'ClickUp', 'productivity',
 'All-in-one productivity platform',
 'Tasks, docs, goals, and chat in one place.',
 'https://clickup.com/favicon.ico',
 true, 'api_key', 'freemium', true, true,
 ARRAY['all'],
 ARRAY['tasks', 'lists', 'spaces', 'goals', 'time_tracking'],
 'n8n-nodes-base.clickUp', 85,
 '{"steps": ["Go to Settings > Apps", "Generate API token"]}'::jsonb,
 'https://clickup.com/api/'),

('linear', 'Linear', 'productivity',
 'Issue tracking for modern teams',
 'Streamlined issue tracking built for speed.',
 'https://linear.app/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['issues', 'projects', 'cycles', 'teams', 'labels'],
 'n8n-nodes-base.linear', 75,
 '{"steps": ["Go to Settings > API > Create new API key"]}'::jsonb,
 'https://developers.linear.app/'),

('basecamp', 'Basecamp', 'productivity',
 'Project management & team communication',
 'All-in-one toolkit for working remotely.',
 'https://basecamp.com/favicon.ico',
 true, 'oauth2', 'paid', false, true,
 ARRAY['all'],
 ARRAY['projects', 'todos', 'messages', 'schedules', 'documents'],
 'n8n-nodes-base.basecamp', 68,
 '{"steps": ["Register app at integrate.37signals.com", "Get OAuth credentials"]}'::jsonb,
 'https://github.com/basecamp/bc3-api')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- SOUTH AFRICAN SPECIFIC INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

('peach-payments', 'Peach Payments', 'payment',
 'African payment gateway',
 'Payment processing for African businesses with support for multiple payment methods.',
 'https://www.peachpayments.com/favicon.ico',
 true, 'api_key', 'transaction_fee', false, true,
 ARRAY['ecommerce', 'retail', 'all'],
 ARRAY['card_payments', 'eft', 'mobile_money', 'subscriptions'],
 'custom', 75,
 '{"steps": ["Apply for merchant account", "Get API credentials from dashboard"]}'::jsonb,
 'https://developer.peachpayments.com/'),

('ozow', 'Ozow', 'payment',
 'Instant EFT payments',
 'Instant bank payments for South African businesses. Lower fees than cards.',
 'https://www.ozow.com/favicon.ico',
 true, 'api_key', 'transaction_fee', true, true,
 ARRAY['ecommerce', 'retail', 'all'],
 ARRAY['instant_eft', 'pay_by_link', 'refunds'],
 'custom', 78,
 '{"steps": ["Register at ozow.com", "Complete verification", "Get API key from dashboard"]}'::jsonb,
 'https://developer.ozow.com/'),

('snapscan', 'SnapScan', 'payment',
 'QR code payments',
 'Accept payments via QR code scanning. Popular in SA retail.',
 'https://www.snapscan.co.za/favicon.ico',
 true, 'api_key', 'transaction_fee', false, true,
 ARRAY['retail', 'restaurant'],
 ARRAY['qr_payments', 'payment_requests', 'refunds'],
 'custom', 72,
 '{"steps": ["Register at snapscan.co.za", "Get merchant credentials"]}'::jsonb,
 'https://developer.snapscan.io/'),

('pargo', 'Pargo', 'shipping',
 'Smart locker delivery network',
 'Click & collect network across South Africa.',
 'https://pargo.co.za/favicon.ico',
 true, 'api_key', 'per_shipment', false, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['pickup_points', 'shipments', 'tracking', 'returns'],
 'custom', 68,
 '{"steps": ["Register at pargo.co.za", "Get API credentials"]}'::jsonb,
 'https://developer.pargo.co.za/'),

('bob-go', 'Bob Go', 'shipping',
 'Multi-courier shipping platform',
 'Compare rates and ship with multiple SA couriers.',
 'https://www.bobgo.co.za/favicon.ico',
 true, 'api_key', 'per_shipment', false, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['rate_comparison', 'bookings', 'tracking', 'labels'],
 'custom', 65,
 '{"steps": ["Register at bobgo.co.za", "Get API key from settings"]}'::jsonb,
 'https://docs.bobgo.co.za/')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ADDITIONAL DATABASE & STORAGE INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

('firebase', 'Firebase', 'database',
 'Google app development platform',
 'Realtime database, authentication, and hosting from Google.',
 'https://firebase.google.com/favicon.ico',
 true, 'service_account', 'freemium', true, true,
 ARRAY['all'],
 ARRAY['realtime_db', 'firestore', 'auth', 'storage', 'functions'],
 'n8n-nodes-base.firebase', 88,
 '{"steps": ["Create Firebase project", "Go to Project Settings > Service accounts", "Generate new private key"]}'::jsonb,
 'https://firebase.google.com/docs'),

('supabase', 'Supabase', 'database',
 'Open source Firebase alternative',
 'PostgreSQL database with realtime subscriptions and auth.',
 'https://supabase.com/favicon.ico',
 true, 'api_key', 'freemium', true, true,
 ARRAY['all'],
 ARRAY['database', 'auth', 'storage', 'edge_functions', 'realtime'],
 'n8n-nodes-base.supabase', 85,
 '{"steps": ["Create Supabase project", "Go to Settings > API", "Copy anon key and service role key"]}'::jsonb,
 'https://supabase.com/docs'),

('mongodb', 'MongoDB', 'database',
 'Document database',
 'Flexible NoSQL database for modern applications.',
 'https://www.mongodb.com/favicon.ico',
 true, 'connection_string', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['crud_operations', 'aggregation', 'indexes', 'transactions'],
 'n8n-nodes-base.mongoDb', 82,
 '{"steps": ["Create MongoDB Atlas cluster", "Get connection string from Connect button"]}'::jsonb,
 'https://www.mongodb.com/docs/'),

('redis', 'Redis', 'database',
 'In-memory data store',
 'High-performance caching and data structure server.',
 'https://redis.io/favicon.ico',
 true, 'connection_string', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['caching', 'pub_sub', 'streams', 'data_structures'],
 'n8n-nodes-base.redis', 78,
 '{"steps": ["Create Redis instance", "Get connection details"]}'::jsonb,
 'https://redis.io/documentation')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ADDITIONAL AI & AUTOMATION INTEGRATIONS
-- =============================================================================

INSERT INTO integration_marketplace (
  slug, name, category, description, long_description, icon_url,
  requires_auth, auth_type, pricing_model, is_featured, is_direct_integration,
  recommended_for_verticals, supported_features, n8n_node_name, popularity_score,
  setup_instructions, documentation_url
) VALUES

('anthropic', 'Anthropic Claude', 'ai',
 'Advanced AI assistant',
 'Access Claude AI for intelligent conversations and analysis.',
 'https://www.anthropic.com/favicon.ico',
 true, 'api_key', 'usage_based', true, true,
 ARRAY['all'],
 ARRAY['chat', 'analysis', 'summarization', 'coding'],
 'custom', 90,
 '{"steps": ["Sign up at anthropic.com", "Go to API section", "Create API key"]}'::jsonb,
 'https://docs.anthropic.com/'),

('replicate', 'Replicate', 'ai',
 'Run AI models in the cloud',
 'Access thousands of AI models including image generation and LLMs.',
 'https://replicate.com/favicon.ico',
 true, 'api_key', 'usage_based', false, true,
 ARRAY['all'],
 ARRAY['image_generation', 'text_generation', 'audio', 'video'],
 'custom', 75,
 '{"steps": ["Sign up at replicate.com", "Go to Account Settings", "Copy API token"]}'::jsonb,
 'https://replicate.com/docs'),

('hugging-face', 'Hugging Face', 'ai',
 'ML model hub and inference',
 'Access thousands of open-source ML models.',
 'https://huggingface.co/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['inference', 'models', 'datasets', 'spaces'],
 'custom', 78,
 '{"steps": ["Sign up at huggingface.co", "Go to Settings > Access Tokens", "Create token"]}'::jsonb,
 'https://huggingface.co/docs'),

('make', 'Make (Integromat)', 'automation',
 'Visual automation platform',
 'Connect apps and automate workflows visually.',
 'https://www.make.com/favicon.ico',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['scenarios', 'modules', 'webhooks', 'data_stores'],
 'custom', 82,
 '{"steps": ["Go to Profile > API", "Create new API token"]}'::jsonb,
 'https://www.make.com/en/api-documentation')

ON CONFLICT (slug) DO NOTHING;

-- Count total integrations
DO $$
DECLARE
  integration_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO integration_count FROM integration_marketplace;
  RAISE NOTICE 'Total integrations in marketplace: %', integration_count;
END $$;
