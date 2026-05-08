-- Migration v18: Privacy settings + soft delete on coach_accounts
ALTER TABLE coach_accounts
  ADD COLUMN IF NOT EXISTS privacy_settings  JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted        BOOLEAN NOT NULL DEFAULT FALSE;
