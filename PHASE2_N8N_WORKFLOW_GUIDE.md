# Phase 2 - n8n Knowledge Ingestion Workflow Guide

## Overview

This workflow receives PDF files from the backend, processes them into embeddings, and stores them in PostgreSQL for RAG (Retrieval-Augmented Generation).

**Workflow Name:** `Knowledge Ingestion Pipeline`

**Trigger:** Webhook from backend API

**Duration:** ~1-3 seconds per PDF page

---

## Workflow Architecture

```
┌─────────────────┐
│  Webhook Start  │ ← Backend triggers this
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HMAC Verify     │ ← Security check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Download File   │ ← Get PDF from Supabase Storage
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse PDF       │ ← Extract text content
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Chunk Text      │ ← Split into 500-token chunks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Loop Chunks     │ ← Process each chunk
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
   ┌─────────────┐   ┌─────────────┐
   │ Generate    │   │ Batch       │
   │ Embedding   │   │ Accumulate  │
   └──────┬──────┘   └─────────────┘
          │
          ▼
   ┌─────────────────┐
   │ Insert to DB    │ ← Store embedding
   └──────┬──────────┘
          │
          ▼
   ┌─────────────────┐
   │ Update Status   │ ← Mark as indexed
   └──────┬──────────┘
          │
          ▼
   ┌─────────────────┐
   │ Callback        │ ← Notify backend
   └─────────────────┘
```

---

## Node-by-Node Implementation

### 1. Webhook Trigger Node

**Node Type:** `Webhook`

