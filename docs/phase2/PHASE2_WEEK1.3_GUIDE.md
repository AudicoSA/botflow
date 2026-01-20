# Phase 2 Week 1.3 - Complete the Knowledge Base Pipeline 🧠

**Status:** Day 1 Complete ✅ | Starting Days 2-3
**Goal:** Test n8n workflow, integrate RAG into chat, and complete end-to-end PDF → Answer flow

---

## 📋 Table of Contents

1. [Quick Context](#quick-context)
2. [What's Already Done](#whats-already-done)
3. [Day 2-3 Tasks](#day-2-3-tasks)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Testing Checklist](#testing-checklist)
6. [Troubleshooting](#troubleshooting)
7. [Success Criteria](#success-criteria)

---

## Quick Context

### What We Built (Day 1)

✅ **Backend API** - 6 REST endpoints for knowledge management
✅ **Database** - PostgreSQL with pgvector (1536-dimensional vectors)
✅ **n8n Workflow** - 14-node PDF processing pipeline
✅ **Security** - HMAC signatures, JWT auth, RLS policies
✅ **Storage** - Supabase Storage with signed URLs

### Current Status

- Backend running on `http://localhost:3002`
- n8n workflow active at `https://botflowsa.app.n8n.cloud`
- Database migration complete with correct schema
- Bot ID: `8982d756-3cd0-4e2b-bf20-396e919cb354` (Texi)
- Test scripts ready: `test-knowledge-full.ps1`

### What's Next

1. Test n8n workflow with real PDF
2. Verify embeddings are created correctly
3. Build vector search endpoint
4. Integrate RAG into WhatsApp chat handler
5. Test complete flow: PDF → Ask question → Get answer with citations

---

## What's Already Done

### Database Schema ✅

```sql
-- Articles table
CREATE TABLE knowledge_base_articles (
  id UUID PRIMARY KEY,
  bot_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'uploaded_document',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings table
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY,
  bot_id TEXT NOT NULL,
  source_id UUID REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search function
CREATE FUNCTION search_knowledge(
  query_embedding VECTOR(1536),
  match_bot_id TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
) RETURNS TABLE (...);
```

### Backend API Endpoints ✅

1. `POST /api/bots/:botId/knowledge` - Initialize file upload (returns signed URL)
2. `GET /api/bots/:botId/knowledge` - List knowledge sources
3. `POST /api/bots/:botId/knowledge/:articleId/process` - Trigger n8n workflow
4. `POST /api/bots/:botId/knowledge/:articleId/complete` - n8n callback webhook
5. `GET /api/bots/:botId/knowledge/stats` - Get statistics
6. `DELETE /api/bots/:botId/knowledge/:articleId` - Delete source

### n8n Workflow (14 Nodes) ✅

1. Webhook Trigger
2. HMAC Verify
3. Download PDF from Storage
4. Parse PDF (pdf-parse)
5. Chunk Text (2000 chars, 200 overlap)
6. Split in Batches (10 at a time)
7. Generate Embedding (OpenAI)
8. Format Embedding
9. Insert to PostgreSQL
10. Loop Back
11. Aggregate Results
12. Update Article Status
13. Generate Callback Signature
14. Callback to Backend

---

## Day 2-3 Tasks

### Day 2: Test PDF Processing Pipeline

**Estimated Time:** 2-3 hours

1. **Upload Real PDF** (30 min)
   - Find a test PDF (product manual, FAQ doc, etc.)
   - Upload via API
   - Trigger n8n workflow
   - Monitor execution in n8n dashboard

2. **Verify Embeddings** (30 min)
   - Check `knowledge_embeddings` table
   - Verify chunk count matches expectations
   - Inspect vector dimensions (should be 1536)
   - Check metadata structure

3. **Test Vector Search** (1 hour)
   - Query embeddings directly with test vector
   - Verify similarity scores
   - Test different threshold values
   - Optimize search performance

4. **Build Search API Endpoint** (1 hour)
   - Create `POST /api/bots/:botId/knowledge/search`
   - Generate query embedding via OpenAI
   - Call `search_knowledge()` function
   - Return ranked results

### Day 3: Integrate RAG into Chat

**Estimated Time:** 3-4 hours

1. **Modify Chat Handler** (2 hours)
   - Read existing WhatsApp message handler
   - Add knowledge retrieval before GPT-4 call
   - Inject context into system prompt
   - Add citation footer to responses

2. **Test Integration** (1 hour)
   - Send WhatsApp message to bot
   - Verify it searches knowledge base
   - Check GPT-4 uses retrieved context
   - Validate citations are included

3. **Handle Edge Cases** (1 hour)
   - No relevant knowledge found → fallback to GPT-4 only
   - Multiple relevant chunks → prioritize by similarity
   - Empty knowledge base → standard bot behavior
   - Error handling → graceful degradation

---

## Step-by-Step Implementation

### Step 1: Upload and Process a Real PDF

#### 1.1 Find a Test PDF

Use any PDF with content you want the bot to know about:
- Product manual
- FAQ document
- Company policies
- Service documentation

**Recommendation:** Start with a 2-5 page PDF for faster testing.

#### 1.2 Run Upload Script

```powershell
cd "C:\Users\kenny\OneDrive\Whatsapp Service"

# Login and create article
.\test-knowledge-full.ps1
```

This creates an article and returns:
- `article-id.txt` - UUID of the article
- `upload-url.txt` - Signed URL for file upload

#### 1.3 Upload the PDF

```powershell
# Read the upload URL
$uploadUrl = Get-Content upload-url.txt

# Upload your PDF
Invoke-RestMethod -Uri $uploadUrl `
    -Method PUT `
    -ContentType "application/pdf" `
    -InFile "C:\path\to\your\test.pdf"
```

#### 1.4 Trigger n8n Processing

```powershell
# Get credentials from previous run
$articleId = Get-Content article-id.txt
$TOKEN = "<from-test-script-output>"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

# Trigger workflow
Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge/$articleId/process" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"}
```

#### 1.5 Monitor n8n Execution

1. Go to: https://botflowsa.app.n8n.cloud
2. Click "Executions" tab
3. Watch the workflow run (should take 10-60 seconds depending on PDF size)
4. Check for errors in any node

**Expected Output:**
- All 14 nodes should show green checkmarks
- Final node should show callback to backend
- No red error indicators

---

### Step 2: Verify Embeddings Were Created

#### 2.1 Check Database

Run this in Supabase SQL Editor:

```sql
-- Count total embeddings for your bot
SELECT COUNT(*) as total_chunks
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354';

-- See sample embeddings
SELECT
    id,
    source_id,
    LEFT(content, 100) as content_preview,
    metadata,
    created_at
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY created_at DESC
LIMIT 5;

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
```

**Expected Results:**
- Total chunks should match: (PDF characters / 2000) approximately
- Content previews should show actual text from PDF
- Metadata should include chunk_index, file_name
- Article status should be "indexed"

#### 2.2 Test Vector Search Directly

```sql
-- Generate a test embedding (you'll need to call OpenAI API for this)
-- For now, let's test with a simple similarity query

SELECT
    content,
    metadata,
    1 - (embedding <=> (SELECT embedding FROM knowledge_embeddings LIMIT 1)) AS similarity
FROM knowledge_embeddings
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY embedding <=> (SELECT embedding FROM knowledge_embeddings LIMIT 1)
LIMIT 3;
```

This tests the vector search infrastructure works.

---

### Step 3: Build Search API Endpoint

#### 3.1 Create Search Route

Add to `botflow-backend/src/routes/knowledge.ts`:

```typescript
/**
 * POST /bots/:botId/knowledge/search
 * Search knowledge base with semantic vector search
 */
fastify.post('/bots/:botId/knowledge/search', {
    onRequest: [fastify.authenticate],
}, async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const { query, limit = 5, threshold = 0.7 } = request.body as {
        query: string;
        limit?: number;
        threshold?: number;
    };

    try {
        const userId = await getUserId(request, fastify);

        // Verify ownership
        const hasAccess = await verifyBotOwnership(botId, userId);
        if (!hasAccess) {
            return reply.code(403).send({ error: 'Unauthorized' });
        }

        // Generate embedding for query via OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: query
            })
        });

        const embedData = await openaiResponse.json();
        const queryEmbedding = embedData.data[0].embedding;

        // Search knowledge base using PostgreSQL function
        const { data: results, error } = await supabaseAdmin.rpc('search_knowledge', {
            query_embedding: queryEmbedding,
            match_bot_id: botId,
            match_threshold: threshold,
            match_count: limit
        });

        if (error) {
            fastify.log.error(error, 'Failed to search knowledge');
            return reply.code(500).send({ error: 'Search failed' });
        }

        return {
            query,
            results: results || [],
            count: results?.length || 0
        };
    } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
});
```

#### 3.2 Test Search Endpoint

Create `test-search.ps1`:

```powershell
$EMAIL = "kenny@audico.co.za"
$PASSWORD = "Apwd4me-1"
$BACKEND_URL = "http://localhost:3002"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

