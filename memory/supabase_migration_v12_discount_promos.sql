-- ============================================================
-- Migration v12: Percentage Discount Promo Codes
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS applicable_plan_type TEXT DEFAULT 'all';

-- applicable_plan_type values: 'all', 'annual', 'monthly'
