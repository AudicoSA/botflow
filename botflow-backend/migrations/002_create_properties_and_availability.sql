-- Migration 002: Properties and Availability System for Airbnb iCal Integration
-- Created: 2026-01-11
-- Updated: 2026-01-12 (Fixed bot_id type to TEXT)
-- Purpose: Support vacation rental calendar sync with Airbnb, Booking.com, etc.
-- Note: bot_id is TEXT type to match existing bots(id) column

-- ========================================
-- Table: properties
-- ========================================
-- Stores vacation rental property information and iCal calendar URLs

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  bot_id TEXT, -- TEXT to match bots(id) column type
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
  ical_urls JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {url, source} objects
  min_nights INTEGER DEFAULT 1,
  max_nights INTEGER DEFAULT 365,
  check_in_time TIME DEFAULT '14:00',
  check_out_time TIME DEFAULT '10:00',
  buffer_days INTEGER DEFAULT 0, -- Days between bookings for cleaning
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Table: blocked_dates
-- ========================================
-- Stores unavailable date ranges from iCal calendars

CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL, -- Exclusive (checkout day is available)
  event_uid TEXT, -- iCal UID for updates
  source TEXT NOT NULL, -- 'airbnb', 'booking', 'google', 'manual'
  summary TEXT, -- Event description from calendar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate events from same source
  CONSTRAINT unique_property_event UNIQUE(property_id, event_uid)
);

-- ========================================
-- Table: sync_logs
-- ========================================
-- Tracks calendar sync history and errors

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  events_processed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Indexes
-- ========================================

-- Fast property lookups by organization
CREATE INDEX IF NOT EXISTS idx_properties_organization
  ON properties(organization_id);

-- Fast property lookups by bot (manual foreign key to bots table)
CREATE INDEX IF NOT EXISTS idx_properties_bot
  ON properties(bot_id);

-- Fast date range queries for availability checking
CREATE INDEX IF NOT EXISTS idx_blocked_dates_property_dates
  ON blocked_dates(property_id, start_date, end_date);

-- Fast sync log queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_property
  ON sync_logs(property_id, synced_at DESC);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Properties: Users can manage their organization's properties
CREATE POLICY "Users can manage their org properties"
  ON properties FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Blocked Dates: Users can view blocked dates for their organization's properties
CREATE POLICY "Users can view blocked dates for their properties"
  ON blocked_dates FOR SELECT
  USING (
    property_id IN (
      SELECT id
      FROM properties
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Blocked Dates: Service role can insert/update/delete (for sync service)
CREATE POLICY "Service role can manage blocked dates"
  ON blocked_dates FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Sync Logs: Users can view sync logs for their organization's properties
CREATE POLICY "Users can view sync logs for their properties"
  ON sync_logs FOR SELECT
  USING (
    property_id IN (
      SELECT id
      FROM properties
      WHERE organization_id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Sync Logs: Service role can insert (for sync service)
CREATE POLICY "Service role can insert sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- Helper Functions
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for properties table
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for blocked_dates table
DROP TRIGGER IF EXISTS update_blocked_dates_updated_at ON blocked_dates;
CREATE TRIGGER update_blocked_dates_updated_at
  BEFORE UPDATE ON blocked_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Comments
-- ========================================

COMMENT ON TABLE properties IS 'Vacation rental properties with iCal calendar URLs for availability sync';
COMMENT ON TABLE blocked_dates IS 'Unavailable date ranges synced from iCal calendars (Airbnb, Booking.com, etc.)';
COMMENT ON TABLE sync_logs IS 'History of calendar sync operations for debugging and monitoring';

COMMENT ON COLUMN properties.ical_urls IS 'Array of calendar sources: [{"url": "https://...", "source": "airbnb"}]';
COMMENT ON COLUMN properties.buffer_days IS 'Days needed between bookings for cleaning and turnover';
COMMENT ON COLUMN blocked_dates.end_date IS 'Exclusive end date - checkout day is available for next booking';
COMMENT ON COLUMN blocked_dates.event_uid IS 'iCal UID for identifying and updating recurring events';

-- ========================================
-- Migration Complete
-- ========================================

-- Verify tables created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocked_dates') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
    RAISE NOTICE '✅ Migration 002 complete: Properties and availability tables created successfully';
  ELSE
    RAISE EXCEPTION '❌ Migration 002 failed: Some tables were not created';
  END IF;
END $$;