# Login
$loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

$TOKEN = $loginResponse.token

# Search knowledge
$searchBody = @{
    query = "How do I reset my password?"
    limit = 3
    threshold = 0.7
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/search" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"} `
    -ContentType "application/json" `
    -Body $searchBody

# Display results
Write-Host "Query: $($response.query)" -ForegroundColor Cyan
Write-Host "Results: $($response.count)" -ForegroundColor Green
Write-Host ""

$response.results | ForEach-Object {
    Write-Host "Similarity: $($_.similarity)" -ForegroundColor Yellow
    Write-Host "Content: $($_.content)" -ForegroundColor White
    Write-Host ""
}
```

Run it:
```powershell
.\test-search.ps1
```

**Expected Output:**
- Should return 3 most relevant chunks
- Similarity scores between 0.7-1.0
- Content should relate to your query

---

### Step 4: Integrate RAG into WhatsApp Chat

#### 4.1 Find Chat Handler

Locate the WhatsApp message handler in your backend:

```typescript
// Likely in src/routes/webhooks.ts or src/queues/message-worker.ts
```

#### 4.2 Add Knowledge Retrieval

Modify the handler to search knowledge before calling GPT-4:

```typescript
async function handleWhatsAppMessage(message: IncomingMessage) {
    const { botId, from, text } = message;

    // NEW: Search knowledge base first
    let knowledgeContext = '';
    try {
        const searchResponse = await fetch(`http://localhost:3002/api/bots/${botId}/knowledge/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceToken}`, // Use service account token
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: text,
                limit: 3,
                threshold: 0.75
            })
        });

        const searchData = await searchResponse.json();

        if (searchData.count > 0) {
            knowledgeContext = '\n\nRelevant information from knowledge base:\n';
            searchData.results.forEach((result, idx) => {
                knowledgeContext += `\n[${idx + 1}] ${result.content}\n`;
            });
        }
    } catch (error) {
        // Log error but don't fail - fallback to GPT-4 without context
        console.error('Knowledge search failed:', error);
    }

    // Get bot configuration
    const bot = await getBot(botId);

    // Build system prompt with knowledge context
    const systemPrompt = bot.system_prompt + knowledgeContext;

    // Call OpenAI GPT-4 as usual
    const gptResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ],
        temperature: bot.temperature || 0.7
    });

    let responseText = gptResponse.choices[0].message.content;

    // Add citation if knowledge was used
    if (knowledgeContext) {
        responseText += '\n\n_Based on uploaded documentation_';
    }

    // Send response via WhatsApp
    await sendWhatsAppMessage(from, responseText);
}
```

#### 4.3 Test WhatsApp Integration

1. Send a message to your bot's WhatsApp number
2. Ask a question related to the uploaded PDF
3. Verify the bot responds with relevant information
4. Check that citation footer is included

**Example Test:**
```
You: "How do I reset my password?"
Bot: "To reset your password, go to Settings > Account > Reset Password. Enter your email and you'll receive a reset link within 5 minutes.

