-- Create bot_templates table
CREATE TABLE bot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vertical TEXT NOT NULL, -- 'taxi', 'restaurant', 'salon', etc.
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  description TEXT,
  tagline TEXT, -- Short one-liner for cards
  icon TEXT, -- Icon name or emoji
  required_fields JSONB NOT NULL DEFAULT '{}', -- Form field definitions
  conversation_flow JSONB NOT NULL DEFAULT '{}', -- AI instructions & prompts
  example_prompts TEXT[] DEFAULT '{}',
  integrations TEXT[] DEFAULT '{}', -- ['maps', 'calendar', 'payment']
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_templates_vertical ON bot_templates(vertical);
CREATE INDEX idx_templates_published ON bot_templates(is_published);
CREATE INDEX idx_templates_tier ON bot_templates(tier);

-- Row Level Security
ALTER TABLE bot_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published templates
CREATE POLICY "Public can read published templates"
  ON bot_templates FOR SELECT
  USING (is_published = true);

-- Policy: Authenticated users can read all templates
CREATE POLICY "Authenticated users can read templates"
  ON bot_templates FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert/update/delete templates
-- (We'll implement admin role checking later)
CREATE POLICY "Admins can manage templates"
  ON bot_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_templates_updated_at
  BEFORE UPDATE ON bot_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
