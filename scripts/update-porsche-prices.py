"""
One-off: set specific daily_rate values for 5 Porsche models on the site.
Dry-run shows before/after; --apply writes to Supabase.
"""

import json, os, re, sys, urllib.request
from pathlib import Path

PROJECT = Path("C:/Users/lenovo/projects/luxeclub-rentals")
APPLY   = "--apply" in sys.argv

OVERRIDES = {
    "porsche-911-gt3":               2199,
    "porsche-911-gt3-rs":            3299,
    "porsche-macan":                  599,
    "911-carerra-s-spyder":          1450,
    "porsche-911-turbo-s":           1999,
}

env = {}
for line in (PROJECT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z_]+)="?([^"]*)"?$', line.strip())
    if m: env[m.group(1)] = m.group(2)
SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"]

# GET current prices first to confirm slugs exist + show before/after
slugs_filter = ",".join(f'"{s}"' for s in OVERRIDES)
url = f"{SUPABASE_URL}/rest/v1/vehicles?select=slug,name,daily_rate&slug=in.({slugs_filter})"
req = urllib.request.Request(url, headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
with urllib.request.urlopen(req, timeout=30) as resp:
    vehicles = {v["slug"]: v for v in json.loads(resp.read().decode("utf-8"))}

print(f"\n{'Slug':<35} {'Name':<35} {'Current':>9} {'New':>9}")
print("-" * 92)
for slug, new in OVERRIDES.items():
    v = vehicles.get(slug)
    if not v:
        print(f"{slug:<35} {'NOT FOUND':<35} {'-':>9} {new:>9}")
        continue
    cur = int(float(v["daily_rate"])) if v["daily_rate"] is not None else 0
    print(f"{slug:<35} {v['name'][:35]:<35} {cur:>9} {new:>9}")
print("-" * 92)

if not APPLY:
    print(f"\nDRY-RUN. Re-run with --apply.")
    sys.exit(0)

print(f"\n=== APPLYING {len(OVERRIDES)} updates ===")
headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
ok = fail = 0
for slug, new in OVERRIDES.items():
    if slug not in vehicles:
        print(f"  SKIP {slug:<35} (not in Supabase)")
        fail += 1
        continue
    body = json.dumps({"daily_rate": new}).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/vehicles?slug=eq.{slug}",
        data=body, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and data[0].get("daily_rate") == new:
                print(f"  OK   {slug:<35} -> {new}")
                ok += 1
            else:
                print(f"  WARN {slug:<35} response: {data}")
                fail += 1
    except Exception as e:
        print(f"  FAIL {slug:<35} {e}")
        fail += 1
print(f"\nDone. {ok} succeeded, {fail} failed.")