_Based on uploaded documentation_"
```

---

## Testing Checklist

### PDF Upload & Processing

- [ ] Can upload PDF via signed URL
- [ ] n8n workflow triggers automatically
- [ ] All 14 nodes execute successfully
- [ ] No errors in n8n execution logs
- [ ] Callback webhook reaches backend
- [ ] Article status updates to "indexed"

### Embeddings Verification

- [ ] Embeddings created in database
- [ ] Chunk count matches expectations
- [ ] Vector dimensions are 1536
- [ ] Metadata includes chunk_index, file_name
- [ ] Content is readable text (not binary)
- [ ] source_id links to article correctly

### Vector Search

- [ ] Search endpoint returns results
- [ ] Similarity scores make sense (0.7-1.0)
- [ ] Results are relevant to query
- [ ] Threshold parameter works
- [ ] Limit parameter works
- [ ] No results when threshold too high

### RAG Integration

- [ ] WhatsApp message triggers knowledge search
- [ ] GPT-4 receives context in system prompt
- [ ] Response includes information from PDF
- [ ] Citation footer appears
- [ ] Fallback works when no knowledge found
- [ ] Error handling prevents chat failures

### Performance

- [ ] Search completes in <1 second
- [ ] n8n processing completes in <60 seconds
- [ ] No memory leaks in backend
- [ ] Database queries are indexed
- [ ] OpenAI API calls are rate-limited

---

## Troubleshooting

### n8n Workflow Fails

**Problem:** Workflow shows red error nodes

**Solutions:**
1. Check n8n execution logs for specific error
2. Verify OpenAI API key is valid
3. Verify Supabase service role key is correct
4. Check webhook signature matches
5. Ensure PDF is accessible in Storage

**Common Errors:**
- `401 Unauthorized` → Wrong API key
- `ECONNREFUSED` → Backend not running
- `Signature mismatch` → Wrong webhook secret
- `File not found` → PDF not uploaded to Storage

### No Embeddings Created

**Problem:** `knowledge_embeddings` table is empty after workflow

**Solutions:**
1. Check n8n execution reached "Insert Embedding" node
2. Verify PostgreSQL permissions for service_role
3. Check embedding array length is 1536
4. Look for constraint violations in Supabase logs
5. Verify bot_id matches correctly

### Search Returns No Results

**Problem:** Search endpoint returns empty array

**Solutions:**
1. Check embeddings exist for this bot_id
2. Lower threshold (try 0.5 instead of 0.7)
3. Verify query embedding generation works
4. Check similarity calculation in SQL function
5. Test with known existing content

### GPT-4 Ignores Context

**Problem:** Bot doesn't use uploaded knowledge

**Solutions:**
1. Verify knowledge context is in system prompt
2. Check search actually returns results
3. Increase context window size
4. Make system prompt clearer about using context
5. Test with more obvious questions

---

## Success Criteria

### Day 2 Complete When:

✅ Real PDF uploaded and processed
✅ Embeddings visible in database
✅ Vector search returns relevant results
✅ Search API endpoint functional
✅ Direct SQL queries work correctly

### Day 3 Complete When:

✅ WhatsApp chat searches knowledge base
✅ Bot responses include PDF information
✅ Citations appear in messages
✅ Error handling prevents failures
✅ End-to-end flow tested successfully

### Week 1 Complete When:

✅ **Upload PDF** → Process with n8n → Store embeddings
✅ **Ask question** → Search vectors → Get GPT-4 answer with context
✅ **WhatsApp conversation** uses knowledge automatically
✅ **Citations** show where information came from
✅ **Performance** acceptable (<1s search, <60s processing)

---

## Next Steps After Week 1

### Week 2: Dynamic Workflow Engine

1. Build workflow compiler
2. Create node library
3. Implement variable injection
4. Add versioning system
5. Test workflow generation

See [PHASE2_WEEK2_GUIDE.md](PHASE2_WEEK2_GUIDE.md) (to be created)

---

## Files You'll Need

### Existing Files

- ✅ `test-knowledge-full.ps1` - Upload and create article
- ✅ `get-bot-id.ps1` - Get bot credentials
- ✅ `n8n-knowledge-ingestion-workflow-no-env.json` - Workflow definition
- ✅ `botflow-backend/src/routes/knowledge.ts` - API routes

### New Files to Create

- [ ] `test-search.ps1` - Test search endpoint
- [ ] `test-pdf-processing.ps1` - Complete upload → process → verify flow
- [ ] Modified chat handler with RAG integration
- [ ] Search API endpoint in knowledge routes

---

## Quick Reference Commands

### Upload PDF
```powershell
.\test-knowledge-full.ps1
$uploadUrl = Get-Content upload-url.txt
Invoke-RestMethod -Uri $uploadUrl -Method PUT -ContentType "application/pdf" -InFile "test.pdf"
```

### Trigger Processing
```powershell
$articleId = Get-Content article-id.txt
Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge/$articleId/process" -Method POST -Headers @{Authorization="Bearer $TOKEN"}
```

### Check Embeddings
```sql
SELECT COUNT(*) FROM knowledge_embeddings WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354';
```

### Test Search
```powershell
.\test-search.ps1
```

---

## Resources

- **n8n Dashboard**: https://botflowsa.app.n8n.cloud
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ajtnixmnfuqtrgrakxss
- **OpenAI Embeddings Docs**: https://platform.openai.com/docs/guides/embeddings
- **pgvector Docs**: https://github.com/pgvector/pgvector

---

**Last Updated:** 2025-01-15
**Status:** Ready to continue from Day 1 completion
**Next Task:** Upload real PDF and test n8n workflow

---

## Practical Implementation Guide

### Quick Start: Test the Complete Pipeline

#### Option 1: Use the All-In-One Test Script

```powershell
# Test the entire pipeline with one command
.\test-pdf-processing.ps1 -PdfPath "C:\path\to\your\test.pdf"
```

This script will:
1. ✓ Login to backend
2. ✓ Create article record
3. ✓ Upload PDF to Supabase Storage
4. ✓ Trigger n8n workflow
5. ✓ Poll until processing completes
6. ✓ Verify embeddings created
7. ✓ Test semantic search

**Expected Duration:** 30-90 seconds depending on PDF size

#### Option 2: Manual Step-by-Step

```powershell
# Step 1: Upload and create article
.\test-knowledge-full.ps1

