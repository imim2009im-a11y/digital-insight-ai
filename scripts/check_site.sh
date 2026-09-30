#!/usr/bin/env bash
set -euo pipefail
while IFS= read -r file; do
  node --check "$file"
done < <(find . -path ./node_modules -prune -o -name "*.js" -type f -print | sort)
python3 scripts/check_site.py
