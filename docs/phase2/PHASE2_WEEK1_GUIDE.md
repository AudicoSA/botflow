# Phase 2 - Week 1: The "Brain" (Knowledge Base & RAG) 🧠

## 🎯 Objective
This week, we turn BotFlow from a "Router" into a "Thinker". We will implement **Retrieval-Augmented Generation (RAG)**. This allows users to upload their own unique data (PDFs, text) which the bot will "read" and use to answer customer questions accurately.

**Key Decision**: We're using **pgvector** (PostgreSQL native) instead of external vector databases. This eliminates dependencies, reduces costs, and keeps all data in our existing Supabase infrastructure.

---

## 📅 Daily Plan

### Day 1: pgvector Setup & Database Schema 🗄️
**Goal:** Enable vector search in our existing PostgreSQL database.

#### Tasks:
- [ ] **Enable pgvector Extension**: Run SQL in Supabase to enable the extension
- [ ] **Create Schema**: Design `knowledge_embeddings` table with proper indexes
- [ ] **Metadata Structure**: Define columns for source tracking, chunking info, timestamps
- [ ] **Test Vector Operations**: Insert test vectors and perform similarity search
- [ ] **Performance Tuning**: Create HNSW index for fast vector search at scale

#### SQL Schema:
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimensions
  metadata JSONB NOT NULL DEFAULT '{}', -- {page: 1, chunk_index: 0, file_name: "policy.pdf"}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_embeddings_bot_id ON knowledge_embeddings(bot_id);
