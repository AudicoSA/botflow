-- Add workflow column to bots table
-- This stores the visual workflow builder data (nodes, edges)

-- Add workflow JSONB column
ALTER TABLE bots ADD COLUMN IF NOT EXISTS workflow JSONB DEFAULT NULL;

-- Add system_prompt and model_config if they don't exist
ALTER TABLE bots ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT NULL;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS model_config JSONB DEFAULT '{"provider": "openai", "model": "gpt-4o", "temperature": 0.7}';

-- Add vertical column for template vertical
ALTER TABLE bots ADD COLUMN IF NOT EXISTS vertical TEXT DEFAULT NULL;

-- Comments
COMMENT ON COLUMN bots.workflow IS 'Visual workflow builder data (nodes, edges from ReactFlow)';
COMMENT ON COLUMN bots.system_prompt IS 'AI system prompt for bot behavior';
COMMENT ON COLUMN bots.model_config IS 'AI model configuration (provider, model, temperature)';
COMMENT ON COLUMN bots.vertical IS 'Business vertical (restaurant, salon, taxi, etc.)';
