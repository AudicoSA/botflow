# Check Supabase Schema

## Quick Check - Run This Query

Run this in Supabase SQL Editor to see what tables already exist:

```sql
-- Check all tables in public schema
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## Check bots Table Structure

```sql
-- Check if bots table exists and its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bots'
ORDER BY ordinal_position;
```

## Check Specific Tables We Need

```sql
-- Check which Week 12 tables already exist
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

## Check bot_id Data Type Issues

```sql
-- Check if bot_id in any table is TEXT instead of UUID
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'bot_id'
ORDER BY table_name;
```

## Results Interpretation

### If bots.id is UUID:
- Migration 002 is correct as-is (bot_id UUID)
- Migration 004 needs fixing (currently has bot_id TEXT)

### If bots.id is TEXT:
- Migration 002 needs fixing (change bot_id to TEXT)
- Migration 004 is correct as-is (bot_id TEXT)

---

## Next Steps After Checking

1. Run the queries above
2. Share the results
3. I'll fix the migrations based on actual schema
4. Then we can run migrations successfully