# Step 2: Upload the PDF
$uploadUrl = Get-Content upload-url.txt
Invoke-RestMethod -Uri $uploadUrl -Method PUT -ContentType "application/pdf" -InFile "test.pdf"

# Step 3: Trigger processing
$articleId = Get-Content article-id.txt
$TOKEN = "<from-login-response>"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge/$articleId/process" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"}

# Step 4: Monitor n8n
# Go to https://botflowsa.app.n8n.cloud and watch the execution

# Step 5: Test search
.\test-search.ps1
```

---

### Real-World Testing Examples

#### Example 1: Restaurant Menu Bot

**Scenario:** Upload restaurant menu PDF, ask about dishes

```powershell
# 1. Upload menu PDF
.\test-pdf-processing.ps1 -PdfPath "C:\Documents\restaurant_menu.pdf"

# 2. Wait for processing (monitor n8n dashboard)

# 3. Test queries via search API
.\test-search.ps1
# Try queries like:
# - "What vegetarian options do you have?"
# - "Do you serve halal food?"
# - "What's your most expensive dish?"
```

**Expected Result:**
- Search returns relevant menu items
- Similarity scores above 0.75 for exact matches
- GPT-4 can answer questions using menu context

#### Example 2: Product Manual Bot

**Scenario:** Upload product manual, answer customer questions

```powershell
# 1. Upload manual
.\test-pdf-processing.ps1 -PdfPath "C:\Documents\product_manual.pdf"

