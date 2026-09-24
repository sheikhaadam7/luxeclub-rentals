"""
APPLY daily_rate updates to production Supabase.

Reads col O of the master sheet — the single source of truth for the site
daily rate. Col O implements the priority chain (per user rules 2026-09-20):
    1. LC-owned (col I winter / L summer) — highest priority
    2. MK × 1.10 (AJ path)
    3. VIP direct (AA / AD)
    4. LSD direct (BC) — last fallback for cars MK+VIP don't stock

Cached col O values are read first (Excel-computed). If cached is missing
(openpyxl saved sheet without Excel re-open), a Python recompute mirroring
push-vehicles-to-site.py:compute_daily_rate_from_master() handles the chain.

Safety features:
  - 50% sanity guard: skips updates where |new - current| / current > 0.50.
    --force bypasses.
  - Slug-mismatch audit: any sheet row with AS populated but no matching
    Supabase slug is reported. --apply refuses to proceed if any exist,
    unless --force.
  - JSON overrides: read from scripts/manual-price-overrides.json. An entry
    for a slug wins over anything the sheet says.

Usage:
  python scripts/apply-daily-rate-update.py                 # dry-run all
  python scripts/apply-daily-rate-update.py --slug=<slug>   # dry-run single
  python scripts/apply-daily-rate-update.py --apply         # PATCH all
  python scripts/apply-daily-rate-update.py --apply --force # bypass guard
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

import openpyxl

PROJECT           = Path(__file__).resolve().parent.parent
MASTER_SHEET      = Path(r"C:/Users/lenovo/Desktop/Luxeclub price master sheet/luxeclub master price sheet.xlsx")
OVERRIDES_FILE    = PROJECT / "scripts" / "manual-price-overrides.json"

APPLY   = "--apply" in sys.argv
FORCE   = "--force" in sys.argv
SLUG_FILTER = None
for a in sys.argv:
    if a.startswith("--slug="):
        SLUG_FILTER = a.split("=", 1)[1].strip()

SANITY_GUARD_RATIO = 0.50   # >50% delta triggers guard
COL_NAME             = 1
COL_MANUAL_F         = 6    # F  (Stage B Step 1: manual override — beats OCD tier)
COL_LC_OWNED_WINTER  = 9    # I
COL_LC_OWNED_SUMMER  = 12   # L
COL_DAILY_O          = 15   # O
COL_VIP_WINTER       = 27   # AA
COL_MK_WINTER_EDIT   = 36   # AJ
COL_SITE_SLUG        = 45   # AS
COL_LSD_DAILY        = 55   # BC
COL_OCD_DAILY        = 59   # BG (Stage B Step 1: OCD median daily, top tier when BH>=3)
COL_OCD_DAILY_N      = 60   # BH
DATA_START_ROW       = 5

# ── Supabase env ───────────────────────────────────────────────────────────

env = {}
for line in (PROJECT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z_]+)="?([^"]*)"?$', line.strip())
    if m: env[m.group(1)] = m.group(2)
SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS_PATCH = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
HEADERS_GET = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

# ── Overrides ──────────────────────────────────────────────────────────────

def load_overrides() -> dict[str, int]:
    if not OVERRIDES_FILE.exists():
        return {}
    data = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8"))
    return data.get("overrides", {}) or {}

# ── Col O recompute (mirrors push-vehicles-to-site.py) ─────────────────────

def _num(v):
    return isinstance(v, (int, float)) and v > 0


def recompute_col_o(ws, ws_data, row: int, season: str) -> float | None:
    """Compute col O in Python when Excel's cache is missing.
    Priority (Stage B Step 1, 2026-09-24):
      0. F manual override (if numeric)
      1. OCD × 1.10 when OCD n (BH) >= 3
      2. LC-owned  →  3. MK × markup  →  4. VIP  →  5. LSD
    """
    manual_f = ws.cell(row=row, column=COL_MANUAL_F).value
    ocd_daily = ws.cell(row=row, column=COL_OCD_DAILY).value
    ocd_n_raw = ws.cell(row=row, column=COL_OCD_DAILY_N).value
    lc_winter = (ws_data.cell(row=row, column=COL_LC_OWNED_WINTER).value
                 or ws.cell(row=row, column=COL_LC_OWNED_WINTER).value)
    lc_summer = ws_data.cell(row=row, column=COL_LC_OWNED_SUMMER).value
    aj = ws.cell(row=row, column=COL_MK_WINTER_EDIT).value
    aa = ws.cell(row=row, column=COL_VIP_WINTER).value
    bc = ws.cell(row=row, column=COL_LSD_DAILY).value

    # 0. F manual override — beats everything else (matches sheet formula)
    if _num(manual_f):
        return round(manual_f)

    # 1. OCD × 1.10 when sample is meaningful (Stage B Step 1)
    try:
        ocd_n = int(ocd_n_raw) if ocd_n_raw else 0
    except (TypeError, ValueError):
        ocd_n = 0
    if _num(ocd_daily) and ocd_n >= 3:
        return round(ocd_daily * 1.10)

    if season == "Summer":
        if _num(lc_summer): return round(lc_summer)
        if _num(lc_winter): return round(lc_winter * 0.65)
        if _num(aj):        return round(aj * 0.65 * 1.10)
        if _num(aa):        return round(aa * 0.65)
        if _num(bc):        return round(bc)
    else:
        if _num(lc_winter): return round(lc_winter)
        if _num(aj):        return round(aj * 0.65 * 1.35)
        if _num(aa):        return round(aa)
        if _num(bc):        return round(bc)
    return None


def read_col_o(ws, ws_data, row: int, season: str) -> tuple[float | None, str]:
    """Return (price, source_tag). Source tag helps diagnose 'no-price' outcomes."""
    cached = ws_data.cell(row=row, column=COL_DAILY_O).value
    if _num(cached):
        return round(cached), "cached-O"
    recomputed = recompute_col_o(ws, ws_data, row, season)
    if recomputed is not None:
        return recomputed, "recomputed"
    # No source at all
    return None, "no-price"

# ── Main ───────────────────────────────────────────────────────────────────

def main():
    if not MASTER_SHEET.exists():
        print(f"! Master sheet not found: {MASTER_SHEET}"); sys.exit(1)

    overrides = load_overrides()
    print(f"Loaded {len(overrides)} manual overrides from {OVERRIDES_FILE.name}")

    wb   = openpyxl.load_workbook(MASTER_SHEET, data_only=False)
    ws   = wb["Master"]
    wb_d = openpyxl.load_workbook(MASTER_SHEET, data_only=True)
    ws_d = wb_d["Master"]

    season_cell = ws["B1"].value
    season = str(season_cell).strip() if season_cell else "Summer"
    if season not in ("Summer", "Winter"): season = "Summer"
    print(f"Sheet season toggle: {season}")

    # Build slug -> {price, source, row, name} from the sheet
    sheet_by_slug: dict[str, dict] = {}
    no_price_rows = []
    for row in range(DATA_START_ROW, ws.max_row + 1):
        name = ws.cell(row=row, column=COL_NAME).value
        if not name: continue
        slug_cell = ws.cell(row=row, column=COL_SITE_SLUG).value
        if not slug_cell: continue  # benchmark row, not on site
        slug = str(slug_cell).strip()
        price, tag = read_col_o(ws, ws_d, row, season)
        if price is None:
            no_price_rows.append((row, slug, str(name)))
            continue
        sheet_by_slug[slug] = {"price": int(price), "source": tag, "row": row, "name": str(name)}

    # Fetch Supabase vehicles
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/vehicles?select=slug,name,daily_rate&is_active=eq.true",
        headers=HEADERS_GET,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        supa_vehicles = json.loads(resp.read().decode("utf-8"))
    supa_by_slug = {v["slug"]: v for v in supa_vehicles}

    # Slug-mismatch audit: sheet has slug, Supabase doesn't
    mismatches = []
    for slug, info in sheet_by_slug.items():
        if slug not in supa_by_slug:
            mismatches.append((info["row"], slug, info["name"]))

    # Build change list
    changes = []          # (slug, name, current, new, source, guarded)
    unchanged_count = 0
    override_slugs = set(overrides.keys())

    for slug, supa in supa_by_slug.items():
        if SLUG_FILTER and slug != SLUG_FILTER:
            continue

        current = supa["daily_rate"]
        name = supa["name"]

        # Overrides win over sheet
        if slug in override_slugs:
            new = int(overrides[slug])
            source = "OVERRIDE"
        else:
            info = sheet_by_slug.get(slug)
            if info is None:
                # Supabase has the car but sheet doesn't (or AS blank) — skip.
                continue
            new = info["price"]
            source = info["source"]

        if current is not None and int(round(float(current))) == int(new):
            unchanged_count += 1
            continue

        guarded = False
        if current and current > 0:
            ratio = abs(new - current) / current
            if ratio > SANITY_GUARD_RATIO:
                guarded = True
        changes.append((slug, name, current, new, source, guarded))

    # ── Report ────────────────────────────────────────────────────────────
    print()
    print(f"=== SUMMARY ===")
    print(f"Sheet rows on site (AS populated):           {len(sheet_by_slug)}")
    print(f"Rows with no price source (no-price):        {len(no_price_rows)}")
    print(f"Supabase active vehicles:                    {len(supa_by_slug)}")
    print(f"Slug mismatches (AS in sheet, not on site):  {len(mismatches)}")
    print(f"Unchanged (already synced):                  {unchanged_count}")
    print(f"Changes queued (safe):                       {sum(1 for c in changes if not c[5])}")
    print(f"Changes SANITY-GUARDED (skipped unless --force): {sum(1 for c in changes if c[5])}")

    if no_price_rows:
        print()
        print(f"=== NO-PRICE ROWS ({len(no_price_rows)}) ===")
        print(f"  Row  Slug                                       Name")
        for r, slug, name in no_price_rows[:20]:
            print(f"  {r:>3}  {slug:<42} {name[:40]}")
        if len(no_price_rows) > 20:
            print(f"  ... ({len(no_price_rows)-20} more)")

    if mismatches:
        print()
        print(f"=== SLUG MISMATCHES ({len(mismatches)}) — sheet AS not found in Supabase ===")
        print(f"  Row  AS in sheet                                Name")
        for r, slug, name in mismatches[:20]:
            print(f"  {r:>3}  {slug:<42} {name[:40]}")
        if len(mismatches) > 20:
            print(f"  ... ({len(mismatches)-20} more)")

    safe_changes = [c for c in changes if not c[5]]
    guarded_changes = [c for c in changes if c[5]]

    if safe_changes:
        print()
        print(f"=== {len(safe_changes)} SAFE UPDATES ===")
        print(f"  {'Source':<10} {'Slug':<38} {'Current':>9} {'New':>9} {'Delta':>7}")
        for slug, name, current, new, source, _ in sorted(safe_changes, key=lambda c: c[0]):
            cur = int(current) if current is not None else 0
            delta = f"{(new - cur) / cur * 100:+.0f}%" if cur else "n/a"
            print(f"  {source:<10} {slug:<38} {cur:>9} {new:>9} {delta:>7}")

    if guarded_changes:
        print()
        print(f"=== {len(guarded_changes)} SANITY-GUARDED UPDATES (>{int(SANITY_GUARD_RATIO*100)}% delta — skipped unless --force) ===")
        print(f"  {'Source':<10} {'Slug':<38} {'Current':>9} {'New':>9} {'Delta':>7}")
        for slug, name, current, new, source, _ in sorted(guarded_changes, key=lambda c: c[0]):
            cur = int(current) if current is not None else 0
            delta = f"{(new - cur) / cur * 100:+.0f}%" if cur else "n/a"
            print(f"  {source:<10} {slug:<38} {cur:>9} {new:>9} {delta:>7}")

    if not APPLY:
        print()
        print("=== DRY-RUN. Re-run with --apply to PATCH Supabase. ===")
        return

    # ── Apply ─────────────────────────────────────────────────────────────
    if mismatches and not FORCE:
        print()
        print(f"! ABORT: {len(mismatches)} slug mismatch(es) found. Fix the sheet's AS")
        print(f"  column to match Supabase slugs, or re-run with --force to ignore.")
        sys.exit(2)

    apply_list = changes if FORCE else safe_changes
    skipped_guarded = 0 if FORCE else sum(1 for c in changes if c[5])

    print()
    print(f"=== APPLYING {len(apply_list)} updates to Supabase ({skipped_guarded} guarded skipped) ===")
    ok = 0
    fail = 0
    for slug, name, current, new, source, _ in apply_list:
        body = json.dumps({"daily_rate": new}).encode("utf-8")
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/vehicles?slug=eq.{slug}",
            data=body, headers=HEADERS_PATCH, method="PATCH")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and data[0].get("daily_rate") == new:
                    print(f"  OK   {slug:<38} {current} -> {new}  ({source})")
                    ok += 1
                else:
                    print(f"  WARN {slug:<38} unexpected response")
                    fail += 1
        except Exception as e:
            print(f"  FAIL {slug:<38} {e}")
            fail += 1

    print()
    print(f"Done. {ok} succeeded, {fail} failed.")

    # Regenerate the WhatsApp customer-response playbook — it reads live
    # Supabase, so any daily_rate change here means the playbook is stale.
    # Non-critical: log a warning on failure but don't fail the run.
    if ok > 0:
        import subprocess
        playbook_gen = Path(
            r"C:/Users/lenovo/Desktop/Luxeclub price master sheet/scripts/generate-whatsapp-playbook.py"
        )
        try:
            r = subprocess.run(
                [sys.executable, "-X", "utf8", str(playbook_gen)],
                capture_output=True, text=True, timeout=60,
                encoding="utf-8", errors="replace",
            )
            if r.returncode == 0:
                print("WhatsApp playbook refreshed.")
            else:
                print(f"! Playbook refresh failed (exit={r.returncode}): "
                      f"{(r.stderr or r.stdout).strip()[:200]}")
        except Exception as e:
            print(f"! Playbook refresh crashed: {e}")


if __name__ == "__main__":
    main()
