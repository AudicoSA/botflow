# BotFlow Load Testing Guide

Phase 2 Week 6 Day 4: Performance and stress testing with k6

## Prerequisites

Install k6:

```bash
# Windows (using Chocolatey)
choco install k6

# macOS (using Homebrew)
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scripts

### 1. API Load Test (`api-load-test.js`)

**Purpose:** Comprehensive load testing of all API endpoints

**What it tests:**
- Health checks
- Bot list retrieval
- Conversation listing
- Real-time analytics
- Template caching

**Load pattern:**
- Ramp up: 0 → 50 → 100 → 200 users
- Duration: ~20 minutes
- Steady state testing at each level

**Run:**
```bash
# Local testing
k6 run api-load-test.js

# Production testing
BASE_URL=https://api.botflow.co.za AUTH_TOKEN=your-token k6 run api-load-test.js

# Cloud testing (k6 Cloud)
k6 cloud api-load-test.js
```

**Success criteria:**
- ✅ p50 response time < 100ms
- ✅ p95 response time < 500ms
- ✅ Error rate < 1%
- ✅ Cache hit rate > 80%

---

### 2. Stress Test (`stress-test.js`)

**Purpose:** Find the breaking point of the system

**What it tests:**
- Maximum concurrent users before failure
- Graceful degradation under load
- Recovery after heavy load

**Load pattern:**
- Gradual increase: 100 → 200 → 300 → 400 users
- Duration: ~25 minutes
- Holds at each level to find breaking point

**Run:**
```bash
# Find breaking point
k6 run stress-test.js

# Production stress test (use with caution!)
BASE_URL=https://api.botflow.co.za AUTH_TOKEN=your-token k6 run stress-test.js
```

**What to look for:**
- At what user count does error rate exceed 5%?
- When do response times exceed 2000ms?
- Does the system recover after load decreases?

---

### 3. Spike Test (`spike-test.js`)

**Purpose:** Test sudden traffic spikes (e.g., viral social media posts)

**What it tests:**
- Sudden 10x traffic increase
- Auto-scaling response time
- Recovery after spike

**Load pattern:**
- Normal: 50 users
- Spike 1: 50 → 500 users in 10 seconds (10x)
- Hold: 3 minutes
- Normal: 50 users
- Spike 2: 50 → 800 users in 10 seconds (16x)
- Recovery

**Run:**
```bash
# Test spike resilience
k6 run spike-test.js

# Production spike test (notify team first!)
BASE_URL=https://api.botflow.co.za AUTH_TOKEN=your-token k6 run spike-test.js
```

**Success criteria:**
- ✅ Error rate < 10% during spike
- ✅ System recovers within 1 minute after spike
- ✅ No crashes or timeouts

---

## Custom Test Scenarios

### Quick Smoke Test (1 minute)
```bash
k6 run --vus 10 --duration 1m api-load-test.js
```

### Sustained Load Test (30 minutes at 100 users)
```bash
k6 run --vus 100 --duration 30m api-load-test.js
```

### Peak Load Test (Find max capacity)
```bash
k6 run --vus 500 --duration 5m api-load-test.js
```

---

## Environment Variables

Set these variables to customize tests:

```bash
# Base URL (default: http://localhost:3001)
export BASE_URL=https://api.botflow.co.za

# Authentication token (get from dashboard)
export AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Run test
k6 run api-load-test.js
```

---

## Understanding Results

### Response Time Metrics

- **p50 (median):** 50% of requests faster than this
- **p95:** 95% of requests faster than this (target: <500ms)
- **p99:** 99% of requests faster than this (target: <1000ms)

### Success Thresholds

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| p95 response time | <200ms | <500ms | >500ms |
| Error rate | <0.1% | <1% | >1% |
| Cache hit rate | >80% | >60% | <60% |

### Example Output

```
✓ health check status is 200
✓ health check response time < 50ms
✓ bot list status is 200
✓ bot list response time < 200ms
✓ conversations status is 200
✓ conversations response time < 300ms
✓ analytics status is 200
✓ analytics response time < 500ms

