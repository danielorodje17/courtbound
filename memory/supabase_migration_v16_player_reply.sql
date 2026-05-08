-- Migration v16: Player reply field on coach_messages
ALTER TABLE coach_messages
  ADD COLUMN IF NOT EXISTS player_reply       TEXT,
  ADD COLUMN IF NOT EXISTS player_replied_at  TIMESTAMPTZ;
