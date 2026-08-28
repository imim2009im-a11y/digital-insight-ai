FROM wordpress:latest

USER root

COPY deploy-bin/ /tmp/deploy-bin/

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends unzip ca-certificates; \
    rm -rf /var/lib/apt/lists/*; \
    cat /tmp/deploy-bin/part-* > /tmp/wp-assets.tar.gz; \
    echo 'b603077fdcadd616acf4ca15d2580769d68ea2ba4e57428f85c3a2c518437297  /tmp/wp-assets.tar.gz' | sha256sum -c -; \
    mkdir -p /tmp/wp-assets; \
    tar -xzf /tmp/wp-assets.tar.gz -C /tmp/wp-assets; \
    unzip -q /tmp/wp-assets/digital-insight-ai-theme.zip -d /usr/src/wordpress/wp-content/themes; \
    unzip -q /tmp/wp-assets/digital-insight-ai-core.zip -d /usr/src/wordpress/wp-content/plugins; \
    test -f /usr/src/wordpress/wp-content/themes/digital-insight-ai/style.css; \
    test -f /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core/digital-insight-ai-core.php; \
    chown -R www-data:www-data /usr/src/wordpress/wp-content/themes/digital-insight-ai /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core; \
    a2dismod mpm_event || true; \
    a2dismod mpm_worker || true; \
    a2enmod mpm_prefork; \
    rm -rf /tmp/deploy-bin /tmp/wp-assets /tmp/wp-assets.tar.gz

EXPOSE 80

# Official WordPress ENTRYPOINT/CMD remain intact; Apache uses prefork only.
