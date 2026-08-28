FROM wordpress:latest

USER root

COPY deploy/digital-insight-ai-wordpress-production-v3.zip /tmp/dia-package.zip

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends unzip; \
    rm -rf /var/lib/apt/lists/*; \
    mkdir -p /tmp/dia-package; \
    unzip -q /tmp/dia-package.zip -d /tmp/dia-package; \
    THEME="$(find /tmp/dia-package -name 'digital-insight-ai-theme.zip' -type f | head -1)"; \
    PLUGIN="$(find /tmp/dia-package -name 'digital-insight-ai-core.zip' -type f | head -1)"; \
    test -n "$THEME"; \
    test -n "$PLUGIN"; \
    mkdir -p /usr/src/wordpress/wp-content/themes /usr/src/wordpress/wp-content/plugins; \
    unzip -q "$THEME" -d /usr/src/wordpress/wp-content/themes; \
    unzip -q "$PLUGIN" -d /usr/src/wordpress/wp-content/plugins; \
    test -f /usr/src/wordpress/wp-content/themes/digital-insight-ai/style.css; \
    test -f /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core/digital-insight-ai-core.php; \
    rm -rf /tmp/dia-package /tmp/dia-package.zip

# Keep the official WordPress ENTRYPOINT/CMD intact so first-run initialization works.
