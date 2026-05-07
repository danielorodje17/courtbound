-- CourtBound Migration v13: College Status Column
-- Run this in your Supabase SQL editor

ALTER TABLE colleges ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'live';

-- Ensure all existing colleges are marked as live
UPDATE colleges SET status = 'live' WHERE status IS NULL;
