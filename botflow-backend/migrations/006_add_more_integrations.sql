-- Migration 006: Add More Popular Integrations
-- Phase 2: Expand marketplace with 10 more integrations
-- Created: 2026-01-17
-- Purpose: Add Notion, Trello, Asana, Mailchimp, Twilio, and more

-- Insert additional popular integrations
INSERT INTO integration_marketplace (
  slug,
  name,
  category,
  description,
  long_description,
  icon_url,
  requires_auth,
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
-- PRODUCTIVITY
-- ============================================================================

('notion', 'Notion', 'productivity',
 'Workspace and knowledge base',
 'Connect Notion to create databases, update pages, and manage your team workspace from WhatsApp. Perfect for project management and documentation.',
 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png',
 true, 'free', true, true,
 ARRAY['all'],
 ARRAY['create_page', 'update_page', 'create_database', 'query_database', 'add_comment'],
 'n8n-nodes-base.notion', 85,
 '{"steps": ["Go to Notion → Settings & Members", "Go to My connections", "Develop or manage integrations", "Create new internal integration", "Copy Internal Integration Token"]}'::jsonb,
 'https://developers.notion.com/'),

('trello', 'Trello', 'productivity',
 'Project management boards',
 'Manage Trello boards, cards, and lists from WhatsApp. Create tasks, update progress, and collaborate with your team.',
 'https://cdn.worldvectorlogo.com/logos/trello.svg',
 true, 'free', false, true,
 ARRAY['all'],
 ARRAY['create_card', 'update_card', 'move_card', 'create_board', 'add_comment'],
 'n8n-nodes-base.trello', 78,
 '{"steps": ["Go to Trello Power-Ups", "Get your API Key", "Generate a Token", "Copy API Key and Token"]}'::jsonb,
 'https://developer.atlassian.com/cloud/trello/'),

('asana', 'Asana', 'productivity',
 'Task and project management',
 'Create and manage Asana tasks, projects, and workflows directly from WhatsApp conversations.',
 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Asana_logo.svg',
 true, 'freemium', false, true,
 ARRAY['all'],
 ARRAY['create_task', 'update_task', 'create_project', 'add_comment', 'assign_task'],
 'n8n-nodes-base.asana', 75,
 '{"steps": ["Log in to Asana", "Go to Account Settings → Apps → Developer apps", "Create new token", "Copy Personal Access Token"]}'::jsonb,
 'https://developers.asana.com/'),

('monday', 'Monday.com', 'productivity',
 'Work operating system',
 'Integrate Monday.com to manage boards, items, and workflows from WhatsApp. Perfect for team collaboration.',
 'https://dapulse-res.cloudinary.com/image/upload/f_auto,q_auto/remote_mondaycom_static/uploads/Yotam/monday-logo-icon.png',
 true, 'paid', false, true,
 ARRAY['all'],
 ARRAY['create_item', 'update_item', 'create_board', 'add_update'],
 'n8n-nodes-base.mondayCom', 72,
 '{"steps": ["Go to Monday.com", "Click profile → Admin → API", "Generate API token", "Copy token"]}'::jsonb,
 'https://developer.monday.com/'),

-- ============================================================================
-- COMMUNICATION & MARKETING
-- ============================================================================

('mailchimp', 'Mailchimp', 'communication',
 'Email marketing platform',
 'Add WhatsApp contacts to Mailchimp lists, trigger campaigns, and manage your email marketing automation.',
 'https://eep.io/images/yzco4xsimv0y/5fZz8tKR9YeVqSo84eKcQk/04f2c5e22f6eb03974d99e65b3d30f2d/Mailchimp_Logo_Square.png',
 true, 'freemium', true, true,
 ARRAY['ecommerce', 'retail', 'all'],
 ARRAY['add_subscriber', 'update_subscriber', 'send_campaign', 'create_list', 'track_events'],
 'n8n-nodes-base.mailchimp', 82,
 '{"steps": ["Log in to Mailchimp", "Go to Account → Extras → API keys", "Create A Key", "Copy API Key"]}'::jsonb,
 'https://mailchimp.com/developer/'),

('twilio', 'Twilio', 'communication',
 'SMS and voice platform',
 'Send SMS messages, make voice calls, and verify phone numbers using Twilio integration.',
 'https://www.twilio.com/assets/images/brand/twilio-logo-red.png',
 true, 'paid', false, true,
 ARRAY['all'],
 ARRAY['send_sms', 'make_call', 'verify_number', 'lookup_number'],
 'n8n-nodes-base.twilio', 80,
 '{"steps": ["Log in to Twilio Console", "Get Account SID", "Get Auth Token", "Copy credentials"]}'::jsonb,
 'https://www.twilio.com/docs/'),

('sendgrid', 'SendGrid', 'communication',
 'Email delivery platform',
 'Send transactional emails, newsletters, and notifications through SendGrid from WhatsApp conversations.',
 'https://sendgrid.com/wp-content/themes/sgdotcom/pages/resource/brand/2016/SendGrid-Logomark.png',
 true, 'freemium', false, true,
 ARRAY['all'],
 ARRAY['send_email', 'add_contact', 'create_list', 'send_campaign'],
 'n8n-nodes-base.sendGrid', 77,
 '{"steps": ["Log in to SendGrid", "Go to Settings → API Keys", "Create API Key", "Copy API Key"]}'::jsonb,
 'https://docs.sendgrid.com/'),

-- ============================================================================
-- ECOMMERCE & BUSINESS
-- ============================================================================

('quickbooks', 'QuickBooks', 'specialized',
 'Accounting and invoicing',
 'Create invoices, track expenses, and manage accounting from WhatsApp. Perfect for small businesses.',
 'https://plugin.intuitcdn.net/designsystem/assets/2023/05/31143736/qbo-icon-green-prod.svg',
 true, 'paid', false, true,
 ARRAY['all'],
 ARRAY['create_invoice', 'create_customer', 'create_payment', 'get_reports'],
 'n8n-nodes-base.quickBooks', 70,
 '{"steps": ["Go to QuickBooks Developer", "Create app", "Get OAuth credentials", "Copy Client ID and Secret"]}'::jsonb,
 'https://developer.intuit.com/'),

('xero', 'Xero', 'specialized',
 'Online accounting software',
 'Manage invoices, contacts, and accounting from WhatsApp with Xero integration.',
 'https://www.xero.com/content/dam/xero/images/logos/xero-logo.svg',
 true, 'paid', false, true,
 ARRAY['all'],
 ARRAY['create_invoice', 'create_contact', 'create_payment', 'get_reports'],
 'n8n-nodes-base.xero', 68,
 '{"steps": ["Go to Xero Developer", "Create app", "Get OAuth credentials", "Copy Client ID and Secret"]}'::jsonb,
 'https://developer.xero.com/'),

('zoom', 'Zoom', 'communication',
 'Video conferencing platform',
 'Schedule Zoom meetings, send invites, and manage webinars from WhatsApp conversations.',
 'https://st1.zoom.us/static/6.3.7935/image/new/ZoomLogo.png',
 true, 'freemium', false, true,
 ARRAY['all'],
 ARRAY['create_meeting', 'list_meetings', 'delete_meeting', 'get_recording'],
 'n8n-nodes-base.zoom', 75,
 '{"steps": ["Go to Zoom App Marketplace", "Develop → Build App", "Choose JWT or OAuth", "Copy credentials"]}'::jsonb,
 'https://marketplace.zoom.us/');

-- Update indexes
REINDEX INDEX idx_marketplace_category;
REINDEX INDEX idx_marketplace_featured;
REINDEX INDEX idx_marketplace_popularity;
REINDEX INDEX idx_marketplace_search;

-- Show results
SELECT 'Added 10 more integrations! Total: ' || COUNT(*)::text || ' integrations' as result
FROM integration_marketplace;
