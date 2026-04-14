-- Preserve Hunter-returned editors that fail the editorial-signal gate.
-- Previously they were silently dropped; now they're kept with skipped=true
-- and a short reason so users can audit decisions or promote false negatives.

ALTER TABLE outreach_editors
  ADD COLUMN IF NOT EXISTS skipped      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skip_reason  TEXT;

CREATE INDEX IF NOT EXISTS outreach_editors_skipped_idx
  ON outreach_editors (skipped);
