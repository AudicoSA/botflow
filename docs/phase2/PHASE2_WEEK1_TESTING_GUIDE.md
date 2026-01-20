# Phase 2 Week 1 - Complete Testing Guide 🧪

**Status:** Ready for Testing
**Date:** 2025-01-15
**Goal:** Comprehensive testing of RAG system with real data

---

## Quick Start Checklist

Before testing, ensure:
- [ ] Backend running on http://localhost:3002
- [ ] Supabase database accessible
- [ ] n8n workflow active (14 nodes)
- [ ] You have test PDF files ready
- [ ] Bot ID: `8982d756-3cd0-4e2b-bf20-396e919cb354`

---

## Test 1: Database Optimization ✅

### Step 1: Verify and Create Indexes

```powershell
# Open Supabase SQL Editor and run:
# c:\Users\kenny\OneDrive\Whatsapp Service\verify-database-optimization.sql
```

**Expected Results:**
- ✓ pgvector extension installed
- ✓ IVFFLAT index created on embeddings
- ✓ bot_id indexes present
- ✓ All tables analyzed

### Step 2: Check Index Performance

```sql
-- Run in Supabase SQL Editor
SELECT
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'knowledge_embeddings';
```

**Success Criteria:**
- Indexes are being used (idx_scan > 0 after searches)
- No "Seq Scan" in EXPLAIN ANALYZE results

---

## Test 2: PDF Upload & Processing 📄

### Step 1: Prepare Test PDFs

Create or use existing PDFs with known content. Recommended test files:

**Test PDF 1: Simple Knowledge Base** (test-knowledge.pdf)
```
BotFlow Knowledge Base

Q: What are your prices?
A: We offer three plans:
   - Basic: R499/month
   - Pro: R899/month
   - Enterprise: R1,999/month

Q: How do I contact support?
A: You can reach us at:
   - Email: support@botflow.co.za
   - Phone: 083 123 4567
   - Hours: Monday-Friday, 9am-5pm SAST

Q: What is BotFlow?
A: BotFlow is an AI-powered WhatsApp automation platform designed
   specifically for South African businesses. We help you automate
   customer service, bookings, and inquiries via WhatsApp.

Q: What integrations do you support?
A: We integrate with Google Sheets, WhatsApp Business API (via Bird),
   n8n workflows, and more coming soon.
```

**Test PDF 2: Business Hours** (business-hours.pdf)
```
Business Operations

Operating Hours:
- Monday to Friday: 8:00 AM - 6:00 PM
- Saturday: 9:00 AM - 2:00 PM
- Sunday: Closed

Public Holidays:
We are closed on all South African public holidays.

Emergency Contact:
For urgent matters after hours, call 082 555 1234
```

**Test PDF 3: Product Catalog** (products.pdf)
```
Product Catalog 2025

WhatsApp Bot Templates:

1. Taxi Service Bot - R499/month
   - Booking management
   - Driver dispatch
   - Fare calculation

2. Restaurant Bot - R899/month
   - Table reservations
   - Menu inquiries
   - Dietary requirements

3. E-commerce Bot - R1,999/month
   - Order tracking
   - Product recommendations
   - Return processing
```

### Step 2: Upload PDFs Using Test Script

```powershell
# Upload first test PDF
.\test-pdf-processing.ps1 -PdfPath "test-knowledge.pdf"

# Wait for processing (monitor n8n dashboard)
# Status should change from "processing" to "indexed"

# Upload second PDF
.\test-pdf-processing.ps1 -PdfPath "business-hours.pdf"

# Upload third PDF
.\test-pdf-processing.ps1 -PdfPath "products.pdf"
```

### Step 3: Verify Processing in Database

```sql
-- Check article status
SELECT
    id,
    title,
    metadata->>'status' as status,
    metadata->>'total_chunks' as chunks,
    created_at
FROM knowledge_base_articles
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY created_at DESC;

-- Count embeddings
SELECT
    a.title,
    COUNT(e.id) as embedding_count
FROM knowledge_base_articles a
LEFT JOIN knowledge_embeddings e ON e.source_id = a.id
WHERE a.bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
GROUP BY a.title;
```

