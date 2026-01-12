// Integration Marketplace Seed Data
// 30+ Pre-configured integrations for BotFlow

import type { IntegrationTemplateData } from '../types/marketplace.js';

export const integrationsSeedData: IntegrationTemplateData[] = [
  // CALENDAR & SCHEDULING (4 integrations)
  {
    name: 'Microsoft Outlook Calendar',
    slug: 'outlook-calendar',
    category: 'calendar',
    description: 'Sync appointments with Microsoft Outlook Calendar',
    long_description: 'Automatically sync your WhatsApp appointments to Microsoft Outlook Calendar. Perfect for businesses using Microsoft 365 or Office 365. Supports calendar event creation, updates, and availability checking.',
    icon_url: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['medical', 'salon', 'gym', 'doctor', 'plumber', 'lawyer', 'accountant'],
    pricing_model: 'free',
    is_featured: false,
    documentation_url: 'https://docs.microsoft.com/en-us/graph/api/resources/calendar',
    supported_features: ['create', 'read', 'update', 'delete', 'availability'],
    setup_instructions: {
      steps: [
        'Click "Connect Outlook Calendar"',
        'Sign in with your Microsoft account',
        'Grant calendar access permissions',
        'Select which calendar to use for bookings'
      ],
      required_scopes: ['Calendars.ReadWrite', 'Calendars.Read.Shared']
    }
  },
  {
    name: 'Calendly',
    slug: 'calendly',
    category: 'calendar',
    description: 'Sync bookings with Calendly scheduling platform',
    long_description: 'Integrate with Calendly for seamless appointment scheduling. Perfect for consultants, coaches, and service providers who already use Calendly.',
    icon_url: 'https://assets.calendly.com/assets/frontend/media/logo.svg',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['lawyer', 'accountant', 'tutor', 'medical', 'doctor'],
    pricing_model: 'free',
    documentation_url: 'https://developer.calendly.com/',
    supported_features: ['create', 'read', 'webhook'],
    setup_instructions: {
      steps: [
        'Get your Calendly API key from Account Settings → Integrations',
        'Paste your API key',
        'Select your default event type'
      ],
      required_fields: ['api_key', 'event_type_uuid']
    }
  },
  {
    name: 'Cal.com',
    slug: 'cal-com',
    category: 'calendar',
    description: 'Open-source scheduling integration with Cal.com',
    long_description: 'Connect to Cal.com, the open-source Calendly alternative. Perfect for developers and businesses who prefer open-source solutions.',
    icon_url: 'https://cal.com/logo.svg',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['tutor', 'lawyer', 'accountant'],
    pricing_model: 'free',
    documentation_url: 'https://developer.cal.com/',
    supported_features: ['create', 'read', 'update', 'delete'],
    setup_instructions: {
      steps: [
        'Generate API key in Cal.com Settings',
        'Paste your API key below',
        'Configure event type and duration'
      ],
      required_fields: ['api_key']
    }
  },

  // PAYMENT GATEWAYS (5 integrations)
  {
    name: 'PayFast',
    slug: 'payfast',
    category: 'payment',
    description: 'South African payment gateway for online transactions',
    long_description: 'Accept online payments with PayFast, South Africa\'s leading payment gateway. Supports credit/debit cards, Instant EFT, Masterpass, SnapScan, and more.',
    icon_url: 'https://www.payfast.co.za/wp-content/themes/payfast/images/logo.png',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['ecommerce', 'retail', 'gym', 'salon', 'restaurant', 'hotel', 'airbnb'],
    pricing_model: 'free',
    is_featured: true,
    documentation_url: 'https://developers.payfast.co.za/',
    supported_features: ['payment', 'refund', 'subscription', 'webhook'],
    setup_instructions: {
      steps: [
        'Sign up at payfast.co.za',
        'Get your Merchant ID and Merchant Key from Settings',
        'Paste your credentials below',
        'Set up webhook URL (optional)'
      ],
      required_fields: ['merchant_id', 'merchant_key']
    }
  },
  {
    name: 'Yoco',
    slug: 'yoco',
    category: 'payment',
    description: 'South African POS and online payment solution',
    long_description: 'Accept card payments online and in-store with Yoco. Perfect for South African SMEs. No monthly fees, just simple per-transaction pricing.',
    icon_url: 'https://www.yoco.co.za/assets/images/yoco-logo.svg',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['retail', 'restaurant', 'salon', 'ecommerce'],
    pricing_model: 'free',
    is_featured: true,
    documentation_url: 'https://developer.yoco.com/',
    supported_features: ['payment', 'refund', 'webhook'],
    setup_instructions: {
      steps: [
        'Sign up for Yoco Business account',
        'Get your API key from Yoco Portal → Developers',
        'Paste your Secret Key below'
      ],
      required_fields: ['secret_key']
    }
  },
  {
    name: 'Ozow',
    slug: 'ozow',
    category: 'payment',
    description: 'Instant EFT payments for South Africa',
    long_description: 'Enable instant bank transfers with Ozow EFT. Perfect for high-value transactions. Customers pay directly from their bank account.',
    icon_url: 'https://www.ozow.com/images/ozow-logo.svg',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['ecommerce', 'retail', 'car_rental', 'hotel'],
    pricing_model: 'free',
    documentation_url: 'https://docs.ozow.com/',
    supported_features: ['payment', 'webhook'],
    setup_instructions: {
      steps: [
        'Register at ozow.com',
        'Complete merchant verification',
        'Get API Key and Site Code from dashboard',
        'Paste credentials below'
      ],
      required_fields: ['api_key', 'site_code', 'private_key']
    }
  },
  {
    name: 'Square',
    slug: 'square',
    category: 'payment',
    description: 'Global payment processing and POS system',
    long_description: 'Accept payments online and in-person with Square. Comprehensive payment solution with inventory management, invoicing, and more.',
    icon_url: 'https://squareup.com/us/en/press/assets/square-logo.svg',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['retail', 'restaurant', 'salon', 'ecommerce'],
    pricing_model: 'free',
    documentation_url: 'https://developer.squareup.com/',
    supported_features: ['payment', 'refund', 'webhook', 'inventory'],
    setup_instructions: {
      steps: [
        'Click "Connect Square"',
        'Sign in with your Square account',
        'Grant payment and business permissions',
        'Webhook will be configured automatically'
      ],
      required_scopes: ['PAYMENTS_READ', 'PAYMENTS_WRITE']
    }
  },

  // CRM SYSTEMS (4 integrations)
  {
    name: 'HubSpot CRM',
    slug: 'hubspot',
    category: 'crm',
    description: 'Sync leads and contacts with HubSpot CRM',
    long_description: 'Automatically create and update HubSpot contacts from WhatsApp conversations. Track deals, log activities, and manage your sales pipeline.',
    icon_url: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['real_estate', 'taxi', 'gym', 'medical', 'lawyer', 'accountant'],
    pricing_model: 'freemium',
    is_featured: true,
    documentation_url: 'https://developers.hubspot.com/',
    supported_features: ['create', 'read', 'update', 'webhook'],
    setup_instructions: {
      steps: [
        'Get HubSpot API key from Settings → Integrations → Private Apps',
        'Create a Private App with Contacts and Deals scopes',
        'Copy the API key',
        'Paste below'
      ],
      required_fields: ['api_key']
    }
  },
  {
    name: 'Salesforce',
    slug: 'salesforce',
    category: 'crm',
    description: 'Enterprise CRM integration with Salesforce',
    long_description: 'Connect to Salesforce to sync leads, contacts, accounts, and opportunities. Perfect for enterprise sales teams managing complex pipelines.',
    icon_url: 'https://www.salesforce.com/etc/designs/sfdc-www/images/logo-company.svg',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['real_estate', 'lawyer', 'accountant'],
    pricing_model: 'paid',
    documentation_url: 'https://developer.salesforce.com/',
    supported_features: ['create', 'read', 'update', 'webhook'],
    setup_instructions: {
      steps: [
        'Click "Connect Salesforce"',
        'Sign in with your Salesforce account',
        'Grant API access permissions',
        'Select which objects to sync (Leads, Contacts, etc.)'
      ],
      required_scopes: ['api', 'refresh_token']
    }
  },
  {
    name: 'Pipedrive',
    slug: 'pipedrive',
    category: 'crm',
    description: 'Sales pipeline management with Pipedrive',
    long_description: 'Sync WhatsApp leads to Pipedrive and track them through your sales pipeline. Automatic deal creation and activity logging.',
    icon_url: 'https://www.pipedrive.com/wp-content/uploads/2021/09/pipedrive-logo.svg',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['real_estate', 'car_rental', 'gym'],
    pricing_model: 'paid',
    documentation_url: 'https://developers.pipedrive.com/',
    supported_features: ['create', 'read', 'update', 'webhook'],
    setup_instructions: {
      steps: [
        'Get API token from Pipedrive Settings → Personal Preferences → API',
        'Copy your API token',
        'Paste below'
      ],
      required_fields: ['api_token']
    }
  },
  {
    name: 'Zoho CRM',
    slug: 'zoho',
    category: 'crm',
    description: 'Affordable CRM for small businesses',
    long_description: 'Integrate with Zoho CRM to manage contacts, deals, and sales activities. Great for SMEs looking for affordable CRM solutions.',
    icon_url: 'https://www.zoho.com/favicon.ico',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['real_estate', 'gym', 'medical'],
    pricing_model: 'freemium',
    documentation_url: 'https://www.zoho.com/crm/developer/',
    supported_features: ['create', 'read', 'update', 'webhook'],
    setup_instructions: {
      steps: [
        'Click "Connect Zoho CRM"',
        'Sign in with your Zoho account',
        'Grant CRM permissions',
        'Select data center region'
      ],
      required_scopes: ['ZohoCRM.modules.ALL']
    }
  },

  // COMMUNICATION (4 integrations)
  {
    name: 'Slack',
    slug: 'slack',
    category: 'communication',
    description: 'Send notifications to Slack channels',
    long_description: 'Get real-time notifications in Slack for new WhatsApp conversations, urgent queries, or booking confirmations. Keep your team in sync.',
    icon_url: 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['taxi', 'restaurant', 'hotel', 'airbnb', 'ecommerce'],
    pricing_model: 'free',
    is_featured: true,
    documentation_url: 'https://api.slack.com/',
    supported_features: ['webhook', 'notifications'],
    setup_instructions: {
      steps: [
        'Click "Connect Slack"',
        'Select your Slack workspace',
        'Choose which channel to post notifications',
        'Configure notification triggers'
      ],
      required_scopes: ['chat:write', 'incoming-webhook']
    }
  },
  {
    name: 'Gmail',
    slug: 'gmail',
    category: 'communication',
    description: 'Send and receive emails via Gmail',
    long_description: 'Automatically send email summaries of WhatsApp conversations, booking confirmations, or follow-ups. Full Gmail integration.',
    icon_url: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['medical', 'doctor', 'lawyer', 'accountant', 'real_estate'],
    pricing_model: 'free',
    documentation_url: 'https://developers.google.com/gmail/api',
    supported_features: ['send', 'read'],
    setup_instructions: {
      steps: [
        'Click "Connect Gmail"',
        'Sign in with your Google account',
        'Grant email sending permissions',
        'Configure email templates'
      ],
      required_scopes: ['https://www.googleapis.com/auth/gmail.send']
    }
  },
  {
    name: 'Telegram',
    slug: 'telegram',
    category: 'communication',
    description: 'Send notifications to Telegram channels',
    long_description: 'Forward WhatsApp messages to your Telegram group or channel. Perfect for team notifications and monitoring.',
    icon_url: 'https://telegram.org/img/t_logo.svg',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['taxi', 'restaurant', 'retail'],
    pricing_model: 'free',
    documentation_url: 'https://core.telegram.org/bots/api',
    supported_features: ['webhook', 'notifications'],
    setup_instructions: {
      steps: [
        'Create a Telegram Bot via @BotFather',
        'Get your Bot Token',
        'Add bot to your group/channel',
        'Get Chat ID and paste credentials below'
      ],
      required_fields: ['bot_token', 'chat_id']
    }
  },
  {
    name: 'Twilio SMS',
    slug: 'twilio-sms',
    category: 'communication',
    description: 'Send SMS notifications via Twilio',
    long_description: 'Send SMS reminders, confirmations, or alerts to customers. Useful for appointment reminders and urgent notifications.',
    icon_url: 'https://www.twilio.com/etc/designs/twilio-com/clientlib-all/img/favicons/favicon.ico',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['medical', 'doctor', 'salon', 'gym', 'taxi'],
    pricing_model: 'paid',
    documentation_url: 'https://www.twilio.com/docs/sms',
    supported_features: ['send'],
    setup_instructions: {
      steps: [
        'Sign up at twilio.com',
        'Get Account SID and Auth Token from console',
        'Purchase a phone number',
        'Paste credentials below'
      ],
      required_fields: ['account_sid', 'auth_token', 'phone_number']
    }
  },

  // E-COMMERCE (3 integrations)
  {
    name: 'Shopify',
    slug: 'shopify',
    category: 'ecommerce',
    description: 'Sync products and orders with Shopify store',
    long_description: 'Connect your Shopify store to answer product questions, check stock, process orders, and send tracking updates via WhatsApp.',
    icon_url: 'https://cdn.shopify.com/shopifycloud/web/assets/v1/shopify-icon.svg',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['ecommerce', 'retail'],
    pricing_model: 'free',
    is_featured: true,
    documentation_url: 'https://shopify.dev/',
    supported_features: ['products', 'orders', 'inventory', 'webhook'],
    setup_instructions: {
      steps: [
        'Click "Connect Shopify"',
        'Enter your Shopify store URL',
        'Sign in and grant permissions',
        'Webhook will be configured automatically'
      ],
      required_scopes: ['read_products', 'read_orders', 'write_orders']
    }
  },
  {
    name: 'WooCommerce',
    slug: 'woocommerce',
    category: 'ecommerce',
    description: 'WordPress e-commerce integration',
    long_description: 'Connect your WooCommerce store for product inquiries, order tracking, and customer support via WhatsApp.',
    icon_url: 'https://woocommerce.com/wp-content/themes/woo/images/logo-woocommerce.svg',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['ecommerce', 'retail'],
    pricing_model: 'free',
    documentation_url: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
    supported_features: ['products', 'orders', 'customers', 'webhook'],
    setup_instructions: {
      steps: [
        'Go to WooCommerce → Settings → Advanced → REST API',
        'Create new API key with Read/Write permissions',
        'Copy Consumer Key and Consumer Secret',
        'Paste below along with your store URL'
      ],
      required_fields: ['store_url', 'consumer_key', 'consumer_secret']
    }
  },
  {
    name: 'Wix Stores',
    slug: 'wix-stores',
    category: 'ecommerce',
    description: 'Integrate with Wix e-commerce platform',
    long_description: 'Connect your Wix online store to manage products, inventory, and orders through WhatsApp conversations.',
    icon_url: 'https://www.wix.com/favicon.ico',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['ecommerce', 'retail'],
    pricing_model: 'free',
    documentation_url: 'https://dev.wix.com/api/rest/wix-stores/',
    supported_features: ['products', 'orders', 'inventory'],
    setup_instructions: {
      steps: [
        'Click "Connect Wix"',
        'Sign in to your Wix account',
        'Grant Wix Stores permissions',
        'Select your site'
      ],
      required_scopes: ['wix-stores.orders', 'wix-stores.products']
    }
  },

  // SPECIALIZED INTEGRATIONS (8 integrations)
  {
    name: 'OpenTable',
    slug: 'opentable',
    category: 'specialized',
    description: 'Restaurant reservation system for fine dining',
    long_description: 'Sync reservations with OpenTable. Perfect for restaurants already using OpenTable for table management.',
    icon_url: 'https://www.opentable.com/favicon.ico',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['restaurant'],
    pricing_model: 'paid',
    documentation_url: 'https://platform.otrestaurant.com/',
    supported_features: ['reservations', 'availability', 'webhook'],
    setup_instructions: {
      steps: [
        'Contact OpenTable to enable API access',
        'Get your API credentials from OpenTable Portal',
        'Paste Client ID and Secret below'
      ],
      required_fields: ['client_id', 'client_secret', 'restaurant_id']
    }
  },
  {
    name: 'Mindbody',
    slug: 'mindbody',
    category: 'specialized',
    description: 'Fitness and wellness business management',
    long_description: 'Connect Mindbody for class bookings, membership management, and appointment scheduling. Perfect for gyms, salons, and wellness centers.',
    icon_url: 'https://www.mindbodyonline.com/sites/default/files/public/favicon.ico',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['gym', 'salon'],
    pricing_model: 'paid',
    documentation_url: 'https://developers.mindbodyonline.com/',
    supported_features: ['classes', 'appointments', 'memberships'],
    setup_instructions: {
      steps: [
        'Click "Connect Mindbody"',
        'Sign in with Mindbody credentials',
        'Grant API permissions',
        'Select location/site'
      ],
      required_scopes: ['ReadClasses', 'ReadAppointments', 'WriteAppointments']
    }
  },
  {
    name: 'DocuSign',
    slug: 'docusign',
    category: 'specialized',
    description: 'Electronic signature for contracts and agreements',
    long_description: 'Send documents for e-signature via WhatsApp. Perfect for real estate agents, lawyers, and any business requiring signed documents.',
    icon_url: 'https://www.docusign.com/sites/default/files/favicon.ico',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['real_estate', 'lawyer', 'accountant', 'car_rental'],
    pricing_model: 'paid',
    is_featured: true,
    documentation_url: 'https://developers.docusign.com/',
    supported_features: ['send', 'webhook', 'status'],
    setup_instructions: {
      steps: [
        'Click "Connect DocuSign"',
        'Sign in with DocuSign account',
        'Grant envelope sending permissions',
        'Configure template (optional)'
      ],
      required_scopes: ['signature', 'impersonation']
    }
  },
  {
    name: 'Zoom',
    slug: 'zoom',
    category: 'specialized',
    description: 'Video conferencing integration',
    long_description: 'Automatically create Zoom meetings for appointments. Share meeting links via WhatsApp for consultations, classes, or virtual appointments.',
    icon_url: 'https://st1.zoom.us/static/6.3.18522/image/new/ZoomLogo.png',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['tutor', 'doctor', 'medical', 'lawyer', 'accountant', 'gym'],
    pricing_model: 'freemium',
    is_featured: true,
    documentation_url: 'https://marketplace.zoom.us/docs/api-reference/introduction',
    supported_features: ['create', 'webhook'],
    setup_instructions: {
      steps: [
        'Click "Connect Zoom"',
        'Sign in with Zoom account',
        'Grant meeting creation permissions',
        'Meetings will be created automatically for bookings'
      ],
      required_scopes: ['meeting:write', 'meeting:read']
    }
  },
  {
    name: 'Google Meet',
    slug: 'google-meet',
    category: 'specialized',
    description: 'Google Meet video calls for appointments',
    long_description: 'Automatically generate Google Meet links for virtual appointments. Integrated with Google Calendar.',
    icon_url: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-64dp/logo_meet_2020q4_color_2x_web_64dp.png',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['tutor', 'doctor', 'medical', 'lawyer', 'accountant'],
    pricing_model: 'free',
    documentation_url: 'https://developers.google.com/meet',
    supported_features: ['create'],
    setup_instructions: {
      steps: [
        'Google Meet is automatically included with Google Calendar',
        'Enable "Add Google Meet video conferencing" in settings',
        'Meet links will be added to calendar events'
      ],
      required_scopes: ['https://www.googleapis.com/auth/calendar.events']
    }
  },

  // SOUTH AFRICAN SPECIALIZED (already covered Yoco, PayFast, Ozow)

  // DATA & PRODUCTIVITY (4 integrations)
  {
    name: 'Google Sheets',
    slug: 'google-sheets',
    category: 'productivity',
    description: 'Export data to Google Sheets spreadsheets',
    long_description: 'Automatically log conversations, bookings, or orders to Google Sheets. Perfect for custom reporting and data analysis.',
    icon_url: 'https://www.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png',
    requires_auth: true,
    auth_type: 'oauth',
    recommended_for_verticals: ['taxi', 'medical', 'real_estate', 'restaurant', 'salon', 'gym', 'retail', 'hotel', 'ecommerce'],
    pricing_model: 'free',
    is_featured: true,
    documentation_url: 'https://developers.google.com/sheets/api',
    supported_features: ['create', 'read', 'update'],
    setup_instructions: {
      steps: [
        'Click "Connect Google Sheets"',
        'Sign in with Google account',
        'Grant Sheets access',
        'Select or create a spreadsheet'
      ],
      required_scopes: ['https://www.googleapis.com/auth/spreadsheets']
    }
  },
  {
    name: 'Airtable',
    slug: 'airtable',
    category: 'productivity',
    description: 'Flexible database for business operations',
    long_description: 'Sync data to Airtable bases for flexible data management. Create custom workflows and automations with Airtable.',
    icon_url: 'https://www.airtable.com/images/favicon/baymax/favicon-32x32.png',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['real_estate', 'ecommerce', 'retail'],
    pricing_model: 'freemium',
    documentation_url: 'https://airtable.com/developers/web/api/introduction',
    supported_features: ['create', 'read', 'update', 'delete'],
    setup_instructions: {
      steps: [
        'Create Personal Access Token in Airtable',
        'Get Base ID from Airtable API docs',
        'Get Table ID from your base',
        'Paste credentials below'
      ],
      required_fields: ['access_token', 'base_id', 'table_id']
    }
  },
  {
    name: 'Zapier Webhooks',
    slug: 'zapier',
    category: 'productivity',
    description: 'Connect to 5000+ apps via Zapier',
    long_description: 'Use Zapier webhooks to connect BotFlow with 5000+ apps. Ultimate flexibility for custom integrations.',
    icon_url: 'https://cdn.zapier.com/zapier/images/favicon.ico',
    requires_auth: false,
    auth_type: 'none',
    recommended_for_verticals: ['taxi', 'medical', 'real_estate', 'ecommerce', 'restaurant', 'salon', 'gym', 'retail', 'hotel'],
    pricing_model: 'freemium',
    is_featured: true,
    documentation_url: 'https://zapier.com/apps/webhook/integrations',
    supported_features: ['webhook'],
    setup_instructions: {
      steps: [
        'Create a Zap in Zapier',
        'Add "Webhooks by Zapier" as trigger',
        'Copy your webhook URL',
        'Paste webhook URL below'
      ],
      required_fields: ['webhook_url']
    }
  },
  {
    name: 'Make (Integromat)',
    slug: 'make',
    category: 'productivity',
    description: 'Visual automation platform for workflows',
    long_description: 'Connect to Make (formerly Integromat) for visual workflow automation. Supports 1000+ apps with advanced logic.',
    icon_url: 'https://www.make.com/en/favicon.ico',
    requires_auth: false,
    auth_type: 'none',
    recommended_for_verticals: ['ecommerce', 'real_estate', 'retail'],
    pricing_model: 'freemium',
    documentation_url: 'https://www.make.com/en/api-documentation',
    supported_features: ['webhook'],
    setup_instructions: {
      steps: [
        'Create a Scenario in Make',
        'Add Webhook module',
        'Copy the webhook URL',
        'Paste below'
      ],
      required_fields: ['webhook_url']
    }
  },

  // ANALYTICS (2 integrations)
  {
    name: 'Google Analytics',
    slug: 'google-analytics',
    category: 'analytics',
    description: 'Track WhatsApp bot analytics in Google Analytics',
    long_description: 'Send conversation metrics and events to Google Analytics 4 for detailed analytics and reporting.',
    icon_url: 'https://www.google.com/analytics/static/7a95caaf98/images/favicon.ico',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['ecommerce', 'retail', 'restaurant'],
    pricing_model: 'free',
    documentation_url: 'https://developers.google.com/analytics',
    supported_features: ['events', 'conversions'],
    setup_instructions: {
      steps: [
        'Get your GA4 Measurement ID from Google Analytics',
        'Get API Secret from Admin → Data Streams',
        'Paste credentials below'
      ],
      required_fields: ['measurement_id', 'api_secret']
    }
  },
  {
    name: 'Mixpanel',
    slug: 'mixpanel',
    category: 'analytics',
    description: 'Product analytics for user behavior',
    long_description: 'Track user journeys, conversation flows, and conversion funnels with Mixpanel analytics.',
    icon_url: 'https://mixpanel.com/wp-content/uploads/2021/07/favicon.ico',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['ecommerce', 'gym', 'salon'],
    pricing_model: 'freemium',
    documentation_url: 'https://developer.mixpanel.com/',
    supported_features: ['events', 'users'],
    setup_instructions: {
      steps: [
        'Get Project Token from Mixpanel Settings',
        'Paste token below'
      ],
      required_fields: ['project_token']
    }
  },

  // ADDITIONAL SPECIALIZED
  {
    name: 'Mailchimp',
    slug: 'mailchimp',
    category: 'communication',
    description: 'Email marketing and newsletter automation',
    long_description: 'Add WhatsApp contacts to Mailchimp lists for email marketing campaigns. Sync customer data and preferences.',
    icon_url: 'https://mailchimp.com/release/plums/cxp/images/apple-touch-icon-192.ce8f3e6d.png',
    requires_auth: true,
    auth_type: 'api_key',
    recommended_for_verticals: ['ecommerce', 'retail', 'restaurant', 'gym', 'salon'],
    pricing_model: 'freemium',
    documentation_url: 'https://mailchimp.com/developer/',
    supported_features: ['contacts', 'lists', 'campaigns'],
    setup_instructions: {
      steps: [
        'Get API key from Mailchimp → Account → Extras → API keys',
        'Paste API key below',
        'Select audience/list to sync contacts'
      ],
      required_fields: ['api_key', 'audience_id']
    }
  }
];
