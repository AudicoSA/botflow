-- Migration 004: Integration Marketplace (v2 - Compatible with TEXT bot_id)
-- Creates tables for storing available integrations and bot-specific integration configurations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean re-run)
DROP TABLE IF EXISTS integration_logs CASCADE;
DROP TABLE IF EXISTS bot_integrations CASCADE;
DROP TABLE IF EXISTS integration_marketplace CASCADE;

-- Integration Marketplace: Catalog of all available integrations
CREATE TABLE integration_marketplace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('calendar', 'payment', 'crm', 'communication', 'ecommerce', 'analytics', 'productivity', 'specialized')),
  description TEXT,
  long_description TEXT,
  icon_url TEXT,
  requires_auth BOOLEAN DEFAULT true,
  auth_type TEXT CHECK (auth_type IN ('oauth', 'api_key', 'basic', 'none')),
  n8n_workflow_template JSONB, -- n8n workflow JSON template
  recommended_for_verticals TEXT[], -- Array of template slugs (e.g., ['taxi', 'medical'])
  pricing_model TEXT DEFAULT 'free' CHECK (pricing_model IN ('free', 'freemium', 'paid')),
  popularity_score INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_direct_integration BOOLEAN DEFAULT false, -- True for Google Calendar, Paystack
  documentation_url TEXT,
  setup_instructions JSONB, -- Steps, fields, etc.
  webhook_url TEXT, -- Webhook endpoint if applicable
  supported_features TEXT[], -- Array of features (e.g., ['create', 'read', 'update', 'delete'])
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot Integrations: Per-bot integration configurations
-- NOTE: Using TEXT for bot_id to match existing bots table
CREATE TABLE bot_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id TEXT NOT NULL, -- Changed from UUID to TEXT to match bots(id)
  integration_id UUID NOT NULL REFERENCES integration_marketplace(id) ON DELETE CASCADE,
  n8n_workflow_id TEXT, -- ID of the created n8n workflow instance
  credentials JSONB, -- Encrypted credentials (API keys, OAuth tokens, etc.)
  configuration JSONB, -- Integration-specific settings
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'pending')),
  error_message TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, integration_id)
);

-- Add foreign key constraint manually (without referencing bots table directly)
-- This allows the table to exist even if bots table structure changes
CREATE INDEX idx_bot_integrations_bot_id_fk ON bot_integrations(bot_id);

-- Integration Logs: Track integration activity and errors
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_integration_id UUID NOT NULL REFERENCES bot_integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- sync, webhook, error, api_call
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
  message TEXT,
  request_data JSONB,
  response_data JSONB,
  error_details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_integration_marketplace_category ON integration_marketplace(category);
CREATE INDEX idx_integration_marketplace_slug ON integration_marketplace(slug);
CREATE INDEX idx_integration_marketplace_featured ON integration_marketplace(is_featured) WHERE is_featured = true;
CREATE INDEX idx_integration_marketplace_verticals ON integration_marketplace USING GIN(recommended_for_verticals);

CREATE INDEX idx_bot_integrations_integration_id ON bot_integrations(integration_id);
CREATE INDEX idx_bot_integrations_status ON bot_integrations(status);

CREATE INDEX idx_integration_logs_bot_integration_id ON integration_logs(bot_integration_id);
CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at DESC);
CREATE INDEX idx_integration_logs_status ON integration_logs(status);

-- Row-Level Security (RLS) Policies

-- Integration Marketplace: Public read access for published integrations
ALTER TABLE integration_marketplace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Integration marketplace is viewable by everyone"
  ON integration_marketplace FOR SELECT
  USING (true);

