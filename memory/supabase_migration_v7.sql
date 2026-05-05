-- Migration v7: Legal documents (Privacy Policy + Terms of Use)
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS legal_documents (
  type         TEXT        PRIMARY KEY,  -- 'privacy' | 'terms'
  content      TEXT        NOT NULL DEFAULT '',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   TEXT
);
