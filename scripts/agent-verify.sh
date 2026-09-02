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
