"""
Auto-fill blank `description` fields on vehicles using the Claude API.

Finds every car where description is NULL or empty and asks Claude for a tight
2-3 sentence rental description. Validates each generated description against
the LuxeClub memory rules (no 24/7, no hard-driving language, no unlimited-
mileage claims, no exclamation marks). Anything that fails the guard goes to
`data/descriptions-for-review.txt` instead of the DB — never silently writes
non-compliant copy.

    python scripts/enhance-fleet.py                  # dry-run
    python scripts/enhance-fleet.py --apply          # write to DB
    python scripts/enhance-fleet.py --slug audi-rsq8 --apply

Requires ANTHROPIC_API_KEY in .env.local. Stdlib only.
"""

import csv
import json
import re
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

# Force UTF-8 console output on Windows so checkmarks/arrows render cleanly.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

PROJECT = Path("C:/Users/lenovo/projects/luxeclub-rentals")
APPLY = "--apply" in sys.argv
SLUG_FILTER: str | None = None
if "--slug" in sys.argv:
    i = sys.argv.index("--slug")
    if i + 1 >= len(sys.argv):
        print("FATAL: --slug given without a value.")
        sys.exit(2)
    SLUG_FILTER = sys.argv[i + 1].strip().lower()

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 300

# Memory-rule guard. Case-insensitive match on the generated description text.
FORBIDDEN_PATTERNS = [
    r"\b24/?7\b",
    r"\baround the clock\b",
    r"\banytime day or night\b",
    r"\bunlimited mileage\b",
    r"\bunlimited mileage upgrade\b",
    r"\bcase by case\b",
    r"\bdrive hard\b",
    r"\bdriving hard\b",
    r"\bflat out\b",
    r"\battack\b",
    r"!",
]
FORBIDDEN_RE = re.compile("|".join(FORBIDDEN_PATTERNS), re.IGNORECASE)

# ---------- env ----------

env = {}
for line in (PROJECT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z_]+)="?([^"]*)"?$', line.strip())
    if m:
        env[m.group(1)] = m.group(2)
SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
ANTHROPIC_KEY = env.get("ANTHROPIC_API_KEY")
if not ANTHROPIC_KEY:
    print("FATAL: add ANTHROPIC_API_KEY to .env.local to use this script.")
    sys.exit(2)

REST_SUPABASE = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
}

REST_ANTHROPIC = {
    "x-api-key": ANTHROPIC_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
}

# ---------- fetch candidates ----------

select = "slug,name,brand,year,description,categories"
filt = "or=(description.is.null,description.eq.)"
url = f"{SUPABASE_URL}/rest/v1/vehicles?select={select}&{filt}&order=name"
req = urllib.request.Request(url, headers=REST_SUPABASE)
with urllib.request.urlopen(req, timeout=30) as resp:
    candidates = json.loads(resp.read().decode("utf-8"))

if SLUG_FILTER:
    candidates = [c for c in candidates if c["slug"] == SLUG_FILTER]

if not candidates:
    print("No cars with blank descriptions. Nothing to do.")
    sys.exit(0)

print(f"Will generate descriptions for {len(candidates)} car(s).")

# ---------- prompt + call ----------

def build_prompt(v: dict) -> str:
    parts = [v["name"]]
    if v.get("year"):
        parts.append(f"({v['year']})")
    name_year = " ".join(parts)
    categories = ", ".join(v.get("categories") or []) or "luxury"
    return (
        f"Write a 2–3 sentence rental description for the {name_year} "
        f"available from LuxeClub Rentals Dubai. "
        f"It sits in the {categories} category on our fleet. "
        f"Focus on what makes it appealing as a luxury rental in Dubai — "
        f"design, comfort, character. "
        f"\n\nHard rules: "
        f"No exclamation marks. No emojis. "
        f"Do not write '24/7' or 'around the clock' (we aren't 24/7). "
        f"Do not suggest unlimited mileage or unlimited-mileage upgrades. "
        f"Do not say 'case by case'. "
        f"Do not suggest hard, aggressive, or flat-out driving. "
        f"Plain editorial voice, in the third person. "
        f"\n\nReturn only the description text — no preface, no quotation marks."
    )

def call_claude(prompt: str) -> str:
    body = json.dumps({
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body, method="POST", headers=REST_ANTHROPIC,
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result["content"][0]["text"].strip().strip('"').strip("'")

# ---------- generate ----------

class Generated:
    __slots__ = ("slug", "name", "text", "violations")
    def __init__(self, slug, name, text, violations):
        self.slug = slug
        self.name = name
        self.text = text
        self.violations = violations

results: list[Generated] = []
for v in candidates:
    prompt = build_prompt(v)
    try:
        text = call_claude(prompt)
    except Exception as e:
        print(f"  FAIL Claude call for {v['slug']}: {e}")
        continue
    violations = sorted(set(m.group(0) for m in FORBIDDEN_RE.finditer(text)))
    results.append(Generated(v["slug"], v["name"], text, violations))
    flag = " ⚠️" if violations else ""
    print(f"  ✓ {v['slug']:<35} ({len(text)} chars){flag}")

clean = [r for r in results if not r.violations]
dirty = [r for r in results if r.violations]

# ---------- show preview ----------

print(f"\n{len(clean)} clean, {len(dirty)} flagged for review.")
print()
for r in clean[:5]:  # first 5 as preview
    print(f"--- {r.slug} ---")
    print(r.text)
    print()
if dirty:
    print(f"Flagged (violations in parens):")
    for r in dirty[:5]:
        print(f"  {r.slug}: {r.violations}")
        print(f"    {r.text[:120]}...")

# ---------- dry-run / apply ----------

if not APPLY:
    print("\nDRY-RUN. Re-run with --apply to write the clean descriptions.")
    sys.exit(0)

# Snapshot
ts = datetime.now().strftime("%Y-%m-%d-%H%M")
backup_path = PROJECT / "data" / f"descriptions-backup-{ts}.csv"
backup_path.parent.mkdir(parents=True, exist_ok=True)
with backup_path.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["slug", "name", "previous_description"])
    for r in results:
        w.writerow([r.slug, r.name, ""])  # all candidates had blank descriptions
print(f"Snapshot written to {backup_path}")

# Route flagged
if dirty:
    review_path = PROJECT / "data" / "descriptions-for-review.txt"
    with review_path.open("a", encoding="utf-8") as f:
        f.write(f"# Flagged at {datetime.now().isoformat()}\n")
        for r in dirty:
            f.write(f"\n## {r.slug} — {r.name}\n")
            f.write(f"Violations: {', '.join(r.violations)}\n")
            f.write(r.text + "\n")
    print(f"\nFlagged descriptions appended to {review_path} (not written to DB).")

# Write clean
print(f"\n=== APPLYING {len(clean)} description(s) ===")
ok = fail = 0
for r in clean:
    body = json.dumps({"description": r.text}).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/vehicles?slug=eq.{r.slug}",
        data=body, method="PATCH", headers={
            **REST_SUPABASE,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and data[0].get("description") == r.text:
                print(f"  OK   {r.slug}")
                ok += 1
            else:
                print(f"  WARN {r.slug}: response mismatch")
                fail += 1
    except Exception as e:
        print(f"  FAIL {r.slug}: {e}")
        fail += 1

print(f"\nDone. {ok} succeeded, {fail} failed.")