-- Bot Integrations: Users can only access their own organization's bot integrations
ALTER TABLE bot_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bot integrations"
  ON bot_integrations FOR SELECT
  USING (
    bot_id IN (
      SELECT b.id::TEXT FROM bots b
      WHERE b.organization_id IN (
        SELECT om.organization_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert bot integrations for their bots"
  ON bot_integrations FOR INSERT
  WITH CHECK (
    bot_id IN (
      SELECT b.id::TEXT FROM bots b
      WHERE b.organization_id IN (
        SELECT om.organization_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own bot integrations"
  ON bot_integrations FOR UPDATE
  USING (
    bot_id IN (
      SELECT b.id::TEXT FROM bots b
      WHERE b.organization_id IN (
        SELECT om.organization_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own bot integrations"
  ON bot_integrations FOR DELETE
  USING (
    bot_id IN (
      SELECT b.id::TEXT FROM bots b
      WHERE b.organization_id IN (
        SELECT om.organization_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    )
  );

-- Integration Logs: Users can view logs for their bot integrations
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integration logs"
  ON integration_logs FOR SELECT
  USING (
    bot_integration_id IN (
      SELECT bi.id FROM bot_integrations bi
      WHERE bi.bot_id IN (
        SELECT b.id::TEXT FROM bots b
        WHERE b.organization_id IN (
          SELECT om.organization_id FROM organization_members om
          WHERE om.user_id = auth.uid()
        )
      )
    )
  );

-- Updated_at trigger function (reuse existing or create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_integration_marketplace_updated_at
  BEFORE UPDATE ON integration_marketplace
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_integrations_updated_at
  BEFORE UPDATE ON bot_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert direct integrations we've already built
INSERT INTO integration_marketplace (name, slug, category, description, long_description, icon_url, requires_auth, auth_type, is_direct_integration, is_featured, popularity_score, recommended_for_verticals, pricing_model, supported_features, setup_instructions)
VALUES
  (
    'Google Calendar',
    'google-calendar',
    'calendar',
    'Sync appointments and check availability in real-time with Google Calendar',
    'Enable automatic appointment booking with real-time availability checking. Customers can book directly via WhatsApp, and appointments sync instantly to your Google Calendar. Supports multiple calendars, working hours, and Google Meet video calls.',
    'https://www.google.com/calendar/images/calendar_32.png',
    true,
    'oauth',
    true,
    true,
    100,
    ARRAY['taxi', 'medical', 'real_estate', 'restaurant', 'salon', 'gym', 'retail', 'hotel', 'car_rental', 'plumber', 'doctor', 'airbnb'],
    'free',
    ARRAY['create', 'read', 'update', 'delete', 'availability'],
    '{"steps": ["Click ''Connect Google Calendar''", "Sign in with your Google account", "Grant calendar access permissions", "Select which calendar to use for bookings"], "required_scopes": ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]}'::jsonb
  ),
  (
    'Paystack',
    'paystack',
    'payment',
    'Accept payments via card, bank transfer, and mobile money with Paystack',
    'Enable secure payment collection for your WhatsApp business. Accept credit/debit cards, EFT, SnapScan, and more. Built specifically for South African businesses with support for ZAR, recurring payments, and instant payment verification.',
    'https://paystack.com/assets/img/logo/paystack-icon-blue.png',
    true,
    'api_key',
    true,
    true,
    95,
    ARRAY['taxi', 'ecommerce', 'restaurant', 'salon', 'gym', 'retail', 'hotel', 'car_rental', 'plumber', 'doctor', 'airbnb'],
    'free',
    ARRAY['payment', 'refund', 'subscription', 'webhook'],
    '{"steps": ["Sign up at paystack.com/za", "Get your API keys from Settings → API Keys", "Paste your Secret Key and Public Key", "Set up webhook URL (optional)"], "required_fields": ["secret_key", "public_key"]}'::jsonb
  );

COMMENT ON TABLE integration_marketplace IS 'Catalog of all available third-party integrations';
COMMENT ON TABLE bot_integrations IS 'Per-bot integration configurations and credentials';
COMMENT ON TABLE integration_logs IS 'Activity logs for integration events and errors';

-- Note: bot_id is TEXT type to match the existing bots table structure in your database
-- If you need to change this later, you can alter the column type
