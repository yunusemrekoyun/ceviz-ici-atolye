#!/usr/bin/env bash
# Mac'te çalışır. Canlı veritabanı ve medyanın yedeğini sunucuda alır, Mac'e indirir
# ve iki tarafta da sağlama toplamıyla doğrular. Canlı siteyi değiştirmez.
set -euo pipefail
umask 077

root="$(cd "$(dirname "$0")/../.." && pwd)"
server="${OLDSOCKS_SERVER:-root@82.25.117.135}"
backup_root="${OLDSOCKS_BACKUP_ROOT:-$(cd "$root/../.." && pwd)/Oldsocks Backups/Canli-Veri}"
export_script="$root/backend/scripts/exportDatabaseBackup.js"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
remote_dir="/root/oldsocks-backup-${stamp}"
local_base="$backup_root/$(date +%F)"

[[ -f "$export_script" ]] || { echo "Dışa aktarma betiği yok: $export_script" >&2; exit 1; }
[[ -d "$backup_root" ]] || { echo "Yerel yedek klasörü yok: $backup_root" >&2; exit 1; }

scp "$export_script" "$server:/home/oldscks/app/api/scripts/exportDatabaseBackup.once.js"

ssh "$server" bash -s -- "$stamp" <<'REMOTE'
set -euo pipefail
umask 077
stamp="$1"
cd /home/oldscks/app/api
backup_dir="/root/oldsocks-backup-${stamp}"
mkdir -m 700 "$backup_dir"
node scripts/exportDatabaseBackup.once.js "$backup_dir/mongodb.ejson.gz"
tar -C /srv/oldscks/media -cf "$backup_dir/media.tar" assets trash quarantine
(
  cd "$backup_dir"
  sha256sum mongodb.ejson.gz media.tar > SHA256SUMS
  sha256sum -c SHA256SUMS
)
gzip -t "$backup_dir/mongodb.ejson.gz"
tar -tf "$backup_dir/media.tar" >/dev/null
printf 'SUNUCU_YEDEGI=%s\n' "$backup_dir"
du -h "$backup_dir"/*
REMOTE

mkdir -p "$local_base"
scp -r "$server:$remote_dir" "$local_base/"
(
  cd "$local_base/oldsocks-backup-${stamp}"
  shasum -a 256 -c SHA256SUMS
  gzip -t mongodb.ejson.gz
  tar -tf media.tar >/dev/null
  printf 'MAC_YEDEGI=%s\n' "$PWD"
  du -h mongodb.ejson.gz media.tar
)