**Success Criteria:**
- ✓ All articles show status = "indexed"
- ✓ total_chunks > 0 for each article
- ✓ Embeddings count matches chunk count
- ✓ Processing time < 60s per 5-page PDF

---

## Test 3: Search Quality Testing 🔍

### Step 1: Test Exact Matches

```powershell
# Run search test script
.\test-search.ps1
```

Or use API directly:

```powershell
# Login first
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{email="kenny@audico.co.za"; password="Apwd4me-1"} | ConvertTo-Json)

$TOKEN = $loginResponse.token

# Test Query 1: Exact match
$query1 = @{
    query = "What are your prices?"
    limit = 3
    threshold = 0.7
} | ConvertTo-Json

$result1 = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/8982d756-3cd0-4e2b-bf20-396e919cb354/knowledge/search" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"} `
    -Body $query1

Write-Host "Results: $($result1.count)"
$result1.results | ForEach-Object {
    Write-Host "Similarity: $($_.similarity) | Chunk: $($_.chunk_index)"
    Write-Host $_.content
    Write-Host ""
}
```

### Step 2: Test Search Scenarios

| Test Case | Query | Expected Similarity | Expected Result |
|-----------|-------|---------------------|-----------------|
| Exact Match | "What are your prices?" | >0.85 | Pricing info from PDF |
| Semantic Match | "How much does it cost?" | >0.75 | Pricing info |
| Partial Match | "Contact details" | >0.70 | Contact info |
| No Match | "What's the weather?" | <0.50 | No results |
| Multi-doc | "When are you open?" | >0.80 | Business hours from PDF 2 |
| Product Query | "Tell me about taxi bot" | >0.75 | Taxi template info from PDF 3 |

### Step 3: Test Different Thresholds

```powershell
# Test with low threshold (0.5)
$queryLow = @{query="pricing"; limit=5; threshold=0.5} | ConvertTo-Json
$resultLow = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge/search" `
    -Method POST -Headers @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"} `
    -Body $queryLow

# Test with medium threshold (0.7)
$queryMed = @{query="pricing"; limit=5; threshold=0.7} | ConvertTo-Json
$resultMed = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge/search" `
    -Method POST -Headers @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"} `
    -Body $queryMed

# Test with high threshold (0.85)
$queryHigh = @{query="pricing"; limit=5; threshold=0.85} | ConvertTo-Json
$resultHigh = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge/search" `
    -Method POST -Headers @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"} `
    -Body $queryHigh

Write-Host "Threshold 0.5: $($resultLow.count) results"
Write-Host "Threshold 0.7: $($resultMed.count) results"
Write-Host "Threshold 0.85: $($resultHigh.count) results"
```

**Success Criteria:**
- ✓ Exact matches return similarity >0.85
- ✓ Semantic matches return similarity >0.70
- ✓ Irrelevant queries return 0 results with threshold 0.7
- ✓ Multi-document search works correctly
- ✓ Optimal threshold identified (usually 0.7-0.75)

---

## Test 4: Performance Benchmarking ⚡

### Step 1: Run Performance Test

```powershell
.\test-performance.ps1
```

### Step 2: Record Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Login Time | <1000ms | ___ms | ⏳ |
| Search (avg) | <500ms | ___ms | ⏳ |
| Search (max) | <1000ms | ___ms | ⏳ |
| Stats Query | <500ms | ___ms | ⏳ |
| List Articles | <500ms | ___ms | ⏳ |
| Concurrent (5x) | <2000ms | ___ms | ⏳ |

### Step 3: Analyze Bottlenecks

If performance targets not met:

1. **Slow Login (>1000ms)**
   - Check JWT generation
   - Verify database connection pooling
   - Monitor Supabase response time

2. **Slow Search (>500ms)**
   - Verify IVFFLAT/HNSW index exists
   - Check if index is being used (EXPLAIN ANALYZE)
   - Monitor OpenAI API latency for embeddings
   - Consider query result caching

3. **Slow Stats Query (>500ms)**
   - Add indexes on metadata fields
   - Optimize COUNT queries
   - Consider materialized views

**Success Criteria:**
- ✓ All metrics meet targets
- ✓ No memory leaks during testing
- ✓ Concurrent requests handled well

---

## Test 5: WhatsApp End-to-End Testing 💬

### Prerequisites
- WhatsApp connected to bot
- Test knowledge PDFs uploaded and indexed
- Bot configured with RAG enabled

### Step 1: Test Knowledge-Based Questions

Send these messages via WhatsApp to your bot number:

**Test 1: Pricing Question**
```
Message: "What are your prices?"

