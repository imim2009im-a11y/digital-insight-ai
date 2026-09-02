#!/bin/bash
set -euo pipefail

# Railway/Apache runtime guard: ensure exactly one MPM is active.
a2dismod -f mpm_event 2>/dev/null || true
a2dismod -f mpm_worker 2>/dev/null || true
a2dismod -f mpm_prefork 2>/dev/null || true
a2enmod mpm_prefork

# Railway Serverless may put MariaDB to sleep. The first WordPress request can
# otherwise fail before the database finishes waking. Route local DB traffic
# through a tiny TCP retry proxy so the request waits for MariaDB instead of
# returning an immediate database-connection 500.
if [[ -n "${WORDPRESS_DB_HOST:-}" && "${WORDPRESS_DB_HOST}" != "127.0.0.1:3307" ]]; then
    DIA_DB_UPSTREAM="${WORDPRESS_DB_HOST}"

    if [[ "${DIA_DB_UPSTREAM}" == *:* ]]; then
        DIA_DB_HOST="${DIA_DB_UPSTREAM%%:*}"
        DIA_DB_PORT="${DIA_DB_UPSTREAM##*:}"
    else
        DIA_DB_HOST="${DIA_DB_UPSTREAM}"
        DIA_DB_PORT="3306"
    fi

    socat \
        TCP-LISTEN:3307,bind=127.0.0.1,reuseaddr,fork \
        "TCP:${DIA_DB_HOST}:${DIA_DB_PORT},forever,interval=1,connect-timeout=2" &

    export WORDPRESS_DB_HOST="127.0.0.1:3307"
fi

# Preserve the official WordPress initialization (copy core + generate wp-config).
exec /usr/local/bin/docker-entrypoint.sh "$@"
