#!/usr/bin/env bash
# Mac'te, repo kökünde çalışır. Ürün paylaşım önizlemesi için www.oldscks.com Nginx ayarına
# /product-details/ bloğunu ekler (deploy/nginx/product-share-location.conf).
# Kullanım: deploy/scripts/urun-onizleme-nginx.sh
# Önce yedek alır; blok snippets/oldscks-urun-onizleme.conf olarak yazılır ve www 443 bloğundaki
# "location /" öncesine tek include satırı eklenir. nginx -t geçmezse eski ayar geri konur.
# Tekrar çalıştırmak güvenlidir (include ikinci kez eklenmez, blok güncellenir).
set -euo pipefail

server="${OLDSOCKS_SERVER:-root@82.25.117.135}"
source_file="deploy/nginx/product-share-location.conf"
[[ -f "$source_file" ]] || { echo "HATA: $source_file yok (repo kökünden çalıştırın)." >&2; exit 1; }
snippet_b64="$(base64 < "$source_file" | tr -d '\n')"

ssh "$server" bash -s -- "$snippet_b64" <<'REMOTE'
set -Eeuo pipefail
conf=/etc/nginx/sites-available/www.oldscks.com.conf
snippet=/etc/nginx/snippets/oldscks-urun-onizleme.conf
backup="$conf.onizleme-oncesi"
[[ -f "$conf" ]] || { echo "HATA: $conf yok." >&2; exit 1; }

had_snippet=0
[[ -f "$snippet" ]] && { had_snippet=1; cp -p "$snippet" "$snippet.onceki"; }
cp -p "$conf" "$backup"

restore() {
  cp -p "$backup" "$conf"
  if [[ "$had_snippet" == 1 ]]; then mv "$snippet.onceki" "$snippet"; else rm -f "$snippet"; fi
  echo "Eski ayar geri kondu; site etkilenmedi." >&2
}

printf '%s' "$1" | base64 -d > "$snippet"

if ! grep -q 'snippets/oldscks-urun-onizleme.conf' "$conf"; then
  # www 443 bloğundaki SPA konumu: "  location / {" + "    expires -1;"
  perl -0pi -e 's/(\n  location \/ \{\n    expires -1;)/\n  include snippets\/oldscks-urun-onizleme.conf;\n$1/' "$conf"
fi
if [[ "$(grep -c 'snippets/oldscks-urun-onizleme.conf' "$conf")" != 1 ]]; then
  echo "HATA: ayar dosyasında beklenen 'location /' bölümü bulunamadı." >&2
  restore
  exit 1
fi

if nginx -t; then
  systemctl reload nginx
  rm -f "$snippet.onceki"
  echo "Tamam: ürün sayfası önizlemesi etkin (yedek: $backup)."
else
  restore
  exit 1
fi
REMOTE

echo "Kontrol: curl -s https://www.oldscks.com/product-details/<ürün-id> | grep og:image"
