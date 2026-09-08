#!/usr/bin/env bash
set -uo pipefail

# Digital Insight AI production smoke checks.
# This script intentionally uses only public endpoints and never reads secrets.
#
# Canonical topology:
#   Application: DigitalInsightProduction on Railway
#   Public edge: https://digitalinsightai.com
#   Fallback:    GitHub Pages
#
# Legacy Railway services are intentionally excluded. A failure on the public
# edge is reported separately from an application/readiness failure so TLS/DNS
# incidents are never misdiagnosed as broken application code.

edge_failures=0
app_failures=0
fallback_failures=0

record_failure() {
  case "$1" in
    EDGE) edge_failures=$((edge_failures + 1)) ;;
    APP) app_failures=$((app_failures + 1)) ;;
    FALLBACK) fallback_failures=$((fallback_failures + 1)) ;;
    *) printf 'Unknown smoke-check layer: %s\n' "$1" >&2; exit 2 ;;
  esac
}

check_url() {
  local layer="$1"
  local name="$2"
  local url="$3"
  local status total_time out
  local err_file
  err_file="$(mktemp)"

  out=$(curl \
    --silent \
    --show-error \
    --location \
    --connect-timeout 10 \
    --max-time 25 \
    --output /dev/null \
    --write-out '%{http_code} %{time_total}' \
    "$url" 2>"$err_file" || true)

  status="${out%% *}"
  total_time="${out#* }"

  if [[ "$status" =~ ^(2|3)[0-9][0-9]$ ]]; then
    printf 'PASS  %-8s %-24s %s (%s, %ss)\n' "$layer" "$name" "$url" "$status" "${total_time:-n/a}"
    if [[ "$total_time" =~ ^[0-9]+([.][0-9]+)?$ ]] && awk "BEGIN {exit !($total_time > 5)}"; then
      printf 'WARN  %-8s %-24s response exceeded 5s (%ss)\n' "$layer" "$name" "$total_time" >&2
    fi
    rm -f "$err_file"
    return 0
  fi

  printf 'FAIL  %-8s %-24s %s (%s, %ss)\n' "$layer" "$name" "$url" "${status:-000}" "${total_time:-n/a}" >&2
  if [[ -s "$err_file" ]]; then
    sed 's/^/      /' "$err_file" >&2
  fi
  rm -f "$err_file"
  record_failure "$layer"
}

check_health_ready() {
  local name="$1"
  local url="$2"
  local body_file err_file status total_time out
  body_file="$(mktemp)"
  err_file="$(mktemp)"

  out=$(curl \
    --silent \
    --show-error \
    --location \
    --connect-timeout 10 \
    --max-time 25 \
    --output "$body_file" \
    --write-out '%{http_code} %{time_total}' \
    "$url" 2>"$err_file" || true)

  status="${out%% *}"
  total_time="${out#* }"

  if [[ "$status" == "200" ]] && grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' "$body_file" && grep -Eq '"database"[[:space:]]*:[[:space:]]*"reachable"' "$body_file"; then
    printf 'PASS  %-8s %-24s %s (%s, database reachable, %ss)\n' 'APP' "$name" "$url" "$status" "${total_time:-n/a}"
    if [[ "$total_time" =~ ^[0-9]+([.][0-9]+)?$ ]] && awk "BEGIN {exit !($total_time > 5)}"; then
      printf 'WARN  %-8s %-24s readiness exceeded 5s (%ss)\n' 'APP' "$name" "$total_time" >&2
    fi
    rm -f "$body_file" "$err_file"
    return 0
  fi

  printf 'FAIL  %-8s %-24s %s (%s, readiness mismatch, %ss)\n' 'APP' "$name" "$url" "${status:-000}" "${total_time:-n/a}" >&2
  if [[ -s "$body_file" ]]; then
    sed 's/^/      /' "$body_file" >&2
    printf '\n' >&2
  fi
  if [[ -s "$err_file" ]]; then
    sed 's/^/      /' "$err_file" >&2
  fi
  rm -f "$body_file" "$err_file"
  record_failure APP
}

printf 'Digital Insight AI production smoke check\n'
printf 'UTC: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
printf 'Canonical application: DigitalInsightProduction (Railway)\n\n'

# Public edge: DNS/TLS/routing. Failures here do not imply broken app code.
check_url EDGE 'Primary domain' 'https://digitalinsightai.com/'
check_url EDGE 'Primary tools' 'https://digitalinsightai.com/tools/'

# Canonical application/readiness checks bypass the custom-domain edge.
check_url APP 'Railway production' 'https://digitalinsightproduction-production.up.railway.app/'
check_url APP 'Railway tools' 'https://digitalinsightproduction-production.up.railway.app/tools/'
check_health_ready 'Railway readiness' 'https://digitalinsightproduction-production.up.railway.app/health/'

# Disaster fallback is tracked independently from the canonical application.
check_url FALLBACK 'GitHub Pages fallback' 'https://imim2009im-a11y.github.io/digital-insight-ai/'

printf '\nSmoke summary: EDGE=%d APP=%d FALLBACK=%d\n' "$edge_failures" "$app_failures" "$fallback_failures"

if (( app_failures > 0 )); then
  printf 'BLOCKED: canonical application/readiness failure detected.\n' >&2
  exit 1
fi

if (( edge_failures > 0 )); then
  printf 'BLOCKED: public edge (DNS/TLS/routing) failure detected; canonical application may still be healthy.\n' >&2
  exit 1
fi

if (( fallback_failures > 0 )); then
  printf 'BLOCKED: fallback endpoint failure detected; canonical application is healthy.\n' >&2
  exit 1
fi

printf 'VERIFIED_SUCCESS: all canonical, edge, readiness, and fallback checks passed.\n'
