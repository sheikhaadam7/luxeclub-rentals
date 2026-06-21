"""
Upload car photos to Supabase Storage and wire them into the vehicle row.

The user drops photos into `data/images-to-upload/{slug}/` (folder name = slug)
OR `data/images-to-upload/{YYYY-MM-DD}_{slug}/` (auto-created by the import
script on INSERT — date prefix is stripped). One file's name must start with
`primary` — that becomes the hero image. Other image files become the gallery
in alphabetical order.

    python scripts/upload-fleet-images.py                # dry-run
    python scripts/upload-fleet-images.py --apply        # write to Storage + DB
    python scripts/upload-fleet-images.py --slug audi-rsq8 --apply
    python scripts/upload-fleet-images.py --folder ~/Pictures/uploads --apply

What the script does for each folder:
- Strips the YYYY-MM-DD_ prefix from the folder name to get the slug.
- Verifies the slug exists in vehicles (aborts with the valid-slug list if not).
- Detects the primary photo (first file whose name starts with `primary`).
- Lists existing Storage objects under `vehicle-images/{slug}/` and deletes any
  that aren't part of the new upload set — orphans removed.
- Uploads each photo as `vehicle-images/{slug}/{0|1|2|…}.{ext}`.
- PATCHes the row: primary_image_url = primary URL, image_urls = [primary, …].
- Auto-publishes: if the row had is_active=false AND no prior primary image,
  flips is_active=true. New cars hidden by the import script come live on
  their first photo upload.
- Backs up previous URLs to data/images-backup-{timestamp}.csv.

Stdlib only.
"""

import csv
import json
import mimetypes
import re
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

PROJECT = Path("C:/Users/lenovo/projects/luxeclub-rentals")
DEFAULT_FOLDER = PROJECT / "data" / "images-to-upload"
BUCKET = "vehicle-images"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
DATE_PREFIX_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})_(.+)$")

APPLY = "--apply" in sys.argv
SLUG_FILTER: str | None = None
FOLDER: Path = DEFAULT_FOLDER

# ---------- args ----------

argv = sys.argv
if "--slug" in argv:
    i = argv.index("--slug")
    if i + 1 >= len(argv):
        print("FATAL: --slug given without a value.")
        sys.exit(2)
    SLUG_FILTER = argv[i + 1].strip().lower()
if "--folder" in argv:
    i = argv.index("--folder")
    if i + 1 >= len(argv):
        print("FATAL: --folder given without a value.")
        sys.exit(2)
    FOLDER = Path(argv[i + 1]).expanduser().resolve()

# ---------- env ----------

env = {}
for line in (PROJECT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r'^([A-Z_]+)="?([^"]*)"?$', line.strip())
    if m:
        env[m.group(1)] = m.group(2)
SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

REST = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
}

# ---------- folder discovery ----------

if not FOLDER.exists():
    print(f"FATAL: folder {FOLDER} does not exist.")
    sys.exit(2)

folders = [f for f in FOLDER.iterdir() if f.is_dir()]
if not folders:
    print(f"No folders under {FOLDER}. Nothing to upload.")
    sys.exit(0)

def parse_slug_from_folder(folder_name: str) -> str:
    m = DATE_PREFIX_RE.match(folder_name)
    return m.group(2) if m else folder_name

# ---------- fetch valid slugs ----------

url = f"{SUPABASE_URL}/rest/v1/vehicles?select=slug,primary_image_url,is_active,image_urls"
req = urllib.request.Request(url, headers=REST)
with urllib.request.urlopen(req, timeout=30) as resp:
    db_rows = json.loads(resp.read().decode("utf-8"))
db_by_slug = {r["slug"]: r for r in db_rows}

# ---------- plan uploads ----------

plans: list[dict] = []  # one per folder to process
for folder in folders:
    slug = parse_slug_from_folder(folder.name)
    if SLUG_FILTER and slug != SLUG_FILTER:
        continue
    if slug not in db_by_slug:
        print(f"FATAL: folder {folder.name} → slug {slug!r} not in vehicles.")
        print("       Did you typo the folder name? Valid slugs:")
        for s in sorted(db_by_slug.keys())[:20]:
            print(f"         - {s}")
        if len(db_by_slug) > 20:
            print(f"         …and {len(db_by_slug) - 20} more.")
        sys.exit(3)

    image_files = sorted([f for f in folder.iterdir()
                          if f.is_file() and f.suffix.lower() in IMAGE_EXTS])
    if not image_files:
        print(f"  SKIP {folder.name}: no image files (.jpg/.png/.webp) found.")
        continue

    primaries = [f for f in image_files if f.stem.lower().startswith("primary")]
    if not primaries:
        print(f"FATAL: folder {folder.name} has no `primary.*` file. "
              "Rename your hero photo to primary.jpg / primary.png / primary.webp.")
        sys.exit(4)
    primary = sorted(primaries)[0]
    gallery = [f for f in image_files if f != primary]

    plans.append({
        "folder": folder,
        "slug": slug,
        "primary": primary,
        "gallery": gallery,
    })

