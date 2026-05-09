-- Migration v22: sort_order for within-column card ordering on recruiting board
ALTER TABLE coach_saved_players
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialise sort_order from saved_at for all existing rows
WITH ranked AS (
  SELECT id,
    (ROW_NUMBER() OVER (PARTITION BY coach_id, list_name ORDER BY saved_at) - 1)::INTEGER AS rn
  FROM coach_saved_players
)
UPDATE coach_saved_players
SET sort_order = ranked.rn
FROM ranked
WHERE coach_saved_players.id = ranked.id;
