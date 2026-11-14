#!/usr/bin/env bash
set -euo pipefail

base="${1:-https://imim2009im-a11y.github.io/digital-insight-ai}"
fail=0

check() {
  local path="$1"
  local code
  code="$(curl -L -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 --max-time 25 "${base}${path}" || true)"
  if [[ "$code" =~ ^(2|3)[0-9][0-9]$ ]]; then
    printf 'PASS %s%s (%s)\n' "$base" "$path" "$code"
  else
    printf 'FAIL %s%s (%s)\n' "$base" "$path" "${code:-000}" >&2
    fail=1
  fi
}

check "/"
check "/tools/"
check "/reviews/"
check "/guides/"
check "/about/"
check "/privacy/"
check "/robots.txt"
check "/sitemap.xml"

exit "$fail"