# 2. Test troubleshooting queries
# - "How do I reset the device?"
# - "What does error code E03 mean?"
# - "How long is the warranty?"
```

**Integration Test:**
Send WhatsApp message to bot → Bot searches manual → Responds with accurate info + citation

---

### Monitoring and Debugging

#### Check Processing Status

```powershell
# Quick status check
$TOKEN = "<your-token>"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

$response = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge" `
    -Method GET `
    -Headers @{Authorization="Bearer $TOKEN"}

$response.articles | Format-Table id, title, @{Name='Status';Expression={$_.metadata.status}}, @{Name='Chunks';Expression={$_.metadata.total_chunks}}
```

#### Check Database Directly

```sql
-- In Supabase SQL Editor

-- Count embeddings per article
SELECT
    a.title,
    a.metadata->>'status' as status,
    COUNT(e.id) as embedding_count
FROM knowledge_base_articles a
LEFT JOIN knowledge_embeddings e ON e.source_id = a.id
WHERE a.bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
GROUP BY a.id, a.title
ORDER BY a.created_at DESC;

-- Recent processing activity
SELECT
    title,
    metadata->>'status' as status,
    metadata->>'total_chunks' as chunks,
    created_at,
    updated_at
FROM knowledge_base_articles
WHERE bot_id = '8982d756-3cd0-4e2b-bf20-396e919cb354'
ORDER BY created_at DESC
LIMIT 5;
```

