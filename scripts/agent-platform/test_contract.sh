#!/usr/bin/env bash
set -euo pipefail
python3 scripts/agent-platform/validate_task.py examples/agent-platform/prototype-task.json
if python3 scripts/agent-platform/validate_task.py examples/agent-platform/invalid-success-without-evidence.json; then
  echo "ERROR: invalid success record was accepted" >&2
  exit 1
fi
echo "agent-platform contract tests passed"
