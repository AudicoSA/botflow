# Backend Testing Guide

## Overview

This guide helps you test all backend API endpoints systematically using the provided `.http` files.

**Tools:** VS Code REST Client extension (recommended) or curl

---

## Prerequisites

1. ✅ Backend running on http://localhost:3001
2. ✅ Database migrations complete
3. ✅ Templates seeded (20 templates)
4. ✅ Integrations seeded (32 integrations)
5. ✅ Valid JWT token for authenticated endpoints

---

## Getting a JWT Token

### Option 1: Login via API

```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

Copy the `access_token` from the response.

### Option 2: Create Test User

```http
POST http://localhost:3001/api/auth/signup
Content-Type: application/json

{
  "email": "test@botflow.com",
  "password": "TestPass123!",
  "full_name": "Test User"
}
```

---

## Test Files Overview

| File | Purpose | Auth Required |
|------|---------|---------------|
| `test-template-api.http` | Template CRUD operations | Partial |
| `test-marketplace.http` | Integration marketplace | Partial |
| `test-google-calendar.http` | Google Calendar OAuth & events | Yes |
| `test-paystack.http` | Payment initialization & webhooks | Partial |
| `test-airbnb-api.http` | Property management & iCal sync | Yes |

---

## 1. Template API Testing

**File:** `test-template-api.http`

### Test 1: Get All Templates (Public)

```http
GET http://localhost:3001/api/templates
```

**Expected:**
- Status: 200
- Body: Array of 20 templates
- Each template has:
  - `id` (UUID)
  - `name` (string)
  - `vertical` (string)
  - `tier` (1, 2, or 3)
  - `description` (string)
  - `required_fields` (JSONB)
  - `conversation_flow` (JSONB)
  - `is_published` (boolean - should be true)

**Validation:**
```javascript
// Check count
templates.length === 20

// Check structure
templates[0].required_fields !== null
templates[0].conversation_flow !== null
templates[0].is_published === true
```

### Test 2: Get Template by ID (Public)

First, get a template ID from the list above, then:

```http
GET http://localhost:3001/api/templates/{{template_id}}
```

**Expected:**
- Status: 200
- Body: Single template object

### Test 3: Get Templates by Vertical (Public)

```http
GET http://localhost:3001/api/templates/vertical/taxi
```

**Expected:**
- Status: 200
- Body: Array with 1 template (Taxi & Shuttle Service)

**Test other verticals:**
- `medical` - Medical & Dental Practice
- `real_estate` - Real Estate Agent
- `ecommerce` - E-commerce Store
- `restaurant` - Restaurant & Food Service
- `salon` - Hair Salon & Beauty
- `gym` - Gym & Fitness Center
- `retail` - Retail Store
- `hotel` - Hotel & Guesthouse
- `car_rental` - Car Rental Service
- `plumber` - Plumber & Home Services
- `doctor` - Doctor & Clinic
- `airbnb` - Airbnb & Vacation Rental

### Test 4: Create Bot from Template (Authenticated)

**Prerequisites:**
- Valid JWT token
- Valid organization_id
- Valid whatsapp_account_id (optional)

```http
POST http://localhost:3001/api/bots/create-from-template
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "template_id": "{{template_id}}",
  "organization_id": "{{org_id}}",
  "whatsapp_account_id": "{{whatsapp_id}}",
  "bot_name": "Test Taxi Bot",
  "field_values": {
    "business_name": "City Cabs",
    "business_location": "Cape Town, South Africa",
    "service_area": "Cape Town Metro",
    "fleet_size": "25",
    "vehicle_types": ["sedan", "suv", "van"],
    "base_fare": "35",
    "per_km_rate": "12",
    "operating_hours": "24/7",
    "payment_methods": ["cash", "card", "eft"],
    "emergency_contact": "+27 12 345 6789"
  }
}
```

**Expected:**
- Status: 201
- Body: Created bot object with:
  - Bot ID
  - Replaced conversation flow ({{business_name}} → City Cabs)
  - Status: active

**Test Validation:**

```http
# Test with missing required field
POST http://localhost:3001/api/bots/create-from-template
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "template_id": "{{template_id}}",
  "organization_id": "{{org_id}}",
  "bot_name": "Test Bot",
  "field_values": {
    "business_name": "City Cabs"
    // Missing other required fields
  }
}
```

**Expected:**
- Status: 400
- Error message about missing required fields

---

## 2. Integration Marketplace Testing

**File:** `test-marketplace.http`

### Test 1: Get All Integrations (Public)

```http
GET http://localhost:3001/api/marketplace
```

**Expected:**
- Status: 200
- Body: Array of 32 integrations
- Categories: calendar, payment, crm, communication, ecommerce, analytics, productivity, specialized

**Validation:**
```javascript
// Check count
integrations.length === 32

