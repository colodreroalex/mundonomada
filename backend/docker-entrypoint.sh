#!/bin/sh
# Ajusta la configuración pública según el entorno antes de arrancar Apache.
# MUNDONOMADA_PRODUCTION=1 quita el aviso de demostración y permite indexar.
set -e
if [ "$MUNDONOMADA_PRODUCTION" = "1" ]; then
  echo "window.__MUNDO_NOMADA_CONFIG__ = { apiBaseUrl: '/api_php/', demoMode: false };" > /var/www/html/runtime-config.js
  : > /etc/apache2/conf-enabled/robots.conf
else
  cp /usr/local/share/mundonomada/runtime-config.production.js /var/www/html/runtime-config.js
  echo 'Header always set X-Robots-Tag "noindex, nofollow"' > /etc/apache2/conf-enabled/robots.conf
fi
exec apache2-foreground
