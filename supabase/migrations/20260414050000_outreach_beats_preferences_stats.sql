-- Beats classification + pitch preferences enrichment.
-- beats is a controlled-vocabulary text[] (see lib/outreach/beats.ts for the
-- full list); beat_summary is a one-line human summary. pitch_preferences
-- stores scraped signals about how the editor likes to be approached.
-- Scoring columns (relevance_score, topical_score, combined_score) are
-- intentionally left unchanged — beats are additive descriptive signal.

ALTER TABLE outreach_editors
  ADD COLUMN IF NOT EXISTS beats                 TEXT[],
  ADD COLUMN IF NOT EXISTS beat_summary          TEXT,
  ADD COLUMN IF NOT EXISTS beats_classified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pitch_preferences     JSONB,
  ADD COLUMN IF NOT EXISTS preferences_scraped_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS outreach_editors_beats_idx
  ON outreach_editors USING GIN (beats);
