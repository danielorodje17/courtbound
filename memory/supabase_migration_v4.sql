-- =============================================================================
-- CourtBound Migration v4: Women's Basketball Division Support
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

-- 1. Add basketball_gender to profiles
--    Stores whether the player is in the Men's or Women's program.
--    Values: 'men' | 'women'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS basketball_gender TEXT NOT NULL DEFAULT 'men';

-- 2. Add program_gender to colleges
--    Tags each college entry for Men's, Women's, or both programs.
--    Values: 'mens' | 'womens' | 'both'
--    Default 'both' means all existing colleges are available to both divisions.
ALTER TABLE colleges
  ADD COLUMN IF NOT EXISTS program_gender TEXT NOT NULL DEFAULT 'both';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('profiles', 'colleges')
  AND column_name IN ('basketball_gender', 'program_gender')
ORDER BY table_name, column_name;
