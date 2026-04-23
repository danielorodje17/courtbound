-- =============================================================================
-- CourtBound — Supabase PostgreSQL Schema
-- Generated: Feb 2026
-- Run this entire file in the Supabase SQL Editor (Database → SQL Editor)
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. COLLEGES
--    Source: MongoDB `colleges` collection
--    coaches[] is normalised into its own table (see section 2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS colleges (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT        NOT NULL,
    location         TEXT        NOT NULL DEFAULT '',
    state            TEXT        NOT NULL DEFAULT '',
    division         TEXT        NOT NULL DEFAULT '',
    conference       TEXT        NOT NULL DEFAULT '',
    region           TEXT        NOT NULL DEFAULT 'USA',    -- 'USA' | 'Europe'
    country          TEXT        NOT NULL DEFAULT '',
    foreign_friendly BOOLEAN     NOT NULL DEFAULT FALSE,
    image_url        TEXT        NOT NULL DEFAULT '',
    scholarship_info TEXT        NOT NULL DEFAULT '',
    notable_alumni   TEXT        NOT NULL DEFAULT '',
    ranking          INTEGER     NOT NULL DEFAULT 999,
    acceptance_rate  TEXT        NOT NULL DEFAULT '',
    website          TEXT        NOT NULL DEFAULT '',
    scholarship_type TEXT        NOT NULL DEFAULT '',
    language_of_study TEXT       NOT NULL DEFAULT '',
    from_csv         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colleges_name           ON colleges (name);
CREATE INDEX IF NOT EXISTS idx_colleges_division       ON colleges (division);
CREATE INDEX IF NOT EXISTS idx_colleges_region         ON colleges (region);
CREATE INDEX IF NOT EXISTS idx_colleges_foreign_friendly ON colleges (foreign_friendly);
CREATE INDEX IF NOT EXISTS idx_colleges_ranking        ON colleges (ranking);

-- =============================================================================
-- 2. COACHES
--    Source: embedded `coaches[]` array inside each MongoDB college document.
--    Normalised to a separate table with a FK back to colleges.
-- =============================================================================
CREATE TABLE IF NOT EXISTS coaches (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id    UUID        NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
    name          TEXT        NOT NULL DEFAULT '',
    email         TEXT        NOT NULL DEFAULT '',
    title         TEXT        NOT NULL DEFAULT '',   -- 'Head Coach' | 'Assistant Coach' etc.
    phone         TEXT        NOT NULL DEFAULT '',
    last_verified TEXT        DEFAULT NULL,          -- '2026-04-22' when verified
    sort_order    INTEGER     NOT NULL DEFAULT 0,    -- preserves original array order
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_college_id ON coaches (college_id);
CREATE INDEX IF NOT EXISTS idx_coaches_email      ON coaches (email);
CREATE INDEX IF NOT EXISTS idx_coaches_last_verified ON coaches (last_verified);

-- =============================================================================
-- 3. USERS
--    Source: MongoDB `users` collection
--    Holds both Google OAuth players (google_id set) and
--    local admin accounts (password_hash set, role = 'admin').
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id     TEXT        UNIQUE,                -- null for admin accounts
    email         TEXT        UNIQUE NOT NULL,
    name          TEXT        NOT NULL DEFAULT '',
    picture       TEXT        NOT NULL DEFAULT '',
    password_hash TEXT        DEFAULT NULL,          -- only for admin accounts
    role          TEXT        NOT NULL DEFAULT 'player', -- 'player' | 'admin'
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);

-- =============================================================================
-- 4. PROFILES
--    Source: MongoDB `profiles` collection (merges player_profiles too).
--    One row per user — created/updated via the Profile page.
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,

    -- Identity
    full_name             TEXT        NOT NULL DEFAULT '',
    email                 TEXT        NOT NULL DEFAULT '',
    phone                 TEXT        NOT NULL DEFAULT '',
    date_of_birth         DATE        DEFAULT NULL,
    nationality           TEXT        NOT NULL DEFAULT '',
    hometown              TEXT        NOT NULL DEFAULT '',

    -- Basketball
    position              TEXT        NOT NULL DEFAULT '',   -- 'Point Guard' etc.
    secondary_position    TEXT        NOT NULL DEFAULT '',
    height_cm             TEXT        NOT NULL DEFAULT '',
    height_ft             TEXT        NOT NULL DEFAULT '',
    weight_kg             TEXT        NOT NULL DEFAULT '',
    wingspan_cm           TEXT        NOT NULL DEFAULT '',
    dominant_hand         TEXT        NOT NULL DEFAULT '',
    jersey_number         TEXT        NOT NULL DEFAULT '',
    years_playing         TEXT        NOT NULL DEFAULT '',

    -- Teams
    current_school        TEXT        NOT NULL DEFAULT '',
    club_team             TEXT        NOT NULL DEFAULT '',
    current_team          TEXT        NOT NULL DEFAULT '',   -- national/county team

    -- Stats (Academy / Club)
    academy_ppg           TEXT        NOT NULL DEFAULT '',
    academy_rpg           TEXT        NOT NULL DEFAULT '',
    academy_apg           TEXT        NOT NULL DEFAULT '',
    academy_spg           TEXT        NOT NULL DEFAULT '',
    academy_fg_percent    TEXT        NOT NULL DEFAULT '',
    academy_three_pt_percent TEXT     NOT NULL DEFAULT '',

    -- Stats (College level)
    college_ppg           TEXT        NOT NULL DEFAULT '',
    college_rpg           TEXT        NOT NULL DEFAULT '',
    college_apg           TEXT        NOT NULL DEFAULT '',
    college_spg           TEXT        NOT NULL DEFAULT '',
    college_fg_percent    TEXT        NOT NULL DEFAULT '',
    college_three_pt_percent TEXT     NOT NULL DEFAULT '',

    -- Stats (National / Country)
    country_ppg           TEXT        NOT NULL DEFAULT '',
    country_rpg           TEXT        NOT NULL DEFAULT '',
    country_apg           TEXT        NOT NULL DEFAULT '',
    country_spg           TEXT        NOT NULL DEFAULT '',
    country_fg_percent    TEXT        NOT NULL DEFAULT '',
    country_three_pt_percent TEXT     NOT NULL DEFAULT '',

    -- General stats aliases (kept for backward compat)
    ppg                   TEXT        NOT NULL DEFAULT '',
    rpg                   TEXT        NOT NULL DEFAULT '',
    apg                   TEXT        NOT NULL DEFAULT '',
    spg                   TEXT        NOT NULL DEFAULT '',
    fg_percent            TEXT        NOT NULL DEFAULT '',
    three_pt_percent      TEXT        NOT NULL DEFAULT '',

    -- Academics
    school_year           TEXT        NOT NULL DEFAULT '',
    expected_graduation   TEXT        NOT NULL DEFAULT '',
    gcse_grades           TEXT        NOT NULL DEFAULT '',
    a_level_subjects      TEXT        NOT NULL DEFAULT '',
    predicted_grades      TEXT        NOT NULL DEFAULT '',
    gpa_equivalent        TEXT        NOT NULL DEFAULT '',
    sat_score             TEXT        NOT NULL DEFAULT '',
    act_score             TEXT        NOT NULL DEFAULT '',
    ncaa_id               TEXT        NOT NULL DEFAULT '',
    ncaa_registered       BOOLEAN     NOT NULL DEFAULT FALSE,
    intended_major        TEXT        NOT NULL DEFAULT '',

    -- Recruiting goals
    target_division       TEXT        NOT NULL DEFAULT '',   -- 'Division I, Division II' etc.
    target_start_year     TEXT        NOT NULL DEFAULT '',

    -- Media
    highlight_tape_url    TEXT        NOT NULL DEFAULT '',
    instagram             TEXT        NOT NULL DEFAULT '',
    twitter               TEXT        NOT NULL DEFAULT '',
    bio                   TEXT        NOT NULL DEFAULT '',

    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);

-- =============================================================================
-- 5. USER SESSIONS
--    Source: MongoDB `user_sessions` + `sessions` collections.
--    Stores active player session tokens (JWT-style bearer tokens).
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    session_token TEXT        NOT NULL UNIQUE,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token   ON user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

-- =============================================================================
-- 6. ADMIN SESSIONS
--    Source: MongoDB `admin_sessions` collection.
--    Short-lived tokens for admin panel access.
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT        NOT NULL,
    token      TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions (token);

-- =============================================================================
-- 7. LOGIN ATTEMPTS  (brute-force protection)
--    Source: MongoDB `login_attempts` collection.
-- =============================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier   TEXT        NOT NULL UNIQUE, -- '<ip>:<email>'
    attempts     INTEGER     NOT NULL DEFAULT 1,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts (identifier);

-- =============================================================================
-- 8. TRACKED COLLEGES  (user recruiting pipeline)
--    Source: MongoDB `tracked_colleges` collection.
--    sent/received summaries are computed on-the-fly from the emails table.
-- =============================================================================
CREATE TABLE IF NOT EXISTS tracked_colleges (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    college_id      UUID        NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
    status          TEXT        NOT NULL DEFAULT 'tracked',
        -- 'tracked' | 'interested' | 'contacted' | 'replied' | 'closed'
    reply_outcome   TEXT        DEFAULT NULL,
        -- 'interested' | 'no_interest' | 'rejected' | 'scholarship_offered'
        -- 'after_call' | 'after_visit' | 'schedule_call' | 'second_follow_up' | 'closed'
    follow_up_needed BOOLEAN    NOT NULL DEFAULT FALSE,
    follow_up_date   DATE       DEFAULT NULL,
    notes            TEXT       NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_tracked_user_id    ON tracked_colleges (user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_college_id ON tracked_colleges (college_id);
CREATE INDEX IF NOT EXISTS idx_tracked_status     ON tracked_colleges (status);

-- =============================================================================
-- 9. EMAILS
--    Source: MongoDB `emails` collection.
--    Stores both outgoing ('sent') and incoming ('received') messages.
-- =============================================================================
CREATE TABLE IF NOT EXISTS emails (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    college_id     UUID        NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
    direction      TEXT        NOT NULL DEFAULT 'sent', -- 'sent' | 'received'
    subject        TEXT        NOT NULL DEFAULT '',
    body           TEXT        NOT NULL DEFAULT '',
    coach_name     TEXT        NOT NULL DEFAULT '',
    coach_email    TEXT        NOT NULL DEFAULT '',
    message_type   TEXT        NOT NULL DEFAULT 'initial_outreach',
        -- 'initial_outreach' | 'follow_up' | 'second_follow_up'
        -- 'reply_to_offer' | 'after_call' | 'after_visit' | 'coach_reply'
    follow_up_needed BOOLEAN   NOT NULL DEFAULT FALSE,
    follow_up_date   DATE      DEFAULT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id    ON emails (user_id);
CREATE INDEX IF NOT EXISTS idx_emails_college_id ON emails (college_id);
CREATE INDEX IF NOT EXISTS idx_emails_direction  ON emails (direction);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails (created_at DESC);

-- =============================================================================
-- 10. COLLEGE REPORTS
--     Source: MongoDB `college_reports` collection.
--     Users flag incorrect coach info; admins resolve via the admin panel.
-- =============================================================================
CREATE TABLE IF NOT EXISTS college_reports (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    user_name      TEXT        NOT NULL DEFAULT '',
    user_email     TEXT        NOT NULL DEFAULT '',
    college_id     UUID        REFERENCES colleges (id) ON DELETE SET NULL,
    college_name   TEXT        NOT NULL DEFAULT '',
    coach_name     TEXT        NOT NULL DEFAULT '',
    issue_type     TEXT        NOT NULL DEFAULT '',
    correct_info   TEXT        NOT NULL DEFAULT '',
    notes          TEXT        NOT NULL DEFAULT '',
    status         TEXT        NOT NULL DEFAULT 'open', -- 'open' | 'in_review' | 'fixed' | 'dismissed'
    admin_response TEXT        NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_college_reports_user_id   ON college_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_college_reports_college_id ON college_reports (college_id);
CREATE INDEX IF NOT EXISTS idx_college_reports_status    ON college_reports (status);

-- =============================================================================
-- 11. USER NOTIFICATIONS
--     Source: MongoDB `user_notifications` collection.
--     Notifies users when admin resolves a report they submitted.
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    report_id   UUID        REFERENCES college_reports (id) ON DELETE SET NULL,
    college_name TEXT       NOT NULL DEFAULT '',
    message     TEXT        NOT NULL DEFAULT '',
    status      TEXT        NOT NULL DEFAULT 'open', -- mirrors report status
    read        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON user_notifications (user_id, read);

-- =============================================================================
-- 12. WEEKLY GOALS
--     Source: MongoDB `weekly_goals` collection.
--     Stores per-user weekly recruiting targets.
-- =============================================================================
CREATE TABLE IF NOT EXISTS weekly_goals (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    week_start DATE        NOT NULL,                    -- ISO date of the Monday
    goals      JSONB       NOT NULL DEFAULT '{}',
        -- { "emails_sent": 8, "follow_ups": 4, "new_tracks": 3, "calls": 2 }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_id   ON weekly_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week_start ON weekly_goals (user_id, week_start DESC);

-- =============================================================================
-- 13. COLLEGE CHECKLISTS
--     Source: MongoDB `college_checklists` collection.
--     Per-user, per-college checklist stored as a JSONB array.
-- =============================================================================
CREATE TABLE IF NOT EXISTS college_checklists (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    college_id UUID        NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
    items      JSONB       NOT NULL DEFAULT '[]',
        -- [{ "id": "email_sent", "label": "...", "checked": false }, ...]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_checklists_user_id    ON college_checklists (user_id);
CREATE INDEX IF NOT EXISTS idx_checklists_college_id ON college_checklists (college_id);

-- =============================================================================
-- 14. AI MATCH RESULTS  (cached AI college-fit scores)
--     Source: MongoDB `ai_match_results` collection.
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_match_results (
    id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    results JSONB       NOT NULL DEFAULT '{}',
        -- { "excellent_fit": [...], "good_fit": [...], "possible_fit": [...] }
    run_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_match_user_id ON ai_match_results (user_id);

-- =============================================================================
-- 15. APP SETTINGS  (global admin toggles)
--     Source: MongoDB `app_settings` collection.
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
    key             TEXT        PRIMARY KEY,
    show_european   BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the single global settings row
INSERT INTO app_settings (key, show_european)
VALUES ('global', TRUE)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
-- NEXT STEPS (do NOT run these yet — see migration guide):
--   Phase 2: install supabase-py on the backend
--   Phase 3: replace Motor/PyMongo calls with Supabase Python client
--   Phase 4: migrate data from MongoDB → Supabase using a one-off script
-- =============================================================================
