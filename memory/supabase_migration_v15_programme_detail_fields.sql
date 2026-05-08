-- Migration v15: Programme detail fields on coach_accounts
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE coach_accounts
  ADD COLUMN IF NOT EXISTS scholarship_type       TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_avg_value  INTEGER,
  ADD COLUMN IF NOT EXISTS nil_available          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nil_description        TEXT,
  ADD COLUMN IF NOT EXISTS housing_type           TEXT,
  ADD COLUMN IF NOT EXISTS f1_visa_support        TEXT,
  ADD COLUMN IF NOT EXISTS international_players_count INTEGER;
