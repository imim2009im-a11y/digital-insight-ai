FROM wordpress:latest

USER root

COPY deploy-b64/ /tmp/deploy-b64/

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends unzip ca-certificates; \
    rm -rf /var/lib/apt/lists/*; \
    cat /tmp/deploy-b64/chunk-*.txt | base64 -d > /tmp/wp-assets.tar.gz; \
    mkdir -p /tmp/wp-assets; \
    tar -xzf /tmp/wp-assets.tar.gz -C /tmp/wp-assets; \
    unzip -q /tmp/wp-assets/digital-insight-ai-theme.zip -d /usr/src/wordpress/wp-content/themes; \
    unzip -q /tmp/wp-assets/digital-insight-ai-core.zip -d /usr/src/wordpress/wp-content/plugins; \
    test -f /usr/src/wordpress/wp-content/themes/digital-insight-ai/style.css; \
    test -f /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core/digital-insight-ai-core.php; \
    chown -R www-data:www-data /usr/src/wordpress/wp-content/themes/digital-insight-ai /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core; \
    rm -rf /tmp/deploy-b64 /tmp/wp-assets /tmp/wp-assets.tar.gz

EXPOSE 80

# WordPress migration deployment only. GitHub Pages ignores this file.
