FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

COPY Mundo-nomada-backEnd/ /var/www/html/api_php/

RUN a2enmod headers rewrite \
    && chown -R www-data:www-data /var/www/html/api_php

EXPOSE 80