if not plans:
    print("Nothing to upload.")
    sys.exit(0)

# ---------- dry-run / apply ----------

ts = datetime.now().strftime("%Y-%m-%d-%H%M")
backup_path = PROJECT / "data" / f"images-backup-{ts}.csv"

print(f"\nFolders to process: {len(plans)}")
for p in plans:
    print(f"  {p['slug']:<35} primary={p['primary'].name:<25} gallery=[{len(p['gallery'])}]")

if not APPLY:
    print("\nDRY-RUN. Re-run with --apply to upload to Supabase Storage + update DB.")
    sys.exit(0)

# Backup previous URLs.
backup_path.parent.mkdir(parents=True, exist_ok=True)
with backup_path.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["slug", "primary_image_url", "image_urls"])
    for p in plans:
        cur = db_by_slug[p["slug"]]
        w.writerow([p["slug"], cur.get("primary_image_url") or "",
                    ",".join(cur.get("image_urls") or [])])
print(f"Backed up current URLs to {backup_path}")

# ---------- helpers ----------

def storage_list(slug: str) -> list[str]:
    """Returns object names under vehicle-images/{slug}/ (just the filename)."""
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    body = json.dumps({"prefix": slug, "limit": 1000, "offset": 0}).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST", headers={
        **REST, "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            items = json.loads(resp.read().decode("utf-8"))
            return [item["name"] for item in items]
    except Exception as e:
        print(f"  WARN list {slug}: {e}")
        return []

def storage_delete(paths: list[str]) -> None:
    if not paths:
        return
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}"
    body = json.dumps({"prefixes": paths}).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="DELETE", headers={
        **REST, "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()
    except Exception as e:
        print(f"  WARN delete: {e}")

def storage_upload(storage_path: str, local: Path) -> str:
    mime, _ = mimetypes.guess_type(str(local))
    if not mime:
        mime = "application/octet-stream"
    body = local.read_bytes()
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    req = urllib.request.Request(url, data=body, method="POST", headers={
        **REST, "Content-Type": mime, "x-upsert": "true",
    })
    with urllib.request.urlopen(req, timeout=180) as resp:
        resp.read()
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"

def db_patch(slug: str, body: dict) -> bool:
    payload = json.dumps(body, default=str).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/vehicles?slug=eq.{slug}",
        data=payload, method="PATCH", headers={
            **REST, "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return bool(json.loads(resp.read().decode("utf-8")))
    except Exception as e:
        print(f"  FAIL PATCH {slug}: {e}")
        return False

# ---------- execute ----------

print(f"\n=== APPLYING {len(plans)} upload(s) ===")
ok = fail = 0
for p in plans:
    slug = p["slug"]
    primary = p["primary"]
    gallery = p["gallery"]
    files = [primary, *gallery]

    # Determine target paths: 0.<ext>, 1.<ext>, ...
    targets = []
    for i, local in enumerate(files):
        ext = local.suffix.lower().lstrip(".")
        targets.append((i, local, f"{slug}/{i}.{ext}"))

    # Storage cleanup: delete existing objects that aren't in targets
    new_names = {f"{i}.{local.suffix.lower().lstrip('.')}" for i, local, _ in targets}
    existing = set(storage_list(slug))
    orphans = existing - new_names
    if orphans:
        storage_delete([f"{slug}/{name}" for name in orphans])
        print(f"  {slug}: cleaned up {len(orphans)} orphan object(s)")

    # Upload each file
    public_urls: list[str] = []
    try:
        for i, local, path in targets:
            url = storage_upload(path, local)
            public_urls.append(url)
        print(f"  {slug}: uploaded {len(public_urls)} file(s)")
    except Exception as e:
        print(f"  FAIL upload {slug}: {e}")
        fail += 1
        continue

    # PATCH the row
    body = {
        "primary_image_url": public_urls[0],
        "image_urls": public_urls,
    }
    cur = db_by_slug[slug]
    if not cur.get("is_active") and not cur.get("primary_image_url"):
        body["is_active"] = True
        print(f"  {slug}: auto-publishing (was hidden, now has primary image)")

    if db_patch(slug, body):
        print(f"  OK   {slug}")
        ok += 1
    else:
        fail += 1

print(f"\nDone. {ok} succeeded, {fail} failed. Backup: {backup_path}")
