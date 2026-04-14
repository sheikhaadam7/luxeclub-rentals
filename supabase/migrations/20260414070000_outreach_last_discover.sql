-- Persistent record of each domain's last Discover run so the UI can always
-- show inserted / skipped / enriched counts, not just immediately after click.

ALTER TABLE outreach_domains
  ADD COLUMN IF NOT EXISTS last_discover_result JSONB;
