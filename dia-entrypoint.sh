#!/bin/bash
set -euo pipefail

# Railway/Apache runtime guard: ensure exactly one MPM is active.
a2dismod -f mpm_event 2>/dev/null || true
a2dismod -f mpm_worker 2>/dev/null || true
a2dismod -f mpm_prefork 2>/dev/null || true
a2enmod mpm_prefork

# Keep the generated /tools module synchronized from the immutable image source.
# /var/www/html is a WordPress volume, so files must be refreshed at runtime.
if [ -d /usr/src/wordpress/tools ]; then
  mkdir -p /var/www/html
  rm -rf /var/www/html/tools
  cp -a /usr/src/wordpress/tools /var/www/html/tools
  chown -R www-data:www-data /var/www/html/tools
fi

# Database wake handling is request-level via PHP auto_prepend_file
# (dia-db-gate.php), because Railway may sleep MariaDB while this
# WordPress container remains running.

# Preserve the official WordPress initialization (copy core + generate wp-config).
exec /usr/local/bin/docker-entrypoint.sh "$@"
