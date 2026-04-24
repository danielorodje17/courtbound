-- =============================================================================
-- CourtBound — Supabase Schema v3: Subscription / Trial / Pricing
-- Run this in the Supabase SQL Editor (Database → SQL Editor)
-- =============================================================================

-- 1. Add trial columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end_date   TIMESTAMPTZ DEFAULT NULL;

-- 2. Pricing plans table (admin-editable)
CREATE TABLE IF NOT EXISTS pricing_plans (
    tier            TEXT        PRIMARY KEY,           -- 'basic' | 'premium'
    name            TEXT        NOT NULL,
    price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency        TEXT        NOT NULL DEFAULT 'GBP',
    description     TEXT        NOT NULL DEFAULT '',
    features        JSONB       NOT NULL DEFAULT '[]'::jsonb,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default pricing plans
INSERT INTO pricing_plans (tier, name, price_monthly, currency, description, features)
VALUES
  ('basic', 'Basic', 9.99, 'GBP', 'Perfect for serious players',
   '["Unlimited college tracking","Email logging & history","Response tracker","Profile management","College comparison tool","Basic dashboard analytics"]'::jsonb),
  ('premium', 'Premium', 19.99, 'GBP', 'Full access to every feature',
   '["All Basic features","AI email composer","Recruitment strategy AI","NCAA eligibility checker","AI college match scoring","Bulk email import","CSV export","Priority support"]'::jsonb)
ON CONFLICT (tier) DO NOTHING;

-- 3. Trial email reminders tracking (prevents duplicate sends)
CREATE TABLE IF NOT EXISTS trial_email_reminders (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reminder_type   TEXT        NOT NULL,  -- 'day_7' | 'day_11'
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, reminder_type)
);

-- Done!