checks.........................: 100.00% ✓ 8000      ✗ 0
data_received..................: 2.4 MB  80 kB/s
data_sent......................: 800 kB  27 kB/s
http_req_blocked...............: avg=1.2ms    min=0s    med=0s    max=100ms  p(95)=2ms   p(99)=5ms
http_req_connecting............: avg=800µs    min=0s    med=0s    max=50ms   p(95)=1ms   p(99)=3ms
http_req_duration..............: avg=120ms    min=15ms  med=95ms  max=800ms  p(95)=350ms p(99)=600ms
  { expected_response:true }...: avg=120ms    min=15ms  med=95ms  max=800ms  p(95)=350ms p(99)=600ms
http_req_failed................: 0.00%   ✓ 0         ✗ 2000
http_req_receiving.............: avg=500µs    min=100µs med=400µs max=5ms    p(95)=1ms   p(99)=2ms
http_req_sending...............: avg=200µs    min=50µs  med=150µs max=2ms    p(95)=500µs p(99)=1ms
http_req_tls_handshaking.......: avg=0s       min=0s    med=0s    max=0s     p(95)=0s    p(99)=0s
http_req_waiting...............: avg=119.3ms  min=14ms  med=94ms  max=799ms  p(95)=349ms p(99)=599ms
http_reqs......................: 2000    66.66/s
iteration_duration.............: avg=1.5s     min=1s    med=1.4s  max=2s     p(95)=1.8s  p(99)=1.9s
iterations.....................: 400     13.33/s
vus............................: 20      min=20      max=20
vus_max........................: 20      min=20      max=20
```

---

## Troubleshooting

### High Error Rate

**Problem:** Error rate > 5%

**Possible causes:**
- Database connection pool exhausted
- Redis connection limit reached
- Rate limiting triggered
- Server out of memory

**Solutions:**
1. Check database connection pool size
2. Increase Redis max connections
3. Review rate limiting thresholds
4. Scale server resources

### Slow Response Times

**Problem:** p95 > 500ms

**Possible causes:**
- Missing database indexes
- Cache not working
- Slow queries
- N+1 query problems

**Solutions:**
1. Run `EXPLAIN ANALYZE` on slow queries
2. Check cache hit rate
3. Add missing indexes
4. Optimize query patterns

### Failed Requests

**Problem:** Requests timing out or failing

**Possible causes:**
- Server crashes under load
- Memory leaks
- Unhandled exceptions
- Resource exhaustion

**Solutions:**
1. Check server logs
2. Monitor memory usage
3. Review error tracking (Sentry)
4. Add error handling

---

## Best Practices

### Before Load Testing

1. ✅ **Notify team** - Let everyone know you're testing
2. ✅ **Backup data** - In case something goes wrong
3. ✅ **Monitor in real-time** - Watch metrics during test
4. ✅ **Start small** - Begin with low load, increase gradually

### During Load Testing

1. 📊 **Watch metrics** - Monitor response times, errors, CPU, memory
2. 🔍 **Check logs** - Look for errors in real-time
3. 💾 **Monitor database** - Check connection pool, query times
4. 🚨 **Be ready to stop** - Have rollback plan if issues occur

### After Load Testing

1. 📈 **Analyze results** - Review all metrics
2. 🐛 **Fix issues** - Address bottlenecks found
3. 🔄 **Re-test** - Verify fixes work
4. 📝 **Document** - Record findings and optimizations

---

## Performance Targets

### Production Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API p50 | <100ms | TBD | 🟡 Test needed |
| API p95 | <500ms | TBD | 🟡 Test needed |
| Error rate | <0.1% | TBD | 🟡 Test needed |
| Cache hit rate | >80% | TBD | 🟡 Test needed |
| Max concurrent users | 10,000+ | TBD | 🟡 Test needed |
| Uptime | 99.9% | TBD | 🟡 Test needed |

### After Optimization

Run tests again and update this table with actual results!

---

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Cloud](https://k6.io/cloud/)
- [Performance Testing Guide](https://k6.io/docs/test-types/introduction/)
- [BotFlow Performance Guide](../docs/performance.md)

---

**Created:** 2026-01-17
**Status:** Ready for testing
**Week:** Phase 2 Week 6 Day 4
