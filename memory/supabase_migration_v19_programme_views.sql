-- Migration v19: Programme views tracking table
CREATE TABLE IF NOT EXISTS coach_programme_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES coach_accounts(id) ON DELETE CASCADE,
  viewer_type TEXT NOT NULL DEFAULT 'player',  -- 'player' | 'anonymous'
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_programme_views_coach ON coach_programme_views(coach_id);
CREATE INDEX IF NOT EXISTS idx_programme_views_time  ON coach_programme_views(viewed_at);
