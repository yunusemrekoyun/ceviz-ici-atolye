#!/bin/bash
# VPS'te çalıştır: bash scripts/deploy.sh
# (Localden upload.sh ile yeni dosyalar geldikten sonra)
set -e

APP_DIR="/var/www/fitnesspaneli.com/app"
cd "$APP_DIR"

echo "▶ Docker yeniden derleniyor..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo "✓ Deploy tamamlandı."
docker ps | grep fitnesspaneli
