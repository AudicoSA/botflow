# BotFlow Production Deployment Guide

Phase 2 Week 6 Day 5: Deploy to production with optimal performance and security

## Overview

This guide covers deploying BotFlow to production infrastructure:
- **Backend:** Railway (Fastify API + BullMQ workers)
- **Frontend:** Vercel (Next.js 15)
- **Database:** Supabase PostgreSQL (with pgvector)
- **Cache:** Redis Cloud
- **CDN:** Cloudflare
- **Monitoring:** Sentry
- **Backups:** Automated daily backups

---

## Prerequisites

### Required Accounts

1. ✅ **Railway** - Backend hosting ([railway.app](https://railway.app))
2. ✅ **Vercel** - Frontend hosting ([vercel.com](https://vercel.com))
3. ✅ **Supabase** - Database ([supabase.com](https://supabase.com))
4. ✅ **Redis Cloud** - Cache ([redis.com](https://redis.com))
5. ✅ **Cloudflare** - CDN and DNS ([cloudflare.com](https://cloudflare.com))
6. ✅ **Sentry** - Error tracking ([sentry.io](https://sentry.io))
7. ✅ **OpenAI** - AI API ([platform.openai.com](https://platform.openai.com))
8. ✅ **Bird/Twilio** - WhatsApp API

### Required Tools

```bash
# Railway CLI
npm install -g @railway/cli

# Vercel CLI
npm install -g vercel

# k6 (load testing)
# See botflow-backend/load-tests/README.md
```

---

## Part 1: Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project: `botflow-production`
3. Select region: **closest to your users** (e.g., South Africa: `af-south-1`)
4. Note down:
   - Project URL
   - Anon key
   - Service role key

### Step 2: Run Database Migrations

```bash
cd botflow-backend

# Get database connection string from Supabase
# Project Settings → Database → Connection string (URI)

# Run migrations
psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" -f migrations/001_pgvector_knowledge_base.sql
psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" -f migrations/002_workflow_engine.sql
psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" -f migrations/003_analytics_dashboard.sql
psql "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" -f migrations/004_performance_indexes.sql
```

### Step 3: Enable pgvector Extension

```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 4: Configure Supabase Storage

1. Go to **Storage** in Supabase dashboard
2. Create bucket: `knowledge-base-files`
3. Set policies:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'knowledge-base-files');

   -- Allow service role to read
   CREATE POLICY "Allow service role access"
   ON storage.objects FOR SELECT
   TO service_role
   USING (bucket_id = 'knowledge-base-files');
   ```

---

## Part 2: Redis Setup (Redis Cloud)

### Step 1: Create Redis Instance

1. Go to [redis.com](https://redis.com)
2. Create free account
3. Create database:
   - Name: `botflow-cache`
   - Region: **Same as backend** (minimize latency)
   - Plan: Free (30MB) or Pro ($7/month for 250MB)

### Step 2: Get Connection Details

Note down:
- Redis host
- Redis port
- Redis password

### Step 3: Test Connection

```bash
# Install redis-cli
brew install redis  # macOS
apt install redis-tools  # Linux

# Test connection
redis-cli -h redis-12345.c1.us-west-1-2.ec2.cloud.redislabs.com -p 12345 -a your-password ping
# Should return: PONG
```

---

## Part 3: Backend Deployment (Railway)

### Step 1: Prepare Backend

```bash
cd botflow-backend

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Test build
node dist/server.js
```

### Step 2: Deploy to Railway

```bash
# Login to Railway
railway login

# Link to project (or create new)
railway link

# Set environment variables (see below)
railway variables set NODE_ENV=production
railway variables set PORT=3001
# ... (add all variables from list below)

# Deploy
railway up
```

### Step 3: Environment Variables (Railway)

**Required variables:**

```bash
# Node
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Redis
REDIS_HOST=redis-12345.c1.us-west-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-password

# OpenAI
OPENAI_API_KEY=sk-proj-...

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Bird WhatsApp
BIRD_API_KEY=your-bird-api-key
BIRD_WORKSPACE_ID=your-workspace-id
BIRD_WEBHOOK_SECRET=your-webhook-secret

# n8n (optional)
N8N_API_URL=https://your-n8n-instance.com
N8N_API_KEY=your-n8n-api-key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=min-32-character-webhook-secret

# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456

# Frontend URL
FRONTEND_URL=https://botflow.co.za

# Logging
LOG_LEVEL=info
```

### Step 4: Configure Custom Domain (Railway)

1. Go to Railway dashboard
2. Select your project
3. Settings → Domains
4. Add custom domain: `api.botflow.co.za`
5. Update DNS records in Cloudflare (see Part 5)

### Step 5: Verify Deployment

```bash
# Test health endpoint
curl https://api.botflow.co.za/health

# Expected response:
# {"status":"healthy","checks":{"database":true,"redis":true,"memory":true},...}
```

---

## Part 4: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

```bash
cd botflow-website

# Install dependencies
npm ci

# Set environment variable
export NEXT_PUBLIC_API_URL=https://api.botflow.co.za

# Build
npm run build

# Test build
npm run start
```

### Step 2: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy production
vercel --prod

# Or use Vercel dashboard:
# 1. Import Git repository
# 2. Framework Preset: Next.js
# 3. Root Directory: botflow-website
# 4. Build Command: npm run build
# 5. Output Directory: .next
```

### Step 3: Environment Variables (Vercel)

Go to Vercel dashboard → Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://api.botflow.co.za
```

### Step 4: Configure Custom Domain (Vercel)

1. Go to Vercel dashboard
2. Settings → Domains
3. Add domain: `botflow.co.za` and `www.botflow.co.za`
4. Update DNS in Cloudflare (see Part 5)

---

## Part 5: CDN & DNS Setup (Cloudflare)

### Step 1: Add Domain to Cloudflare

1. Go to [cloudflare.com](https://cloudflare.com)
2. Add site: `botflow.co.za`
3. Select Free plan
4. Copy nameservers

### Step 2: Update Nameservers

Update nameservers at your domain registrar to Cloudflare nameservers.

### Step 3: Configure DNS Records

Add these DNS records in Cloudflare:

```
Type    Name    Content                         Proxy Status
A       @       76.76.21.21                     Proxied (orange cloud)
CNAME   www     botflow.co.za                   Proxied
CNAME   api     xxx-production.up.railway.app   Proxied

TXT     @       v=spf1 include:_spf.google.com ~all
```

### Step 4: SSL/TLS Configuration

1. SSL/TLS → Overview → Full (strict)
2. Edge Certificates → Always Use HTTPS: **On**
3. Edge Certificates → Minimum TLS Version: **1.2**
4. Edge Certificates → Automatic HTTPS Rewrites: **On**

### Step 5: Caching Rules

Page Rules:
```
URL: api.botflow.co.za/*
Cache Level: Bypass
```

```
URL: botflow.co.za/*
Cache Level: Standard
Edge Cache TTL: 2 hours
Browser Cache TTL: 4 hours
```

### Step 6: Security Settings

1. **Firewall Rules:**
   - Block bad bots
   - Challenge suspicious traffic
   - Allow only from trusted countries (optional)

2. **Rate Limiting:**
   - API: 100 requests per minute per IP
   - Login: 5 requests per minute per IP

3. **DDoS Protection:** **Enabled** (automatic)

---

## Part 6: Monitoring Setup (Sentry)

### Step 1: Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create organization: `botflow`
3. Create project: `botflow-backend`
4. Platform: Node.js
5. Copy DSN

### Step 2: Configure Backend

Already done in [botflow-backend/src/config/sentry.ts](./botflow-backend/src/config/sentry.ts)

Add to Railway environment variables:
```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456
```

### Step 3: Set Up Alerts

Sentry dashboard → Alerts:
1. **Error rate alert:** > 1% in 1 hour
2. **Slow transactions:** p95 > 500ms
3. **Failed requests:** > 10 in 5 minutes

---

## Part 7: Backups Setup

### Automated Database Backups

Supabase automatically backs up your database daily. To download backups:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Download backup
supabase db dump -p your-project-ref > backup.sql
```

### Manual Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/botflow_backup_$DATE.sql"

# Backup database
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Upload to S3 or similar
# aws s3 cp "${BACKUP_FILE}.gz" s3://botflow-backups/

# Keep only last 30 days
find "$BACKUP_DIR" -name "botflow_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

Schedule with cron:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## Part 8: Post-Deployment Verification

### Checklist

- [ ] Backend health check: `curl https://api.botflow.co.za/health`
- [ ] Frontend loads: `https://botflow.co.za`
- [ ] Authentication works (login/signup)
- [ ] Bot creation works
- [ ] WhatsApp webhooks receiving messages
- [ ] Knowledge base upload works
- [ ] Analytics dashboard loads
- [ ] SSL certificates valid
- [ ] Monitoring receiving data (Sentry)
- [ ] Error alerts configured
- [ ] Backups running

### Performance Testing

```bash
cd botflow-backend/load-tests

# Run smoke test
k6 run --vus 10 --duration 1m api-load-test.js

# Run full load test
BASE_URL=https://api.botflow.co.za AUTH_TOKEN=your-token k6 run api-load-test.js
```

### Monitor Metrics

Check these after 24 hours:
1. **Sentry:** Error rate, slow transactions
2. **Railway:** CPU, memory, request count
3. **Supabase:** Query performance, connection pool
4. **Redis:** Cache hit rate, memory usage
5. **Cloudflare:** Bandwidth, requests, cache ratio

---

## Part 9: Rollback Plan

If deployment fails, rollback immediately:

### Railway Rollback

```bash
# List deployments
railway status

# Rollback to previous deployment
railway rollback
```

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Database Rollback

```bash
# Restore from backup
psql "$DATABASE_URL" < backup.sql
```

---

## Part 10: Maintenance

### Weekly Tasks

- [ ] Review Sentry errors
- [ ] Check database performance
- [ ] Review cache hit rate
- [ ] Check disk usage
- [ ] Update dependencies (security patches)

### Monthly Tasks

- [ ] Review server costs
- [ ] Audit security logs
- [ ] Test backup restoration
- [ ] Update documentation
- [ ] Review performance metrics

---

## Troubleshooting

### Backend won't start

1. Check Railway logs: `railway logs`
2. Verify environment variables set correctly
3. Test database connection
4. Check Redis connection

### Frontend 502 errors

1. Verify backend is running
2. Check API URL in environment variables
3. Test CORS configuration
4. Review Vercel logs

### Database connection errors

1. Check Supabase status
2. Verify connection string
3. Check connection pool limits
4. Review RLS policies

### Redis connection errors

1. Test Redis connection with `redis-cli`
2. Verify host/port/password
3. Check Redis Cloud status
4. Review connection limits

---

## Cost Estimate

### Monthly Costs (Estimated)

| Service | Plan | Cost |
|---------|------|------|
| Railway | Hobby ($5) or Pro ($20) | $5-20 |
| Vercel | Hobby (Free) or Pro ($20) | $0-20 |
| Supabase | Free or Pro ($25) | $0-25 |
| Redis Cloud | Free or Pro ($7) | $0-7 |
| Cloudflare | Free | $0 |
| Sentry | Developer ($26) | $26 |
| **Total** | | **$31-98/month** |

Note: Costs increase with usage (API calls, storage, bandwidth)

---

## Support

- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- Redis: [redis.io/docs](https://redis.io/docs)
- Cloudflare: [developers.cloudflare.com](https://developers.cloudflare.com)

---

**Created:** 2026-01-17
**Status:** Production ready
**Week:** Phase 2 Week 6 Day 5
