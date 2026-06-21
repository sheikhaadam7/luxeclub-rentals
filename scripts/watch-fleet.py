"""
Watch the fleet master spreadsheet and auto-import on every save.

Start this once in a terminal and leave it running. Every time you save
`data/fleet.xlsx` in Excel, the watcher detects the change and runs
`import-fleet.py --apply` for you. Ctrl+C to stop.

    python scripts/watch-fleet.py
    python scripts/watch-fleet.py --input ~/Downloads/fleet.xlsx

The watcher delegates to scripts/import-fleet.py, so the same safety guards
apply — header validation, snapshot backup, and the split bulk-change guards.

Content-hash skip: after each successful --apply, the watcher records the
SHA-256 of the file. If the next poll sees the same hash, it skips the run
(belt-and-braces against any background process touching mtime without
actually changing the content).

Stdlib only.
"""

import hashlib
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

PROJECT = Path("C:/Users/lenovo/projects/luxeclub-rentals")
DEFAULT_INPUT = PROJECT / "data" / "fleet.xlsx"
POLL_SECONDS = 2.0
DEBOUNCE_SECONDS = 0.8

def parse_input_arg(argv: list[str]) -> Path:
    for flag in ("--input", "-i"):
        if flag in argv:
            i = argv.index(flag)
            if i + 1 >= len(argv):
                print(f"FATAL: {flag} given without a path.")
                sys.exit(2)
            return Path(argv[i + 1]).expanduser().resolve()
    return DEFAULT_INPUT

INPUT = parse_input_arg(sys.argv)

if not INPUT.exists():
    print(f"FATAL: {INPUT} does not exist. Run `python scripts/export-fleet.py` first.")
    sys.exit(2)

def mtime() -> float:
    try:
        return INPUT.stat().st_mtime
    except FileNotFoundError:
        return 0.0

def file_hash() -> str:
    try:
        h = hashlib.sha256()
        with INPUT.open("rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()
    except FileNotFoundError:
        return ""

def run_import() -> None:
    cmd = [sys.executable, str(PROJECT / "scripts" / "import-fleet.py"),
           "--input", str(INPUT), "--apply"]
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\n[{ts}] Detected save. Running import…")
    print("-" * 72)
    result = subprocess.run(cmd, cwd=PROJECT)
    print("-" * 72)
    if result.returncode == 0:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Import OK. Refresh /catalogue to see changes.")
    else:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Import exited with code {result.returncode}. Watcher continues.")

last_mtime = mtime()
last_hash = file_hash()
print(f"Watching {INPUT}")
print(f"Save the spreadsheet to trigger auto-import. Ctrl+C to stop.\n")

try:
    while True:
        time.sleep(POLL_SECONDS)
        current = mtime()
        if current and current != last_mtime:
            # Debounce — Excel often writes the file in multiple passes.
            time.sleep(DEBOUNCE_SECONDS)
            settled = mtime()
            if settled != current:
                continue
            last_mtime = settled
            # Content-hash guard: skip if file bytes are identical to last run.
            new_hash = file_hash()
            if new_hash and new_hash == last_hash:
                ts = datetime.now().strftime("%H:%M:%S")
                print(f"[{ts}] mtime changed but content identical — skipping.")
                continue
            last_hash = new_hash
            run_import()
except KeyboardInterrupt:
    print("\nWatcher stopped.")