Expected Response:
- Mentions Basic R499, Pro R899, Enterprise R1,999
- Includes citation footer: "📚 Source: test-knowledge.pdf"
- Natural language (not copy-paste)
```

**Test 2: Contact Question**
```
Message: "How can I contact support?"

Expected Response:
- Mentions email support@botflow.co.za
- Mentions phone 083 123 4567
- Mentions hours Monday-Friday 9am-5pm
- Includes citation footer
```

**Test 3: Business Hours**
```
Message: "When are you open?"

Expected Response:
- Mentions Monday-Friday 8am-6pm
- Mentions Saturday 9am-2pm
- Includes citation footer: "📚 Source: business-hours.pdf"
```

**Test 4: Product Query**
```
Message: "Tell me about the taxi bot"

Expected Response:
- Mentions R499/month
- Mentions booking management features
- Includes citation footer: "📚 Source: products.pdf"
```

### Step 2: Test General Questions (No RAG)

**Test 5: General Greeting**
```
Message: "Hello"

Expected Response:
- Friendly greeting
- NO citation footer (general knowledge)
```

**Test 6: Irrelevant Question**
```
Message: "What's the weather today?"

Expected Response:
- Polite response indicating outside scope
- NO citation footer
```

### Step 3: Verify in Backend Logs

```powershell
# Check logs for RAG activity
cd botflow-backend
npm run dev

# Look for log entries:
# ✓ "Knowledge search found X results"
# ✓ "RAG context added to GPT-4 prompt"
# ✓ "Citation added to response"
```

**Success Criteria:**
- ✓ Knowledge-based questions answered accurately
- ✓ Citations appear when knowledge used
- ✓ No citations for general questions
- ✓ Response time <3s end-to-end
- ✓ Natural language responses (not robotic)

---

## Test 6: Error Handling 🛡️

### Scenario 1: No Knowledge Available

```powershell
# Create new bot without knowledge
# Send message: "What are your prices?"

# Expected:
# - Bot responds with general knowledge
# - NO citation
# - No errors in logs
```

### Scenario 2: OpenAI API Failure

```powershell
# Temporarily set invalid OPENAI_API_KEY in .env
# Restart backend
# Send WhatsApp message

# Expected:
# - Warning logged in backend
# - Bot still responds (without RAG)
# - User notified politely
# - No crash
```

### Scenario 3: Large PDF Processing

```powershell
# Upload 50+ page PDF
.\test-pdf-processing.ps1 -PdfPath "large-document.pdf"

# Expected:
# - Processes completely OR fails gracefully
# - Clear error message if too large
# - No memory issues
# - Processing timeout handled
```

### Scenario 4: Invalid Search Query

```powershell
# Test with empty query
$emptyQuery = @{query=""; limit=3; threshold=0.7} | ConvertTo-Json

# Expected:
# - Returns 400 error
# - Clear error message
# - No crash
```

### Scenario 5: Concurrent Upload Stress Test

```powershell
# Upload 5 PDFs simultaneously
# Monitor system resources
# Check database connections

# Expected:
# - All process successfully OR queue properly
# - No connection pool exhaustion
# - Clear status for each upload
```

**Success Criteria:**
- ✓ All error scenarios handled gracefully
- ✓ Clear error messages to user
- ✓ Proper logging for debugging
- ✓ No system crashes
- ✓ Graceful degradation when services unavailable

---

## Test 7: Data Quality Verification 📊

### Step 1: Check Embedding Quality

```sql
-- Verify embedding dimensions
SELECT
    id,
    array_length(embedding, 1) as dimensions
FROM knowledge_embeddings
LIMIT 10;

-- Expected: All should be 1536 (OpenAI text-embedding-3-small)
```

### Step 2: Check Metadata Completeness

```sql
-- Verify all required metadata fields
SELECT
    id,
    title,
    metadata->>'status' as status,
    metadata->>'total_chunks' as chunks,
    metadata->>'file_size' as size,
    metadata ? 'storage_path' as has_storage_path
