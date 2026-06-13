#!/usr/bin/env bash
set -euo pipefail
node --check script.js
python3 scripts/check_site.py
