-- Phase 3 Week 3: Workflow Templates Migration
-- Creates tables for the template library and usage tracking

-- ============================================================================
-- Workflow Templates Table
-- ============================================================================
-- Stores pre-built workflow templates that users can instantiate

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'workflow',

  -- Matching fields for template discovery
  trigger_phrases TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',

  -- Requirements
  required_integrations TEXT[] DEFAULT '{}',
  vertical TEXT, -- Optional business vertical (ecommerce, salon, restaurant, etc.)

  -- The actual workflow blueprint
  blueprint JSONB NOT NULL,

  -- Configuration
  variables JSONB DEFAULT '[]',          -- Variables user must provide
  configurable_fields JSONB DEFAULT '[]', -- Optional configuration fields

  -- Metadata & ranking
  popularity_score INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_keywords ON workflow_templates USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_trigger_phrases ON workflow_templates USING GIN(trigger_phrases);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_vertical ON workflow_templates(vertical);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_public ON workflow_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_popularity ON workflow_templates(popularity_score DESC);

-- ============================================================================
-- Workflow Template Usage Table
-- ============================================================================
-- Tracks when templates are instantiated and their success metrics

CREATE TABLE IF NOT EXISTS workflow_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Customizations applied during instantiation
  customizations JSONB DEFAULT '{}',

  -- Deployment info
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  -- Success metrics (updated over time)
  messages_processed INTEGER DEFAULT 0,
  successful_completions INTEGER DEFAULT 0,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_template_usage_template ON workflow_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_bot ON workflow_template_usage(bot_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_org ON workflow_template_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_active ON workflow_template_usage(is_active);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_usage ENABLE ROW LEVEL SECURITY;

-- Templates: Public templates are readable by everyone, only admins can modify
CREATE POLICY "Public templates readable by all"
  ON workflow_templates FOR SELECT
  USING (is_public = true);

-- Template usage: Users can only see their organization's usage
CREATE POLICY "Users can view own template usage"
  ON workflow_template_usage FOR SELECT
  USING (organization_id = auth.uid());

CREATE POLICY "Users can insert own template usage"
  ON workflow_template_usage FOR INSERT
  WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Users can update own template usage"
  ON workflow_template_usage FOR UPDATE
  USING (organization_id = auth.uid());

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_workflow_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_templates_updated_at();

CREATE TRIGGER workflow_template_usage_updated_at
  BEFORE UPDATE ON workflow_template_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_templates_updated_at();

-- ============================================================================
-- Function to update template popularity score
-- ============================================================================

CREATE OR REPLACE FUNCTION update_template_popularity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the template's usage count and recalculate popularity
  UPDATE workflow_templates
  SET
    usage_count = (
      SELECT COUNT(*)
      FROM workflow_template_usage
      WHERE template_id = NEW.template_id
    ),
    success_rate = (
      SELECT
        CASE
          WHEN SUM(messages_processed) > 0
          THEN (SUM(successful_completions)::DECIMAL / SUM(messages_processed) * 100)
          ELSE 0
        END
      FROM workflow_template_usage
      WHERE template_id = NEW.template_id
    ),
    popularity_score = (
      SELECT
        -- Weighted score: 70% recent usage, 30% success rate
        COALESCE(
          (COUNT(*) FILTER (WHERE deployed_at > NOW() - INTERVAL '30 days') * 7) +
          (AVG(COALESCE(user_rating, 3)) * 6),
          0
        )::INTEGER
      FROM workflow_template_usage
      WHERE template_id = NEW.template_id
    ),
    updated_at = NOW()
  WHERE id = NEW.template_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_popularity_on_usage
  AFTER INSERT OR UPDATE ON workflow_template_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_template_popularity();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE workflow_templates IS 'Pre-built workflow templates for the AI agent';
COMMENT ON TABLE workflow_template_usage IS 'Tracks template instantiations and success metrics';
COMMENT ON COLUMN workflow_templates.trigger_phrases IS 'Phrases that trigger this template (e.g., "track order", "book appointment")';
COMMENT ON COLUMN workflow_templates.keywords IS 'Keywords for search matching';
COMMENT ON COLUMN workflow_templates.blueprint IS 'The actual workflow definition (nodes, edges)';
COMMENT ON COLUMN workflow_templates.variables IS 'Variables user must provide during instantiation';
COMMENT ON COLUMN workflow_templates.configurable_fields IS 'Optional fields user can customize';
