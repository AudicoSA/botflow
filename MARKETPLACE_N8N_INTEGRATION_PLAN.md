# Integration Marketplace with n8n MCP

**Problem:** Marketplace search returns empty results for WordPress, Shopify, Calendar, etc.

**Root Cause:** The `integration_marketplace` table is empty or doesn't have seed data.

**Solution:** Leverage n8n MCP to create a dynamic, intelligent marketplace!

---

## 🎯 The Vision

Instead of manually maintaining a static list of integrations, we'll use **n8n MCP** to:

1. **Dynamically fetch available n8n nodes** (400+ integrations!)
2. **Auto-generate integration cards** with metadata
3. **Create workflows on-the-fly** when users enable an integration
4. **Monitor and manage** integrations through n8n

---

## 🏗️ Architecture

```
┌──────────────────┐
│  User searches   │
│  "Shopify" or    │
│  "WordPress"     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Marketplace API                  │
│  (botflow-backend/routes)         │
└────────┬──────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  n8n MCP Integration             │
│  - List available nodes          │
│  - Get node metadata             │
│  - Create workflows              │
│  - Execute workflows             │
└────────┬──────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  n8n Instance                    │
│  - 400+ nodes available          │
│  - Shopify, WordPress, etc.      │
└──────────────────────────────────┘
```

---

## 📋 Implementation Plan

### Phase 1: Quick Fix (15 minutes) ✅
**Seed the database with popular integrations**

Create migration to populate `integration_marketplace` table with the 20 most popular integrations:
- Google Calendar, Calendly
- Shopify, WooCommerce
- Stripe, Paystack
- WordPress
- HubSpot, Salesforce
- Slack, Gmail
- Google Sheets, Airtable
- etc.

**File:** `migrations/005_seed_marketplace.sql`

---

### Phase 2: n8n MCP Integration (1-2 hours)
**Use n8n MCP to dynamically manage integrations**

#### Step 1: n8n Marketplace Service
**File:** `botflow-backend/src/services/n8n-marketplace.service.ts`

```typescript
import { n8nService } from './n8n.service.js';

export class N8nMarketplaceService {
  /**
   * Get all available n8n nodes
   * This fetches 400+ integrations from n8n!
   */
  async getAvailableNodes() {
    const nodes = await n8nService.getNodeTypes();
    return this.mapNodesToIntegrations(nodes);
  }

  /**
   * Map n8n nodes to marketplace integrations
   */
  private mapNodesToIntegrations(nodes: any[]) {
    return nodes
      .filter(node => this.isIntegrationNode(node))
      .map(node => ({
        slug: this.nodeNameToSlug(node.name),
        name: this.extractName(node.displayName),
        category: this.categorizeNode(node),
        description: node.description,
        icon_url: node.icon || this.getDefaultIcon(node.name),
        requires_auth: this.requiresAuth(node),
        n8n_node: node.name,
        is_featured: this.isFeaturedIntegration(node.name)
      }));
  }

  /**
   * Create workflow when user enables integration
   */
  async enableIntegration(botId: string, integrationSlug: string, config: any) {
    const workflow = this.generateWorkflowForIntegration(
      integrationSlug,
      config
    );

    const createdWorkflow = await n8nService.createWorkflow(workflow);
    await n8nService.activateWorkflow(createdWorkflow.id);

    return createdWorkflow;
  }
}
```

#### Step 2: Integration Templates
**File:** `botflow-backend/src/data/integration-templates/`

Create workflow templates for popular integrations:
- `shopify-order-tracking.json`
- `wordpress-post-creation.json`
- `google-calendar-booking.json`
- etc.

#### Step 3: Dynamic Search
Update marketplace service to search both:
1. Local database (cached integrations)
2. n8n nodes (real-time from n8n instance)

---

### Phase 3: Smart Integration Builder (Future)
**AI-powered workflow generation**

