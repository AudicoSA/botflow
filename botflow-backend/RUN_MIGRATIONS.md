# Database Migration Guide - Week 12

## Prerequisites

- Access to Supabase dashboard (https://supabase.com/dashboard)
- Your Supabase project credentials
- Service role key (not anon key!)

## Migration Order (CRITICAL - Run in this exact order!)

1. **001_create_bot_templates.sql** - Bot template system
2. **002_create_properties_and_availability.sql** - Airbnb iCal system
3. **003_create_payments_and_subscriptions.sql** - Paystack payments
4. **004_create_integration_marketplace_v2.sql** - Integration marketplace

## Option A: Supabase Dashboard (Recommended)

### Step 1: Go to SQL Editor

1. Visit https://supabase.com/dashboard
2. Select your BotFlow project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Run Migration 001

1. Open `botflow-backend/migrations/001_create_bot_templates.sql`
2. Copy the entire file contents
3. Paste into the Supabase SQL Editor
4. Click **"Run"** (or press Ctrl/Cmd + Enter)
5. Wait for success message: ✅ "Success. No rows returned"
6. Verify in "Table Editor" - should see `bot_templates` table

### Step 3: Run Migration 002

1. Open `botflow-backend/migrations/002_create_properties_and_availability.sql`
2. Copy the entire file contents
3. Paste into the Supabase SQL Editor
4. Click **"Run"**
5. Wait for success message with notice: "✅ Migration 002 complete"
6. Verify tables: `properties`, `blocked_dates`, `sync_logs`

### Step 4: Run Migration 003

1. Open `botflow-backend/migrations/003_create_payments_and_subscriptions.sql`
2. Copy the entire file contents
3. Paste into the Supabase SQL Editor
4. Click **"Run"**
5. Verify tables: `payments`, `subscriptions`

### Step 5: Run Migration 004

1. Open `botflow-backend/migrations/004_create_integration_marketplace_v2.sql`
2. Copy the entire file contents
3. Paste into the Supabase SQL Editor
4. Click **"Run"**
5. Verify tables: `integration_marketplace`, `bot_integrations`, `integration_logs`
6. Verify 2 rows inserted (Google Calendar, Paystack)

## Option B: Command Line (psql)

```bash
# Set your Supabase connection string
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# Navigate to backend
cd botflow-backend

# Run migrations in order
psql $DATABASE_URL -f migrations/001_create_bot_templates.sql
psql $DATABASE_URL -f migrations/002_create_properties_and_availability.sql
psql $DATABASE_URL -f migrations/003_create_payments_and_subscriptions.sql
psql $DATABASE_URL -f migrations/004_create_integration_marketplace_v2.sql
```

## Verification Queries

After running ALL 4 migrations, run this verification query:

```sql
-- Check all tables exist
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

**Expected Result:** 9 tables

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN (
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
ORDER BY tablename, policyname;
```

**Expected Result:** Multiple RLS policies per table

```sql
-- Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
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
ORDER BY tablename, indexname;
```

**Expected Result:** Multiple indexes per table

```sql
-- Check initial data seeded
SELECT 'Google Calendar' as integration, COUNT(*) as count
FROM integration_marketplace WHERE slug = 'google-calendar'
UNION ALL
SELECT 'Paystack', COUNT(*)
FROM integration_marketplace WHERE slug = 'paystack';
```

**Expected Result:**
```
integration       | count
------------------|------
Google Calendar   | 1
Paystack          | 1
```

## Troubleshooting

### Error: "relation already exists"

The table was already created. Options:
1. **Skip** - Table is already there, move to next migration
2. **Drop and recreate** - Run `DROP TABLE [table_name] CASCADE;` first
3. **Check if complete** - Run verification queries to see if it's correct

### Error: "permission denied"

You're using the anon key instead of service role key.
- Go to Project Settings → API
- Copy the `service_role` secret (not `anon` public)
- Update your connection string

### Error: "syntax error at or near..."

Check PostgreSQL version:
```sql
SELECT version();
```

Should be PostgreSQL 14+ (Supabase uses 15)

### Error: "function update_updated_at_column already exists"

This is fine! The function is shared across migrations. Continue to next step.

### Error: "cannot execute DROP TABLE in a read-only transaction"

You're connected as a read-only user. Use the service role key.

## Post-Migration Checklist

- [ ] All 9 tables visible in Table Editor
- [ ] RLS enabled on all tables (check policies tab)
- [ ] Indexes created (check in database performance tab)
- [ ] Google Calendar integration record exists
- [ ] Paystack integration record exists
- [ ] No errors in Supabase logs

## Next Steps

After migrations complete:
1. Seed bot templates: `npm run build && node dist/scripts/run-seed.js`
2. Seed integrations: `node dist/scripts/seed-integrations.js`
3. Verify data: Check counts match expected (13 templates, 32 integrations)

## Need Help?

- Check Supabase logs: Project → Logs → Database
- Check migration file for specific error messages
- Ensure you have sufficient database permissions
- Verify network connectivity to Supabase

---

**Status:** Ready to run
**Estimated Time:** 5-10 minutes total
**Risk:** Low (migrations are idempotent and can be safely re-run)