#### Monitor n8n Executions

1. Go to: https://botflowsa.app.n8n.cloud
2. Click "Executions" in sidebar
3. Filter by "Knowledge Ingestion Workflow"
4. Check recent runs:
   - ✅ Green = Success
   - 🔴 Red = Failed
   - ⏱️ Yellow = Running

**Common Issues:**
- **Node 2 (HMAC Verify) fails** → Check webhook secret matches
- **Node 7 (Generate Embedding) fails** → Check OpenAI API key
- **Node 9 (Insert Embedding) fails** → Check Supabase service role key

---

### Performance Benchmarks

**Expected Performance:**

| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| PDF Upload | <2s | 1-5s |
| n8n Processing (5 pages) | <30s | 10-60s |
| Embedding Generation | 1s per chunk | 0.5-2s |
| Search Query | <500ms | 200ms-1s |
| End-to-end (upload to searchable) | <60s | 30s-120s |

**Optimization Tips:**
- PDFs < 10 pages process fastest
- Batch size of 10 chunks is optimal
- Use threshold 0.7-0.75 for best relevance
- Cache frequently searched queries

---

### Integration with WhatsApp Chat

#### Find Your Chat Handler

```bash
# Search for the message handler
cd botflow-backend
grep -r "handleWhatsAppMessage" src/
grep -r "processMessage" src/
grep -r "/webhooks/whatsapp" src/routes/
```

Likely locations:
- `src/routes/webhooks.ts`
- `src/queues/message-worker.ts`
- `src/services/whatsapp-handler.ts`

#### Add RAG Integration

```typescript
// Example integration in message handler
import { searchKnowledge } from '../services/knowledge-search.js';

async function handleIncomingMessage(message: WhatsAppMessage) {
    const { botId, from, text } = message;

    // 1. Search knowledge base
    const knowledgeResults = await searchKnowledge({
        botId,
        query: text,
        limit: 3,
        threshold: 0.75
    });

    // 2. Build context for GPT-4
    let systemPromptAddition = '';
    if (knowledgeResults.length > 0) {
        systemPromptAddition = '\n\n📚 Relevant Knowledge:\n';
        knowledgeResults.forEach((result, idx) => {
            systemPromptAddition += `[${idx + 1}] ${result.content}\n\n`;
        });
        systemPromptAddition += 'Use the above information to answer the question accurately. If the answer is in the knowledge base, cite it.';
    }

    // 3. Call GPT-4 with enhanced context
    const bot = await getBot(botId);
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: bot.system_prompt + systemPromptAddition
            },
            { role: 'user', content: text }
        ],
        temperature: 0.7
    });

    let reply = response.choices[0].message.content;

    // 4. Add citation if knowledge was used
    if (knowledgeResults.length > 0) {
        reply += '\n\n_💡 Based on uploaded documentation_';
    }

    // 5. Send response
    await sendWhatsAppMessage(from, reply);
}
```

#### Create Knowledge Search Service

```typescript
// src/services/knowledge-search.ts
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

interface SearchOptions {
    botId: string;
    query: string;
    limit?: number;
    threshold?: number;
}

export async function searchKnowledge(options: SearchOptions) {
    const { botId, query, limit = 5, threshold = 0.7 } = options;

    try {
        // 1. Generate query embedding
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: query
            })
        });

        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // 2. Search knowledge base
        const { data, error } = await supabaseAdmin.rpc('search_knowledge', {
            query_embedding: queryEmbedding,
            match_bot_id: botId,
            match_threshold: threshold,
            match_count: limit
        });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Knowledge search failed:', error);
        return []; // Graceful fallback
    }
}
```

