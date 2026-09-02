FROM wordpress:latest

USER root

COPY tools.html /usr/src/wordpress/tools/index.html
COPY style.css /usr/src/wordpress/tools/style.css
COPY script.js /usr/src/wordpress/tools/script.js
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
    test -f /usr/src/wordpress/tools/style.css; \
    test -f /usr/src/wordpress/tools/script.js; \
    sed -i \
      -e 's|https://digitalinsightai.com/tools.html|https://digitalinsightai.com/tools/|g' \
      -e 's|href="start.html#finder"|href="/tools/"|g' \
      -e 's|href="index.html"|href="/"|g' \
      -e 's|href="start.html"|href="/tools/"|g' \
      -e 's|href="tools.html"|href="/tools/"|g' \
      -e 's|href="best-ai-video-tools.html"|href="/reviews/"|g' \
      -e 's|href="methodology.html"|href="/editorial-policy/"|g' \
      -e 's|href="privacy-policy.html"|href="/editorial-policy/"|g' \
      -e 's|href="contact.html"|href="/"|g' \
      /usr/src/wordpress/tools/index.html; \
    grep -q 'https://digitalinsightai.com/tools/' /usr/src/wordpress/tools/index.html; \
    grep -q 'AI Tools Directory' /usr/src/wordpress/tools/index.html; \
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
      '</Directory>' \
      > /etc/apache2/conf-available/dia-runtime.conf; \
    a2enconf dia-runtime; \
    chown -R www-data:www-data /usr/src/wordpress/wp-content/themes/digital-insight-ai /usr/src/wordpress/wp-content/plugins/digital-insight-ai-core; \
    chmod +x /usr/local/bin/dia-entrypoint.sh; \
    rm -rf /tmp/deploy-bin /tmp/wp-assets /tmp/wp-assets.tar.gz

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/dia-entrypoint.sh"]
CMD ["apache2-foreground"]
