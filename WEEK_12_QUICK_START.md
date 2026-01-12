# Week 12 Quick Start Guide

## 🚀 Quick Start - Follow These Steps

**Total Time:** 30-60 minutes
**Status:** Ready to begin!

---

## Step 1: Database Migrations (10 minutes)

### Option A: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your BotFlow project
3. Click **"SQL Editor"** → **"New Query"**

**Run each migration in order:**

#### Migration 1: Bot Templates
- Open: `botflow-backend/migrations/001_create_bot_templates.sql`
- Copy all contents
- Paste in SQL Editor
- Click **"Run"**
- ✅ Should see: "Success. No rows returned"

#### Migration 2: Properties & Availability
- Open: `botflow-backend/migrations/002_create_properties_and_availability.sql`
- Copy all contents
- Paste in SQL Editor
- Click **"Run"**
- ✅ Should see: "Migration 002 complete" notice

#### Migration 3: Payments & Subscriptions
- Open: `botflow-backend/migrations/003_create_payments_and_subscriptions.sql`
- Copy all contents
- Paste in SQL Editor
- Click **"Run"**
- ✅ Should see: "Success"

#### Migration 4: Integration Marketplace
- Open: `botflow-backend/migrations/004_create_integration_marketplace_v2.sql`
- Copy all contents
- Paste in SQL Editor
- Click **"Run"**
- ✅ Should see: "Success" (2 rows inserted for Google Calendar + Paystack)

### Verification

Run this query in SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'bot_templates',
    'properties',
    'blocked_dates',
    'sync_logs',
    'payments',
    'subscriptions',
    'integration_marketplace',
    'bot_integrations',
    'integration_logs'
  )
ORDER BY table_name;
```

**Expected:** 9 tables listed

---

## Step 2: Build Backend (2 minutes)

```bash
cd botflow-backend
npm install  # If dependencies changed
npm run build
```

**Expected Output:**
```
> botflow-backend@1.0.0 build
> tsc

✔ Build complete!
```

---

## Step 3: Seed Templates (3 minutes)

```bash
# From botflow-backend directory
node dist/scripts/run-seed.js
```

**Expected Output:**
```
🌱 Seeding templates...

📁 Found 20 template file(s)

Processing: airbnb-template.json
✅ Successfully created: Airbnb & Vacation Rental
   ID: xxx
   Vertical: airbnb | Tier: 3 | Published: true

... (20 templates total)

✅ Template seeding complete!
```

**Verify:**
```sql
SELECT COUNT(*) as template_count FROM bot_templates;
-- Should return: 20
```

---

## Step 4: Seed Integrations (3 minutes)

```bash
# From botflow-backend directory
node dist/scripts/seed-integrations.js
```

**Expected Output:**
```
🌱 Seeding Integration Marketplace...

Total integrations to seed: 30

⏭️  Skipping "Google Calendar" - already exists
⏭️  Skipping "Paystack" - already exists
✅ Seeded "Outlook Calendar" (calendar)
✅ Seeded "Apple Calendar" (calendar)
... (30 more)

============================================================
📊 Seeding Summary:
   ✅ Successfully seeded: 30
   ⏭️  Skipped (already exist): 2
   ❌ Errors: 0
   📦 Total processed: 30
============================================================

🎉 All integrations seeded successfully!
```

**Verify:**
```sql
SELECT COUNT(*) as integration_count FROM integration_marketplace;
-- Should return: 32 (2 from migration + 30 from seed)
```

---

## Step 5: Start Backend Server (1 minute)

```bash
# From botflow-backend directory
npm run dev
```

**Expected Output:**
```
🚀 Server listening on http://localhost:3001
📊 Environment: development
🔒 JWT enabled: true
🤖 Ralph enabled: true
```

**Test Health Endpoint:**

Open browser: http://localhost:3001/health

Expected:
```json
{
  "status": "ok",
  "timestamp": "2026-01-12T..."
}
```

---

## Step 6: Test Template API (5 minutes)

### Test 1: Get All Templates

**Request:**
```bash
curl http://localhost:3001/api/templates
```

**Expected:**
- Status: 200
- Body: Array of 20 templates
- Each template has: id, name, vertical, tier, description, required_fields, conversation_flow

### Test 2: Get Template by ID

First, copy a template ID from the response above, then:

```bash
curl http://localhost:3001/api/templates/{template-id}
```

**Expected:**
- Status: 200
- Body: Single template object

### Test 3: Get Templates by Vertical

```bash
curl http://localhost:3001/api/templates/vertical/taxi
```

**Expected:**
- Status: 200
- Body: Array with 1 taxi template

---

## Step 7: Test Integration Marketplace (5 minutes)

### Test 1: Get All Integrations

```bash
curl http://localhost:3001/api/marketplace
```

**Expected:**
- Status: 200
- Body: Array of 32 integrations

### Test 2: Get Integration by Slug

```bash
curl http://localhost:3001/api/marketplace/google-calendar
```

**Expected:**
- Status: 200
- Body: Google Calendar integration details

### Test 3: Get Integrations by Category

```bash
curl http://localhost:3001/api/marketplace/category/calendar
```

**Expected:**
- Status: 200
- Body: Array of calendar integrations

---

## Step 8: Test Ralph (if enabled) (3 minutes)

**Note:** Requires `ANTHROPIC_API_KEY` in `.env`

### Test 1: Check Ralph Status

```bash
curl http://localhost:3001/api/ralph/status \
  -H "Authorization: Bearer {your-jwt-token}"
