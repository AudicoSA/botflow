# Phase 2 Week 8: Frontend Integration & Production Testing

**Status:** In Progress
**Goal:** Complete frontend integration updates, end-to-end testing, and production deployment verification
**Created:** 2026-01-18
**Last Updated:** 2026-01-18
**Prerequisites:** Week 7 Complete (RLS fix, credential validation, n8n-MCP service)

---

## Table of Contents

1. [Overview](#overview)
2. [Week 7 Recap](#week-7-recap)
3. [Week 8 Goals](#week-8-goals)
4. [Day-by-Day Plan](#day-by-day-plan)
5. [Frontend Updates](#frontend-updates)
6. [Database Migration](#database-migration)
7. [Testing Guide](#testing-guide)
8. [Production Checklist](#production-checklist)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Week 8 focuses on completing the integration marketplace by:
1. Applying the RLS fix migration to production
2. Updating the frontend to support n8n-powered integrations
3. End-to-end testing with real credentials
4. Production deployment verification

### What Was Built in Week 7

| Component | Status | Description |
|-----------|--------|-------------|
| RLS Fix | ✅ Complete | `supabaseAdmin` for bot_integrations, SECURITY DEFINER functions |
| Credential Validation | ✅ Complete | 10 integration validators (PayFast, Shopify, etc.) |
| n8n-MCP Service | ✅ Complete | Dynamic integration discovery via MCP |
| Validate Endpoint | ✅ Complete | `POST /api/marketplace/:slug/validate-credentials` |

### What Needs to Be Done in Week 8

| Task | Priority | Estimated Time |
|------|----------|----------------|
| Apply RLS migration | High | 15 minutes |
| Frontend n8n badge | Medium | 2 hours |
| Integration modal updates | Medium | 3 hours |
| End-to-end testing | High | 4 hours |
| Documentation | Low | 2 hours |

---

## Week 7 Recap

### Files Created

```
botflow-backend/
├── migrations/
│   └── 010_fix_rls_infinite_recursion.sql   # RLS fix with SECURITY DEFINER
├── src/
│   └── services/
│       ├── credential-validator.service.ts   # 10 integration validators
│       └── n8n-mcp.service.ts               # MCP integration service
```

### Files Modified

```
botflow-backend/src/
├── config/
│   └── env.ts                               # Added N8N_MCP_* variables
├── routes/
│   └── marketplace.ts                       # Added validate-credentials endpoint
└── services/
    ├── integration-marketplace.service.ts   # Use supabaseAdmin, add validation
    └── n8n-marketplace.service.ts           # Integrate n8n-MCP service
```

### New Environment Variables

```env
# n8n-MCP (Model Context Protocol integration)
N8N_MCP_ENABLED=true                          # Enable n8n-MCP integration
N8N_MCP_SERVER_URL=http://localhost:3030      # n8n-MCP server URL
```

### New API Endpoints

```
POST /api/marketplace/:slug/validate-credentials
  - Validates credentials without enabling integration
  - Requires authentication
  - Body: { credentials: { api_key: "...", ... } }
  - Returns: { valid: boolean, message: string, details?: object }
```

---

## Week 8 Goals

### Primary Goals

1. **Apply Database Migration**
   - Run `010_fix_rls_infinite_recursion.sql` on production Supabase
   - Verify RLS policies work correctly
   - Test enable/disable flow

2. **Frontend Updates**
   - Add "n8n powered" badge to dynamic integrations
   - Update integration detail modal for credential validation
   - Add loading states for validation
   - Handle validation errors gracefully

3. **End-to-End Testing**
   - Test with real PayFast sandbox credentials
   - Test with real Shopify development store
   - Test iCal sync with Airbnb calendar URL
   - Document test results

### Secondary Goals

4. **Performance Optimization**
   - Verify marketplace loads in <500ms
   - Check credential validation timeout handling
   - Optimize n8n-MCP caching

5. **Documentation**
   - Update API documentation
   - Create user guide for integrations
   - Document credential requirements per integration

---

## Day-by-Day Plan

### Day 1: Database Migration & Backend Verification

**Tasks:**
- [x] Apply `010_fix_rls_infinite_recursion.sql` to Supabase
- [ ] Verify SECURITY DEFINER functions created
- [ ] Test enable integration via API
- [ ] Test disable integration via API
- [ ] Verify integration logs are recorded

**Verification Commands:**

```bash
# Test enable integration
curl -X POST http://localhost:3001/api/marketplace/payfast/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "your-bot-id",
    "credentials": {
      "merchant_id": "10000100",
      "merchant_key": "46f0cd694581a"
    }
  }'

# Expected: 201 Created with bot_integration object

# Test get bot integrations
curl http://localhost:3001/api/marketplace/bots/your-bot-id/integrations \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with integrations array
```

### Day 2: Frontend - Integration Card Updates

**Tasks:**
- [x] Add `is_n8n_node` field handling to integration cards
- [x] Create "n8n powered" badge component
- [ ] Update marketplace page grid layout
- [x] Add tooltip explaining n8n integrations

**Files Modified/Created:**

```
botflow-website/app/
├── components/
│   ├── IntegrationCard.tsx        # ✅ Updated with n8n badge support
│   ├── EnableIntegrationModal.tsx # ✅ Updated with validation UI
│   ├── N8nBadge.tsx               # ✅ CREATED: n8n powered badge
│   └── ValidationResult.tsx       # ✅ CREATED: validation result display
```

**IntegrationCard.tsx Updates:**

```tsx
// Add to IntegrationCard component
interface IntegrationCardProps {
  integration: {
    // ... existing fields
    is_n8n_node?: boolean;
    n8n_node_type?: string;
  };
}

// In the card render
{integration.is_n8n_node && (
  <N8nBadge tooltip="Powered by n8n workflow automation" />
)}
```

### Day 3: Frontend - Credential Validation UI

**Tasks:**
- [x] Add "Test Credentials" button to enable modal
- [x] Create validation loading state
- [x] Display validation results (success/error)
- [x] Handle API errors gracefully

**IntegrationModal.tsx Updates:**

```tsx
const [isValidating, setIsValidating] = useState(false);
const [validationResult, setValidationResult] = useState<{
  valid: boolean;
  message: string;
} | null>(null);

const handleValidateCredentials = async () => {
  setIsValidating(true);
  setValidationResult(null);

  try {
    const response = await fetch(
      `${API_URL}/api/marketplace/${integration.slug}/validate-credentials`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials }),
      }
    );

    const result = await response.json();
    setValidationResult(result);
  } catch (error) {
    setValidationResult({
      valid: false,
      message: 'Failed to validate credentials',
    });
  } finally {
    setIsValidating(false);
  }
};

// In render
<Button
  onClick={handleValidateCredentials}
  disabled={isValidating}
  variant="outline"
>
  {isValidating ? 'Validating...' : 'Test Credentials'}
</Button>

{validationResult && (
  <Alert variant={validationResult.valid ? 'success' : 'error'}>
    {validationResult.message}
  </Alert>
)}
```

### Day 4: End-to-End Testing

**Tasks:**
- [ ] Create test accounts for each integration
- [ ] Test full enable/disable flow
- [ ] Test credential validation for each type
- [ ] Document results and any issues

**Test Matrix:**

| Integration | Test Account | Status | Notes |
|-------------|--------------|--------|-------|
| PayFast | Sandbox | ⏳ | Use test merchant |
| Paystack | Test mode | ⏳ | sk_test_xxx |
| Yoco | Sandbox | ⏳ | Test API key |
| Shopify | Dev store | ⏳ | Create private app |
| WooCommerce | Local | ⏳ | Docker instance |
| iCal Sync | Sample URL | ⏳ | Public calendar |

**Test Script:**

```bash
#!/bin/bash
# test-integrations.sh

API_URL="http://localhost:3001"
TOKEN="your-jwt-token"
BOT_ID="your-bot-id"

# Test PayFast
echo "Testing PayFast..."
curl -X POST "$API_URL/api/marketplace/payfast/validate-credentials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credentials": {"merchant_id": "10000100", "merchant_key": "46f0cd694581a"}}'

# Test Paystack
echo "Testing Paystack..."
curl -X POST "$API_URL/api/marketplace/paystack/validate-credentials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credentials": {"secret_key": "sk_test_xxx", "public_key": "pk_test_xxx"}}'

# Test iCal
echo "Testing iCal Sync..."
curl -X POST "$API_URL/api/marketplace/ical-sync/validate-credentials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credentials": {"ical_urls": ["https://calendar.google.com/calendar/ical/xxx/basic.ics"]}}'
```

### Day 5: Production Deployment

**Tasks:**
- [ ] Deploy backend changes to Railway
- [ ] Deploy frontend changes to Vercel
- [ ] Run migration on production Supabase
- [ ] Verify production marketplace works
- [ ] Monitor for errors

**Deployment Checklist:**

```bash
# 1. Commit and push changes
git add .
git commit -m "feat: Week 7+8 - Integration marketplace completion"
git push origin main

# 2. Railway will auto-deploy backend

# 3. Vercel will auto-deploy frontend

# 4. Apply migration to production Supabase
# Go to Supabase Dashboard > SQL Editor
# Paste contents of 010_fix_rls_infinite_recursion.sql
# Run migration

# 5. Verify deployment
curl https://botflow-production.up.railway.app/api/marketplace?per_page=5
curl https://botflow-production.up.railway.app/health
```

### Day 6-7: Documentation & Polish

**Tasks:**
- [ ] Update CLAUDE.md with new endpoints
- [ ] Create integration setup guides
- [ ] Add inline help to frontend
- [ ] Final testing and bug fixes

---

## Frontend Updates

### N8nBadge Component

Create `botflow-website/app/dashboard/marketplace/components/N8nBadge.tsx`:

```tsx
'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface N8nBadgeProps {
  tooltip?: string;
}

export function N8nBadge({ tooltip = 'Powered by n8n' }: N8nBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <svg
              className="w-3 h-3 mr-1"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            n8n
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### Integration Card Updates

Update the integration card to show the n8n badge:

```tsx
// In IntegrationCard.tsx
import { N8nBadge } from './N8nBadge';

export function IntegrationCard({ integration, onEnable }: Props) {
  return (
    <div className="...">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <img
            src={integration.icon_url}
            alt={integration.name}
            className="w-10 h-10 rounded"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-integration.png';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{integration.name}</h3>
              {integration.is_n8n_node && <N8nBadge />}
            </div>
            <p className="text-sm text-gray-500">{integration.category}</p>
          </div>
        </div>
        {integration.is_featured && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Featured
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
        {integration.description}
      </p>

      <div className="mt-4 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {integration.pricing_model === 'free' ? 'Free' : 'Paid'}
        </span>
        <button
          onClick={() => onEnable(integration)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Enable →
        </button>
      </div>
    </div>
  );
}
```

### Validation Result Display

```tsx
// ValidationResult.tsx
interface ValidationResultProps {
  result: {
    valid: boolean;
    message: string;
    details?: Record<string, any>;
  };
}

export function ValidationResult({ result }: ValidationResultProps) {
  return (
    <div className={`p-4 rounded-lg ${
      result.valid
        ? 'bg-green-50 border border-green-200'
        : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-center gap-2">
        {result.valid ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600" />
        )}
        <span className={result.valid ? 'text-green-800' : 'text-red-800'}>
          {result.message}
        </span>
      </div>

      {result.details && result.valid && (
        <div className="mt-2 text-sm text-green-700">
          {result.details.verified_via_api && (
            <p>✓ Verified via API</p>
          )}
          {result.details.shop_name && (
            <p>Store: {result.details.shop_name}</p>
          )}
          {result.details.balance !== undefined && (
            <p>Balance: {result.details.balance}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Database Migration

### Applying the Migration

**Option 1: Supabase Dashboard**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Create a new query
5. Paste the contents of `botflow-backend/migrations/010_fix_rls_infinite_recursion.sql`
6. Click "Run"

**Option 2: CLI**

```bash
# Using psql
psql -h your-supabase-host -U postgres -d postgres \
  -f botflow-backend/migrations/010_fix_rls_infinite_recursion.sql
```

### Verifying the Migration

```sql
-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'user_has_bot_access',
  'user_has_bot_integration_access',
  'increment_sync_count'
);

-- Check policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('bot_integrations', 'integration_logs');

-- Test function
SELECT public.user_has_bot_access('your-bot-id');
```

---

## Testing Guide

### Unit Testing Credential Validators

```typescript
// test-credential-validators.ts
import { credentialValidatorService } from './credential-validator.service';

describe('CredentialValidatorService', () => {
  describe('PayFast', () => {
    it('should validate correct merchant_id format', async () => {
      const result = await credentialValidatorService.validateCredentials(
        'payfast',
        { merchant_id: '10000100', merchant_key: '46f0cd694581a' }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid merchant_id format', async () => {
      const result = await credentialValidatorService.validateCredentials(
        'payfast',
        { merchant_id: 'invalid', merchant_key: '46f0cd694581a' }
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('Paystack', () => {
    it('should validate sk_test_ prefix', async () => {
      const result = await credentialValidatorService.validateCredentials(
        'paystack',
        { secret_key: 'sk_test_12345678901234567890' }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('iCal', () => {
    it('should validate accessible iCal URL', async () => {
      const result = await credentialValidatorService.validateCredentials(
        'ical-sync',
        { ical_urls: ['https://calendar.google.com/calendar/ical/public/basic.ics'] }
      );
      expect(result.valid).toBe(true);
    });
  });
});
```

### Integration Testing

```bash
# Full flow test
# 1. List marketplace
curl http://localhost:3001/api/marketplace?per_page=5

# 2. Validate credentials
curl -X POST http://localhost:3001/api/marketplace/paystack/validate-credentials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credentials": {"secret_key": "sk_test_xxx"}}'

# 3. Enable integration
curl -X POST http://localhost:3001/api/marketplace/paystack/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "xxx", "credentials": {"secret_key": "sk_test_xxx"}}'

# 4. Get bot integrations
curl http://localhost:3001/api/marketplace/bots/xxx/integrations \
  -H "Authorization: Bearer $TOKEN"

# 5. Disable integration
curl -X DELETE http://localhost:3001/api/marketplace/bot-integrations/integration-id \
  -H "Authorization: Bearer $TOKEN"
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] RLS migration tested on staging
- [ ] Frontend build succeeds
- [ ] Environment variables configured
- [ ] Error monitoring ready (Sentry)

### Deployment

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Migration applied to Supabase
- [ ] DNS and SSL verified

### Post-Deployment

- [ ] Health check passes
- [ ] Marketplace loads correctly
- [ ] Can enable/disable integrations
- [ ] Credential validation works
- [ ] Logs are being recorded
- [ ] No errors in Sentry

### Rollback Plan

If issues occur:

1. **Backend**: Railway supports instant rollback to previous deploy
2. **Frontend**: Vercel supports instant rollback
3. **Database**:
   ```sql
   -- Revert RLS changes if needed
   DROP FUNCTION IF EXISTS public.user_has_bot_access(TEXT);
   DROP FUNCTION IF EXISTS public.user_has_bot_integration_access(UUID);
   -- Re-apply original policies from 004_create_integration_marketplace_v2.sql
   ```

---

## API Reference

### Marketplace Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/marketplace` | No | List integrations |
| GET | `/api/marketplace/:slug` | No | Get integration details |
| GET | `/api/marketplace/categories` | No | Get categories |
| GET | `/api/marketplace/stats` | No | Get statistics |
| GET | `/api/marketplace/search?q=` | No | Search integrations |
| POST | `/api/marketplace/:slug/validate-credentials` | Yes | Validate credentials |
| POST | `/api/marketplace/:slug/enable` | Yes | Enable integration |
| PATCH | `/api/marketplace/bot-integrations/:id` | Yes | Update integration |
| DELETE | `/api/marketplace/bot-integrations/:id` | Yes | Disable integration |
| GET | `/api/marketplace/bots/:botId/integrations` | Yes | Get bot integrations |
| GET | `/api/marketplace/bot-integrations/:id/logs` | Yes | Get integration logs |
| GET | `/api/marketplace/recommended/:botId` | Yes | Get recommended integrations |

### Credential Schemas

**PayFast:**
```json
{
  "merchant_id": "string (numeric)",
  "merchant_key": "string (min 10 chars)",
  "passphrase": "string (optional)"
}
```

**Paystack:**
```json
{
  "secret_key": "string (starts with sk_)",
  "public_key": "string (starts with pk_, optional)"
}
```

**Yoco:**
```json
{
  "secret_key": "string (starts with sk_)"
}
```

**iKhokha:**
```json
{
  "application_id": "string (from iK Pay API dashboard)",
  "application_secret": "string (keep safe, used for HMAC signing)"
}
```

**Shopify:**
```json
{
  "api_key": "string (starts with shpat_ or shpca_)",
  "store_url": "string (contains .myshopify.com)"
}
```

**WooCommerce:**
```json
{
  "consumer_key": "string (starts with ck_)",
  "consumer_secret": "string (starts with cs_)",
  "store_url": "string (valid URL)"
}
```

**iCal Sync:**
```json
{
  "ical_urls": ["string (valid iCal URLs)"]
}
```

---

## Troubleshooting

### Common Issues

**1. "infinite recursion detected in policy"**
- Cause: RLS migration not applied
- Fix: Run `010_fix_rls_infinite_recursion.sql`

**2. "Failed to enable integration" (500 error)**
- Cause: Service role key not configured
- Fix: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

**3. Credential validation timeout**
- Cause: External API not responding
- Fix: Validation falls back to format check

**4. n8n integrations not showing**
- Cause: `N8N_MCP_ENABLED` not set to `true`
- Fix: Set environment variable

**5. Icons not loading**
- Cause: Clearbit API rate limit
- Fix: Icons will use fallback emoji

### Debug Logging

```typescript
// Enable debug logging
LOG_LEVEL=debug npm run dev

// Check specific service
logger.debug({ integrationSlug, credentials }, 'Validating credentials');
```

### Health Check

```bash
# Backend health
curl http://localhost:3001/health

# Marketplace health
curl http://localhost:3001/api/marketplace/stats
```

---

## Success Criteria

### Week 8 Complete When:

- [ ] RLS migration applied and working
- [ ] Can enable/disable integrations without errors
- [ ] Credential validation shows results in UI
- [ ] n8n badge shows on dynamic integrations
- [ ] At least 3 integrations tested with real credentials
- [ ] Production deployment verified
- [ ] Documentation updated

### Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Marketplace load | <500ms | ⏳ |
| Credential validation | <5s | ⏳ |
| Enable integration | <2s | ⏳ |
| n8n-MCP cache hit | <100ms | ⏳ |

---

## Quick Reference

### Test Commands

```bash
# Run backend locally
cd botflow-backend && npm run dev

# Run frontend locally
cd botflow-website && npm run dev

# Build backend
cd botflow-backend && npm run build

# Run tests
cd botflow-backend && npm run test
```

### Key Files

```
Backend:
- src/services/credential-validator.service.ts (validation logic)
- src/services/n8n-mcp.service.ts (MCP integration)
- src/services/integration-marketplace.service.ts (main service)
- src/routes/marketplace.ts (API routes)
- migrations/010_fix_rls_infinite_recursion.sql (database fix)

Frontend:
- app/dashboard/marketplace/page.tsx (main page)
- app/dashboard/marketplace/components/ (UI components)
```

### Environment Variables

```env
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx

# Optional (for n8n-MCP)
N8N_MCP_ENABLED=true
N8N_MCP_SERVER_URL=http://localhost:3030
```

---

## Summary

Week 8 completes the integration marketplace by:

1. **Applying the RLS fix** - Enables integration enable/disable functionality
2. **Frontend updates** - n8n badge, validation UI, error handling
3. **Testing** - End-to-end with real credentials
4. **Production deployment** - Deploy and verify

After Week 8, the marketplace will be fully functional with:
- 130+ database integrations
- Potential 1000+ n8n-MCP integrations
- Credential validation before enabling
- Clean enable/disable flow
- Comprehensive logging

---

**Created:** 2026-01-18
**Last Updated:** 2026-01-18
**Author:** Claude Code
**Status:** In Progress - Frontend components complete

---

> "Week 7 built the foundation. Week 8 makes it production-ready!" 🚀
