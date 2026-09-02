#!/bin/bash

# ITSM Portal (Laravel) Startup Script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LARAVEL_DIR="$SCRIPT_DIR/laravel"

echo "=========================================="
echo "   🎯 ITSM Portal Startup (Laravel 12)   "
echo "=========================================="

# Check PHP
if ! command -v php &> /dev/null; then
  echo "❌ PHP tidak ditemukan. Pastikan PHP sudah terinstall."
  exit 1
fi
echo "✅ PHP Version: $(php -r 'echo PHP_VERSION;')"

# Check Composer
if ! command -v composer &> /dev/null; then
  echo "❌ Composer tidak ditemukan."
  exit 1
fi
echo "✅ Composer siap."

cd "$LARAVEL_DIR" || exit 1

# Setup .env if not exists
if [ ! -f ".env" ]; then
  cp .env.example .env
  php artisan key:generate
fi

# Ensure database exists and migrated
if [ ! -f "database/database.sqlite" ]; then
  touch database/database.sqlite
  echo "🌱 Menyiapkan database SQLite dan data demo..."
  php artisan migrate:fresh --seed --force
fi

echo ""
echo "🚀 Menjalankan ITSM Server di http://localhost:8000"
echo "------------------------------------------"
echo "Akun Super Administrator:"
echo "  👑 Email:    admin@itsm.com"
echo "  🔑 Password: admin123"
echo "------------------------------------------"
echo "Tekan Ctrl+C untuk menghentikan server."
echo ""

php -d opcache.enable_cli=0 -d opcache.enable=0 artisan serve --host=127.0.0.1 --port=8000
