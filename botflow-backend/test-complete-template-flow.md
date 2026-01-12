# Complete Template System Test Guide

This document provides step-by-step testing procedures for the entire template system built in Week 1.

## Prerequisites

- Backend server running (`npm run dev`)
- Database migration completed
- Taxi template seeded
- Test organization and WhatsApp account (optional for full flow)

## Test Suite

### ✅ Test 1: Database Schema

**Goal:** Verify bot_templates table exists with correct structure

**Steps:**
1. Open Supabase SQL Editor
2. Run: `SELECT * FROM bot_templates LIMIT 1;`

**Expected Result:**
- Table exists
- Returns taxi template data
- All columns present (id, name, vertical, tier, description, required_fields, conversation_flow, etc.)

**Status:** ✅ PASSED (verified during Day 1)

---

### ✅ Test 2: GET All Templates

**Endpoint:** `GET /api/templates`

**Command:**
```bash
curl http://localhost:3001/api/templates
```

**Expected Result:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Taxi & Shuttle Service",
      "vertical": "taxi",
      "tier": 1,
      "is_published": true,
      ...
    }
  ]
}
```

**Status:** ✅ PASSED (verified during Day 3)

---

### ✅ Test 3: GET Template by ID

**Endpoint:** `GET /api/templates/:id`

**Command:**
```bash
curl http://localhost:3001/api/templates/248320a2-8750-460a-9068-735fd27eadfc
```

**Expected Result:**
- Single template object
- All fields present including required_fields and conversation_flow
- Variable placeholders intact ({{business_name}}, etc.)

**Status:** ✅ PASSED (verified during Day 5)

---

### ✅ Test 4: GET Templates by Vertical

**Endpoint:** `GET /api/templates/vertical/:vertical`

**Command:**
```bash
curl http://localhost:3001/api/templates/vertical/taxi
```

**Expected Result:**
- Array of templates filtered by vertical="taxi"
- Only published templates returned

**Status:** ✅ PASSED (verified during Day 3)

---

### ✅ Test 5: Template Validation

**Goal:** Verify template JSON matches TypeScript types

**Command:**
```bash
cd botflow-backend
node dist/scripts/run-validate.js
```

**Expected Result:**
```
🔍 Validating template files...
Validating: example-taxi-template.json
✅ Valid
✅ All templates are valid!
```

**Status:** ✅ PASSED (verified during Day 2)

---

### ⏳ Test 6: Create Bot from Template (Requires Auth)

**Endpoint:** `POST /api/bots/create-from-template`

**Prerequisites:**
- Valid JWT token
- Organization ID
- WhatsApp Account ID

**Command:**
```bash
curl -X POST http://localhost:3001/api/bots/create-from-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "template_id": "248320a2-8750-460a-9068-735fd27eadfc",
    "organization_id": "YOUR_ORG_ID",
    "whatsapp_account_id": "YOUR_WHATSAPP_ID",
    "bot_name": "My Test Taxi Bot",
    "field_values": {
      "business_name": "Test Cabs",
      "service_area": "Cape Town",
      "vehicle_types": ["Sedan (4 seater)", "SUV (6 seater)"],
      "pricing_model": "Per kilometer",
      "base_rate": 50,
      "per_km_rate": 12,
      "operating_hours": "24/7",
      "booking_phone": "021 555 1234"
    }
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "bot": {
    "id": "new-bot-uuid",
    "name": "My Test Taxi Bot",
    "task_type": "taxi",
    "configuration": {
      "template_id": "...",
      "field_values": {...},
      "conversation_flow": {
        "systemPrompt": "You are a helpful taxi booking assistant for Test Cabs. ..."
      }
    }
  }
}
```

**What to Verify:**
- Bot created in database
- Variable placeholders replaced ({{business_name}} → "Test Cabs")
- configuration.field_values contains user input
- conversation_flow has processed system prompt

**Status:** ⏳ PENDING (requires authentication setup)

---

### ⏳ Test 7: Template Validation - Missing Required Field

**Goal:** Verify validation rejects missing required fields

**Command:**
```bash
curl -X POST http://localhost:3001/api/bots/create-from-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "template_id": "248320a2-8750-460a-9068-735fd27eadfc",
    "organization_id": "YOUR_ORG_ID",
    "whatsapp_account_id": "YOUR_WHATSAPP_ID",
    "bot_name": "My Test Bot",
    "field_values": {
      "business_name": "Test Cabs"
    }
  }'
```

**Expected Result:**
```json
{
  "error": "Missing required field: Service Area"
}
```

**Status:** ⏳ PENDING (requires authentication setup)

---

### ⏳ Test 8: Template Validation - Invalid Select Option

**Goal:** Verify validation rejects invalid select/multiselect values

**Command:**
```bash
curl -X POST http://localhost:3001/api/bots/create-from-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "template_id": "248320a2-8750-460a-9068-735fd27eadfc",
    ...
    "field_values": {
      ...
      "pricing_model": "Invalid Option"
    }
  }'
```

**Expected Result:**
```json
{
  "error": "Pricing Model must be one of: Per kilometer, Fixed routes, Hourly rate, Custom quote"
}
```

**Status:** ⏳ PENDING (requires authentication setup)

---

## Test Summary

| Test | Status | Notes |
|------|--------|-------|
| Database Schema | ✅ PASSED | Table structure verified |
| GET All Templates | ✅ PASSED | Returns published templates |
| GET Template by ID | ✅ PASSED | Returns full template data |
| GET by Vertical | ✅ PASSED | Filters correctly |
| Template Validation | ✅ PASSED | JSON structure valid |
| Create Bot from Template | ⏳ PENDING | Requires auth setup |
| Validation - Missing Field | ⏳ PENDING | Requires auth setup |
| Validation - Invalid Option | ⏳ PENDING | Requires auth setup |

**Overall Week 1 Status:** ✅ CORE FUNCTIONALITY COMPLETE

Tests 6-8 are integration tests that require full authentication flow. They can be completed in Week 2 when frontend is integrated.

---

## Quick Smoke Test

Run this to verify the system is working:

```bash
# 1. Server health
curl http://localhost:3001/health

# 2. Get all templates
curl http://localhost:3001/api/templates | python -m json.tool

# 3. Validate templates
cd botflow-backend && node dist/scripts/run-validate.js

# 4. Check template count
curl -s http://localhost:3001/api/templates | python -c "import sys, json; print(f\"Templates loaded: {len(json.load(sys.stdin)['templates'])}\")"
```

**Expected Output:**
```
Server is healthy ✓
Templates returned ✓
Validation passed ✓
Templates loaded: 1 ✓
```

---

## Next Steps

After Week 1, you should be able to:
- ✅ View templates via API
- ✅ Validate template structure
- ✅ Understand bot instantiation flow
- ⏳ Create bots from templates (Week 2 with frontend)

**Ready for Week 2:** Frontend Template Selection & Onboarding Flow
