-- =============================================================================
-- CourtBound — Migration v23: Coach Message Templates
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

-- 1. Create the templates table
CREATE TABLE IF NOT EXISTS coach_message_templates (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id    UUID        NOT NULL REFERENCES coach_accounts(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    subject     TEXT,
    body        TEXT        NOT NULL,
    is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_templates_coach_id
    ON coach_message_templates(coach_id);

-- 2. Backfill 3 default templates for ALL existing coaches
INSERT INTO coach_message_templates (coach_id, name, subject, body, is_default)
SELECT ca.id, t.name, t.subject, t.body, TRUE
FROM coach_accounts ca
CROSS JOIN (VALUES
  (
    'Initial Interest Introduction',
    'Recruiting Interest',
    'Hi, I''m Coach [Name] from [Institution]. We''ve been following your development closely and believe you could be a great fit for our programme. We''d love to connect and tell you more about what we offer and the opportunities available. Please feel free to reply with any questions.'
  ),
  (
    'Highlight Reel Request',
    'Film Request',
    'Thank you for your interest in our programme. To continue our evaluation, we''d love to review your most recent highlight reel and any available game film. Could you please share a link to your current footage? Any recent competition film would be very helpful for our process.'
  ),
  (
    'Official Visit Invitation',
    'Official Visit Invitation',
    'We''d like to formally invite you for an official visit to our campus. This would be a wonderful opportunity to meet our coaching staff, see our facilities, and experience campus life first-hand. Please let us know your availability and we''ll arrange a date that works for both of us.'
  )
) AS t(name, subject, body)
WHERE NOT EXISTS (
    SELECT 1 FROM coach_message_templates WHERE coach_id = ca.id
);

-- Done!
