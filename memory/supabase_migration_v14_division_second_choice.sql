-- Migration v14: Add target_division_2 to profiles table
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS target_division_2 TEXT NOT NULL DEFAULT '';
