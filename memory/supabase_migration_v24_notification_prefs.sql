-- =============================================================================
-- CourtBound — Migration v24: Coach Notification Preferences
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

ALTER TABLE coach_accounts
    ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}';

-- Done!