// Check direct integrations
integrations.filter(i => i.is_direct_integration).length === 2

// Check categories
const categories = [...new Set(integrations.map(i => i.category))]
categories.length === 8
```

### Test 2: Get Integration by Slug (Public)

```http
GET http://localhost:3001/api/marketplace/google-calendar
```

**Expected:**
- Status: 200
- Body: Google Calendar integration with:
  - `name`: "Google Calendar"
  - `slug`: "google-calendar"
  - `category`: "calendar"
  - `is_direct_integration`: true
  - `auth_type`: "oauth"
  - `setup_instructions`: JSONB with steps

### Test 3: Get Integrations by Category (Public)

```http
GET http://localhost:3001/api/marketplace/category/calendar
```

**Expected:**
- Status: 200
- Body: Array of calendar integrations (6 total)

**Test all categories:**
- `calendar` (6)
- `payment` (6)
- `crm` (5)
- `communication` (5)
- `ecommerce` (5)
- `analytics` (2)
- `productivity` (2)
- `specialized` (1)

### Test 4: Enable Integration (Authenticated)

```http
POST http://localhost:3001/api/marketplace/google-calendar/enable
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "bot_id": "{{bot_id}}",
  "configuration": {
    "calendar_id": "primary"
  }
}
```

**Expected:**
- Status: 200
- Body: Created bot_integration record
- Status: "pending" (before OAuth)

### Test 5: Disable Integration (Authenticated)

```http
DELETE http://localhost:3001/api/marketplace/google-calendar/disable
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "bot_id": "{{bot_id}}"
}
```

**Expected:**
- Status: 200
- Body: Success message

---

## 3. Google Calendar Testing

**File:** `test-google-calendar.http`

### Test 1: OAuth Flow (Authenticated)

**Step 1: Initiate OAuth**

```http
GET http://localhost:3001/api/calendar/auth?bot_id={{bot_id}}
Authorization: Bearer {{jwt_token}}
```

**Expected:**
- Status: 302 (redirect)
- Location: Google OAuth consent screen URL
- URL includes: `state`, `scope`, `redirect_uri`

**Step 2: Complete OAuth (Manual)**

1. Copy redirect URL
2. Open in browser
3. Sign in to Google
4. Grant calendar permissions
5. Get redirected back to `/api/calendar/callback?code=...&state=...`
6. Callback should:
   - Exchange code for tokens
   - Store encrypted credentials
   - Update bot_integration status to 'active'
   - Redirect to frontend with success

### Test 2: Create Calendar Event (Authenticated)

**Prerequisites:**
- Google Calendar OAuth completed
- Valid bot_id with active Google Calendar integration

```http
POST http://localhost:3001/api/calendar/events
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "bot_id": "{{bot_id}}",
  "summary": "Haircut Appointment",
  "description": "Haircut with stylist Sarah",
  "start_time": "2026-01-15T10:00:00+02:00",
  "end_time": "2026-01-15T11:00:00+02:00",
  "attendee_email": "customer@example.com",
  "timezone": "Africa/Johannesburg"
}
```

**Expected:**
- Status: 201
- Body:
  - `event_id`: Google Calendar event ID
  - `event_link`: Link to view event
  - `status`: "confirmed"

### Test 3: Check Availability (Authenticated)

```http
POST http://localhost:3001/api/calendar/availability
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "bot_id": "{{bot_id}}",
  "date": "2026-01-15",
  "timezone": "Africa/Johannesburg"
}
```

**Expected:**
- Status: 200
- Body: Array of available time slots
- Format: `["09:00", "10:00", "11:00", ...]`

---

## 4. Paystack Testing

**File:** `test-paystack.http`

### Test 1: Initialize Payment (Authenticated)

```http
POST http://localhost:3001/api/payments/initialize
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "bot_id": "{{bot_id}}",
  "amount": 50000,
  "email": "customer@example.com",
  "metadata": {
    "service": "Haircut",
    "appointment_id": "appt-123"
  }
}
```

**Expected:**
- Status: 200
- Body:
  - `authorization_url`: Paystack payment page URL
  - `access_code`: Payment access code
  - `reference`: Payment reference code
  - `amount`: 50000 (R500.00)

### Test 2: Verify Payment (Authenticated)

After completing payment on Paystack:

```http
GET http://localhost:3001/api/payments/verify/{{reference}}
Authorization: Bearer {{jwt_token}}
```

**Expected:**
- Status: 200
- Body:
  - `status`: "success"
  - `amount`: 50000
  - `customer`: Customer details
  - `payment_method`: Card type

### Test 3: Webhook (Public, Signature Required)

```http
POST http://localhost:3001/api/payments/webhook
X-Paystack-Signature: {{signature}}
Content-Type: application/json

