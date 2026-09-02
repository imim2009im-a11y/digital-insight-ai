#!/bin/bash
set -euo pipefail

# Railway/Apache runtime guard: ensure exactly one MPM is active.
a2dismod -f mpm_event 2>/dev/null || true
a2dismod -f mpm_worker 2>/dev/null || true
a2dismod -f mpm_prefork 2>/dev/null || true
a2enmod mpm_prefork

# Database wake handling is request-level via PHP auto_prepend_file
# (dia-db-gate.php), because Railway may sleep MariaDB while this
# WordPress container remains running.

# Preserve the official WordPress initialization (copy core + generate wp-config).
exec /usr/local/bin/docker-entrypoint.sh "$@"
