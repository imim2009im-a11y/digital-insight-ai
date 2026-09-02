#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() {
  printf '\n==> %s\n' "$1"
}

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

need bash
need python3
need node
need git

log "Checking repository diff for whitespace errors"
git diff --check

log "Checking shell syntax"
while IFS= read -r -d '' file; do
  bash -n "$file"
done < <(find scripts -maxdepth 1 -type f -name '*.sh' -print0)

for file in docker-entrypoint.sh railway-entrypoint.sh entrypoint.sh; do
  if [[ -f "$file" ]]; then
    bash -n "$file"
  fi
done

log "Checking JavaScript syntax"
if [[ -f script.js ]]; then
  node --check script.js
fi

log "Checking Python syntax"
python3 -m py_compile scripts/check_site.py

log "Validating Codex agent TOML files"
python3 - <<'PY'
from pathlib import Path
import sys

try:
    import tomllib
except ModuleNotFoundError:
    print("Python tomllib is unavailable; Codex TOML validation was skipped.")
    sys.exit(0)

required = {"name", "description", "developer_instructions"}
paths = sorted(Path("codex-agents").glob("*.toml"))
if not paths:
    raise SystemExit("No Codex agent TOML files found")

for path in paths:
    with path.open("rb") as handle:
        data = tomllib.load(handle)
    missing = sorted(required - data.keys())
    if missing:
        raise SystemExit(f"{path}: missing required keys: {', '.join(missing)}")
    for key in required:
        value = data[key]
        if not isinstance(value, str) or not value.strip():
            raise SystemExit(f"{path}: {key} must be a non-empty string")

print(f"Validated {len(paths)} Codex agent definitions")
PY

log "Running static site quality checks"
bash scripts/check_site.sh

if [[ "${AGENT_VERIFY_PRODUCTION:-0}" == "1" ]]; then
  log "Running live production smoke checks"
  bash scripts/production-smoke.sh
else
  echo "Skipping live production smoke checks (set AGENT_VERIFY_PRODUCTION=1 to enable)."
fi

if [[ "${AGENT_VERIFY_DOCKER:-0}" == "1" ]]; then
  need docker
  log "Building the production container"
  docker build --pull=false -t digital-insight-ai-agent-verify .
else
  echo "Skipping Docker build (set AGENT_VERIFY_DOCKER=1 to enable)."
fi

log "Agent verification completed successfully"
