-- Outreach Management System
-- Tables for tracking editorial backlink outreach: target outlets, discovered editors,
-- their articles (via Google Search index), pitches sent, and monthly API usage.
-- All tables admin-only via RLS.

-- ============================================================
-- 1. outreach_domains — target outlets for outreach
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach_domains (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain              TEXT UNIQUE NOT NULL,
  outlet_name         TEXT NOT NULL,
  tier                TEXT NOT NULL CHECK (tier IN ('UAE', 'Expat', 'UK', 'Germany', 'Russia', 'Europe', 'Global')),
  priority            TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3')),
  notes               TEXT,
  hunter_searched_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outreach_domains_priority_idx ON outreach_domains (priority);
CREATE INDEX IF NOT EXISTS outreach_domains_tier_idx ON outreach_domains (tier);

-- ============================================================
-- 2. outreach_editors — editors discovered via Hunter.io
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach_editors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id           UUID NOT NULL REFERENCES outreach_domains(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  first_name          TEXT,
  last_name           TEXT,
  position            TEXT,
  seniority           TEXT,
  department          TEXT,
  linkedin_url        TEXT,
  twitter_handle      TEXT,
  confidence          INT,
  relevance_score     INT,
  topical_score       INT,
  combined_score      INT,
  articles_fetched_at TIMESTAMPTZ,
  contacted_at        TIMESTAMPTZ,
  -- Phase 7 additions (bio scraping)
  bio_text            TEXT,
  bio_url             TEXT,
  bio_fetched_at      TIMESTAMPTZ,
  -- Phase 8 additions (AI summary)
  ai_summary          TEXT,
  hunter_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(domain_id, email)
);

CREATE INDEX IF NOT EXISTS outreach_editors_domain_idx ON outreach_editors (domain_id);
CREATE INDEX IF NOT EXISTS outreach_editors_combined_score_idx ON outreach_editors (combined_score DESC);
CREATE INDEX IF NOT EXISTS outreach_editors_contacted_idx ON outreach_editors (contacted_at);

-- ============================================================
-- 3. outreach_articles — articles published by each editor
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach_articles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id           UUID NOT NULL REFERENCES outreach_editors(id) ON DELETE CASCADE,
  url                 TEXT NOT NULL,
  title               TEXT NOT NULL,
  snippet             TEXT,
  published_date      DATE,
  topic_match_score   INT NOT NULL DEFAULT 0,
  topic_keywords      TEXT[],
  -- Phase 8 additions (full-text enrichment)
  full_text           TEXT,
  serper_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(editor_id, url)
);

CREATE INDEX IF NOT EXISTS outreach_articles_editor_idx ON outreach_articles (editor_id);
CREATE INDEX IF NOT EXISTS outreach_articles_score_idx ON outreach_articles (topic_match_score DESC);

-- ============================================================
-- 4. outreach_pitches — each pitch drafted/sent
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach_pitches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id           UUID NOT NULL REFERENCES outreach_editors(id) ON DELETE CASCADE,
  pitch_angle         TEXT NOT NULL,
  target_url          TEXT NOT NULL,
  anchor_type         TEXT NOT NULL CHECK (anchor_type IN ('branded', 'url', 'generic', 'partial', 'exact')),
  anchor_text         TEXT NOT NULL,
  subject             TEXT NOT NULL,
  body                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'replied', 'published', 'rejected')),
  sent_at             TIMESTAMPTZ,
  replied_at          TIMESTAMPTZ,
  published_url       TEXT,
  published_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outreach_pitches_editor_idx ON outreach_pitches (editor_id);
CREATE INDEX IF NOT EXISTS outreach_pitches_status_idx ON outreach_pitches (status);
CREATE INDEX IF NOT EXISTS outreach_pitches_anchor_type_idx ON outreach_pitches (anchor_type);

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION outreach_pitches_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outreach_pitches_updated_at
  BEFORE UPDATE ON outreach_pitches
  FOR EACH ROW EXECUTE FUNCTION outreach_pitches_touch_updated_at();

-- ============================================================
-- 5. outreach_api_usage — monthly quota tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach_api_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month           DATE NOT NULL,
  provider        TEXT NOT NULL CHECK (provider IN ('hunter', 'serper', 'scrapingbee')),
  searches_used   INT NOT NULL DEFAULT 0,
  UNIQUE(month, provider)
);

CREATE INDEX IF NOT EXISTS outreach_api_usage_month_idx ON outreach_api_usage (month);

-- ============================================================
-- Row Level Security — admin-only access to all outreach tables
-- ============================================================

ALTER TABLE outreach_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_api_usage ENABLE ROW LEVEL SECURITY;

-- Single policy per table: only admins can read/write.
-- Uses profiles.role = 'admin' which matches the auth pattern in app/actions/admin.ts.
CREATE POLICY "Admins manage outreach_domains"
  ON outreach_domains FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage outreach_editors"
  ON outreach_editors FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage outreach_articles"
  ON outreach_articles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage outreach_pitches"
  ON outreach_pitches FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage outreach_api_usage"
  ON outreach_api_usage FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
