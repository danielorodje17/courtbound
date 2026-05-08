-- Migration v21: Scheduled send + status on coach_messages
ALTER TABLE coach_messages
  ADD COLUMN IF NOT EXISTS scheduled_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'sent';

-- Index for scheduler job (pick up pending scheduled messages efficiently)
CREATE INDEX IF NOT EXISTS idx_coach_messages_status ON coach_messages(status) WHERE status = 'scheduled';
