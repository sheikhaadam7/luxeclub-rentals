-- LinkedIn title enrichment for outreach editors.
-- Pulled via ScrapingBee from linkedin_url (public profile headline/og:title).
-- Used by the scorer to cross-check / fall back when Hunter's position is
-- null, stale, or underspecified.

ALTER TABLE outreach_editors
  ADD COLUMN IF NOT EXISTS linkedin_title        TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_scraped_at   TIMESTAMPTZ;