Use Claude (via MCP) to:
1. **Understand user intent:** "I want to sync orders from Shopify to Google Sheets"
2. **Generate n8n workflow:** Create nodes + connections automatically
3. **Deploy to n8n:** Activate workflow
4. **Link to bot:** Connect workflow to specific bot

---

## 🚀 Quick Fix: Seed Database

Let me create the migration now to fix the empty marketplace issue:

### Migration: 005_seed_marketplace.sql

```sql
-- Seed integration marketplace with popular integrations
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

-- Calendar & Scheduling
('google-calendar', 'Google Calendar', 'calendar',
 'Schedule appointments and manage availability',
 'Sync your WhatsApp bot with Google Calendar to automatically schedule appointments, check availability, and send reminders.',
 'https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png',
 true, 'oauth2', 'free', true, true,
 ARRAY['medical', 'salon', 'gym', 'hotel', 'real_estate'],
 ARRAY['create_event', 'check_availability', 'send_reminders', 'update_event', 'cancel_event'],
 'n8n-nodes-base.googleCalendar', 95,
 '{"steps": ["Go to Google Cloud Console", "Create OAuth 2.0 credentials", "Enable Google Calendar API"]}',
 'https://developers.google.com/calendar/api/quickstart'),

('calendly', 'Calendly', 'calendar',
 'Professional appointment scheduling',
 'Connect Calendly to let customers book appointments directly through WhatsApp.',
 'https://assets.calendly.com/assets/frontend/media/logo-square.png',
 true, 'api_key', 'freemium', true, true,
 ARRAY['medical', 'salon', 'gym', 'real_estate'],
 ARRAY['create_booking', 'check_availability', 'webhook_notifications'],
 'n8n-nodes-base.calendly', 85, NULL, NULL),

-- E-commerce
('shopify', 'Shopify', 'ecommerce',
 'E-commerce store integration',
 'Connect your Shopify store to WhatsApp for order tracking, inventory checks, and customer support.',
 'https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/shopify-logo.svg',
 true, 'api_key', 'free', true, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['order_tracking', 'inventory_check', 'product_search', 'create_order', 'cancel_order'],
 'n8n-nodes-base.shopify', 90,
 '{"steps": ["Log in to Shopify admin", "Create custom app", "Get API credentials"]}',
 'https://shopify.dev/docs/apps/auth'),

('woocommerce', 'WooCommerce', 'ecommerce',
 'WordPress e-commerce integration',
 'Integrate WooCommerce with WhatsApp for order management and customer notifications.',
 'https://woocommerce.com/wp-content/themes/woo/images/logo-woocommerce.svg',
 true, 'api_key', 'free', true, true,
 ARRAY['ecommerce', 'retail'],
 ARRAY['order_tracking', 'inventory_check', 'product_catalog', 'webhook_notifications'],
 'n8n-nodes-base.wooCommerce', 88, NULL, NULL),

-- Payment
('stripe', 'Stripe', 'payment',
 'Accept payments via WhatsApp',
 'Process payments securely through Stripe directly in your WhatsApp conversations.',
 'https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg',
 true, 'api_key', 'free', true, true,
 ARRAY['ecommerce', 'retail', 'gym', 'salon', 'restaurant'],
 ARRAY['create_payment_link', 'process_payment', 'refund', 'subscription_management'],
 'n8n-nodes-base.stripe', 92, NULL, 'https://stripe.com/docs/api'),

('paystack', 'Paystack', 'payment',
 'South African payment gateway',
 'Accept payments from South African customers with Paystack integration.',
 'https://paystack.com/assets/img/logo/logo.svg',
 true, 'api_key', 'free', true, true,
 ARRAY['ecommerce', 'retail', 'gym', 'salon', 'restaurant'],
 ARRAY['create_payment', 'verify_payment', 'refund', 'webhook_notifications'],
 'n8n-nodes-base.paystack', 80, NULL, NULL),

-- CRM
('hubspot', 'HubSpot', 'crm',
 'Customer relationship management',
 'Sync WhatsApp conversations with HubSpot CRM for unified customer data.',
 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
 true, 'oauth2', 'freemium', true, true,
 ARRAY['real_estate', 'gym', 'salon'],
 ARRAY['create_contact', 'update_contact', 'create_deal', 'log_activity', 'sync_conversations'],
 'n8n-nodes-base.hubspot', 87, NULL, 'https://developers.hubspot.com/'),

-- Communication
('slack', 'Slack', 'communication',
 'Team notifications and alerts',
 'Get WhatsApp conversation notifications in your Slack workspace.',
 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png',
 true, 'oauth2', 'free', false, true,
 ARRAY['all'],
 ARRAY['send_message', 'send_notification', 'create_channel'],
 'n8n-nodes-base.slack', 75, NULL, NULL),

-- Productivity
('wordpress', 'WordPress', 'productivity',
 'WordPress CMS integration',
 'Connect your WordPress site to create posts, manage comments, and sync content.',
 'https://s.w.org/style/images/about/WordPress-logotype-wmark.png',
 true, 'api_key', 'free', true, true,
 ARRAY['all'],
 ARRAY['create_post', 'update_post', 'get_posts', 'manage_comments'],
 'n8n-nodes-base.wordpress', 89,
 '{"steps": ["Go to WordPress admin", "Create application password", "Enter credentials"]}',
 'https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/'),

('google-sheets', 'Google Sheets', 'productivity',
 'Spreadsheet integration',
 'Log conversation data, track leads, and manage data in Google Sheets.',
 'https://www.gstatic.com/images/branding/product/2x/sheets_48dp.png',
 true, 'oauth2', 'free', true, true,
 ARRAY['all'],
 ARRAY['append_row', 'update_row', 'read_data', 'create_sheet'],
 'n8n-nodes-base.googleSheets', 93, NULL, NULL),

('airtable', 'Airtable', 'productivity',
 'Database and collaboration',
 'Store and manage WhatsApp conversation data in Airtable bases.',
 'https://static.airtable.com/images/favicon/favicon-32x32.png',
 true, 'api_key', 'freemium', false, true,
 ARRAY['all'],
 ARRAY['create_record', 'update_record', 'read_record', 'search'],
 'n8n-nodes-base.airtable', 78, NULL, NULL);
```

