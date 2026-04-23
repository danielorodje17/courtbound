-- =============================================================================
-- CourtBound — Supabase Schema v2 Additions
-- Run this in the Supabase SQL Editor (Database → SQL Editor)
-- before deploying the Supabase backend (Phase 3)
-- =============================================================================

-- 1. tracked_colleges — add call_notes, deadlines
ALTER TABLE tracked_colleges ADD COLUMN IF NOT EXISTS call_notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tracked_colleges ADD COLUMN IF NOT EXISTS application_deadline DATE DEFAULT NULL;
ALTER TABLE tracked_colleges ADD COLUMN IF NOT EXISTS signing_day DATE DEFAULT NULL;

-- 2. users — add last_active and subscription_tier
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free';

-- 3. emails — add outcome field
ALTER TABLE emails ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT '';

-- 4. email_templates — new table (not in original schema)
CREATE TABLE IF NOT EXISTS email_templates (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name         TEXT        NOT NULL DEFAULT '',
    subject      TEXT        NOT NULL DEFAULT '',
    body         TEXT        NOT NULL DEFAULT '',
    message_type TEXT        NOT NULL DEFAULT 'initial_outreach',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates (user_id);

-- Done!
