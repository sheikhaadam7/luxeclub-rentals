-- Outreach domain metrics: Ahrefs DR + traffic, and a numeric priority_score
-- that replaces the vague P1/P2/P3 tier used in scoring.
--
-- DR and monthly_traffic are display-only and fetched from Ahrefs.
-- priority_score (0-100) is an editorial rubric: section fit + geographic fit
-- + reachability. It feeds the editor profile scorer (priority_score / 10).

ALTER TABLE outreach_domains
  ADD COLUMN IF NOT EXISTS dr                  INT,
  ADD COLUMN IF NOT EXISTS monthly_traffic     BIGINT,
  ADD COLUMN IF NOT EXISTS priority_score      INT,
  ADD COLUMN IF NOT EXISTS metrics_fetched_at  TIMESTAMPTZ;

-- Seed priority_score with a rubric-derived value per outlet.
-- Rubric: section fit (up to 40) + geographic fit (up to 25) + reachability (up to 35).
UPDATE outreach_domains SET priority_score = CASE domain
  -- UAE (local audience = best fit for Dubai luxury car rental)
  WHEN 'esquireme.com'          THEN 90  -- dedicated Motors section, UAE
  WHEN 'whatson.ae'             THEN 85
  WHEN 'gulfnews.com'           THEN 82
  WHEN 'timeoutdubai.com'       THEN 85
  WHEN 'thenationalnews.com'    THEN 85
  WHEN 'khaleejtimes.com'       THEN 88  -- Wheels section, major UAE daily
  WHEN 'arabianbusiness.com'    THEN 65
  WHEN 'harpersbazaararabia.com' THEN 72
  WHEN 'mojeh.com'              THEN 68
  WHEN 'blvd.ae'                THEN 55
  -- Expat audiences in UAE (high conversion, niche reach)
  WHEN 'russianemirates.com'    THEN 80
  WHEN 'frenchmorning.com'      THEN 78
  -- UK (inbound tourist source market)
  WHEN 'cntraveller.com'        THEN 75
  WHEN 'telegraph.co.uk'        THEN 60  -- huge but cold-pitch-resistant
  WHEN 'robbreport.co.uk'       THEN 82
  WHEN 'tatler.com'             THEN 65
  WHEN 'harpersbazaar.com'      THEN 60
  WHEN 'monocle.com'            THEN 55
  WHEN 'squaremile.com'         THEN 75  -- highly targeted luxury men's
  -- Germany
  WHEN 'cntraveller.de'         THEN 70
  WHEN 'faz.net'                THEN 55
  WHEN 'spiegel.de'             THEN 50
  WHEN 'robbreport.de'          THEN 80
  WHEN 'welt.de'                THEN 55
  -- Russia
  WHEN 'kommersant.ru'          THEN 60
  WHEN 'forbes.ru'              THEN 62
  WHEN 'style.rbc.ru'           THEN 68
  WHEN 'robbreport.ru'          THEN 78
  WHEN 'posta-magazine.ru'      THEN 55
  -- Europe
  WHEN 'lefigaro.fr'            THEN 55
  -- Global (mostly aspirational / long-term)
  WHEN 'bloomberg.com'          THEN 40
  WHEN 'ft.com'                 THEN 40
  WHEN 'robbreport.com'         THEN 85
  WHEN 'billionaire.com'        THEN 75
  WHEN 'spearswms.com'          THEN 72
  ELSE 50  -- sensible default for any unlisted rows
END
WHERE priority_score IS NULL;

-- Any outlet not covered above (future seeds) still gets a default
UPDATE outreach_domains SET priority_score = 50 WHERE priority_score IS NULL;

ALTER TABLE outreach_domains
  ALTER COLUMN priority_score SET DEFAULT 50,
  ALTER COLUMN priority_score SET NOT NULL;

CREATE INDEX IF NOT EXISTS outreach_domains_priority_score_idx
  ON outreach_domains (priority_score DESC);
