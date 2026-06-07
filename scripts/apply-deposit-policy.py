"""
Apply the new per-vehicle security-deposit policy to Supabase.

Policy (2026-06-07):
- Top tier (5 named cars): AED 5,000
- All McLaren cars:        AED 4,500
- All other Lamborghini:   AED 4,500 — EXCEPT the Urus (any colour): AED 2,500
- All other Ferrari:       AED 4,500 — EXCEPT the Portofino:         AED 2,500
- Every other vehicle:                                                AED 2,500

Run:
  python scripts/apply-deposit-policy.py            # dry-run summary
  python scripts/apply-deposit-policy.py --apply    # PATCH the DB
"""
import os, re, sys, json, urllib.request
from pathlib import Path

PROJECT = Path("C:/Users/lenovo/projects/luxeclub-rentals")
APPLY   = "--apply" in sys.argv

# User-picked top tier (5 highest-value cars, AED 5,000 deposit).
# McLaren 765LT was here but moved to the McLaren tier (4,500) per user request.
TOP_TIER_SLUGS = {
    "lamborghini-revuelto",
    "ferrari-purosangue",
    "ferrari-sf90-stradale",
    "porsche-911-gt3-rs",
    "rolls-royce-culli-mansory",
}
TOP_TIER_DEPOSIT = 5000

env = {}
for line in (PROJECT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z_]+)="?([^"]*)"?$', line.strip())
    if m: env[m.group(1)] = m.group(2)
SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


# GET vehicles
req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/vehicles?select=slug,name,daily_rate,deposit_amount&order=daily_rate.desc.nullslast",
    headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
with urllib.request.urlopen(req, timeout=30) as resp:
    vehicles = json.loads(resp.read().decode("utf-8"))


def target_deposit(slug: str) -> int:
    """Compute the policy deposit for a vehicle by slug."""
    if slug in TOP_TIER_SLUGS:          return TOP_TIER_DEPOSIT
    s = slug.lower()
    if s.startswith("mclaren-"):        return 4500
    is_lambo    = s.startswith("lamborghini-")
    is_ferrari  = s.startswith("ferrari-")
    is_urus     = "urus" in s
    is_portofino = "portofino" in s
    if is_lambo and not is_urus:        return 4500
    if is_ferrari and not is_portofino: return 4500
    return 2500


# Sanity: every top-tier slug must actually exist in the fleet
known_slugs = {v["slug"] for v in vehicles}
missing = TOP_TIER_SLUGS - known_slugs
if missing:
    print(f"ERROR: these top-tier slugs are not in the DB: {missing}", file=sys.stderr)
    sys.exit(1)

print(f"Top tier (deposit = AED {TOP_TIER_DEPOSIT}):")
for slug in sorted(TOP_TIER_SLUGS):
    v = next(x for x in vehicles if x["slug"] == slug)
    print(f"  {slug:<36} {v['name']:<38} daily={int(v['daily_rate']):>6}")
print()

# Build change list
changes = []  # (slug, name, current, new)
for v in vehicles:
    cur = int(v["deposit_amount"]) if v["deposit_amount"] is not None else None
    new = target_deposit(v["slug"])
    if cur == new:
        continue
    changes.append((v["slug"], v["name"], cur, new))

# Print plan
print(f"\n{'Slug':<36} {'Name':<38} {'Current':>8} {'New':>5} {'Delta':>7}")
print("-" * 100)
for slug, name, cur, new in changes:
    delta = f"{new - (cur or 0):+}"
    cur_s = str(cur) if cur is not None else "null"
    print(f"{slug:<36} {name:<38} {cur_s:>8} {new:>5} {delta:>7}")
print("-" * 100)
print(f"Total vehicles to update: {len(changes)} (of {len(vehicles)} in fleet)")

if not APPLY:
    print("\nDRY-RUN. Re-run with --apply to write to Supabase.")
    sys.exit(0)

# APPLY
print(f"\n=== APPLYING {len(changes)} deposit updates to production Supabase ===")
ok = fail = 0
for slug, name, cur, new in changes:
    body = json.dumps({"deposit_amount": new}).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/vehicles?slug=eq.{slug}",
        data=body, headers=HEADERS, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and len(data) > 0 and int(data[0].get("deposit_amount")) == new:
                print(f"  OK   {slug:<38} {cur} -> {new}")
                ok += 1
            else:
                print(f"  WARN {slug:<38} response: {data}")
                fail += 1
    except Exception as e:
        print(f"  FAIL {slug:<38} {e}")
        fail += 1
print(f"\nDone. {ok} succeeded, {fail} failed.")
