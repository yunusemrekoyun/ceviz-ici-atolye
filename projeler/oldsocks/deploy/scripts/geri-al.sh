#!/usr/bin/env bash
# Mac'te çalışır. Başarılı bir dağıtımdan sonra sorun çıkarsa önceki sürüme döner.
# Kullanım: deploy/scripts/geri-al.sh /home/oldscks/deploy-backups/<etiket>
# (dagit.sh çıktısındaki GERI_DONUS_DIZINI). Kodu geri alır; açık stok ayrımlarını önceden bırakır,
# başka veriye dokunmaz.
set -euo pipefail

server="${OLDSOCKS_SERVER:-root@82.25.117.135}"
dir="${1:-}"
[[ "$dir" =~ ^/home/oldscks/deploy-backups/[0-9a-f]{7,12}-[0-9]{8}T[0-9]{6}Z$ ]] || { echo "Kullanım: $0 /home/oldscks/deploy-backups/<etiket>" >&2; exit 2; }

ssh "$server" bash -s -- "$dir" <<'REMOTE'
set -Eeuo pipefail
dir="$1"
app='/home/oldscks/app'
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
pm2_as_app() { sudo -u oldscks -H pm2 "$@"; }
trap 'echo "GERI_ALMA_YARIDA_KALDI: $app/api ve $app/www dizinlerini ve pm2 durumunu kontrol edin." >&2; pm2_as_app restart oldscks-media --update-env >/dev/null 2>&1 || true' ERR

[[ -d "$dir/api" && -f "$dir/api/server.js" && -f "$dir/www/index.html" ]] || { echo "Geri dönüş dizini eksik: $dir" >&2; exit 1; }
pm2_as_app stop oldscks-media
# Çalışan sürüm stok ayrımı kullanıyorsa: yeni ödeme oturumu açılmasın diye API durdurulur,
# açık ayrımların stoğu geri verilir (önceki sürüm bunları tanımaz).
if [[ -f "$app/api/scripts/releaseOpenHolds.js" ]]; then
  pm2_as_app stop oldscks-api
  sudo -u oldscks -H bash -c 'cd /home/oldscks/app/api && node scripts/releaseOpenHolds.js'
  echo "Yukarıdaki siparişlere ve dağıtımdan bu yana ödemesi gelmeyen ya da iptal görünen siparişlere 24 saat boyunca PayTR panelinden ödeme gelip gelmediğine bakın."
fi
mv "$app/api" "$dir/geri-alinan-api-$stamp"
mv "$dir/api" "$app/api"
mv "$app/www" "$dir/geri-alinan-www-$stamp"
mv "$dir/www" "$app/www"
pm2_as_app restart oldscks-api --update-env
for attempt in $(seq 1 20); do curl -fs --max-time 2 http://127.0.0.1:5000/readyz >/dev/null && break; sleep 1; done
curl -fsS --max-time 2 http://127.0.0.1:5000/readyz
pm2_as_app restart oldscks-media --update-env
pm2_as_app save
echo
echo "GERI_ALINDI=$dir"
REMOTE
