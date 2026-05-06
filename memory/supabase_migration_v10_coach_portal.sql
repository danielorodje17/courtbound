-- ============================================================
-- Migration v10: Coach Portal Tables
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Coach accounts
CREATE TABLE IF NOT EXISTS coach_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    session_token TEXT,
    full_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    division TEXT NOT NULL,
    conference TEXT,
    institution_website TEXT,
    primary_sport TEXT NOT NULL,
    country TEXT DEFAULT 'US',
    verification_status TEXT DEFAULT 'pending',
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    profile_photo TEXT,
    about_programme TEXT,
    recruiting_prefs JSONB DEFAULT '{}',
    last_active TIMESTAMPTZ,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_steps JSONB DEFAULT '{}',
    is_founding_member BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. NCAA institutions for email domain auto-verification
CREATE TABLE IF NOT EXISTS ncaa_institutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    division TEXT NOT NULL,
    conference TEXT,
    state TEXT,
    country TEXT DEFAULT 'US',
    website TEXT,
    email_domains TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Coach saved players (Phase 1 board)
CREATE TABLE IF NOT EXISTS coach_saved_players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES coach_accounts(id) ON DELETE CASCADE,
    player_user_id TEXT NOT NULL,
    list_name TEXT DEFAULT 'Watch List',
    notes TEXT,
    color_label TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, player_user_id)
);

-- 4. Coach notifications
CREATE TABLE IF NOT EXISTS coach_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES coach_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Player profile views by coaches
CREATE TABLE IF NOT EXISTS coach_player_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES coach_accounts(id) ON DELETE CASCADE,
    player_user_id TEXT NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_saved_players_coach ON coach_saved_players(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notifications_coach ON coach_notifications(coach_id, is_read);
CREATE INDEX IF NOT EXISTS idx_coach_player_views_coach ON coach_player_views(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_accounts_status ON coach_accounts(verification_status);
CREATE INDEX IF NOT EXISTS idx_ncaa_institutions_division ON ncaa_institutions(division);
