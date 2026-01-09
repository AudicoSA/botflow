-- Migration: Add Brain ("system_prompt", "model_config") and Knowledge Base tables

-- 1. Add "Brain" columns to bots table
ALTER TABLE bots 
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS model_config JSONB DEFAULT '{"provider": "openai", "model": "gpt-4o", "temperature": 0.7}'::jsonb;

-- 2. Create knowledge_sources table (tracks files/urls before indexing)
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE NOT NULL, -- Changed to TEXT to match bots.id
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url', 'text')),
  content TEXT NOT NULL, -- URL or connection string or raw text
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
  metadata JSONB DEFAULT '{}', -- Store filename, original size, crawl depth, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add bot_id to knowledge_base_articles (linking articles to specific bots)
ALTER TABLE knowledge_base_articles
ADD COLUMN IF NOT EXISTS bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE; -- Changed to TEXT

-- 4. Enable RLS for new table
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policies for knowledge_sources
CREATE POLICY "Users can view org bot knowledge sources"
  ON knowledge_sources FOR SELECT
  USING (
    bot_id IN (
      SELECT id FROM bots WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage org bot knowledge sources"
  ON knowledge_sources FOR ALL
  USING (
    bot_id IN (
      SELECT id FROM bots WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- 6. Trigger for updated_at
CREATE TRIGGER update_knowledge_sources_updated_at 
BEFORE UPDATE ON knowledge_sources 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Add Index
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_bot ON knowledge_sources(bot_id);
