#!/bin/bash
# Localden VPS'e dosya yükle (git clone gerekmez)
# Kullanım: bash scripts/upload.sh
set -e

REMOTE="root@72.60.32.144"
REMOTE_DIR="/var/www/fitnesspaneli.com/app"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)/"

echo "▶ Dosyalar yükleniyor → $REMOTE:$REMOTE_DIR"

rsync -avz --progress \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.git/' \
  --exclude '.env*' \
  --exclude 'public/uploads/' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  --exclude 'tsconfig.tsbuildinfo' \
  "$LOCAL_DIR" \
  "$REMOTE:$REMOTE_DIR"

echo ""
echo "✓ Upload tamamlandı."
echo ""
echo "Şimdi VPS'te şunu çalıştır:"
echo "  ssh $REMOTE"
echo "  cd $REMOTE_DIR && docker compose down && docker compose build && docker compose up -d"
