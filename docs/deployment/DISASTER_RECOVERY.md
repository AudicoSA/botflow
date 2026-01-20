## BotFlow Disaster Recovery Plan

Phase 2 Week 6 Day 7: Complete disaster recovery procedures

**Version:** 1.0
**Last Updated:** 2026-01-17
**Owner:** DevOps Team
**Review Schedule:** Quarterly

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Recovery Procedures](#recovery-procedures)
5. [Incident Response](#incident-response)
6. [Testing Schedule](#testing-schedule)
7. [Contact Information](#contact-information)

---

## Overview

This document outlines the disaster recovery procedures for BotFlow, including backup strategies, recovery procedures, and incident response protocols.

### Scope

This plan covers:
- Database failures
- Application failures
- Infrastructure failures
- Data corruption
- Complete system failures
- Security incidents

### Assumptions

- Backups are taken daily and stored in multiple locations
- Recovery team has access to all necessary credentials
- Communication channels are established
- Staff are trained on recovery procedures

---

## Recovery Objectives

### RTO (Recovery Time Objective)

| Severity | Target RTO | Description |
|----------|------------|-------------|
| **Critical** | 1 hour | Complete system outage, data loss |
| **High** | 4 hours | Major feature unavailable |
| **Medium** | 24 hours | Minor feature issues |
| **Low** | 7 days | Non-critical issues |

### RPO (Recovery Point Objective)

| Data Type | Target RPO | Backup Frequency |
|-----------|------------|------------------|
| **Database** | 1 hour | Daily + WAL archiving |
| **Files (Knowledge Base)** | 24 hours | Daily |
| **Configuration** | 1 hour | Version controlled |
| **Logs** | 5 minutes | Real-time streaming |

---

## Backup Strategy

### Automated Daily Backups

**Schedule:** Every day at 2:00 AM UTC

**What's Backed Up:**
- Full PostgreSQL database dump
- Supabase Storage files (knowledge base documents)
- Application configuration
- Environment variables (encrypted)

**Backup Locations:**
1. **Primary:** Supabase automatic backups (7 days retention)
2. **Secondary:** Local server (`/backups/botflow/`)
3. **Tertiary:** AWS S3 (`s3://botflow-backups/daily/`) - 30 days retention

**Backup Script:**
```bash
/path/to/botflow-backend/scripts/backup-database.sh
```

**Cron Schedule:**
```bash
0 2 * * * /path/to/botflow-backend/scripts/backup-database.sh >> /var/log/botflow-backup.log 2>&1
```

### Backup Verification

Backups are verified daily:
- ✅ File integrity check (gzip -t)
- ✅ File size validation (not empty)
- ✅ Restoration test (monthly)
- ✅ Encryption validation

### Backup Retention

| Location | Retention Period |
|----------|------------------|
| Supabase | 7 days |
| Local server | 30 days |
| AWS S3 (Standard-IA) | 30 days |
| AWS S3 Glacier (Archive) | 1 year |

---

## Recovery Procedures

### Scenario 1: Database Corruption or Data Loss

**Severity:** Critical
**Target RTO:** 1 hour
**Target RPO:** 1 hour

#### Steps:

1. **Assess the Damage**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT NOW();"

   # Check table integrity
   psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
   ```

2. **List Available Backups**
   ```bash
   # Local backups
   ls -lh /backups/botflow/

   # S3 backups
   aws s3 ls s3://botflow-backups/daily/
   ```

3. **Select Backup to Restore**
   - Choose most recent backup before corruption
   - Verify backup integrity

4. **Restore Database**
   ```bash
   # Run restore script
   cd /path/to/botflow-backend/scripts
   ./restore-database.sh botflow_backup_20260117_020000.sql.enc.gz

   # Or from S3
   ./restore-database.sh s3://botflow-backups/daily/2026-01-17/botflow_backup_20260117_020000.sql.enc.gz
   ```

5. **Verify Restoration**
   ```bash
   # Check record counts
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM organizations;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM conversations;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM messages;"
   ```

6. **Test Application**
   - Login to dashboard
   - Check bot functionality
   - Verify WhatsApp webhooks
   - Test analytics

7. **Notify Stakeholders**
   - Update status page
   - Send customer notification
   - Post-incident report

**Estimated Recovery Time:** 30-60 minutes

---

### Scenario 2: Complete Backend Failure

**Severity:** Critical
**Target RTO:** 1 hour

#### Steps:

1. **Assess the Failure**
   ```bash
   # Check service status
   railway status

   # Check logs
   railway logs --tail 100
   ```

2. **Deploy to New Infrastructure**
   ```bash
   # Option A: Rollback to previous deployment
   railway rollback

   # Option B: Deploy from GitHub
   git clone https://github.com/your-org/botflow.git
   cd botflow/botflow-backend
   railway up
   ```

3. **Configure Environment Variables**
   ```bash
   # Set all required environment variables
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=...
   # ... (see DEPLOYMENT_GUIDE.md)
   ```

4. **Verify Health**
   ```bash
   curl https://api.botflow.co.za/health
   ```

5. **Restore Database if Needed**
   - Follow Scenario 1 if database was affected

**Estimated Recovery Time:** 45-60 minutes

---

### Scenario 3: Frontend Failure

**Severity:** High
**Target RTO:** 30 minutes

#### Steps:

1. **Rollback Deployment**
   ```bash
   # Vercel dashboard or CLI
   vercel rollback <deployment-url>
   ```

2. **Or Deploy from Git**
   ```bash
   cd botflow/botflow-website
   vercel --prod
   ```

3. **Verify**
   - Visit https://botflow.co.za
   - Test login/signup
   - Check dashboard loads

**Estimated Recovery Time:** 15-30 minutes

---

### Scenario 4: Redis Cache Failure

**Severity:** Medium
**Target RTO:** 15 minutes
**Impact:** Degraded performance (no data loss)

#### Steps:

1. **Verify Redis Status**
   ```bash
   redis-cli -h <host> -p <port> -a <password> ping
   ```

2. **Restart Redis** (if self-hosted)
   ```bash
   sudo systemctl restart redis
   ```

3. **Or Switch to Redis Cloud** (if using local Redis)
   - Update `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
   - Redeploy backend

4. **Verify Cache Working**
   ```bash
   curl https://api.botflow.co.za/health
   # Check "redis": true in response
   ```

**Note:** Application continues to work without Redis, just slower.

---

### Scenario 5: Supabase Storage Failure

**Severity:** Medium
**Target RTO:** 4 hours
**Impact:** Knowledge base files unavailable

#### Steps:

1. **Check Supabase Status**
   - https://status.supabase.com

2. **Restore from Local Backup** (if available)
   ```bash
   # Re-upload files to Supabase Storage
   # This requires manual intervention or custom script
   ```

3. **Or Wait for Supabase Recovery**
   - Supabase has their own disaster recovery
   - Files are replicated across zones

4. **Verify Files Restored**
   - Test file upload in dashboard
   - Check existing files load

**Estimated Recovery Time:** 4 hours (depends on Supabase)

---

### Scenario 6: Security Incident

**Severity:** Critical
**Target RTO:** Immediate

#### Steps:

1. **Immediate Actions**
   - Rotate all API keys and secrets
   - Force logout all users (invalidate JWT tokens)
   - Enable read-only mode (if possible)
   - Notify security team

2. **Assess Breach**
   - Check logs for suspicious activity
   - Review Sentry errors
   - Audit database for unauthorized changes

3. **Contain Threat**
   - Block malicious IPs in Cloudflare
   - Disable compromised accounts
   - Patch vulnerability if identified

4. **Restore from Clean Backup**
   - If data was compromised, restore from backup before breach
   - Follow Scenario 1 (Database Restoration)

5. **Post-Incident**
   - Security audit
   - Incident report
   - Customer notification (if required by POPIA)
   - Update security measures

**See also:** SECURITY_AUDIT.md

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Complete outage, data loss | Immediate | Database down, API unavailable |
| **P2 - High** | Major feature unavailable | < 1 hour | WhatsApp not working, login broken |
| **P3 - Medium** | Minor feature issue | < 4 hours | Analytics slow, UI bug |
| **P4 - Low** | Cosmetic issue | < 24 hours | Typo, minor UI glitch |

### Incident Response Team

| Role | Responsibilities | Contact |
|------|------------------|---------|
| **Incident Commander** | Coordinate response, make decisions | +27 xx xxx xxxx |
| **Technical Lead** | Execute technical recovery | +27 xx xxx xxxx |
| **Communications Lead** | Customer & stakeholder updates | +27 xx xxx xxxx |
| **Database Administrator** | Database recovery | +27 xx xxx xxxx |

### Communication Protocol

1. **Internal Communication:** Slack #incidents channel
2. **Customer Communication:** Status page (status.botflow.co.za)
3. **Stakeholder Communication:** Email to stakeholders
4. **Post-Incident:** Full incident report within 24 hours

### Incident Response Checklist

- [ ] Incident detected and severity assessed
- [ ] Incident Commander notified
- [ ] Response team assembled
- [ ] Status page updated (if customer-facing)
- [ ] Root cause identified
- [ ] Recovery procedure initiated
- [ ] Recovery verified
- [ ] Customers notified of resolution
- [ ] Post-incident review scheduled
- [ ] Documentation updated

---

## Testing Schedule

### Monthly Tests

- [ ] **Backup Verification:** Restore backup to test environment
- [ ] **Failover Test:** Test Railway auto-scaling
- [ ] **Security Test:** Run security audit checklist

### Quarterly Tests

- [ ] **Full DR Drill:** Simulate complete outage and recovery
- [ ] **Load Test:** Run k6 load tests to verify performance
- [ ] **Penetration Test:** Security penetration testing
- [ ] **DR Plan Review:** Update this document

### Annual Tests

- [ ] **Multi-Region Failover:** Test geographic redundancy
- [ ] **Compliance Audit:** POPIA compliance review
- [ ] **Business Continuity Test:** Test entire organization's response

---

## Runbook Quick Reference

### Quick Commands

```bash
# Check system health
curl https://api.botflow.co.za/health

# Check database
psql $DATABASE_URL -c "SELECT NOW();"

# Check Redis
redis-cli -h <host> -p <port> -a <password> ping

# View logs
railway logs --tail 100

# Rollback deployment
railway rollback

# Restore database
cd /path/to/botflow-backend/scripts
./restore-database.sh <backup-file>

# List backups
ls -lh /backups/botflow/
aws s3 ls s3://botflow-backups/daily/
```

### Health Check URLs

- Backend: https://api.botflow.co.za/health
- Frontend: https://botflow.co.za
- Supabase: https://status.supabase.com
- Railway: https://railway.app/status
- Vercel: https://vercel-status.com

---

## Contact Information

### Emergency Contacts

| Name | Role | Phone | Email |
|------|------|-------|-------|
| [Name] | CEO / Incident Commander | +27 xx xxx xxxx | ceo@botflow.co.za |
| [Name] | CTO / Technical Lead | +27 xx xxx xxxx | cto@botflow.co.za |
| [Name] | DevOps Engineer | +27 xx xxx xxxx | devops@botflow.co.za |

### Service Providers

| Provider | Service | Support URL | Phone |
|----------|---------|-------------|-------|
| Supabase | Database | https://supabase.com/support | support@supabase.com |
| Railway | Backend Hosting | https://railway.app/help | support@railway.app |
| Vercel | Frontend Hosting | https://vercel.com/support | support@vercel.com |
| Cloudflare | CDN & DNS | https://cloudflare.com/support | +1 (888) 993-5273 |
| Sentry | Monitoring | https://sentry.io/support | support@sentry.io |

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-17 | 1.0 | Initial disaster recovery plan | Claude |

---

## Next Review Date

**Scheduled Review:** 2026-04-17 (3 months)

---

**Remember:** This is a living document. Update it after every incident and quarterly review!

---

## Appendix A: Backup Script Usage

See [backup-database.sh](./botflow-backend/scripts/backup-database.sh)

```bash
# Set environment variables
export DATABASE_URL="postgresql://..."
export BACKUP_ENCRYPTION_KEY="your-32-char-key"
export S3_BUCKET="botflow-backups"

# Run backup
./backup-database.sh
```

## Appendix B: Restore Script Usage

See [restore-database.sh](./botflow-backend/scripts/restore-database.sh)

```bash
# Restore from local backup
./restore-database.sh botflow_backup_20260117_020000.sql.enc.gz

# Restore from S3
./restore-database.sh s3://botflow-backups/daily/2026-01-17/botflow_backup_20260117_020000.sql.enc.gz
```

---

**END OF DISASTER RECOVERY PLAN**
