#!/bin/bash
set -e

# Railway/Apache runtime guard: ensure exactly one MPM is active.
a2dismod -f mpm_event 2>/dev/null || true
a2dismod -f mpm_worker 2>/dev/null || true
a2dismod -f mpm_prefork 2>/dev/null || true
a2enmod mpm_prefork

# Preserve the official WordPress initialization (copy core + generate wp-config).
exec /usr/local/bin/docker-entrypoint.sh "$@"
