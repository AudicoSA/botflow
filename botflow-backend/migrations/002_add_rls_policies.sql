-- ============================================
-- Add RLS Policies for Knowledge Base Tables
-- ============================================

-- Enable RLS on knowledge_base_articles
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on knowledge_embeddings
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Knowledge Base Articles Policies
-- ============================================

-- Policy: Users can SELECT articles for bots in their organization
CREATE POLICY "Users can view knowledge articles for their org's bots"
ON knowledge_base_articles
FOR SELECT
USING (
  bot_id IN (
    SELECT b.id
    FROM bots b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Policy: Users can INSERT articles for bots in their organization
CREATE POLICY "Users can create knowledge articles for their org's bots"
ON knowledge_base_articles
FOR INSERT
WITH CHECK (
  bot_id IN (
    SELECT b.id
    FROM bots b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Policy: Users can UPDATE articles for bots in their organization
CREATE POLICY "Users can update knowledge articles for their org's bots"
ON knowledge_base_articles
FOR UPDATE
USING (
  bot_id IN (
    SELECT b.id
    FROM bots b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Policy: Users can DELETE articles for bots in their organization
CREATE POLICY "Users can delete knowledge articles for their org's bots"
ON knowledge_base_articles
FOR DELETE
USING (
  bot_id IN (
    SELECT b.id
    FROM bots b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- ============================================
-- Knowledge Embeddings Policies
-- ============================================

-- Policy: Users can SELECT embeddings for bots in their organization
CREATE POLICY "Users can view knowledge embeddings for their org's bots"
ON knowledge_embeddings
FOR SELECT
USING (
  bot_id IN (
    SELECT b.id
    FROM bots b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Policy: Users can INSERT embeddings for bots in their organization
CREATE POLICY "Users can create knowledge embeddings for their org's bots"
ON knowledge_embeddings
FOR INSERT
WITH CHECK (
  bot_id IN (
    SELECT b.id
    FROM bots b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Policy: Users can UPDATE embeddings for bots in their organization
CREATE POLICY "Users can update knowledge embeddings for their org's bots"
ON knowledge_embeddings
FOR UPDATE
USING (
  bot_id IN (
    SELECT b.id
    FROM bots b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- Policy: Users can DELETE embeddings for bots in their organization
CREATE POLICY "Users can delete knowledge embeddings for their org's bots"
ON knowledge_embeddings
FOR DELETE
USING (
  bot_id IN (
    SELECT b.id
    FROM bots b
    INNER JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- ============================================
-- Service Role Bypass (Important!)
-- ============================================
-- The service role key automatically bypasses RLS, so n8n and backend
-- can still write directly to these tables using the service role key.
-- These policies only affect anon/authenticated users.

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('knowledge_base_articles', 'knowledge_embeddings');
