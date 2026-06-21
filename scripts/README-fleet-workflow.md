# Fleet master spreadsheet — workflow

`data/fleet.xlsx` is the source of truth for every car on the site.
Edit a cell → save → the change is on the site within ~2 seconds.

## One-time setup

```
pip install openpyxl
python scripts/export-fleet.py   # creates data/fleet.xlsx
```

Then in a separate terminal, start the watcher and leave it running:

```
python scripts/watch-fleet.py
```

The watcher auto-imports every time you save the xlsx in Excel.

## Day-to-day editing

1. Open `data/fleet.xlsx` in Excel.
2. Edit cells (prices, brand, year, categories, descriptions, …).
3. `Ctrl + S`.
4. Refresh your local `/catalogue` page. The change is there.

Row colour tells you the state at a glance:

| Colour | Status | Meaning |
|---|---|---|
| (none) | Live | On the public site, bookable. |
| Yellow | Awaiting photos | Added to the DB but no hero image yet — hidden from the public site. |
| Light orange | Sold out | Visible on the site with the "temporarily unavailable" message. |
| Grey | Retired | Hidden from the public site. Booking history preserved. |

The `status` column is read-only; you change it by editing `bookable?` / `retire?` or by uploading photos.

## Adding a new car

Minimum: type `name` and `daily_rate`. Save.

The script will:
- Auto-generate a slug from the name (`Lamborghini Aventador SVJ` → `lamborghini-aventador-svj`).
- Insert the row into the database.
- Create `data/images-to-upload/{YYYY-MM-DD}_{slug}/` with a README inside.
- **Auto-hide the car** until the first photo is uploaded — it's in the DB but not on the public site yet.

Then drop your photos into that folder:
- The hero photo must be named `primary.{jpg|png|webp}`.
- Other photos become the gallery in alphabetical order.

Run the upload:

```
python scripts/upload-fleet-images.py --apply
```

The script uploads to Supabase Storage and **auto-publishes the car** the moment the first hero photo lands. No extra step.

## Retiring a car

Mark `X` in the `retire?` cell. Save. The car disappears from the public site within seconds. Booking history is preserved (soft delete via `is_active=false`).

To un-retire, clear the `X` and save.

## Auto-fill descriptions with Claude

After adding new cars, run:

```
python scripts/enhance-fleet.py --apply
```

This finds every car with a blank `description` and asks Claude for a 2–3 sentence rental write-up. Anything that fails the memory-rule guard (no `24/7`, no hard-driving language, no unlimited-mileage claims) is routed to `data/descriptions-for-review.txt` for manual review instead of being written.

Requires `ANTHROPIC_API_KEY` in `.env.local`.

## Seasonal pricing

`winter_daily_rate`, `summer_daily_rate`, `winter_weekly_rate`, `summer_weekly_rate` are stored on the row but **not yet wired into the booking flow** — the booking page still uses `daily_rate`. Follow-up work will pick the right rate based on travel date.

## Mileage

The site-wide allowance is fixed at 250 km/day, 1,500 km/week, 4,500 km/month. Per-car overage charge is `overage_rate_per_km` (AED per km over the allowance). Set it where it should differ per car.

## Personal notes / extra columns

You can add any extra columns to the spreadsheet for your own use. The import script reads columns by header name and ignores anything it doesn't recognise. Keep the canonical headers spelled the same as the export wrote them; everything else is yours.

## Don't run the scraper

The legacy scraper at `scripts/scraper/scrape-vehicles.ts` writes to the same vehicles table. Running it overwrites your spreadsheet edits. Don't run `npm run scrape` while you're using the spreadsheet workflow.

## Files in `data/` (all gitignored)

| File | Purpose |
|---|---|
| `fleet.xlsx` | The master spreadsheet you edit. |
| `fleet-backup-*.csv` | Snapshot of the DB before every `import --apply`. |
| `images-to-upload/{date}_{slug}/` | Drop zone for new car photos. |
| `images-backup-*.csv` | Previous image URLs from before every `upload --apply`. |
| `descriptions-backup-*.csv` | Previous descriptions from before every `enhance --apply`. |
| `descriptions-for-review.txt` | Flagged Claude output that didn't pass the guardrail. |
| `last-assigned-slugs.txt` | The auto-derived slugs from the last import run. |

## Troubleshooting

**"slug ... not in vehicles" when uploading images.**
The folder name doesn't match a row in the DB. Did you typo the slug? Add the row to the spreadsheet first, save, then drop photos.

**"required columns missing from header" on import.**
You renamed or deleted a canonical column. Re-export with `python scripts/export-fleet.py` to restore the header (your data is preserved in the DB).

**"BULK RETIRE WARNING".**
The script refuses to retire >30% of the fleet in one go without `--force`. This catches "I marked X on every row by accident". Add `--force` if it's intentional.

**The watcher's not picking up my save.**
Check the watcher terminal output. If it prints "mtime changed but content identical", you saved without making a change — that's the content-hash guard. Make an actual edit and save again.