FROM knowledge_base_articles
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354';

-- Expected: All fields populated, status = 'indexed'
```

### Step 3: Check for Duplicate Content

```sql
-- Find potential duplicate chunks
SELECT content, COUNT(*) as occurrences
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
GROUP BY content
HAVING COUNT(*) > 1;

-- Expected: Minimal duplicates (exact same content)
```

**Success Criteria:**
- ✓ All embeddings are 1536 dimensions
- ✓ All metadata fields complete
- ✓ No missing or null critical fields
- ✓ Minimal duplicate content

---

## Test Results Template 📝

```markdown
## Test Report: Phase 2 Week 1 RAG System

**Date:** 2025-01-15
**Tester:** Kenny
**Environment:** Development (localhost:3002)
**Bot ID:** 8982d756-3cd0-4e2b-bf20-396e919cb354

---

### 1. Database Optimization ✅

- pgvector extension: ✅ Installed
- IVFFLAT index: ✅ Created
- bot_id indexes: ✅ Present
- Query performance: ✅ <50ms

### 2. PDF Upload & Processing

| File | Size | Pages | Processing Time | Chunks | Status |
|------|------|-------|-----------------|--------|--------|
| test-knowledge.pdf | 5KB | 1 | 22s | 12 | ✅ |
| business-hours.pdf | 3KB | 1 | 18s | 8 | ✅ |
| products.pdf | 7KB | 2 | 28s | 15 | ✅ |

### 3. Search Quality

| Query | Similarity | Results | Relevant? |
|-------|------------|---------|-----------|
| "What are your prices?" | 0.89 | 3 | ✅ |
| "How to contact?" | 0.92 | 3 | ✅ |
| "When are you open?" | 0.87 | 3 | ✅ |
| "Weather today?" | 0.32 | 0 | ✅ |

**Optimal Threshold:** 0.75

### 4. Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Login | <1000ms | 245ms | ✅ |
| Avg Search | <500ms | 312ms | ✅ |
| Max Search | <1000ms | 489ms | ✅ |
| Stats Query | <500ms | 156ms | ✅ |

### 5. WhatsApp E2E

- Pricing question: ✅ Correct + citation
- Contact question: ✅ Correct + citation
- Hours question: ✅ Correct + citation
- General greeting: ✅ No citation (correct)
- Irrelevant question: ✅ Handled gracefully

### 6. Error Handling

- No knowledge: ✅ Graceful
- API failure: ✅ Graceful degradation
- Large PDF: ✅ Handled
- Invalid query: ✅ Clear error

### Issues Found

None

### Recommendations

1. Current threshold of 0.75 works well
2. Consider adding query caching for frequent searches
3. Monitor performance with larger knowledge bases (>100 PDFs)
4. Add analytics dashboard for knowledge usage

### Overall Result

**✅ PASS - All tests successful**

Week 1 objectives complete. Ready for Week 2.
```

---

## Quick Commands Reference

```powershell
# Start backend
cd botflow-backend && npm run dev

# Test search
.\test-search.ps1

# Upload PDF
.\test-pdf-processing.ps1 -PdfPath "file.pdf"

# Performance test
.\test-performance.ps1

# Check database (run in Supabase SQL Editor)
SELECT COUNT(*) FROM knowledge_embeddings;
SELECT * FROM knowledge_base_articles;
```

---

## Success Criteria Summary

### Must Pass ✅
- [ ] All PDFs process successfully
- [ ] Search returns relevant results (>85% accuracy)
- [ ] Performance targets met (<500ms search)
- [ ] WhatsApp E2E works with citations
- [ ] Error handling graceful

### Should Pass 🎯
- [ ] Database optimized with indexes
- [ ] Multiple PDFs tested
- [ ] All error scenarios handled
- [ ] Documentation complete

### Nice to Have 💡
- [ ] Dashboard UI tested
- [ ] Bulk upload tested
- [ ] Analytics verified

---

**Next Steps:**
1. Run all tests following this guide
2. Record results in test report
3. Fix any issues found
4. Complete Week 1 sign-off
5. Move to Week 2: Dynamic Workflow Engine

**Created:** 2025-01-15
**Status:** Ready for execution

🚀 Let's test everything and complete Week 1!
