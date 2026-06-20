"""
Watch the car-types spreadsheet and auto-import on every save.

Start this once in a terminal and leave it running. Every time you save the
xlsx in Excel, the watcher detects the change and runs the import script
with `--apply` for you. Ctrl+C to stop.

    python scripts/watch-car-types.py                              # watches data/car-types.xlsx
    python scripts/watch-car-types.py --input ~/Downloads/car-types.xlsx

The watcher delegates to scripts/import-car-types.py, so the same safety
guards apply — header validation, snapshot backup, and the bulk-removal
warning (>20% category-assignment removals).

Stdlib only — uses polling, no extra deps.
"""

import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

PROJECT = Path("C:/Users/lenovo/projects/luxeclub-rentals")
DEFAULT_INPUT = PROJECT / "data" / "car-types.xlsx"
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
    print(f"FATAL: {INPUT} does not exist. Run `python scripts/export-car-types.py` first.")
    sys.exit(2)

def mtime() -> float:
    try:
        return INPUT.stat().st_mtime
    except FileNotFoundError:
        return 0.0

def run_import() -> None:
    cmd = [sys.executable, str(PROJECT / "scripts" / "import-car-types.py"), "--input", str(INPUT), "--apply"]
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
print(f"Watching {INPUT}")
print(f"Save the spreadsheet to trigger auto-import. Ctrl+C to stop.\n")

try:
    while True:
        time.sleep(POLL_SECONDS)
        current = mtime()
        if current and current != last_mtime:
            # Debounce — Excel often writes the file in multiple passes (temp
            # file, rename). Sleep briefly and re-read the mtime; if it's
            # still settling we'll catch it on the next poll instead.
            time.sleep(DEBOUNCE_SECONDS)
            settled = mtime()
            if settled != current:
                continue  # still being written; wait for next poll
            last_mtime = settled
            run_import()
except KeyboardInterrupt:
    print("\nWatcher stopped.")
