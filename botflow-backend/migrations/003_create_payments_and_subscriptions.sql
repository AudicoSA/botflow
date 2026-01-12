-- Payments and Subscriptions Tables
-- Migration: 003
-- Created: 2026-01-11

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Payment provider details
  provider TEXT NOT NULL DEFAULT 'paystack', -- paystack, payfast, yoco, ozow
  provider_transaction_id TEXT,
  provider_reference TEXT NOT NULL,

  -- Transaction details
  amount INTEGER NOT NULL, -- Amount in cents (kobo)
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, refunded
  payment_type TEXT NOT NULL DEFAULT 'initialize', -- initialize, charge, subscription
  payment_method TEXT, -- card, bank, eft, ussd, etc.

  -- Customer details
  customer_email TEXT,
  customer_phone TEXT,

  -- Metadata
  description TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Indexes
  CONSTRAINT payments_provider_reference_key UNIQUE (provider_reference)
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_organization ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_bot ON payments(bot_id);
CREATE INDEX IF NOT EXISTS idx_payments_conversation ON payments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,

  -- Provider details
  provider TEXT NOT NULL DEFAULT 'paystack', -- paystack, payfast, yoco
  provider_subscription_id TEXT NOT NULL,
  provider_customer_code TEXT,

  -- Plan details
  plan_code TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents (kobo)
  currency TEXT NOT NULL DEFAULT 'ZAR',
  interval TEXT NOT NULL, -- hourly, daily, weekly, monthly, annually

  -- Status
  status TEXT DEFAULT 'active', -- active, cancelled, expired

  -- Timestamps
  next_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint
  CONSTRAINT subscriptions_provider_subscription_id_key UNIQUE (provider_subscription_id)
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_bot ON subscriptions(bot_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(next_payment_date);

-- Row Level Security (RLS) for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can read their organization's payments
CREATE POLICY "Users can view their organization's payments"
  ON payments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create payments for their organization
CREATE POLICY "Users can create payments for their organization"
  ON payments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their organization's payments
CREATE POLICY "Users can update their organization's payments"
  ON payments FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Row Level Security (RLS) for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their organization's subscriptions
CREATE POLICY "Users can view their organization's subscriptions"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create subscriptions for their organization
CREATE POLICY "Users can create subscriptions for their organization"
  ON subscriptions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their organization's subscriptions
CREATE POLICY "Users can update their organization's subscriptions"
  ON subscriptions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE payments IS 'Payment transactions from Paystack and other providers';
COMMENT ON COLUMN payments.amount IS 'Amount in cents (kobo) - R100 = 10000';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, success, failed, refunded';
COMMENT ON COLUMN payments.payment_type IS 'Type: initialize (new payment), charge (saved card), subscription';

COMMENT ON TABLE subscriptions IS 'Recurring payment subscriptions';
COMMENT ON COLUMN subscriptions.amount IS 'Subscription amount in cents (kobo)';
COMMENT ON COLUMN subscriptions.interval IS 'Billing interval: hourly, daily, weekly, monthly, annually';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, cancelled, expired';