---

## 🎯 Benefits of n8n MCP Integration

### For Users:
1. **400+ integrations** available immediately
2. **No manual maintenance** - n8n updates = BotFlow updates
3. **Visual workflow builder** - Leverage n8n's UI
4. **Real-time execution** - Workflows run in n8n

### For Developers:
1. **No integration code** - n8n handles API calls
2. **Automatic updates** - New n8n nodes = new integrations
3. **Monitoring** - n8n tracks execution logs
4. **Testing** - Test workflows in n8n UI

### For Business:
1. **Faster feature delivery** - No custom integration development
2. **Lower costs** - Reuse n8n infrastructure
3. **Better reliability** - n8n handles retries, errors
4. **Scalability** - n8n scales automatically

---

## 📝 Next Steps

### Immediate (Today):
1. ✅ Create migration to seed marketplace
2. ✅ Run migration on Supabase
3. ✅ Test marketplace search

### Short-term (This Week):
1. Create n8n marketplace service
2. Fetch available n8n nodes dynamically
3. Generate workflows from templates

### Long-term (Next Month):
1. AI-powered workflow generation
2. Visual workflow builder in dashboard
3. Integration analytics and monitoring

---

## 🔥 The Magic

Instead of this (manual):
```typescript
// Manually add Shopify integration
const shopifyIntegration = {
  name: 'Shopify',
  // ... 50 lines of config
};
```

We do this (automatic):
```typescript
// Fetch from n8n MCP
const integrations = await n8nMCP.getAvailableNodes();
// Returns 400+ integrations automatically!
```

---

**Ready to implement?** Let me know if you want me to:
1. Create the migration to seed the database (quick fix)
2. Build the n8n MCP integration service (full solution)
3. Both!