CREATE INDEX idx_embeddings_source_id ON knowledge_embeddings(source_id);
CREATE INDEX idx_embeddings_vector ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function for similarity search
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding VECTOR(1536),
  match_bot_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_embeddings.id,
    knowledge_embeddings.content,
    knowledge_embeddings.metadata,
    1 - (knowledge_embeddings.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings
  WHERE knowledge_embeddings.bot_id = match_bot_id
    AND 1 - (knowledge_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### Verification:
```sql
-- Test vector insertion
INSERT INTO knowledge_embeddings (bot_id, source_id, content, embedding, metadata)
VALUES (
  'test-bot-uuid',
  'test-source-uuid',
  'Our store is open Monday to Friday, 9am to 5pm.',
  '[0.1, 0.2, ..., 0.5]'::vector, -- Replace with actual embedding
  '{"page": 1, "chunk_index": 0}'::jsonb
);

-- Test similarity search
SELECT * FROM search_knowledge(
  '[0.1, 0.2, ..., 0.5]'::vector, -- Query embedding
  'test-bot-uuid',
  0.7,
  5
);
```

### Day 2: The Ingestion Workflow 📥
**Goal:** Accept a file, process it, and store embeddings in pgvector.

#### Tasks:
- [ ] **Webhook Security**: Generate HMAC secret for webhook authentication
- [ ] **Build n8n Workflow** called "Knowledge Ingestion Pipeline":
    1. **Webhook Trigger**: Receive POST with `{file_url, bot_id, source_id, file_name}`
    2. **Webhook Auth**: Verify HMAC signature to prevent unauthorized triggers
    3. **File Download**: Fetch file from Supabase Storage URL
    4. **PDF Parser**: Extract text using PDF parser node (or HTTP request to parsing service)
    5. **Text Splitter**: Chunk text into 500-token pieces with 50-token overlap
    6. **Metadata Enrichment**: Add page numbers, chunk index, timestamps
    7. **Batch Embedder**: Send chunks to OpenAI `text-embedding-3-small` API (batch for efficiency)
    8. **Database Insert**: Store embeddings in `knowledge_embeddings` table via PostgreSQL node
    9. **Status Update**: Call backend API to update source status to "indexed"
    10. **Error Handling**: Catch failures and update status to "failed" with error message

#### n8n Workflow Structure:
```
[Webhook Trigger]
  → [Verify HMAC]
  → [HTTP Request: Download File]
  → [Code: Parse PDF Text]
  → [Code: Split into Chunks]
  → [Loop: For Each Chunk]
      → [OpenAI: Generate Embedding]
      → [PostgreSQL: Insert Embedding]
  → [HTTP Request: Update Status]
  → [Error Handler: Report Failure]
```

#### Security Implementation:
```javascript
// In Webhook node - Verify HMAC
const receivedSignature = $request.headers['x-webhook-signature'];
const secret = $env.WEBHOOK_SECRET;
const payload = JSON.stringify($request.body);
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (receivedSignature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

#### Test Case:
- Upload PDF: "BotFlow_Shipping_Policy.pdf" (2 pages, ~1000 words)
- Expected: ~6-8 chunks created in database
- Verify: Query `knowledge_embeddings` table shows all chunks with metadata

### Day 3: The Retrieval (Chat) Workflow 🤖
**Goal:** Make the bot use its knowledge base to answer questions.

#### Tasks:
- [ ] **Enhance Main Chat Workflow** with RAG capabilities:
    1. **Generate Query Embedding**: Send user's question to OpenAI embeddings API
    2. **Vector Search**: Call `search_knowledge()` function in PostgreSQL
    3. **Hybrid Search** (Optional): Combine vector similarity with keyword matching (full-text search)
    4. **Context Assembly**: Format retrieved chunks with metadata (source citations)
    5. **Prompt Engineering**: Inject context into system prompt with instructions
    6. **Fallback Logic**: If no relevant chunks found (similarity < 0.7), use general bot knowledge
    7. **Citation Tracking**: Log which chunks were used for each response

#### Updated Chat Workflow:
```
[Webhook: Incoming WhatsApp Message]
  → [Get Conversation Context]
  → [OpenAI: Generate Query Embedding]
  → [PostgreSQL: search_knowledge(embedding, bot_id)]
  → [IF: relevant_chunks_found]
      YES → [Format Context with Citations]
          → [OpenAI Chat: with context]
      NO → [OpenAI Chat: general knowledge]
  → [Send Response via Bird API]
  → [Log: Track chunks used]
```

#### Prompt Engineering:
```javascript
// System prompt with context
const systemPrompt = `You are ${botName}, a helpful customer service assistant.

${retrieved_chunks.length > 0 ? `
Use the following information from our knowledge base to answer the customer's question:

${retrieved_chunks.map((chunk, i) => `
[Source ${i+1}: ${chunk.metadata.file_name}, Page ${chunk.metadata.page}]
${chunk.content}
`).join('\n')}

IMPORTANT:
- Answer ONLY using the information provided above
- If the answer is not in the provided context, say "I don't have that specific information, but I can connect you with our team who can help."
- Always cite your sources when answering (e.g., "According to our shipping policy...")
` : ''}

${bot.system_prompt}
`;
```

#### Test Cases:
1. **Direct Match**: "What are your shipping costs?" (should find exact info from PDF)
2. **Paraphrased**: "How much does delivery cost?" (should match semantically)
3. **Not in KB**: "What's the weather today?" (should gracefully decline)
4. **Edge Case**: "Tell me about returns AND shipping" (should retrieve multiple chunks)

#### Success Criteria:
- Answers questions from PDF with 90%+ accuracy
- Provides source citations
- Doesn't hallucinate information not in the PDF
- Gracefully handles questions outside knowledge base

### Day 4: Backend "Knowledge" API 🔌
**Goal:** Connect the Frontend "Upload" button to the Ingestion Workflow with security.

#### Tasks:
- [ ] **Update/Create** `botflow-backend/src/routes/knowledge.ts`:

```typescript
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';

const knowledgeRoutes: FastifyPluginAsync = async (fastify) => {
  // Upload knowledge file
  fastify.post('/bots/:botId/knowledge', {
    onRequest: [fastify.authenticate],
    schema: {
      params: z.object({
        botId: z.string().uuid()
      }),
      body: z.object({
        file_name: z.string(),
        file_size: z.number().max(10 * 1024 * 1024), // 10MB max
        file_type: z.enum(['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
      })
    }
  }, async (request, reply) => {
    const { botId } = request.params;
    const { file_name, file_size, file_type } = request.body;
    const userId = request.user.sub;

    // 1. Verify user owns this bot
    const { data: bot, error: botError } = await fastify.supabase
      .from('bots')
      .select('id, organization_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return reply.code(404).send({ error: 'Bot not found' });
    }

    // Check user is member of organization
    const { data: member } = await fastify.supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', bot.organization_id)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return reply.code(403).send({ error: 'Unauthorized' });
    }

    // 2. Create knowledge_base_articles record
    const { data: article, error: articleError } = await fastify.supabase
      .from('knowledge_base_articles')
      .insert({
        bot_id: botId,
        title: file_name,
        content: '', // Will be populated after processing
        category: 'uploaded_document',
        metadata: { file_name, file_size, file_type }
      })
      .select()
      .single();

    if (articleError) {
      return reply.code(500).send({ error: 'Failed to create article record' });
    }

    // 3. Generate signed upload URL (Supabase Storage)
    const filePath = `knowledge/${botId}/${article.id}/${file_name}`;
    const { data: uploadData, error: uploadError } = await fastify.supabase.storage
      .from('knowledge-files')
      .createSignedUploadUrl(filePath);

    if (uploadError) {
      return reply.code(500).send({ error: 'Failed to generate upload URL' });
    }

    // 4. Return upload URL to frontend (they'll upload directly)
    return reply.send({
      article_id: article.id,
      upload_url: uploadData.signedUrl,
      file_path: filePath
    });
  });

  // Trigger processing after frontend confirms upload
  fastify.post('/bots/:botId/knowledge/:articleId/process', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { botId, articleId } = request.params;
    const userId = request.user.sub;

    // Verify ownership (same as above)
    // ...

    // Get file URL from storage
    const { data: article } = await fastify.supabase
      .from('knowledge_base_articles')
      .select('metadata')
      .eq('id', articleId)
      .single();

    const filePath = `knowledge/${botId}/${articleId}/${article.metadata.file_name}`;
    const { data: urlData } = await fastify.supabase.storage
      .from('knowledge-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    // Update status to processing
    await fastify.supabase
      .from('knowledge_base_articles')
      .update({
        metadata: { ...article.metadata, status: 'processing' }
      })
      .eq('id', articleId);

    // Trigger n8n ingestion workflow with HMAC signature
    const payload = {
      file_url: urlData.signedUrl,
      bot_id: botId,
      source_id: articleId,
      file_name: article.metadata.file_name
    };

    const signature = crypto
      .createHmac('sha256', process.env.N8N_WEBHOOK_SECRET!)
      .update(JSON.stringify(payload))
      .digest('hex');

    await fetch(`${process.env.N8N_API_URL}/webhook/knowledge-ingestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify(payload)
    });

    return reply.send({ status: 'processing' });
  });

  // Get knowledge base status
  fastify.get('/bots/:botId/knowledge', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { botId } = request.params;

    const { data: articles } = await fastify.supabase
      .from('knowledge_base_articles')
      .select('id, title, metadata, created_at')
      .eq('bot_id', botId)
      .eq('category', 'uploaded_document')
      .order('created_at', { ascending: false });

    return reply.send({ articles });
  });

  // Delete knowledge source
  fastify.delete('/bots/:botId/knowledge/:articleId', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { botId, articleId } = request.params;

    // Delete embeddings (cascades via foreign key)
    await fastify.supabase
      .from('knowledge_base_articles')
      .delete()
      .eq('id', articleId)
      .eq('bot_id', botId);

    return reply.send({ success: true });
  });
};

export default knowledgeRoutes;
```

#### Environment Variables:
Add to `botflow-backend/src/config/env.ts`:
```typescript
N8N_WEBHOOK_SECRET: z.string().min(32),
```

#### Test with cURL:
```bash
# Upload file
curl -X POST http://localhost:3001/api/bots/{bot-id}/knowledge \
  -H "Authorization: Bearer {jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{"file_name": "policy.pdf", "file_size": 50000, "file_type": "application/pdf"}'

# Frontend uploads to signed URL, then triggers processing
curl -X POST http://localhost:3001/api/bots/{bot-id}/knowledge/{article-id}/process \
  -H "Authorization: Bearer {jwt-token}"
```

### Day 5: Frontend "Knowledge Base" UI 💻
**Goal:** Allow users to manage their bot's brain with a polished interface.

#### Tasks:
- [ ] **Create Component**: `botflow-website/app/dashboard/bots/[id]/knowledge/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface KnowledgeArticle {
  id: string;
  title: string;
  metadata: {
    file_name: string;
    file_size: number;
    status: 'processing' | 'indexed' | 'failed';
  };
  created_at: string;
}

export default function KnowledgeBasePage() {
  const { id: botId } = useParams();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchArticles();
    // Poll for status updates every 5 seconds
    const interval = setInterval(fetchArticles, 5000);
    return () => clearInterval(interval);
  }, [botId]);

  const fetchArticles = async () => {
    const res = await fetch(`/api/bots/${botId}/knowledge`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setArticles(data.articles);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload PDF, TXT, or DOCX files.');
      return;
    }

    setUploading(true);

    try {
      // Step 1: Get signed upload URL
      const initRes = await fetch(`/api/bots/${botId}/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        })
      });
      const { article_id, upload_url } = await initRes.json();

      // Step 2: Upload file directly to Supabase Storage
      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      // Step 3: Trigger processing
      await fetch(`/api/bots/${botId}/knowledge/${article_id}/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      fetchArticles();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    await fetch(`/api/bots/${botId}/knowledge/${articleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    fetchArticles();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Knowledge Base</h1>
      <p className="text-gray-600 mb-6">
        Upload documents (PDF, TXT, DOCX) to teach your bot about your business.
        The bot will use this information to answer customer questions accurately.
      </p>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
        <input
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
          accept=".pdf,.txt,.docx"
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </label>
        <p className="text-sm text-gray-500 mt-2">Max 10MB • PDF, TXT, or DOCX</p>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {articles.map((article) => (
          <div
            key={article.id}
            className="border rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                📄
              </div>
              <div>
                <p className="font-medium">{article.title}</p>
                <p className="text-sm text-gray-500">
                  {(article.metadata.file_size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Status Badge */}
              {article.metadata.status === 'processing' && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  ⏳ Processing...
                </span>
              )}
              {article.metadata.status === 'indexed' && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  ✓ Ready
                </span>
              )}
              {article.metadata.status === 'failed' && (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  ✗ Failed
                </span>
              )}

              <button
                onClick={() => handleDelete(article.id)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Navigation Update:
Add "Knowledge Base" tab to bot detail page navigation.

#### Full Integration Test:
1. **Upload**: User uploads "Shipping_Policy.pdf" (2 pages)
2. **Processing**: Status shows "Processing..." for ~30 seconds
3. **Indexed**: Status changes to "Ready" with green checkmark
4. **Chat Test**: Open bot in test chat, ask "What are your shipping costs?"
5. **Response**: Bot answers with information from the PDF with citation
6. **Verification**: Check database shows 6-8 embedding chunks

---

## 🛠️ Tech Stack & Requirements

### Core Technologies:
- **pgvector**: PostgreSQL extension (Supabase native) - No external vector DB needed!
- **OpenAI Embeddings**: text-embedding-3-small (1536 dimensions, $0.02/1M tokens)
- **n8n Nodes**: HTTP Request, Code, PostgreSQL, OpenAI
- **Supabase**: Storage for files, PostgreSQL for vectors

### Required Environment Variables:
```bash
# Add to botflow-backend/.env
N8N_WEBHOOK_SECRET="your-32-char-secret-here"
OPENAI_API_KEY="sk-..."

# Supabase Storage Bucket
# Create bucket: "knowledge-files" (private)
```

### Database Setup Checklist:
- [ ] Enable pgvector extension
- [ ] Create `knowledge_embeddings` table
- [ ] Create `search_knowledge()` function
- [ ] Create HNSW index for vector search
- [ ] Create Supabase Storage bucket "knowledge-files"
- [ ] Set up RLS policies for knowledge tables

---

## 🚀 Getting Started

### Prerequisites:
1. Access to Supabase dashboard for SQL execution
2. n8n instance running and accessible
3. OpenAI API key with available credits
4. Backend server running on localhost:3001

### Step-by-Step Launch:
1. **Day 1 Morning**: Run SQL schema setup in Supabase
2. **Day 1 Afternoon**: Test vector operations manually
3. **Day 2 Morning**: Build n8n ingestion workflow
4. **Day 2 Afternoon**: Test workflow with sample PDF
5. **Day 3**: Enhance chat workflow with RAG
6. **Day 4**: Implement backend API routes
7. **Day 5**: Build frontend UI and test end-to-end

---

## ✅ Success Criteria

By end of Week 1, you should be able to:
- [ ] Upload a PDF through the dashboard
- [ ] See file processing status update in real-time
- [ ] Chat with bot and get answers from the PDF
- [ ] Bot cites sources in responses ("According to our policy...")
- [ ] Bot gracefully handles questions outside the knowledge base
- [ ] Vector search returns relevant chunks in <200ms
- [ ] System handles 10+ concurrent uploads without errors

---

## 📊 Performance Targets

- **Upload Processing**: <1 minute for 10-page PDF
- **Vector Search**: <200ms average query time
- **Embedding Generation**: ~2 seconds per 500-token chunk
- **End-to-End Latency**: <3 seconds from question to answer
- **Accuracy**: 90%+ correct answers for questions in knowledge base

---

## 🐛 Troubleshooting

### Common Issues:

**pgvector not available:**
```sql
-- Verify extension
SELECT * FROM pg_available_extensions WHERE name = 'vector';
-- If not available, contact Supabase support or use different Postgres instance
```

**Slow vector search:**
```sql
-- Check if index exists
SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_embeddings';
-- Rebuild index if needed
REINDEX INDEX idx_embeddings_vector;
```

**n8n webhook not triggering:**
- Verify HMAC signature matches on both sides
- Check n8n logs for incoming requests
- Test with cURL first before frontend integration

**Bot not using knowledge base:**
- Verify `search_knowledge()` returns results
- Check similarity threshold (lower if needed: 0.6 instead of 0.7)
- Verify bot_id matches in queries

---

## 🎯 Next Steps (Week 2 Preview)

Once Week 1 is complete, we'll move to the Workflow Compiler:
- Dynamic workflow generation based on user config
- Modular node library for reusable components
- Workflow versioning and rollback capabilities

**Let's build!** 🚀