```

**Expected:**
```json
{
  "enabled": true,
  "model": "claude-3-5-sonnet-20241022",
  "features": ["generate-template", "refine-template", "chat"]
}
```

### Test 2: Generate Template (takes 2-3 minutes)

```bash
curl -X POST http://localhost:3001/api/ralph/generate-template \
  -H "Authorization: Bearer {your-jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "Car Wash",
    "businessName": "Sparkle Auto Wash",
    "description": "Professional car wash in Johannesburg",
    "services": ["Express Wash", "Full Detail"],
    "bookingRequired": true
  }'
```

**Expected:**
- Status: 200
- Body: Complete template with required_fields and conversation_flow
- Takes 2-3 minutes

---

## Step 9: Start Frontend (2 minutes)

Open a new terminal:

```bash
cd botflow-website
npm install  # If dependencies changed
npm run dev
```

**Expected Output:**
```
▲ Next.js 15.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Compiled in XXXms
```

**Open Browser:** http://localhost:3000

---

## Step 10: Test Frontend Flows (10 minutes)

### Flow 1: Template Selection

1. Go to http://localhost:3000/dashboard/templates
2. Should see 20 template cards
3. Click on "Taxi & Shuttle Service" template
4. Preview modal should open showing:
   - Description
   - Example prompts
   - Required fields
   - Required integrations
5. Click "Use This Template"
6. Dynamic form should appear with taxi-specific fields

### Flow 2: Integration Marketplace

1. Go to http://localhost:3000/dashboard/marketplace
2. Should see 32 integration cards
3. Filter by "Calendar" category - should show 6 integrations
4. Click on "Google Calendar"
5. Detail modal should open showing:
   - Long description
   - Setup instructions
   - Supported features
6. Click "Enable Integration"

### Flow 3: Bot Creation

1. Go to http://localhost:3000/dashboard/templates
2. Click "Salon & Beauty" template
3. Click "Use This Template"
4. Fill in form:
   - Business Name: "Glamour Salon"
   - Business Location: "Sandton, Johannesburg"
   - Services: "Haircut, Color, Styling"
   - Operating Hours: "9:00 - 18:00"
5. Submit form
6. Should see success toast
7. Should redirect to bot detail page

---

## Quick Verification Checklist

After completing all steps, verify:

- [ ] ✅ Backend running on http://localhost:3001
- [ ] ✅ Frontend running on http://localhost:3000
- [ ] ✅ 9 database tables created
- [ ] ✅ 20 templates seeded
- [ ] ✅ 32 integrations seeded
- [ ] ✅ `/health` endpoint returns 200
- [ ] ✅ `/api/templates` returns 20 templates
- [ ] ✅ `/api/marketplace` returns 32 integrations
- [ ] ✅ Frontend loads without console errors
- [ ] ✅ Template cards visible in marketplace
- [ ] ✅ Integration cards visible in marketplace

---

## Common Issues & Fixes

### Issue: "Cannot connect to database"
**Fix:** Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### Issue: "Templates not showing in frontend"
**Fix:**
1. Check backend is running
2. Check `NEXT_PUBLIC_API_URL` in frontend `.env`
3. Check browser console for CORS errors

### Issue: "Migration already exists"
**Fix:** Table already created - skip to next migration

### Issue: "Port 3001 already in use"
**Fix:** Kill existing process: `npx kill-port 3001`

### Issue: "Module not found" when seeding
**Fix:** Run `npm run build` first

### Issue: Ralph not working
**Fix:** Check `ANTHROPIC_API_KEY` in `.env`

---

## Next Steps

After completing Quick Start:

1. ✅ Mark Phase 1 complete in [WEEK_12_TESTING_CHECKLIST.md](./WEEK_12_TESTING_CHECKLIST.md)
2. ✅ Start comprehensive backend testing with HTTP files
3. ✅ Test all template creation flows
4. ✅ Test all integration enablement flows
5. ✅ Run performance tests
6. ✅ Complete security audit
7. ✅ Setup monitoring
8. ✅ Prepare beta launch

---

## Time Breakdown

- Step 1 (Migrations): 10 min
- Step 2 (Build): 2 min
- Step 3 (Seed Templates): 3 min
- Step 4 (Seed Integrations): 3 min
- Step 5 (Start Backend): 1 min
- Step 6 (Test Templates): 5 min
- Step 7 (Test Marketplace): 5 min
- Step 8 (Test Ralph): 3 min
- Step 9 (Start Frontend): 2 min
- Step 10 (Test Frontend): 10 min

**Total: 44 minutes**

---

## Support

If you encounter issues:
1. Check [WEEK_12_GUIDE.md](./WEEK_12_GUIDE.md) for detailed troubleshooting
2. Check backend logs for errors
3. Check Supabase logs: Project → Logs → Database
4. Check frontend console for errors

---

**Good luck! Let's smash Week 12! 🚀**