**Configuration:**
- **Path:** `/knowledge-ingestion` (or custom path)
- **Method:** POST
- **Authentication:** None (we'll verify HMAC in next node)
- **Response Mode:** Immediately (don't wait for workflow to finish)

**Expected Payload:**
```json
{
  "article_id": "uuid-here",
  "bot_id": "bot-uuid-here",
  "file_path": "bot-uuid/filename.pdf",
  "file_url": "https://ajtnixmnfuqtrgrakxss.supabase.co/storage/v1/object/public/...",
  "metadata": {
    "file_name": "policy.pdf",
    "file_size": 50000,
    "file_type": "application/pdf"
  }
}
```

**Webhook URL (after creation):**
```
https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion
```

---

### 2. HMAC Verification Node

**Node Type:** `Function` or `Code`

**Purpose:** Verify the webhook signature to prevent unauthorized requests

**Code (JavaScript):**
```javascript
// Get the signature from headers
const receivedSignature = $node["Webhook"].json.headers["x-webhook-signature"];

// Get the payload
const payload = $node["Webhook"].json.body;
const payloadString = JSON.stringify(payload);

// Calculate expected signature
const crypto = require('crypto');
const secret = '244c564393ffbe3c4d0e08727d007d9bfc7c6505ac7bf5b03e265edef29edc18';
const expectedSignature = crypto.createHmac('sha256', secret)
  .update(payloadString)
  .digest('hex');

// Verify
if (receivedSignature !== expectedSignature) {
  throw new Error('Invalid webhook signature - unauthorized request');
}

// Pass through the payload if valid
return {
  json: payload
};
```

**Error Handling:**
- If signature doesn't match → throw error → workflow stops
- If signature matches → continue to next node

---

### 3. Update Status to Processing

**Node Type:** `Postgres` or `HTTP Request`

**Purpose:** Mark article status as "processing" in database

**Using Postgres Node:**
```sql
UPDATE knowledge_base_articles
SET
  metadata = jsonb_set(
    metadata,
    '{status}',
    '"processing"'
  ),
  updated_at = NOW()
WHERE id = '{{ $json.article_id }}';
```

**OR using HTTP Request to Supabase REST API:**
```
Method: PATCH
URL: https://ajtnixmnfuqtrgrakxss.supabase.co/rest/v1/knowledge_base_articles?id=eq.{{ $json.article_id }}
Headers:
  apikey: {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
  Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
  Content-Type: application/json
Body:
{
  "metadata": {
    "status": "processing"
  }
}
```

---

### 4. Download File from Storage

**Node Type:** `HTTP Request`

**Configuration:**
- **Method:** GET
- **URL:** `{{ $json.file_url }}`
- **Response Format:** File
- **Download Binary:** Yes

**Alternative (if signed URL expired):**

Generate a new signed URL:
```
Method: POST
URL: https://ajtnixmnfuqtrgrakxss.supabase.co/storage/v1/object/sign/knowledge-files/{{ $json.file_path }}
Headers:
  apikey: {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
  Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
Body:
{
  "expiresIn": 3600
}
```

Then use the signed URL to download.

---

### 5. Parse PDF

**Node Type:** `Code` (Node.js)

**Purpose:** Extract text from PDF

**Code:**
```javascript
const pdf = require('pdf-parse');

// Get the binary data from previous node
const pdfBuffer = Buffer.from($binary.data, 'base64');

// Parse PDF
const data = await pdf(pdfBuffer);

// Extract text and metadata
return {
  json: {
    text: data.text,
    pages: data.numpages,
    info: data.info,
    metadata: $json.metadata,
    article_id: $json.article_id,
    bot_id: $json.bot_id
  }
};
```

**Note:** You'll need to install `pdf-parse` in your n8n environment:
```bash
npm install pdf-parse
```

**Alternative:** Use the "Extract from File" node if available in n8n cloud.

---

### 6. Chunk Text

**Node Type:** `Function` or `Code`

**Purpose:** Split text into overlapping chunks for better context

**Configuration:**
- **Chunk Size:** 500 tokens (~2000 characters)
- **Overlap:** 50 tokens (~200 characters)
- **Strategy:** By sentences (don't cut mid-sentence)

**Code:**
```javascript
// Simple chunking function
function chunkText(text, chunkSize = 2000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Don't cut mid-sentence - find last period
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      if (lastPeriod > start + overlap) {
        end = lastPeriod + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push({
        content: chunk,
        chunk_index: chunks.length,
        char_start: start,
        char_end: end
      });
    }

    start = end - overlap;
  }

  return chunks;
}

// Get text from previous node
const text = $json.text;
const chunks = chunkText(text);

// Return array of chunks with metadata
return chunks.map((chunk, index) => ({
  json: {
    ...chunk,
    article_id: $json.article_id,
    bot_id: $json.bot_id,
    file_name: $json.metadata.file_name,
    total_chunks: chunks.length
  }
}));
```

**Output:** Array of chunk objects (one item per chunk)

---

### 7. Loop Through Chunks

**Node Type:** `Split In Batches` or `Loop Over Items`

**Configuration:**
- **Batch Size:** 10 (process 10 chunks at a time to avoid rate limits)
- **Mode:** Run sequentially

This node will iterate over each chunk and pass it to the next nodes.

---

### 8. Generate Embedding

**Node Type:** `HTTP Request` (OpenAI API)

**Configuration:**
- **Method:** POST
- **URL:** `https://api.openai.com/v1/embeddings`
- **Headers:**
  - `Authorization: Bearer {{ $env.OPENAI_API_KEY }}`
  - `Content-Type: application/json`

**Body:**
```json
{
  "model": "text-embedding-3-small",
  "input": "{{ $json.content }}"
}
```

**Response Handling:**
Extract the embedding vector from response:
```javascript
// In next Function node
const embedding = $json.data[0].embedding;

return {
  json: {
    ...($input.item.json),
    embedding: embedding
  }
};
```

**Rate Limiting:**
- OpenAI limit: 3,000 requests/minute
- Batch size of 10 keeps you well under this
- Add 100ms delay between batches if needed

---

### 9. Insert Embedding to Database

**Node Type:** `Postgres` or `HTTP Request`

**Purpose:** Store embedding in `knowledge_embeddings` table

**Using Postgres:**
```sql
INSERT INTO knowledge_embeddings (
  bot_id,
  source_id,
  content,
  embedding,
  metadata,
  created_at
) VALUES (
  '{{ $json.bot_id }}',
  '{{ $json.article_id }}',
  '{{ $json.content }}',
  '[{{ $json.embedding.join(",") }}]',  -- Convert array to PostgreSQL vector format
  '{
    "chunk_index": {{ $json.chunk_index }},
    "file_name": "{{ $json.file_name }}",
    "char_start": {{ $json.char_start }},
    "char_end": {{ $json.char_end }}
  }'::jsonb,
  NOW()
);
```

**OR using HTTP Request (Supabase REST):**
```
Method: POST
URL: https://ajtnixmnfuqtrgrakxss.supabase.co/rest/v1/knowledge_embeddings
Headers:
  apikey: {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
  Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
  Content-Type: application/json
  Prefer: return=minimal
Body:
{
  "bot_id": "{{ $json.bot_id }}",
  "source_id": "{{ $json.article_id }}",
  "content": "{{ $json.content }}",
  "embedding": {{ JSON.stringify($json.embedding) }},
  "metadata": {
    "chunk_index": {{ $json.chunk_index }},
    "file_name": "{{ $json.file_name }}",
    "char_start": {{ $json.char_start }},
    "char_end": {{ $json.char_end }}
  }
}
```

---

### 10. Aggregate Results

**Node Type:** `Aggregate` or `Function`

**Purpose:** After all chunks are processed, aggregate stats

**Code:**
```javascript
// Count total chunks inserted
const items = $input.all();
const totalChunks = items.length;
const articleId = items[0].json.article_id;
const botId = items[0].json.bot_id;

return {
  json: {
    article_id: articleId,
    bot_id: botId,
    total_chunks: totalChunks,
    status: 'indexed',
    processed_at: new Date().toISOString()
  }
};
```

---

### 11. Update Article Status to Indexed

**Node Type:** `Postgres` or `HTTP Request`

**Purpose:** Mark article as successfully processed

**SQL:**
```sql
UPDATE knowledge_base_articles
SET
  metadata = jsonb_set(
    jsonb_set(
      metadata,
      '{status}',
      '"indexed"'
    ),
    '{total_chunks}',
    '{{ $json.total_chunks }}'
  ),
  updated_at = NOW()
WHERE id = '{{ $json.article_id }}';
```

---

### 12. Callback to Backend

**Node Type:** `HTTP Request`

**Purpose:** Notify backend that processing is complete

**Configuration:**
- **Method:** POST
- **URL:** `http://localhost:3002/api/bots/{{ $json.bot_id }}/knowledge/{{ $json.article_id }}/complete`
- **Headers:**
  - `Content-Type: application/json`
  - `x-webhook-signature: {{ HMAC signature }}`

**Body:**
```json
{
  "article_id": "{{ $json.article_id }}",
  "status": "indexed",
  "total_chunks": {{ $json.total_chunks }},
  "processed_at": "{{ $json.processed_at }}"
}
```

**Generate HMAC Signature:**

Add a Function node before this to generate signature:
```javascript
const crypto = require('crypto');
const secret = '244c564393ffbe3c4d0e08727d007d9bfc7c6505ac7bf5b03e265edef29edc18';

const payload = {
  article_id: $json.article_id,
  status: $json.status,
  total_chunks: $json.total_chunks,
  processed_at: $json.processed_at
};

const payloadString = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret)
  .update(payloadString)
  .digest('hex');

return {
  json: {
    ...payload,
    signature: signature
  }
};
```

---

## Error Handling

### Error Catcher Node

Add an "Error Trigger" node that catches any errors in the workflow:

**Node Type:** `Error Trigger`

**Connected to:**
- Update article status to "failed"
- Log error details
- Optional: Send notification

**Error Status Update:**
```sql
UPDATE knowledge_base_articles
SET
  metadata = jsonb_set(
    jsonb_set(
      metadata,
      '{status}',
      '"failed"'
    ),
    '{error_message}',
    '"{{ $json.error.message }}"'
  ),
  updated_at = NOW()
WHERE id = '{{ $json.article_id }}';
```

---

## Environment Variables

Set these in n8n Settings → Environment Variables:

```
OPENAI_API_KEY=sk-proj-your-openai-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-key
SUPABASE_URL=https://ajtnixmnfuqtrgrakxss.supabase.co
N8N_WEBHOOK_SECRET=244c564393ffbe3c4d0e08727d007d9bfc7c6505ac7bf5b03e265edef29edc18
```

---

## Testing the Workflow

### 1. Test Webhook

Use the test data from backend:
```bash
curl -X POST https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: YOUR_HMAC_SIGNATURE" \
  -d '{
    "article_id": "test-uuid",
    "bot_id": "bot-uuid",
    "file_url": "https://your-test-pdf-url.com/file.pdf",
    "metadata": {
      "file_name": "test.pdf",
      "file_size": 10000,
      "file_type": "application/pdf"
    }
  }'
```

### 2. Verify in Database

```sql
-- Check embeddings were created
SELECT COUNT(*) FROM knowledge_embeddings
WHERE source_id = 'test-uuid';

-- Check article status
SELECT metadata->>'status', metadata->>'total_chunks'
FROM knowledge_base_articles
WHERE id = 'test-uuid';
```

### 3. Test Vector Search

```sql
-- Get a sample embedding
SELECT embedding FROM knowledge_embeddings LIMIT 1;

-- Test search function
SELECT * FROM search_knowledge(
  '[0.1, 0.2, ..., 0.5]'::vector,  -- Use actual embedding
  'your-bot-id',
  0.7,
  5
);
```

---

## Performance Optimization

### Current Setup
- Processing time: ~1-2 seconds per page
- 10 chunks per batch
- Sequential processing

### For Scale (>100 PDFs/day)
1. **Increase batch size** to 20-50 chunks
2. **Parallel processing** - run multiple workflow instances
3. **Queue system** - use Redis for job queue
4. **Caching** - cache frequently accessed files

---

## Next Steps

After building this workflow:

1. **Update backend** to trigger this webhook URL
2. **Test with sample PDF** from your knowledge base
3. **Verify embeddings** are stored correctly
4. **Test search function** with real queries
5. **Integrate into chat workflow** (Day 3)

---

## Troubleshooting

### Workflow doesn't start
- Check webhook URL is correct in backend
- Verify HMAC signature is being sent
- Check n8n webhook logs

### PDF parsing fails
- Verify pdf-parse is installed
- Check if PDF is password-protected
- Try with a simpler test PDF first

### Embeddings not inserted
- Check PostgreSQL connection
- Verify vector format is correct
- Ensure bot_id exists in bots table

### Rate limit errors
- Reduce batch size
- Add delay between batches
- Check OpenAI API quota

---

**Ready to build?** Let me know if you need help with any specific node or want me to generate the n8n JSON workflow file for import!

Last updated: 2026-01-14 18:20
