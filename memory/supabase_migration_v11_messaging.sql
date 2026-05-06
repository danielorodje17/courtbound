-- ============================================================
-- Migration v11: Coach Messaging (one-way: coach → player)
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS coach_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES coach_accounts(id) ON DELETE CASCADE,
    player_user_id TEXT NOT NULL,
    coach_name TEXT NOT NULL,
    coach_institution TEXT NOT NULL,
    coach_division TEXT,
    subject TEXT,
    body TEXT NOT NULL,
    ncaa_period_type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_player ON coach_messages(player_user_id);
CREATE INDEX IF NOT EXISTS idx_coach_messages_coach ON coach_messages(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_messages_unread ON coach_messages(player_user_id, is_read);
