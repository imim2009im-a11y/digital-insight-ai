FROM wordpress:latest

USER root

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends unzip curl ca-certificates; \
    rm -rf /var/lib/apt/lists/*; \
    curl -fsSL 'https://raw.githubusercontent.com/imim2009im-a11y/digital-insight-ai/wordpress-staging-package/deploy/digital-insight-ai-wordpress-production-v3.zip' -o /tmp/dia-package.zip; \
    mkdir -p /tmp/dia-package; \
    unzip -q /tmp/dia-package.zip -d /tmp/dia-package; \
    THEME="$(find /tmp/dia-package -name 'digital-insight-ai-theme.zip' -type f | head -1)"; \
    PLUGIN="$(find /tmp/dia-package -name 'digital-insight-ai-core.zip' -type f | head -1)"; \
    test -n "$THEME"; \
    test -n "$PLUGIN"; \
    unzip -q "$THEME" -d /usr/src/wordpress/wp-content/themes; \
    unzip -q "$PLUGIN" -d /usr/src/wordpress/wp-content/plugins; \
    test -f /usr/src/wordpress/wp-content/themes/digital-insight-ai/style.css; \
    test -f /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core/digital-insight-ai-core.php; \
    chown -R www-data:www-data /usr/src/wordpress/wp-content/themes/digital-insight-ai /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core; \
    rm -rf /tmp/dia-package /tmp/dia-package.zip

EXPOSE 80

# WordPress migration deployment only. GitHub Pages ignores this file.
