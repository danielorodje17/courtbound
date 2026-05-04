-- Migration v6: Stripe payments support
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add subscription_expires_at to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 2. Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT        UNIQUE NOT NULL,
  user_id           UUID        REFERENCES users(id) ON DELETE SET NULL,
  amount            NUMERIC     NOT NULL,
  currency          TEXT        NOT NULL DEFAULT 'gbp',
  plan_key          TEXT        NOT NULL,
  tier              TEXT        NOT NULL,
  days              INTEGER     NOT NULL DEFAULT 30,
  payment_status    TEXT        NOT NULL DEFAULT 'pending',
  status            TEXT        NOT NULL DEFAULT 'initiated',
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_session_id
  ON payment_transactions(session_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
  ON payment_transactions(user_id);

-- 4. Row-level security (optional but recommended)
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service role full access" ON payment_transactions
  FOR ALL USING (true);
