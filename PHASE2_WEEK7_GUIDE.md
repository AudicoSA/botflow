# Phase 2 Week 7: Integration Marketplace - Full Completion Guide

**Status:** Days 1-5 Complete, Days 6-7 In Progress
**Goal:** Fix RLS policies, complete integration enable/disable functionality, and prepare for n8n-MCP integration
**Created:** 2026-01-18
**Prerequisites:** Week 1-6 Complete, Marketplace seeded with 130+ integrations

---

## Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Critical Fix: RLS Policy Infinite Recursion](#critical-fix-rls-policy-infinite-recursion)
4. [Integration Enable/Disable Flow](#integration-enabledisable-flow)
5. [Testing Each Integration Type](#testing-each-integration-type)
6. [n8n-MCP Integration Plan](#n8n-mcp-integration-plan)
7. [Day-by-Day Plan](#day-by-day-plan)
8. [Success Criteria](#success-criteria)

---

## Overview

### What We've Accomplished

1. **Marketplace Seeded:** 130+ integrations across 8 categories
   - 85+ global integrations (Shopify, Stripe, Google Calendar, etc.)
   - 44+ South African integrations (PayFast, Yoco, Takealot, The Courier Guy, etc.)

2. **Icons Fixed:** All SA integrations now use Clearbit Logo API (`https://logo.clearbit.com/{domain}`)

3. **Frontend Working:** Marketplace page at `/dashboard/marketplace` displays:
   - 100 integrations visible
   - 30 featured integrations
   - 41 free integrations
   - Category filtering
   - Search functionality

### What Needs Fixing

1. **RLS Policy Infinite Recursion** - Critical blocker for enable/disable
2. **Integration Enable Flow** - Currently fails with RLS error
3. **Credential Validation** - Test API keys before saving
4. **n8n Workflow Templates** - Connect integrations to actual workflows

---

## Current Status

### Working
- [x] Marketplace listing (`GET /api/marketplace`)
- [x] Category filtering
- [x] Search functionality
- [x] Integration details (`GET /api/marketplace/:slug`)
- [x] Statistics endpoint (`GET /api/marketplace/stats`)

### Broken (RLS Issue)
- [ ] Enable integration (`POST /api/marketplace/:slug/enable`)
- [ ] Update integration (`PATCH /api/marketplace/bot-integrations/:id`)
- [ ] Delete integration (`DELETE /api/marketplace/bot-integrations/:id`)
- [ ] Get bot integrations (`GET /api/marketplace/bots/:botId/integrations`)

### Error Message
```
Failed to enable integration: infinite recursion detected in policy for relation "organization_members"
```

---

## Critical Fix: RLS Policy Infinite Recursion

### Root Cause Analysis

The RLS policies in `004_create_integration_marketplace_v2.sql` reference `organization_members` which itself has RLS policies that reference other tables, creating a circular dependency.

**Current Policy (Problematic):**
```sql
CREATE POLICY "Users can view their own bot integrations"
  ON bot_integrations FOR SELECT
  USING (
    bot_id IN (
      SELECT b.id::TEXT FROM bots b
      WHERE b.organization_id IN (
        SELECT om.organization_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    )
  );
```

### Solution Options

#### Option A: Use Service Role Key (Recommended for Backend)

The backend already uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS entirely. The issue is likely that:
1. RLS is being triggered even with service role key
2. OR the Supabase client isn't configured correctly

**Fix in `integration-marketplace.service.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Use supabaseAdmin for all bot_integrations operations
```

#### Option B: Fix RLS Policies (Database Migration)

**File:** `botflow-backend/migrations/010_fix_rls_infinite_recursion.sql`

```sql
-- Migration 010: Fix RLS Infinite Recursion
-- The organization_members RLS policy creates circular references
-- Solution: Use SECURITY DEFINER functions to break the cycle

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own bot integrations" ON bot_integrations;
DROP POLICY IF EXISTS "Users can insert bot integrations for their bots" ON bot_integrations;
DROP POLICY IF EXISTS "Users can update their own bot integrations" ON bot_integrations;
DROP POLICY IF EXISTS "Users can delete their own bot integrations" ON bot_integrations;
DROP POLICY IF EXISTS "Users can view their own integration logs" ON integration_logs;

-- Create a SECURITY DEFINER function to check organization membership
-- This runs with elevated privileges and avoids RLS recursion
CREATE OR REPLACE FUNCTION public.user_has_bot_access(p_bot_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_has_access BOOLEAN;
BEGIN
  -- Get the organization_id for this bot
  SELECT organization_id INTO v_org_id
  FROM bots
  WHERE id = p_bot_id;

  IF v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is a member of this organization
  SELECT EXISTS(
    SELECT 1 FROM organization_members
    WHERE organization_id = v_org_id
    AND user_id = auth.uid()
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$;

-- Create new policies using the SECURITY DEFINER function
CREATE POLICY "Users can view their own bot integrations"
  ON bot_integrations FOR SELECT
  USING (public.user_has_bot_access(bot_id));

CREATE POLICY "Users can insert bot integrations for their bots"
  ON bot_integrations FOR INSERT
  WITH CHECK (public.user_has_bot_access(bot_id));

CREATE POLICY "Users can update their own bot integrations"
  ON bot_integrations FOR UPDATE
  USING (public.user_has_bot_access(bot_id));

CREATE POLICY "Users can delete their own bot integrations"
  ON bot_integrations FOR DELETE
  USING (public.user_has_bot_access(bot_id));

-- Fix integration_logs policy similarly
CREATE OR REPLACE FUNCTION public.user_has_bot_integration_access(p_bot_integration_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_id TEXT;
BEGIN
  SELECT bot_id INTO v_bot_id
  FROM bot_integrations
  WHERE id = p_bot_integration_id;

  IF v_bot_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.user_has_bot_access(v_bot_id);
END;
$$;

CREATE POLICY "Users can view their own integration logs"
  ON integration_logs FOR SELECT
  USING (public.user_has_bot_integration_access(bot_integration_id));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_has_bot_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_bot_integration_access(UUID) TO authenticated;
```

#### Option C: Disable RLS for Bot Integrations (Simplest)

If security is handled at the application layer:

```sql
-- Disable RLS for bot_integrations (application handles security)
ALTER TABLE bot_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs DISABLE ROW LEVEL SECURITY;
```

**Note:** Only do this if the backend validates organization membership before all operations.

### Recommended Approach

1. **Immediate Fix:** Use Option A (service role client) to unblock development
2. **Proper Fix:** Apply Option B migration for production-grade RLS

---

## Integration Enable/Disable Flow

### Current Flow (Backend)

```
User clicks "Enable" on PayFast
  ↓
Frontend: POST /api/marketplace/payfast/enable
  Body: { bot_id: "xxx", credentials: { api_key: "sk_live_..." } }
  ↓
Backend: integrationMarketplaceService.enableIntegration()
  1. Get integration by slug
  2. Check if already enabled
  3. Encrypt credentials
  4. Insert into bot_integrations  ← FAILS HERE (RLS)
  5. Log event
  6. Increment popularity
  ↓
Response: { bot_integration: {...}, message: "Integration enabled" }
```

### After Fix

```typescript
// integration-marketplace.service.ts - Updated enableIntegration method

async enableIntegration(
  integrationSlug: string,
  request: EnableIntegrationRequest
): Promise<BotIntegration> {
  const { bot_id, credentials, configuration } = request;

  // 1. Validate bot exists and user has access (do this in route handler)

  // 2. Get integration details
  const integration = await this.getIntegration(integrationSlug);

  // 3. Check if already enabled (use admin client)
  const { data: existing } = await supabaseAdmin
    .from('bot_integrations')
    .select('*')
    .eq('bot_id', bot_id)
    .eq('integration_id', integration.id)
    .single();

  if (existing) {
    throw new Error('Integration already enabled for this bot');
  }

  // 4. Validate credentials before saving (if applicable)
  if (credentials && integration.requires_auth) {
    await this.validateCredentials(integration.slug, credentials);
  }

  // 5. Encrypt and store
  const encryptedCredentials = credentials
    ? encryptionService.encrypt(credentials)
    : encryptionService.encrypt({});

  const { data: botIntegration, error } = await supabaseAdmin
    .from('bot_integrations')
    .insert({
      bot_id,
      integration_id: integration.id,
      credentials: encryptedCredentials,
      configuration: configuration || {},
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to enable integration: ${error.message}`);
  }

  return botIntegration as BotIntegration;
}
```

---

## Testing Each Integration Type

### Payment Integrations

#### PayFast (South Africa)
```typescript
// Credentials required
{
  merchant_id: "10000100",
  merchant_key: "46f0cd694581a",
  passphrase: "optional-security-passphrase"
}

// Validation endpoint
POST https://api.payfast.co.za/ping
Headers: { "merchant-id": "xxx" }

// Expected: 200 OK
```

#### Paystack (South Africa)
```typescript
// Credentials required
{
  secret_key: "sk_test_xxx",
  public_key: "pk_test_xxx"
}

// Validation endpoint
GET https://api.paystack.co/balance
Headers: { "Authorization": "Bearer sk_test_xxx" }

// Expected: { status: true, data: [...] }
```

#### Yoco (South Africa)
```typescript
// Credentials required
{
  secret_key: "sk_test_xxx"
}

// Validation endpoint
GET https://online.yoco.com/v1/businesses/me
Headers: { "Authorization": "Bearer sk_test_xxx" }
```

### E-commerce Integrations

#### Shopify
```typescript
// Credentials required
{
  api_key: "shpat_xxx",
  store_url: "mystore.myshopify.com"
}

// Validation
GET https://mystore.myshopify.com/admin/api/2024-01/shop.json
Headers: { "X-Shopify-Access-Token": "shpat_xxx" }
```

#### WooCommerce
```typescript
// Credentials required
{
  consumer_key: "ck_xxx",
  consumer_secret: "cs_xxx",
  store_url: "https://mystore.com"
}

// Validation
GET https://mystore.com/wp-json/wc/v3/orders?per_page=1
Auth: Basic (consumer_key:consumer_secret)
```

#### Takealot (South Africa)
```typescript
// Credentials required (Seller Portal API)
{
  api_key: "xxx",
  seller_id: "xxx"
}

// Note: Takealot API is invite-only for sellers
// Test with mock data initially
```

### Logistics Integrations

#### The Courier Guy (South Africa)
```typescript
// Credentials required
{
  account_number: "xxx",
  password: "xxx"
}

// Validation endpoint
POST https://api.thecourierguy.co.za/v1/auth/login
Body: { accountNumber: "xxx", password: "xxx" }
```

#### ShipLogic (South Africa)
```typescript
// Credentials required
{
  api_key: "xxx"
}

// Validation endpoint
GET https://api.shiplogic.com/v1/rates
Headers: { "X-API-KEY": "xxx" }
```

### Calendar Integrations

#### Google Calendar (Already Built)
```typescript
// OAuth flow - already implemented
// Tokens stored encrypted in credentials

// Validation: Check token refresh works
POST https://oauth2.googleapis.com/token
Body: { refresh_token, client_id, client_secret, grant_type: "refresh_token" }
```

#### iCal Sync (For Airbnb Template)
```typescript
// Credentials required
{
  ical_urls: [
    "https://www.airbnb.com/calendar/ical/xxx.ics",
    "https://www.booking.com/calendar/xxx.ics"
  ]
}

// Validation: Fetch and parse each URL
GET <ical_url>
// Parse ICS format, check for VEVENT entries
```

---

## n8n-MCP Integration Plan

### Overview

n8n-MCP (https://github.com/czlonkowski/n8n-mcp) exposes n8n's 1000+ nodes via Model Context Protocol, enabling:
- Dynamic discovery of all n8n integrations
- AI-powered workflow suggestions
- Automatic credential requirements detection

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   BotFlow Backend                            │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Marketplace │ ←→ │  n8n-MCP     │ ←→ │  n8n Cloud   │  │
│  │   Service    │    │  Client      │    │  Instance    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                              ↓                              │
│                     ┌──────────────┐                        │
│                     │  Node Cache  │                        │
│                     │  (Redis)     │                        │
│                     └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Install n8n-MCP Server

```bash
# Clone and set up n8n-MCP
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp
npm install
npm run build

# Configure environment
cp .env.example .env
# Add n8n credentials
```

#### Step 2: Create MCP Client Service

**File:** `botflow-backend/src/services/n8n-mcp.service.ts`

```typescript
import { Client } from '@modelcontextprotocol/sdk';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';

interface N8nNode {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  group: string[];
  version: number;
  defaults: Record<string, any>;
  credentials: Array<{
    name: string;
    required: boolean;
  }>;
}

export class N8nMcpService {
  private client: Client | null = null;
  private cacheKey = 'n8n:mcp:nodes';
  private cacheTTL = 3600; // 1 hour

  async connect(): Promise<void> {
    // Connect to n8n-MCP server via stdio or SSE
    this.client = new Client({
      name: 'botflow',
      version: '1.0.0',
    });

    await this.client.connect({
      // Connection config based on n8n-MCP setup
    });

    logger.info('Connected to n8n-MCP server');
  }

  async getAllNodes(): Promise<N8nNode[]> {
    // Check cache first
    const cached = await redis.get(this.cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    if (!this.client) {
      await this.connect();
    }

    // Call MCP tool to list all nodes
    const result = await this.client!.callTool({
      name: 'list_nodes',
      arguments: {},
    });

    const nodes = result.content as N8nNode[];

    // Cache for 1 hour
    await redis.setex(this.cacheKey, this.cacheTTL, JSON.stringify(nodes));

    return nodes;
  }

  async getNodesByCategory(category: string): Promise<N8nNode[]> {
    const allNodes = await this.getAllNodes();
    return allNodes.filter(node =>
      node.group.includes(category) ||
      node.group.includes(category.toLowerCase())
    );
  }

  async searchNodes(query: string): Promise<N8nNode[]> {
    const allNodes = await this.getAllNodes();
    const queryLower = query.toLowerCase();

    return allNodes.filter(node =>
      node.displayName.toLowerCase().includes(queryLower) ||
      node.description.toLowerCase().includes(queryLower) ||
      node.name.toLowerCase().includes(queryLower)
    );
  }

  async getNodeCredentials(nodeName: string): Promise<any[]> {
    if (!this.client) {
      await this.connect();
    }

    const result = await this.client!.callTool({
      name: 'get_node_credentials',
      arguments: { nodeName },
    });

    return result.content as any[];
  }

  // Convert n8n node to marketplace integration format
  nodeToIntegration(node: N8nNode): any {
    return {
      slug: `n8n-${node.name}`,
      name: node.displayName,
      description: node.description,
      category: this.mapCategory(node.group),
      icon_url: node.icon,
      is_n8n_node: true,
      requires_auth: node.credentials.length > 0,
      auth_type: node.credentials.length > 0 ? 'api_key' : 'none',
      n8n_node_type: node.name,
      pricing_model: 'free',
      popularity_score: 50, // Default score for n8n nodes
      is_featured: false,
    };
  }

  private mapCategory(groups: string[]): string {
    const categoryMap: Record<string, string> = {
      'transform': 'productivity',
      'output': 'communication',
      'input': 'communication',
      'utility': 'productivity',
      'flow': 'productivity',
      'marketing': 'communication',
      'analytics': 'analytics',
      'development': 'specialized',
      'finance': 'payment',
      'sales': 'crm',
    };

    for (const group of groups) {
      const mapped = categoryMap[group.toLowerCase()];
      if (mapped) return mapped;
    }

    return 'specialized';
  }
}

export const n8nMcpService = new N8nMcpService();
```

#### Step 3: Integrate with Marketplace

```typescript
// Update marketplace.ts route

fastify.get('/', async (request, reply) => {
  const query = request.query as ListIntegrationsQuery;

  // Get database integrations
  const dbResult = await integrationMarketplaceService.listIntegrations(query);

  // Get n8n-MCP integrations (if enabled)
  let allIntegrations = dbResult.integrations;

  if (env.N8N_MCP_ENABLED && !query.category) {
    try {
      const n8nNodes = await n8nMcpService.getAllNodes();
      const n8nIntegrations = n8nNodes.map(node =>
        n8nMcpService.nodeToIntegration(node)
      );

      // Merge and deduplicate
      const dbSlugs = new Set(dbResult.integrations.map(i => i.slug));
      const uniqueN8nIntegrations = n8nIntegrations.filter(i => !dbSlugs.has(i.slug));

      allIntegrations = [...dbResult.integrations, ...uniqueN8nIntegrations];
    } catch (error) {
      logger.warn({ error }, 'Failed to fetch n8n-MCP integrations');
    }
  }

  return reply.send({
    integrations: allIntegrations,
    total: allIntegrations.length,
    // ... rest of response
  });
});
```

---

## Day-by-Day Plan

### Day 1: Fix RLS Policy Issue ✅ COMPLETE
- [x] Analyze current RLS policies in Supabase
- [x] Create migration 010_fix_rls_infinite_recursion.sql
- [x] Update integration-marketplace.service.ts to use supabaseAdmin
- [x] Created SECURITY DEFINER functions for database-level fix

### Day 2-3: Credential Validation ✅ COMPLETE
- [x] Implement validateCredentials() method
- [x] Add validation for PayFast, Paystack, Yoco
- [x] Add validation for Shopify, WooCommerce
- [x] Add validation for The Courier Guy, ShipLogic
- [x] Add validation for iCal Sync, Clickatell, BulkSMS
- [x] Add /api/marketplace/:slug/validate-credentials endpoint
- [x] Integrate validation into enableIntegration() and updateIntegration()

### Day 4-5: n8n-MCP Integration ✅ COMPLETE
- [x] Create n8n-mcp.service.ts
- [x] Implement getAllNodes() with caching
- [x] Implement node-to-integration conversion
- [x] Add Clearbit Logo API for icons
- [x] Integrate with n8n-marketplace.service.ts
- [x] Add N8N_MCP_ENABLED and N8N_MCP_SERVER_URL env variables

### Day 6: Frontend Updates (IN PROGRESS)
- [ ] Update marketplace page for n8n integrations
- [ ] Add "n8n powered" badge
- [ ] Update integration detail modal
- [ ] Test filtering with 1000+ integrations

### Day 7: Testing & Documentation (PENDING)
- [ ] End-to-end testing
- [ ] Performance testing with large dataset
- [ ] Update API documentation
- [ ] Create user guide for integrations

---

## Success Criteria

### RLS Fix
- [ ] Enable integration returns 201 Created (not 500 error)
- [ ] Bot integrations visible at `/dashboard/integrations`
- [ ] Disable integration works
- [ ] Logs recorded in integration_logs table

### Credential Validation
- [ ] Invalid PayFast credentials show clear error
- [ ] Invalid Shopify URL/key shows clear error
- [ ] OAuth integrations redirect correctly

### n8n-MCP
- [ ] Marketplace shows 1000+ integrations
- [ ] Search works across all integrations
- [ ] Node credentials detected automatically
- [ ] Performance: <500ms for marketplace load

### User Experience
- [ ] User can enable PayFast in <30 seconds
- [ ] User can see enabled integrations
- [ ] User can disable integrations
- [ ] Error messages are clear and actionable

---

## Quick Reference

### Files to Modify

```
botflow-backend/
├── migrations/
│   └── 010_fix_rls_infinite_recursion.sql  # NEW
├── src/
│   ├── config/
│   │   └── supabase.ts                      # Add admin client
│   ├── services/
│   │   ├── integration-marketplace.service.ts  # Use admin client
│   │   └── n8n-mcp.service.ts               # NEW
│   └── routes/
│       └── marketplace.ts                    # Integrate n8n-MCP
```

### Key Environment Variables

```env
# Existing
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
N8N_API_URL=xxx
N8N_API_KEY=xxx

# New for n8n-MCP
N8N_MCP_ENABLED=true
N8N_MCP_SERVER_URL=http://localhost:3030
```

### Test Commands

```bash
# Test enable integration
curl -X POST http://localhost:3001/api/marketplace/payfast/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "xxx", "credentials": {"api_key": "test"}}'

# Test list bot integrations
curl http://localhost:3001/api/marketplace/bots/xxx/integrations \
  -H "Authorization: Bearer $TOKEN"

# Test marketplace with n8n
curl http://localhost:3001/api/marketplace?per_page=100
```

---

## Summary

Week 7 focuses on making integrations fully functional:

1. **Fix RLS** - Unblock enable/disable functionality
2. **Validate Credentials** - Ensure API keys work before saving
3. **n8n-MCP** - Scale to 1000+ integrations dynamically
4. **Testing** - Comprehensive testing of all integration types

After Week 7, users will be able to:
- Browse 1000+ integrations in the marketplace
- Enable integrations for their bots
- Connect their accounts (PayFast, Shopify, etc.)
- Use integrated services in their bot workflows

---

**Created:** 2026-01-18
**Last Updated:** 2026-01-18
**Author:** Claude Code
**Status:** In Progress

---

> "From 130 database integrations to 1000+ with n8n-MCP - Week 7 makes the marketplace truly comprehensive!"
