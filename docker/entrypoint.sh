#!/usr/bin/env bash
set -e

cd /var/www/html

# Create .env from template if missing
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
  fi
fi

# Ensure APP_KEY exists
if ! grep -q "^APP_KEY=base64:" .env; then
  php artisan key:generate --force
fi

# Auto create sqlite file if sqlite is selected
DB_CONN=$(grep "^DB_CONNECTION=" .env | cut -d '=' -f2 | tr -d ' "' || echo "sqlite")
if [ "$DB_CONN" = "sqlite" ] || [ -z "$DB_CONN" ]; then
  if [ ! -f "database/database.sqlite" ]; then
    mkdir -p database
    touch database/database.sqlite
  fi
fi

# Run database migrations
php artisan migrate --force --seed || true

# Storage link & permissions
php artisan storage:link --quiet || true
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Production cache optimization
APP_ENV_VAL=$(grep "^APP_ENV=" .env | cut -d '=' -f2 | tr -d ' "' || echo "production")
if [ "$APP_ENV_VAL" = "production" ]; then
  php artisan config:cache || true
  php artisan route:cache || true
  php artisan view:cache || true
fi

exec "$@"
