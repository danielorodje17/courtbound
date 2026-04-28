-- Migration v5: Add lead_source column to profiles
-- Run this in your Supabase Dashboard → SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_source TEXT;
