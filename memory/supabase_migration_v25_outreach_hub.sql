-- =============================================================================
-- CourtBound — Migration v25: Coach Outreach Hub
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================

-- Outreach campaigns (one row per send campaign)
CREATE TABLE IF NOT EXISTS admin_campaigns (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT        NOT NULL,
    subject           TEXT        NOT NULL,
    body_html         TEXT        NOT NULL,
    sender_email      TEXT        NOT NULL DEFAULT 'graham@getcourtbound.com',
    status            TEXT        NOT NULL DEFAULT 'draft',
        -- draft | scheduled | sending | sent | failed
    scheduled_at      TIMESTAMPTZ,
    sent_at           TIMESTAMPTZ,
    recipient_count   INTEGER     NOT NULL DEFAULT 0,
    sent_count        INTEGER     NOT NULL DEFAULT 0,
    failed_count      INTEGER     NOT NULL DEFAULT 0,
    filters           JSONB       NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-recipient tracking (one row per email address in a campaign)
CREATE TABLE IF NOT EXISTS admin_campaign_recipients (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id       UUID        NOT NULL REFERENCES admin_campaigns(id) ON DELETE CASCADE,
    contact_email     TEXT        NOT NULL,
    contact_name      TEXT,
    contact_institution TEXT,
    contact_division  TEXT,
    status            TEXT        NOT NULL DEFAULT 'pending',
        -- pending | sent | failed | unsubscribed
    sent_at           TIMESTAMPTZ,
    resend_message_id TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global unsubscribe list
CREATE TABLE IF NOT EXISTS admin_unsubscribes (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email             TEXT        NOT NULL,
    unsubscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source            TEXT        NOT NULL DEFAULT 'email_link',
    CONSTRAINT admin_unsubscribes_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON admin_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email    ON admin_campaign_recipients(contact_email);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email           ON admin_unsubscribes(email);
