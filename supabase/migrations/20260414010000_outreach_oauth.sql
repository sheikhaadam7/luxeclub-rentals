-- OAuth token storage for outreach tools (Gmail reply detection, etc)
-- Separate migration so the earlier one remains atomic.

CREATE TABLE IF NOT EXISTS outreach_oauth_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL CHECK (provider IN ('google')),
  admin_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_token    TEXT,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ,
  email           TEXT,
  scopes          TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, admin_user_id)
);

CREATE INDEX IF NOT EXISTS outreach_oauth_tokens_user_idx ON outreach_oauth_tokens (admin_user_id);

ALTER TABLE outreach_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage outreach_oauth_tokens"
  ON outreach_oauth_tokens FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
