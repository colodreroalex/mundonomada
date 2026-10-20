FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY frontend/mundo-nomada/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/mundo-nomada/ ./
RUN npm run build

FROM php:8.3-apache
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev libonig-dev \
    && docker-php-ext-install pdo_pgsql mbstring \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod headers rewrite
COPY --from=frontend /app/dist/mundo-nomada/browser/ /var/www/html/
COPY backend/Mundo-nomada-backEnd/ /var/www/html/api_php/
COPY backend/apache-site.conf /etc/apache2/sites-available/000-default.conf
COPY backend/production.ini /usr/local/etc/php/conf.d/production.ini
COPY backend/runtime-config.production.js /usr/local/share/mundonomada/runtime-config.production.js
COPY backend/docker-entrypoint.sh /usr/local/bin/mundonomada-entrypoint
RUN tr -d '\r' < /usr/local/bin/mundonomada-entrypoint > /tmp/entrypoint \
    && mv /tmp/entrypoint /usr/local/bin/mundonomada-entrypoint \
    && chmod 755 /usr/local/bin/mundonomada-entrypoint
EXPOSE 80
CMD ["mundonomada-entrypoint"]