---

### Testing Scenarios

#### Scenario 1: Basic Knowledge Retrieval

```powershell
# Upload FAQ document
.\test-pdf-processing.ps1 -PdfPath "company_faq.pdf"

# Wait for processing

# Test via WhatsApp
# Send: "What are your business hours?"
# Expected: Bot responds with hours from FAQ + citation
```

#### Scenario 2: Multi-Document Search

```powershell
# Upload multiple documents
.\test-pdf-processing.ps1 -PdfPath "product_catalog.pdf"
.\test-pdf-processing.ps1 -PdfPath "pricing_guide.pdf"
.\test-pdf-processing.ps1 -PdfPath "warranty_info.pdf"

# Test cross-document query
# Send: "What's the warranty on Product X?"
# Expected: Bot combines info from catalog + warranty docs
```

#### Scenario 3: Fallback Behavior

```powershell
# Test with no knowledge uploaded
# Send: "Tell me a joke"
# Expected: Bot responds normally without knowledge base (no citation)

# Test with irrelevant query
# Send: "What's the weather today?"
# Expected: Bot responds with general knowledge, no citation
```

---

### Troubleshooting Common Issues

#### Issue 1: "No embeddings created"

**Symptoms:**
- n8n workflow completes
- `knowledge_embeddings` table is empty
- Search returns no results

**Solutions:**
```sql
-- Check if article exists
SELECT * FROM knowledge_base_articles
WHERE id = '<your-article-id>';

-- Check for constraint violations
SELECT * FROM knowledge_embeddings
WHERE bot_id = '<your-bot-id>'
LIMIT 1;

-- Verify pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Common Causes:**
- PDF has no extractable text (scanned images)
- Embedding dimensions mismatch (must be 1536)
- RLS policies blocking insert
- Supabase service role key wrong

#### Issue 2: "Search returns irrelevant results"

**Symptoms:**
- Search completes but results don't match query
- Similarity scores are low (<0.6)

**Solutions:**
```powershell
# Test with lower threshold
$searchBody = @{
    query = "your query"
    limit = 5
    threshold = 0.5  # Lower from 0.7
} | ConvertTo-Json
```

**Optimization:**
- Use more specific queries
- Improve chunk size (adjust in n8n workflow)
- Add more context to PDF content
- Try hybrid search instead of pure vector

#### Issue 3: "n8n workflow fails on callback"

**Symptoms:**
- Workflow completes processing
- Fails at Node 14 (Callback)
- Article status stays "processing"

**Solutions:**
```typescript
// Check backend logs
cd botflow-backend
npm run dev

// Verify signature calculation matches
console.log('Expected signature:', signature);
console.log('Received signature:', request.headers['x-webhook-signature']);
```

**Common Causes:**
- Backend not running
- HMAC secret mismatch
- Firewall blocking callback
- Wrong callback URL

---

## Week 1 Completion Checklist

### Infrastructure ✅
- [x] pgvector extension enabled
- [x] Database schema created
- [x] Supabase Storage bucket configured
- [x] n8n workflow imported and active
- [x] Backend API routes implemented
- [x] HMAC security configured

### Testing 🔄
- [ ] Real PDF uploaded and processed
- [ ] Embeddings visible in database
- [ ] Search API returns relevant results
- [ ] WhatsApp integration complete
- [ ] End-to-end flow tested
- [ ] Error handling verified

### Performance 🎯
- [ ] Search responds in <1s
- [ ] Processing completes in <60s
- [ ] No memory leaks detected
- [ ] Database queries optimized

### Documentation 📚
- [x] API endpoints documented
- [x] Test scripts created
- [x] Troubleshooting guide written
- [x] Integration examples provided

---

**Last Updated:** 2025-01-15
**Status:** Ready to continue from Day 1 completion
**Next Task:** Upload real PDF and test n8n workflow

**Test Scripts Created:**
- ✅ `test-knowledge-full.ps1` - Full upload flow
- ✅ `test-search.ps1` - Search endpoint testing
- ✅ `test-pdf-processing.ps1` - Complete pipeline test

Ready to build! 🚀
