FROM node:22-bookworm-slim AS tools-build

ARG AI_TOOLS_COMMIT=bd2404b3a84ceab91c737144df9997ee487d0432

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /src

RUN set -eux; \
    curl -fsSL "https://github.com/imim2009im-a11y/ai-tools-directory/archive/${AI_TOOLS_COMMIT}.tar.gz" -o /tmp/ai-tools.tar.gz; \
    tar -xzf /tmp/ai-tools.tar.gz --strip-components=1 -C /src; \
    rm /tmp/ai-tools.tar.gz; \
    corepack enable; \
    pnpm install --frozen-lockfile; \
    APP_BASE_PATH=/tools/ pnpm build; \
    test -f /src/dist/public/index.html; \
    grep -q '/tools/assets/' /src/dist/public/index.html

FROM wordpress:latest

USER root

COPY --from=tools-build /src/dist/public/ /usr/src/wordpress/tools/
COPY deploy-bin/ /tmp/deploy-bin/
COPY dia-entrypoint.sh /usr/local/bin/dia-entrypoint.sh
COPY dia-db-gate.php /usr/local/bin/dia-db-gate.php
COPY dia-health.php /var/www/dia-health.php

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
    test -f /usr/src/wordpress/tools/index.html; \
    grep -q '/tools/assets/' /usr/src/wordpress/tools/index.html; \
    php -l /usr/local/bin/dia-db-gate.php; \
    php -l /var/www/dia-health.php; \
    printf '%s\n' 'auto_prepend_file=/usr/local/bin/dia-db-gate.php' > /usr/local/etc/php/conf.d/zz-dia-db-gate.ini; \
    chown www-data:www-data /var/www/dia-health.php; \
    chown -R www-data:www-data /usr/src/wordpress/tools; \
    printf '%s\n' \
      'ServerName 0.0.0.0' \
      'AliasMatch "^/health/?$" "/var/www/dia-health.php"' \
      'RedirectMatch 308 ^/tools$ /tools/' \
      'Alias "/tools/" "/var/www/html/tools/"' \
      '<Directory "/var/www">' \
      '    Require all granted' \
      '</Directory>' \
      '<Directory "/var/www/html/tools">' \
      '    Options -Indexes' \
      '    AllowOverride None' \
      '    Require all granted' \
      '    DirectoryIndex index.html' \
      '    FallbackResource /tools/index.html' \
      '</Directory>' \
      > /etc/apache2/conf-available/dia-runtime.conf; \
    a2enconf dia-runtime; \
    chown -R www-data:www-data /usr/src/wordpress/wp-content/themes/digital-insight-ai /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core; \
    chmod +x /usr/local/bin/dia-entrypoint.sh; \
    rm -rf /tmp/deploy-bin /tmp/wp-assets /tmp/wp-assets.tar.gz

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/dia-entrypoint.sh"]
CMD ["apache2-foreground"]
