# Database Migrations

This directory contains SQL migrations for BotFlow database schema changes.

## Phase 2 Week 1: pgvector Knowledge Base

### Migration 001: pgvector Setup

**File**: `001_pgvector_knowledge_base.sql`

**Purpose**: Enable RAG (Retrieval-Augmented Generation) capabilities by setting up pgvector for semantic search.

**What it creates**:
1. Enables pgvector PostgreSQL extension
2. Creates `knowledge_base_articles` table (stores document metadata)
3. Creates `knowledge_embeddings` table (stores vector embeddings)
4. Creates similarity search functions (`search_knowledge`, `hybrid_search_knowledge`)
5. Creates helper functions (`get_knowledge_stats`)
6. Sets up indexes for performance (including HNSW vector index)
7. Configures Row Level Security (RLS) policies

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `001_pgvector_knowledge_base.sql`
5. Paste into the editor
6. Click **Run** (or press `Ctrl+Enter`)
7. Verify success by checking the output messages

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migration
supabase db push --file migrations/001_pgvector_knowledge_base.sql
```

### Option 3: psql (Direct Connection)

```bash
# Connect to your Supabase database
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"

# Run migration
\i migrations/001_pgvector_knowledge_base.sql

# Exit
\q
```

## Verification

After running the migration, verify it worked:

```sql
-- Check pgvector is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('knowledge_base_articles', 'knowledge_embeddings');

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('search_knowledge', 'hybrid_search_knowledge', 'get_knowledge_stats');

-- Test vector operations
SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector AS cosine_distance;
```

Expected output:
- `vector` extension should show version
- Both tables should exist
- All 3 functions should be listed
- Cosine distance should return a numeric value

## Post-Migration Setup

### 1. Create Supabase Storage Bucket

**Via Dashboard:**
1. Go to **Storage** in Supabase Dashboard
2. Click **Create Bucket**
3. Name: `knowledge-files`
4. Public: **No** (private)
5. Click **Create**

**Configure Bucket Policies:**
```sql
-- Allow authenticated users to upload files for their bots
CREATE POLICY "Users can upload knowledge files for their bots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM bots b
    JOIN organizations o ON b.organization_id = o.id
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Allow authenticated users to read their own knowledge files
CREATE POLICY "Users can read knowledge files for their bots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM bots b
    JOIN organizations o ON b.organization_id = o.id
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their own knowledge files
CREATE POLICY "Users can delete knowledge files for their bots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM bots b
    JOIN organizations o ON b.organization_id = o.id
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);
```

### 2. Set Environment Variables

Add to `botflow-backend/.env`:

```bash
# n8n Webhook Security
N8N_WEBHOOK_SECRET="your-32-character-secret-here"

# Generate a secure secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenAI (should already exist)
OPENAI_API_KEY="sk-..."
```

### 3. Restart Backend Server

```bash
cd botflow-backend
npm run dev
```

## Testing the Setup

### Test 1: Manual Vector Insert

```sql
-- Insert a test article
INSERT INTO knowledge_base_articles (bot_id, title, metadata)
VALUES (
  (SELECT id FROM bots LIMIT 1), -- Use first bot for testing
  'Test Document',
  '{"file_name": "test.pdf", "file_size": 1000, "status": "indexed"}'::jsonb
)
RETURNING id;

-- Insert a test embedding (use returned id from above)
INSERT INTO knowledge_embeddings (bot_id, source_id, content, embedding, metadata)
VALUES (
  (SELECT id FROM bots LIMIT 1),
  'ARTICLE_ID_FROM_ABOVE',
  'This is a test chunk of text for semantic search.',
  array_fill(0.5::float, ARRAY[1536])::vector(1536),
  '{"page": 1, "chunk_index": 0}'::jsonb
);

-- Test similarity search
SELECT * FROM search_knowledge(
  array_fill(0.5::float, ARRAY[1536])::vector(1536),
  (SELECT id FROM bots LIMIT 1),
  0.1, -- Low threshold for testing
  5
);
```

### Test 2: Knowledge Stats

```sql
SELECT * FROM get_knowledge_stats((SELECT id FROM bots LIMIT 1));
```

Expected output:
- `total_articles`: 1
- `total_chunks`: 1
- `indexed_articles`: 1

## Troubleshooting

### Error: "extension 'vector' is not available"

**Solution**: pgvector must be installed on your PostgreSQL server. For Supabase, contact support or use a different Postgres instance with pgvector support.

### Error: "relation 'bots' does not exist"

**Solution**: Ensure your main database schema is set up first. The knowledge base tables reference the `bots` table.

### Slow Vector Search

**Solution**: Rebuild the vector index:
```sql
REINDEX INDEX idx_embeddings_vector;
```

Or create an HNSW index for better performance with large datasets:
```sql
DROP INDEX IF EXISTS idx_embeddings_vector;
CREATE INDEX idx_embeddings_vector_hnsw
  ON knowledge_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

### RLS Policy Errors

**Solution**: Ensure you're using the service role key for backend operations, not the anon key.

## Next Steps

After successful migration:
1. ✅ Database schema ready
2. 📦 Set up n8n ingestion workflow (Day 2)
3. 🔌 Implement backend API routes (Day 4)
4. 🎨 Build frontend UI (Day 5)

See `PHASE2_WEEK1_GUIDE.md` for detailed implementation steps.
