#!/usr/bin/env bash
# DB geri yükleme — backup.sh'ın ürettiği .dump dosyasını mevcut veritabanının
# ÜZERİNE yazar (--clean --if-exists: önce nesneleri düşürür).
#
# Kullanım:
#   scripts/restore-db.sh backups/db-20260722-033000.dump
#   COMPOSE_FILE=docker-compose.dev.yml scripts/restore-db.sh backups/db-....dump
#
# Güvenlik: yıkıcı işlem — onay ister. Otomasyonda FORCE=1 ile geçilir.
set -euo pipefail

DUMP="${1:?Kullanım: scripts/restore-db.sh <db-dosyası.dump>}"
[ -s "$DUMP" ] || {
  echo "[restore] HATA: '$DUMP' yok ya da boş" >&2
  exit 1
}

TARGET="$(docker compose exec -T postgres sh -c 'echo "$POSTGRES_DB"' | tr -d '\r')"
if [ "${FORCE:-0}" != "1" ]; then
  printf "[restore] '%s' dökümü '%s' veritabanının ÜZERİNE yazılacak. Onay için veritabanı adını yazın: " "$DUMP" "$TARGET"
  read -r answer
  [ "$answer" = "$TARGET" ] || {
    echo "[restore] iptal edildi." >&2
    exit 1
  }
fi

docker compose exec -T postgres sh -c \
  'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <"$DUMP"

echo "[restore] tamam — '$TARGET' geri yüklendi. Uygulama cache'i için /api/revalidate çağırmayı unutmayın."
