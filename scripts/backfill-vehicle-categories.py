"""
One-shot backfill for vehicles.categories (TEXT[]).

Seeds the new array column without regressing the existing catalogue filter.
For each car the target array contains exactly one canonical label produced by
the legacy name-inference regex from components/catalogue/VehicleGrid.tsx and
app/(public)/[slug]/page.tsx — ported faithfully so every car keeps the
category it shows under today.

(Originally this script also unioned the legacy singular `category` TEXT field
into the array, but the UI never actually read that field — it has been
ignored by extractCarType — and the values stored there are noisy scraper
artefacts that produce wrong results when merged in. Dropped.)

Dry-run prints the per-car diff; --apply PATCHes the rows.

    python scripts/backfill-vehicle-categories.py             # dry-run
    python scripts/backfill-vehicle-categories.py --apply     # write

Stdlib only — same urllib/.env.local pattern as update-bentayga-prices.py.
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

PROJECT = Path("C:/Users/lenovo/projects/luxeclub-rentals")
APPLY = "--apply" in sys.argv

# ---------- env ----------

env = {}
for line in (PROJECT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z_]+)="?([^"]*)"?$', line.strip())
    if m:
        env[m.group(1)] = m.group(2)
SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

# ---------- legacy name inference (ported from VehicleGrid.tsx:75-107) ----------

SUV_KEYWORDS = [
    "range rover", "vogue", "cayenne", "bentayga", "cullinan",
    "escalade", "dbx", "rsq8", "sq7", "sq8", "g63", "gle",
    "gls", "x5", "x7", "urus", "levante", "macan", "trackhawk",
    "purosangue", "x6",
]
CONVERTIBLE_KEYWORDS = [
    "spyder", "spider", "dawn", "gtc", "cabriolet", "cabrio",
    "roadster", "convertible", "carrera s spyder", "portofino",
]

def infer_from_name(name: str) -> str:
    lower = name.lower()
    if any(kw in lower for kw in CONVERTIBLE_KEYWORDS):
        return "Convertible"
    if any(kw in lower for kw in SUV_KEYWORDS):
        return "SUV"
    return "Sports"

# ---------- fetch ----------

url = f"{SUPABASE_URL}/rest/v1/vehicles?select=slug,name,categories&order=name"
req = urllib.request.Request(url, headers={
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
})
with urllib.request.urlopen(req, timeout=30) as resp:
    vehicles = json.loads(resp.read().decode("utf-8"))

if not vehicles:
    print("No vehicles in DB. Nothing to backfill.")
    sys.exit(1)

# ---------- compute target arrays ----------

CANONICAL_ORDER = ["Sports", "SUV", "Convertible", "Sedan", "Coupe", "Family"]

def order_dedupe(items: list[str]) -> list[str]:
    seen: dict[str, None] = {}
    for it in items:
        if it not in seen:
            seen[it] = None
    return [c for c in CANONICAL_ORDER if c in seen]

changes = []
unchanged = 0
for v in vehicles:
    target = order_dedupe([infer_from_name(v["name"])])
    current = list(v.get("categories") or [])
    if sorted(target) != sorted(current):
        changes.append((v["slug"], v["name"], current, target))
    else:
        unchanged += 1

# ---------- print table ----------

print(f"\n{'Slug':<35} {'Name':<40} {'Current':<22} {'Target':<22}")
print("-" * 121)
for slug, name, current, target in changes:
    cur_str = ",".join(current) if current else "—"
    tgt_str = ",".join(target)
    print(f"{slug:<35} {name[:40]:<40} {cur_str:<22} {tgt_str:<22}")
print("-" * 121)
print(f"{len(changes)} car(s) will change. {unchanged} already correct.")

if not APPLY:
    print("\nDRY-RUN. Re-run with --apply to write.")
    sys.exit(0)

# ---------- apply ----------

print(f"\n=== APPLYING {len(changes)} updates ===")
headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
ok = fail = 0
for slug, name, _current, target in changes:
    body = json.dumps({"categories": target}).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/vehicles?slug=eq.{slug}",
        data=body, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and sorted(data[0].get("categories") or []) == sorted(target):
                print(f"  OK   {slug:<35} -> {target}")
                ok += 1
            else:
                print(f"  WARN {slug:<35} response: {data}")
                fail += 1
    except Exception as e:
        print(f"  FAIL {slug:<35} {e}")
        fail += 1
print(f"\nDone. {ok} succeeded, {fail} failed.")
