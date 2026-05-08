-- Migration v17: Commitment status on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS commitment_status       TEXT NOT NULL DEFAULT 'uncommitted',
  ADD COLUMN IF NOT EXISTS committed_to_institution TEXT;
