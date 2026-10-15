#!/usr/bin/env bash
# DB + uploads yedeği — tarihli dosyalar üretir, eskileri budar.
#
# Kullanım:
#   scripts/backup.sh [hedef-dizin]          # varsayılan: ./backups
#
# Prod (VPS):  scripts/backup.sh /var/backups/kutahyasatiliktarla
# Dev (lokal): COMPOSE_FILE=docker-compose.dev.yml scripts/backup.sh backups
#
# Kimlik bilgisi gerekmez: pg_dump, postgres container'ının kendi
# POSTGRES_USER/POSTGRES_DB env'iyle container İÇİNDE koşar.
# Uploads: prod'da app container'ındaki /app/uploads volume'ünden,
# dev'de (app servisi yok) proje kökündeki ./uploads dizininden alınır.
#
# VPS crontab örneği (her gece 03:30, log ile):
#   30 3 * * * cd /var/www/kutahyasatiliktarla/app && ./scripts/backup.sh /var/backups/kutahyasatiliktarla >> /var/log/kst-backup.log 2>&1
# NOT: Yedekler aynı diskte kalmasın — kopyayı düzenli olarak makine dışına
# (object storage / başka sunucu) taşıyan ikinci bir adım şart.
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
RETENTION="${RETENTION:-14}" # tutulacak yedek sayısı (dosya başına tür)
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "[backup] $STAMP — hedef: $BACKUP_DIR (saklama: son $RETENTION)"

# --- 1) Veritabanı (pg_dump custom format: pg_restore ile seçmeli geri yükleme) ---
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
docker compose exec -T postgres sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >"$DB_FILE"
[ -s "$DB_FILE" ] || {
  echo "[backup] HATA: DB dökümü boş" >&2
  rm -f "$DB_FILE"
  exit 1
}
echo "[backup] DB    → $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

# --- 2) Uploads ---
UP_FILE="$BACKUP_DIR/uploads-$STAMP.tgz"
if docker compose ps --services 2>/dev/null | grep -qx app; then
  docker compose exec -T app tar -czf - -C /app/uploads . >"$UP_FILE"
elif [ -d ./uploads ]; then
  tar -czf "$UP_FILE" -C ./uploads .
else
  echo "[backup] uyarı: uploads kaynağı yok (app servisi de ./uploads da bulunamadı) — atlandı"
  UP_FILE=""
fi
[ -n "$UP_FILE" ] && echo "[backup] media → $UP_FILE ($(du -h "$UP_FILE" | cut -f1))"

# --- 3) Budama: her türden yalnızca son $RETENTION dosya kalır ---
prune() {
  # macOS/BSD ve GNU ile uyumlu: yeniden eskiye sırala, ilk N'i atla → kalanlar silinecek eskiler
  ls -1 "$BACKUP_DIR"/$1 2>/dev/null | sort -r | tail -n +"$((RETENTION + 1))"
}
for pattern in 'db-*.dump' 'uploads-*.tgz'; do
  prune "$pattern" | while read -r old; do
    [ -n "$old" ] && rm -f "$old" && echo "[backup] budandı: $old"
  done
done

echo "[backup] tamam."
