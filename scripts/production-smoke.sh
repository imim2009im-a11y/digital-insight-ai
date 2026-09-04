#!/usr/bin/env bash
set -uo pipefail

# Cross-platform production smoke checks.
# Public endpoints only: no secrets, no DNS mutation, no deploys, no database writes.

failures=0

curl_common=(
  --silent
  --show-error
  --location
  --connect-timeout 5
  --max-time 15
  --retry 1
  --retry-delay 2
  --retry-all-errors
)

check_url() {
  local name="$1"
  local url="$2"
  local status total_time
  local out

  out=$(curl \
    "${curl_common[@]}" \
    --output /dev/null \
    --write-out '%{http_code} %{time_total}' \
    "$url" 2>/tmp/dia-smoke-curl.err || true)

  status="${out%% *}"
  total_time="${out#* }"

  if [[ "$status" =~ ^(2|3)[0-9][0-9]$ ]]; then
    printf 'PASS  %-24s %s (%s, %ss)\n' "$name" "$url" "$status" "${total_time:-n/a}"
    if [[ "$total_time" =~ ^[0-9]+([.][0-9]+)?$ ]] && awk "BEGIN {exit !($total_time > 5)}"; then
      printf 'WARN  %-24s response exceeded 5s (%ss)\n' "$name" "$total_time" >&2
    fi
    return 0
  fi

  printf 'FAIL  %-24s %s (%s, %ss)\n' "$name" "$url" "${status:-000}" "${total_time:-n/a}" >&2
  if [[ -s /tmp/dia-smoke-curl.err ]]; then
    sed 's/^/      /' /tmp/dia-smoke-curl.err >&2
  fi
  failures=$((failures + 1))
}

check_health_ready() {
  local name="$1"
  local url="$2"
  local body_file=/tmp/dia-smoke-health.json
  local status total_time out

  out=$(curl \
    "${curl_common[@]}" \
    --output "$body_file" \
    --write-out '%{http_code} %{time_total}' \
    "$url" 2>/tmp/dia-smoke-curl.err || true)

  status="${out%% *}"
  total_time="${out#* }"

  if [[ "$status" == "200" ]] \
    && grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' "$body_file" \
    && grep -Eq '"database"[[:space:]]*:[[:space:]]*"reachable"' "$body_file"; then
    printf 'PASS  %-24s %s (%s, database reachable, %ss)\n' "$name" "$url" "$status" "${total_time:-n/a}"
    if [[ "$total_time" =~ ^[0-9]+([.][0-9]+)?$ ]] && awk "BEGIN {exit !($total_time > 5)}"; then
      printf 'WARN  %-24s readiness exceeded 5s (%ss)\n' "$name" "$total_time" >&2
    fi
    return 0
  fi

  printf 'FAIL  %-24s %s (%s, readiness mismatch, %ss)\n' "$name" "$url" "${status:-000}" "${total_time:-n/a}" >&2
  if [[ -s "$body_file" ]]; then
    sed 's/^/      /' "$body_file" >&2
    printf '\n' >&2
  fi
  if [[ -s /tmp/dia-smoke-curl.err ]]; then
    sed 's/^/      /' /tmp/dia-smoke-curl.err >&2
  fi
  failures=$((failures + 1))
}

printf 'Digital Insight AI cross-platform reliability check\n'
printf 'UTC: %s\n\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# WordPress / Railway production.
# Hit application pages first so a sleeping database gets a wake-up opportunity
# before readiness is evaluated.
check_url 'Primary domain' 'https://digitalinsightai.com/'
check_url 'Primary tools' 'https://digitalinsightai.com/tools/'
check_health_ready 'Primary readiness' 'https://digitalinsightai.com/health/'
check_url 'Railway production' 'https://digitalinsightproduction-production.up.railway.app/'
check_url 'Railway tools' 'https://digitalinsightproduction-production.up.railway.app/tools/'
check_health_ready 'Railway readiness' 'https://digitalinsightproduction-production.up.railway.app/health/'

# Other connected deployment platforms discovered from the authenticated account.
check_url 'Render publisher' 'https://digital-insight-publisher.onrender.com/'
check_url 'Netlify tools preview' 'http://digital-insight-ai-tools-preview.netlify.app/'

# Public GitHub Pages fallbacks.
check_url 'GitHub Pages main' 'https://imim2009im-a11y.github.io/digital-insight-ai/'
check_url 'GitHub Pages portfolio' 'https://imim2009im-a11y.github.io/IBRAHIM-ALBALAWI/'

printf '\n'
if (( failures > 0 )); then
  printf '%d production/app check(s) failed.\n' "$failures" >&2
  exit 1
fi

printf 'All production/app checks passed.\n'
