-- Migration v20: Custom lists stored as JSONB array on coach_accounts
ALTER TABLE coach_accounts
  ADD COLUMN IF NOT EXISTS custom_lists JSONB NOT NULL DEFAULT '[]'::jsonb;
