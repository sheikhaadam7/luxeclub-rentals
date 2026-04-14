-- Cron-driven scans: competitor coverage, media monitoring, editor movement
-- detection + an audit log of job runs.

-- Competitor brands we watch for in outlet coverage (e.g., rival rentals)
CREATE TABLE IF NOT EXISTS outreach_competitor_brands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  aliases     TEXT[] NOT NULL DEFAULT '{}',
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keywords for media monitoring ("luxury car Dubai", etc.)
CREATE TABLE IF NOT EXISTS outreach_monitor_keywords (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword     TEXT NOT NULL,
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Editor movement events (new byline, went quiet, returned)
CREATE TABLE IF NOT EXISTS outreach_editor_movements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id    UUID REFERENCES outreach_editors(id) ON DELETE CASCADE,
  domain_id    UUID NOT NULL REFERENCES outreach_domains(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('new', 'went_quiet', 'returned', 'moved_to')),
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_url   TEXT,
  details      JSONB
);

CREATE INDEX IF NOT EXISTS outreach_editor_movements_domain_idx
  ON outreach_editor_movements (domain_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS outreach_editor_movements_editor_idx
  ON outreach_editor_movements (editor_id);

-- Audit log of cron job runs
CREATE TABLE IF NOT EXISTS outreach_job_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name          TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  items_processed   INT NOT NULL DEFAULT 0,
  errors_count      INT NOT NULL DEFAULT 0,
  summary           JSONB
);

CREATE INDEX IF NOT EXISTS outreach_job_runs_started_idx
  ON outreach_job_runs (started_at DESC);

-- Editor activity timestamps
ALTER TABLE outreach_editors
  ADD COLUMN IF NOT EXISTS last_seen_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS went_quiet_at  TIMESTAMPTZ;

-- Link articles back to the scan that surfaced them
ALTER TABLE outreach_articles
  ADD COLUMN IF NOT EXISTS competitor_brand_id  UUID REFERENCES outreach_competitor_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS monitor_keyword_id   UUID REFERENCES outreach_monitor_keywords(id) ON DELETE SET NULL;

-- Admin-only RLS
ALTER TABLE outreach_competitor_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_monitor_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_editor_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage outreach_competitor_brands"
  ON outreach_competitor_brands FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage outreach_monitor_keywords"
  ON outreach_monitor_keywords FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage outreach_editor_movements"
  ON outreach_editor_movements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage outreach_job_runs"
  ON outreach_job_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
