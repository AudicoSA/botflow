# Phase 2 Week 1.4 - Testing, Optimization & Polish 🧪

**Status:** Final Testing Phase
**Goal:** Test RAG system with real data, optimize performance, and prepare for Week 2
**Duration:** 1-2 days

---

## 📋 Table of Contents

1. [Quick Overview](#quick-overview)
2. [What's Already Complete](#whats-already-complete)
3. [Day 4 Objectives](#day-4-objectives)
4. [Testing Procedures](#testing-procedures)
5. [Performance Optimization](#performance-optimization)
6. [Quality Assurance](#quality-assurance)
7. [Week 1 Completion Criteria](#week-1-completion-criteria)
8. [Transition to Week 2](#transition-to-week-2)

---

## Quick Overview

### Where We Are Now ✅
- ✅ Backend RAG system fully implemented
- ✅ Knowledge search service operational
- ✅ WhatsApp integration complete
- ✅ Citation system working
- ✅ Test scripts created

### What's Left 🎯
- 🧪 Test with real PDF documents
- 🔍 Verify search quality and relevance
- ⚡ Optimize performance
- 📊 Measure success metrics
- 📝 Document findings

---

## What's Already Complete

### Infrastructure ✅
```
✓ pgvector extension enabled
✓ Database schema with vector(1536) columns
✓ Supabase Storage bucket configured
✓ n8n workflow active (14 nodes)
✓ HMAC webhook security
```

### Backend Code ✅
```
✓ Knowledge search service (115 lines)
✓ Search API endpoint with auth
✓ RAG integrated in message handler
✓ Citation system
✓ Error handling
✓ Metadata tracking
```

### Test Infrastructure ✅
```
✓ test-search.ps1 (PowerShell)
✓ test-search.sh (Bash)
✓ test-pdf-processing.ps1 (End-to-end)
✓ test-knowledge-full.ps1 (Upload flow)
```

---

## Day 4 Objectives

### 1. Real PDF Testing (2-3 hours)

#### Objective
Upload and process real PDF documents to verify the complete pipeline works end-to-end.

#### Tasks
- [ ] Select 3-5 test PDFs (different sizes, content types)
- [ ] Upload each PDF using test scripts
- [ ] Monitor n8n workflow execution
- [ ] Verify embeddings created in database
- [ ] Test search with various queries
- [ ] Document results

#### Success Criteria
- All PDFs process successfully
- Embeddings visible in database
- Search returns relevant results
- Processing completes in <60s per PDF

---

### 2. Search Quality Testing (1-2 hours)

#### Objective
Evaluate the quality and relevance of search results with different queries and thresholds.

#### Test Cases

##### Test Case 1: Exact Match
```
PDF Content: "Our business hours are Monday-Friday 8am-6pm"
Query: "What are your business hours?"
Expected: High similarity (>0.85), accurate match
```

##### Test Case 2: Semantic Match
```
PDF Content: "We operate from morning until evening on weekdays"
Query: "When are you open?"
Expected: Medium-high similarity (>0.75), relevant result
```

##### Test Case 3: No Match
```
PDF Content: "Business hours..."
Query: "What's the weather?"
Expected: Low similarity (<0.5), no results returned
```

##### Test Case 4: Multi-document
```
PDF 1: "Pricing: R499/month"
PDF 2: "Features: 24/7 support"
Query: "What features are included?"
Expected: Returns chunks from PDF 2, not PDF 1
```

#### Tasks
- [ ] Run test cases with different thresholds (0.5, 0.7, 0.85)
- [ ] Document similarity scores for each
- [ ] Identify optimal threshold value
- [ ] Test with 10+ different queries

---

### 3. WhatsApp End-to-End Testing (1 hour)

#### Objective
Verify the complete flow from WhatsApp message to cited response works perfectly.

#### Test Procedure

**Step 1: Prepare Test PDF**
```powershell
# Create simple test PDF with known content
"Test Knowledge Base

Q: What are your prices?
A: Basic R499, Pro R899, Enterprise R1,999

Q: How do I contact support?
A: Email support@botflow.co.za or call 083 123 4567

Q: What is BotFlow?
A: BotFlow is an AI WhatsApp automation platform for South African businesses."

# Save as test-knowledge.pdf
```

**Step 2: Upload and Process**
```powershell
.\test-pdf-processing.ps1 -PdfPath "test-knowledge.pdf"
```

**Step 3: Send WhatsApp Messages**
```
Message 1: "What are your prices?"
Expected: Lists pricing with citation

Message 2: "How can I reach support?"
Expected: Provides contact info with citation

Message 3: "Tell me about BotFlow"
Expected: Explains BotFlow with citation

Message 4: "What's the weather?"
Expected: General response, NO citation
```

**Step 4: Verify Results**
- [ ] All knowledge-based questions include citation
- [ ] General questions don't have citation
- [ ] Responses are accurate from PDF
- [ ] Responses are natural (not copy-paste)

---

### 4. Performance Benchmarking (1 hour)

#### Objective
Measure system performance and identify bottlenecks.

#### Metrics to Measure

| Operation | Target | Measurement |
|-----------|--------|-------------|
| PDF Upload | <2s | ___s |
| n8n Processing (5 pages) | <30s | ___s |
| Embedding Generation | 1s/chunk | ___s |
| Search Query | <500ms | ___ms |
| End-to-end Message Response | <3s | ___s |

#### Performance Test Script

```powershell
# test-performance.ps1

$EMAIL = "kenny@audico.co.za"
$PASSWORD = "Apwd4me-1"
$BACKEND_URL = "http://localhost:3002"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Write-Host "=== Performance Benchmark ===" -ForegroundColor Cyan
Write-Host ""

# Login
$loginStart = Get-Date
$loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)
$loginEnd = Get-Date
$loginTime = ($loginEnd - $loginStart).TotalMilliseconds

$TOKEN = $loginResponse.token
Write-Host "Login: ${loginTime}ms" -ForegroundColor Green

# Search Performance (10 queries)
$queries = @(
    "What are your prices?",
    "How do I contact support?",
    "What is BotFlow?",
    "Tell me about features",
    "How does pricing work?"
)

$searchTimes = @()

foreach ($query in $queries) {
    $searchStart = Get-Date

    $searchBody = @{
        query = $query
        limit = 3
        threshold = 0.7
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/search" `
        -Method POST `
        -Headers @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"} `
        -Body $searchBody

    $searchEnd = Get-Date
    $searchTime = ($searchEnd - $searchStart).TotalMilliseconds
    $searchTimes += $searchTime

    Write-Host "Search '$query': ${searchTime}ms (found $($response.count))" -ForegroundColor Yellow
}

$avgSearchTime = ($searchTimes | Measure-Object -Average).Average
Write-Host ""
Write-Host "Average Search Time: ${avgSearchTime}ms" -ForegroundColor Cyan

# Performance Summary
Write-Host ""
Write-Host "=== Performance Summary ===" -ForegroundColor Cyan
Write-Host "Login: ${loginTime}ms" -ForegroundColor $(if ($loginTime -lt 1000) {"Green"} else {"Yellow"})
Write-Host "Avg Search: ${avgSearchTime}ms" -ForegroundColor $(if ($avgSearchTime -lt 500) {"Green"} else {"Yellow"})
Write-Host ""

if ($avgSearchTime -lt 500) {
    Write-Host "✓ Performance targets met!" -ForegroundColor Green
} else {
    Write-Host "⚠ Performance optimization needed" -ForegroundColor Yellow
}
```

#### Tasks
- [ ] Run performance test script
- [ ] Record all measurements
- [ ] Identify bottlenecks
- [ ] Document optimization opportunities

---

### 5. Database Optimization (1 hour)

#### Objective
Optimize database queries for production performance.

#### Optimization Tasks

##### Task 1: Verify Indexes

```sql
-- Check if IVFFLAT index exists on embedding column
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'knowledge_embeddings';

-- If not present, create it
CREATE INDEX IF NOT EXISTS knowledge_embeddings_embedding_idx
ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Analyze table for query planner
ANALYZE knowledge_embeddings;
```

##### Task 2: Query Performance

```sql
-- Test search performance
EXPLAIN ANALYZE
SELECT
    content,
    metadata,
    1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;

-- Look for:
-- - Index scan (good) vs Seq scan (bad)
-- - Execution time < 50ms
```

##### Task 3: Cleanup Old Data

```sql
-- Check for orphaned records
SELECT COUNT(*)
FROM knowledge_embeddings e
LEFT JOIN knowledge_base_articles a ON e.source_id = a.id
WHERE a.id IS NULL;

-- Delete if any found
DELETE FROM knowledge_embeddings
WHERE source_id NOT IN (SELECT id FROM knowledge_base_articles);
```

---

### 6. Error Handling Verification (30 minutes)

#### Objective
Test error scenarios to ensure graceful degradation.

#### Error Scenarios to Test

##### Scenario 1: No Embeddings
```
Bot with no knowledge uploaded
Message: "What are your prices?"
Expected: Bot responds with general knowledge, NO citation
Verify: No errors in logs
```

##### Scenario 2: OpenAI API Failure
```
Temporarily invalid API key in .env
Message: "What are your prices?"
Expected: Bot continues without RAG, logs warning
Verify: Chat still works
```

##### Scenario 3: Database Connection Failure
```
Message during database timeout
Expected: Error logged, user notified gracefully
Verify: No crash
```

##### Scenario 4: Large PDF
```
Upload 50+ page PDF
Expected: Processes completely or fails gracefully with clear error
Verify: No memory issues
```

#### Tasks
- [ ] Test each scenario
- [ ] Verify error logging
- [ ] Check user experience
- [ ] Document findings

---

## Testing Procedures

### Complete Test Checklist

#### Infrastructure Testing ✅
- [ ] Backend server running on port 3002
- [ ] Supabase database accessible
- [ ] pgvector extension active
- [ ] n8n workflow responding to webhooks
- [ ] Redis connection working (if configured)

#### Upload & Processing Testing
- [ ] Upload PDF via API (test-pdf-processing.ps1)
- [ ] Monitor n8n execution in dashboard
- [ ] Verify 14 nodes all complete successfully
- [ ] Check article status updates to "indexed"
- [ ] Verify embeddings appear in database
- [ ] Confirm chunk count matches expectations

#### Search Testing
- [ ] Search endpoint returns results
- [ ] Similarity scores are reasonable (0.7-1.0)
- [ ] Results are relevant to query
- [ ] Threshold filtering works
- [ ] Limit parameter works
- [ ] Empty results handled gracefully

#### WhatsApp Integration Testing
- [ ] Message triggers knowledge search
- [ ] GPT-4 receives knowledge context
- [ ] Response includes PDF information
- [ ] Citation footer appears when appropriate
- [ ] No citation when knowledge not used
- [ ] Multiple PDFs searchable

#### Performance Testing
- [ ] Search responds in <1s
- [ ] PDF processing in <60s (5 pages)
- [ ] No memory leaks during testing
- [ ] Database queries optimized
- [ ] Multiple concurrent searches work

---

## Performance Optimization

### Database Optimization

#### 1. Vector Index Optimization

```sql
-- Create HNSW index (better for large datasets)
CREATE INDEX knowledge_embeddings_hnsw_idx
ON knowledge_embeddings
USING hnsw (embedding vector_cosine_ops);

-- Monitor index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'knowledge_embeddings';
```

#### 2. Query Optimization

```typescript
// Add caching for frequent queries
import NodeCache from 'node-cache';

const searchCache = new NodeCache({
    stdTTL: 300,  // 5 minutes
    checkperiod: 60
});

export async function searchKnowledge(options: SearchOptions) {
    const cacheKey = `search:${options.botId}:${options.query}`;

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached) {
        return cached as SearchResult[];
    }

    // Perform search...
    const results = await performSearch(options);

    // Cache results
    searchCache.set(cacheKey, results);

    return results;
}
```

#### 3. Connection Pooling

```typescript
// Verify Supabase connection pooling
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        db: {
            schema: 'public',
        },
        auth: {
            persistSession: false,
        },
        // Connection pooling enabled by default
    }
);
```

### API Optimization

#### 1. Rate Limiting

```typescript
// Add rate limiting to search endpoint
import rateLimit from '@fastify/rate-limit';

fastify.register(rateLimit, {
    max: 100,  // 100 requests
    timeWindow: '1 minute',
    cache: 10000,  // Cache 10k users
    allowList: ['127.0.0.1'],  // Whitelist localhost
});
```

#### 2. Response Compression

```typescript
// Enable compression
import compress from '@fastify/compress';

fastify.register(compress, {
    encodings: ['gzip', 'deflate'],
    threshold: 1024,  // Only compress responses > 1KB
});
```

---

## Quality Assurance

### Quality Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Search Accuracy | >85% relevant | ___% | ⏳ |
| Response Time | <3s | ___s | ⏳ |
| Citation Accuracy | 100% | ___% | ⏳ |
| Error Rate | <1% | ___% | ⏳ |
| Uptime | >99% | ___% | ⏳ |

### Testing Documentation Template

```markdown
## Test Report: [Test Name]

**Date:** 2025-01-15
**Tester:** Kenny
**Environment:** Development

### Test Setup
- Backend: http://localhost:3002
- Bot ID: 8982d756-3cd0-4e2b-bf20-396e919cb354
- PDF: test-knowledge.pdf (3 pages, 5KB)

### Test Results

#### Upload & Processing
- Upload time: 1.2s ✅
- Processing time: 28s ✅
- Embeddings created: 12 chunks ✅
- Status: indexed ✅

#### Search Quality
| Query | Results | Top Similarity | Relevant? |
|-------|---------|----------------|-----------|
| "What are prices?" | 3 | 0.89 | ✅ Yes |
| "How to contact?" | 3 | 0.92 | ✅ Yes |
| "Weather today?" | 0 | N/A | ✅ Correct |

#### WhatsApp Integration
- Message received: ✅
- Knowledge searched: ✅
- Citation added: ✅
- Response time: 2.8s ✅

### Issues Found
1. None

### Recommendations
1. Threshold 0.75 works well
2. Consider caching frequent queries
3. Monitor performance with larger PDFs

### Overall Result
✅ PASS - All tests successful
```

---

## Week 1 Completion Criteria

### Must Have (Required) ✅

- [x] Backend RAG system implemented
- [x] Knowledge search service created
- [x] Search API endpoint with auth
- [x] RAG integrated into message handler
- [x] Citation system working
- [x] Error handling implemented
- [ ] Real PDF tested successfully
- [ ] Embeddings verified in database
- [ ] Search quality validated
- [ ] WhatsApp E2E test passed

### Should Have (Important) 🎯

- [ ] Performance benchmarks documented
- [ ] Database optimized with indexes
- [ ] Multiple PDFs tested
- [ ] Error scenarios handled
- [ ] Test report written

### Nice to Have (Optional) 💡

- [ ] Dashboard UI for knowledge management
- [ ] Bulk upload feature
- [ ] Advanced search filters
- [ ] Knowledge analytics
- [ ] Export functionality

---

## Transition to Week 2

### Week 1 Deliverables Checklist

#### Code Deliverables
- [x] `src/services/knowledge-search.ts` - Search service
- [x] `src/routes/knowledge.ts` - API routes (with search endpoint)
- [x] `src/queues/message.queue.ts` - RAG integration
- [ ] Performance optimization code
- [ ] Database indexes SQL

#### Documentation Deliverables
- [x] PHASE2_WEEK1_GUIDE.md - Overview
- [x] PHASE2_WEEK1.3_GUIDE.md - Implementation
- [x] PHASE2_WEEK1_RAG_COMPLETE.md - Summary
- [x] READY_TO_TEST.md - Quick start
- [ ] PHASE2_WEEK1_TEST_REPORT.md - Test results
- [ ] PHASE2_WEEK1_METRICS.md - Performance data

#### Test Artifacts
- [x] test-search.ps1
- [x] test-search.sh
- [x] test-pdf-processing.ps1
- [ ] test-performance.ps1
- [ ] Test PDFs (3-5 samples)
- [ ] Test results screenshots

### Week 2 Preview: Dynamic Workflow Engine ⚙️

**Goal:** Build the backend engine that assembles unique n8n workflows on the fly.

**Key Tasks:**
1. Create node library for standard tasks
2. Upgrade workflow-generator.ts
3. Implement variable injection system
4. Add workflow versioning
5. Build dry-run mode
6. Create rollback capability

**Prerequisites from Week 1:**
- ✅ Understanding of n8n workflow structure
- ✅ HMAC webhook security implementation
- ✅ Database schema patterns
- ✅ Error handling patterns

---

## Quick Reference

### Useful Commands

```powershell
# Start backend
cd botflow-backend && npm run dev

# Test search
.\test-search.ps1

# Upload PDF
.\test-pdf-processing.ps1 -PdfPath "file.pdf"

# Performance test
.\test-performance.ps1

# Check database
# In Supabase SQL Editor:
SELECT COUNT(*) FROM knowledge_embeddings;
```

### Key Files

```
Backend:
- src/services/knowledge-search.ts
- src/routes/knowledge.ts (lines 459-530)
- src/queues/message.queue.ts (lines 84-108, 356-377)

Tests:
- test-search.ps1
- test-search.sh
- test-pdf-processing.ps1

Docs:
- PHASE2_WEEK1_RAG_COMPLETE.md
- READY_TO_TEST.md
```

### Database Queries

```sql
-- Count embeddings
SELECT COUNT(*) FROM knowledge_embeddings
WHERE bot_id = 'your-bot-id';

-- Check article status
SELECT title, metadata->>'status', metadata->>'total_chunks'
FROM knowledge_base_articles
WHERE bot_id = 'your-bot-id';

-- Test search function
SELECT * FROM search_knowledge(
    '[0.1, 0.2, ...]'::vector,
    'your-bot-id',
    0.7,
    5
);
```

---

## Success Checklist

### Before Moving to Week 2

- [ ] All code implemented and tested
- [ ] At least 1 real PDF processed successfully
- [ ] Search quality validated (>85% accuracy)
- [ ] WhatsApp integration verified
- [ ] Performance benchmarks recorded
- [ ] Database optimized
- [ ] Error handling tested
- [ ] Documentation complete
- [ ] Test report written
- [ ] No critical bugs

### Week 1 Sign-off

**Backend Status:** ✅ Complete / ⏳ Pending
**Testing Status:** ⏳ In Progress
**Performance:** ⏳ To Be Measured
**Documentation:** ✅ Complete

**Ready for Week 2:** ⏳ Pending final tests

---

## Resources

- **n8n Dashboard:** https://botflowsa.app.n8n.cloud
- **Supabase Dashboard:** https://supabase.com/dashboard
- **OpenAI Embeddings:** https://platform.openai.com/docs/guides/embeddings
- **pgvector Docs:** https://github.com/pgvector/pgvector

---

**Created:** 2025-01-15
**Status:** Ready for testing
**Next:** Upload PDF and complete final validation

🚀 Let's finish strong and move to Week 2!