{
  "event": "charge.success",
  "data": {
    "reference": "{{reference}}",
    "amount": 50000,
    "status": "success",
    "customer": {
      "email": "customer@example.com"
    }
  }
}
```

**Expected:**
- Status: 200
- Body: Success message
- Database: Payment record updated

**Note:** Paystack signature verification is required. In production, this comes from Paystack's webhook.

---

## 5. Airbnb iCal Testing

**File:** `test-airbnb-api.http`

### Test 1: Create Property (Authenticated)

```http
POST http://localhost:3001/api/properties
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "organization_id": "{{org_id}}",
  "bot_id": "{{bot_id}}",
  "name": "Sea View Apartment",
  "timezone": "Africa/Johannesburg",
  "ical_urls": [
    {
      "url": "https://www.airbnb.com/calendar/ical/12345.ics?s=secret",
      "source": "airbnb"
    },
    {
      "url": "https://admin.booking.com/hotel/hoteladmin/ical.html?t=secret",
      "source": "booking"
    }
  ],
  "min_nights": 2,
  "max_nights": 30,
  "check_in_time": "14:00",
  "check_out_time": "10:00",
  "buffer_days": 1
}
```

**Expected:**
- Status: 201
- Body: Created property object

### Test 2: Sync Calendar (Authenticated)

```http
POST http://localhost:3001/api/properties/{{property_id}}/sync
Authorization: Bearer {{jwt_token}}
```

**Expected:**
- Status: 200
- Body:
  - `events_processed`: Number of events
  - `blocked_dates_created`: Number of blocked date ranges
  - `sync_duration_ms`: Time taken

**Database Check:**
```sql
SELECT COUNT(*) FROM blocked_dates WHERE property_id = '{{property_id}}';
-- Should show blocked dates from iCal
```

### Test 3: Check Availability (Authenticated)

```http
POST http://localhost:3001/api/properties/{{property_id}}/availability
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "start_date": "2026-02-01",
  "end_date": "2026-02-05",
  "guests": 2
}
```

**Expected:**
- Status: 200
- Body:
  - `available`: true/false
  - `blocked_dates`: Array of unavailable dates
  - `min_nights_met`: true/false
  - `max_nights_met`: true/false

---

## Test Result Tracking

Use this table to track your testing progress:

| Test | Status | Notes |
|------|--------|-------|
| Template - Get All | ⬜ | |
| Template - Get by ID | ⬜ | |
| Template - Get by Vertical | ⬜ | |
| Template - Create Bot | ⬜ | |
| Marketplace - Get All | ⬜ | |
| Marketplace - Get by Slug | ⬜ | |
| Marketplace - Get by Category | ⬜ | |
| Marketplace - Enable Integration | ⬜ | |
| Calendar - OAuth Flow | ⬜ | |
| Calendar - Create Event | ⬜ | |
| Calendar - Check Availability | ⬜ | |
| Paystack - Initialize Payment | ⬜ | |
| Paystack - Verify Payment | ⬜ | |
| Paystack - Webhook | ⬜ | |
| Airbnb - Create Property | ⬜ | |
| Airbnb - Sync Calendar | ⬜ | |
| Airbnb - Check Availability | ⬜ | |

---

## Common Testing Issues

### Issue: 401 Unauthorized

**Cause:** JWT token expired or invalid

**Fix:**
1. Get a new JWT token via login
2. Update `{{jwt_token}}` variable in .http file

### Issue: 404 Not Found

**Cause:** Invalid ID or endpoint

**Fix:**
1. Verify the ID exists in database
2. Check endpoint URL spelling

### Issue: 400 Bad Request

**Cause:** Invalid request body or missing required fields

**Fix:**
1. Check request body matches schema
2. Ensure all required fields provided
3. Check data types (string, number, boolean)

### Issue: 500 Internal Server Error

**Cause:** Backend error

**Fix:**
1. Check backend logs in terminal
2. Check database connection
3. Verify environment variables

---

## Next Steps

After completing backend testing:

1. ✅ Update [WEEK_12_TESTING_CHECKLIST.md](../WEEK_12_TESTING_CHECKLIST.md)
2. ✅ Start frontend testing
3. ✅ Run performance tests
4. ✅ Complete security audit

---

**Happy Testing! 🧪**
