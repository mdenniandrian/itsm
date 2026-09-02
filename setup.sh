#!/usr/bin/env bash

# ==============================================================================
# ITSM ENTERPRISE PLATFORM - AUTOMATED VPS & HOMESERVER SETUP SCRIPT
# ==============================================================================
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$ROOT_DIR/laravel" ]; then
  APP_DIR="$ROOT_DIR/laravel"
else
  APP_DIR="$ROOT_DIR"
fi

echo -e "${BLUE}${BOLD}"
echo "========================================================================"
echo "    🚀 ITSM ENTERPRISE - VPS & HOME SERVER AUTO-INSTALLER"
echo "========================================================================"
echo -e "${NC}"

# 1. Check PHP CLI
echo -e "${BLUE}[1/8] Checking PHP environment...${NC}"
if ! command -v php &> /dev/null; then
  echo -e "${RED}❌ PHP is not installed. Please install PHP 8.2 or higher with required extensions (pdo_mysql, pdo_sqlite, mbstring, openssl, xml, curl, zip, gd).${NC}"
  exit 1
fi
PHP_VER=$(php -r 'echo PHP_VERSION;')
echo -e "${GREEN}✓ PHP $PHP_VER detected.${NC}"

# 2. Check Composer
echo -e "${BLUE}[2/8] Checking Composer dependency manager...${NC}"
if ! command -v composer &> /dev/null; then
  echo -e "${YELLOW}⚠️ Composer is not installed globally. Checking local composer.phar...${NC}"
  if [ ! -f "$APP_DIR/composer.phar" ]; then
    echo -e "${BLUE}Downloading Composer...${NC}"
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    php composer-setup.php --install-dir="$APP_DIR" --filename=composer
    php -r "unlink('composer-setup.php');"
    COMPOSER_CMD="php $APP_DIR/composer"
  else
    COMPOSER_CMD="php $APP_DIR/composer.phar"
  fi
else
  COMPOSER_CMD="composer"
fi
echo -e "${GREEN}✓ Composer ready.${NC}"

cd "$APP_DIR"

# 3. Environment File Setup (.env)
echo -e "${BLUE}[3/8] Configuring environment (.env)...${NC}"
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from .env.example template.${NC}"
  else
    echo -e "${RED}❌ .env.example not found!${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Existing .env file found. Preserving your custom configuration.${NC}"
fi

# 4. Install Composer Dependencies
echo -e "${BLUE}[4/8] Installing PHP application packages...${NC}"
rm -f bootstrap/cache/*.php 2>/dev/null || true

if [ ! -d "vendor" ]; then
  $COMPOSER_CMD install --optimize-autoloader --no-interaction --prefer-dist
  echo -e "${GREEN}✓ Dependencies installed.${NC}"
else
  echo -e "${GREEN}✓ Vendor directory already present. Optimizing autoloader...${NC}"
  $COMPOSER_CMD dump-autoload --optimize
fi

# 5. Generate Application Key (if missing)
echo -e "${BLUE}[5/8] Verifying Application Security Key (APP_KEY)...${NC}"
if ! grep -q "^APP_KEY=base64:" .env; then
  php artisan key:generate --force
  echo -e "${GREEN}✓ Generated fresh APP_KEY in .env.${NC}"
else
  echo -e "${GREEN}✓ APP_KEY is already configured.${NC}"
fi

# 6. Database Provisioning & Auto-Migration
echo -e "${BLUE}[6/8] Provisioning Database & Running Migrations...${NC}"
DB_CONN=$(grep "^DB_CONNECTION=" .env | cut -d '=' -f2 | tr -d ' "')

if [ "$DB_CONN" = "sqlite" ] || [ -z "$DB_CONN" ]; then
  if [ ! -f "database/database.sqlite" ]; then
    mkdir -p database
    touch database/database.sqlite
    echo -e "${GREEN}✓ Created SQLite database file at database/database.sqlite.${NC}"
  fi
fi

# Run safe migrations & default seeders
echo -e "${BLUE}Running 'php artisan migrate --force --seed'...${NC}"
php artisan migrate --force --seed
echo -e "${GREEN}✓ Database tables and initial seed data provisioned successfully.${NC}"

# 7. Storage Symlink & Permission Fixes
echo -e "${BLUE}[7/8] Configuring Storage Symlink & Directory Permissions...${NC}"
php artisan storage:link --quiet || true

chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# Try to set web server ownership if running under root or sudo
if [ "$(id -u)" -eq 0 ]; then
  if id "www-data" &>/dev/null; then
    chown -R www-data:www-data storage bootstrap/cache
    echo -e "${GREEN}✓ Ownership set to www-data.${NC}"
  elif id "nginx" &>/dev/null; then
    chown -R nginx:nginx storage bootstrap/cache
    echo -e "${GREEN}✓ Ownership set to nginx.${NC}"
  fi
fi
echo -e "${GREEN}✓ Permissions configured for storage and cache.${NC}"

# 8. Production Cache Optimization
echo -e "${BLUE}[8/8] Optimizing Configuration & Route Cache for High Speed...${NC}"
APP_ENV_VAL=$(grep "^APP_ENV=" .env | cut -d '=' -f2 | tr -d ' "')
if [ "$APP_ENV_VAL" = "production" ]; then
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
  echo -e "${GREEN}✓ Production config, routes, and views cached.${NC}"
else
  php artisan config:clear
  php artisan route:clear
  echo -e "${GREEN}✓ Development cache cleared.${NC}"
fi

echo ""
echo -e "${GREEN}${BOLD}========================================================================${NC}"
echo -e "${GREEN}${BOLD}    🎉 ITSM ENTERPRISE PLATFORM IS READY FOR USE!${NC}"
echo -e "${GREEN}${BOLD}========================================================================${NC}"
echo ""
echo -e "${BOLD}Default Administrator Account:${NC}"
echo -e "  📧 Email:    ${BLUE}admin@itsm.com${NC}"
echo -e "  🔑 Password: ${YELLOW}admin123${NC}"
echo ""
echo -e "${BOLD}How to Run & Deploy:${NC}"
echo -e "  1. ${BOLD}Development / Home Server quick test:${NC}"
echo -e "     cd laravel && php artisan serve --host=0.0.0.0 --port=8000"
echo ""
echo -e "  2. ${BOLD}Production VPS with Nginx + PHP-FPM:${NC}"
echo -e "     Point your Nginx root to: ${BLUE}${APP_DIR}/public${NC}"
echo -e "     (Template available at: ${BLUE}${ROOT_DIR}/deploy/nginx-itsm.conf${NC})"
echo ""
echo -e "  3. ${BOLD}Docker / Docker Compose:${NC}"
echo -e "     docker compose up -d"
echo ""
echo -e "  4. ${BOLD}Background Queue Worker (Email & Telegram alerts):${NC}"
echo -e "     php artisan queue:work --daemon"
echo -e "     (Systemd unit file at: ${BLUE}${ROOT_DIR}/deploy/itsm-queue.service${NC})"
echo ""
echo -e "========================================================================"
