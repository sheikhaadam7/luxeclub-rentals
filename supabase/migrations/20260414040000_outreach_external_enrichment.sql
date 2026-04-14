-- External enrichment sources beyond the outlet's author page.
-- external_bio_* captures Muckrack / Contently / Journoportfolio / About.me
-- / personal-website bios. twitter_bio captures the X profile description.
-- All fields are fed into the scorer's enrichment text so title + topical
-- matches can hit even when Hunter and the outlet bio are thin.

ALTER TABLE outreach_editors
  ADD COLUMN IF NOT EXISTS external_bio_text      TEXT,
  ADD COLUMN IF NOT EXISTS external_bio_url       TEXT,
  ADD COLUMN IF NOT EXISTS external_bio_source    TEXT,
  ADD COLUMN IF NOT EXISTS twitter_bio            TEXT,
  ADD COLUMN IF NOT EXISTS external_fetched_at    TIMESTAMPTZ;
