#!/usr/bin/env bash
# Mac'te çalışır. paketle.sh çıktısını canlıya dağıtır.
# Kullanım: deploy/scripts/dagit.sh /tmp/oldsocks-release-<commit>.tar.gz
# Koşullar: 2 saatten yeni ve doğrulanmış bir yedek (yedek-al.sh), paket özetinin tutması.
# Sunucuda bir kontrol başarısız olursa önceki api ve www dizinleri geri konur.
set -euo pipefail
umask 077

root="$(cd "$(dirname "$0")/../.." && pwd)"
server="${OLDSOCKS_SERVER:-root@82.25.117.135}"
backup_root="${OLDSOCKS_BACKUP_ROOT:-$(cd "$root/../.." && pwd)/Oldsocks Backups/Canli-Veri}"
package="${1:-}"

[[ -f "$package" && -f "$package.sha256" ]] || { echo "Kullanım: $0 /tmp/oldsocks-release-<commit>.tar.gz" >&2; exit 2; }
expected_sha="$(cat "$package.sha256")"
[[ "$(shasum -a 256 "$package" | awk '{print $1}')" == "$expected_sha" ]] || { echo "Paket özeti uyuşmuyor." >&2; exit 1; }

release="$(tar -xOzf "$package" RELEASE.txt)"
commit="$(sed -n 's/^commit=//p' <<<"$release")"
index_js="$(sed -n 's/^index_js=//p' <<<"$release")"
[[ "$commit" =~ ^[0-9a-f]{7,12}$ && "$index_js" =~ ^/assets/index-[A-Za-z0-9_-]+\.js$ ]] || { echo "RELEASE.txt geçersiz." >&2; exit 1; }

latest_backup="$(find "$backup_root" -mindepth 2 -maxdepth 2 -type d -name 'oldsocks-backup-*' -print | sort | tail -n 1)"
[[ -n "$latest_backup" && -f "$latest_backup/SHA256SUMS" ]] || { echo "Doğrulanmış yedek bulunamadı; önce yedek-al.sh çalıştırın." >&2; exit 1; }
backup_age=$(( $(date +%s) - $(stat -f %m "$latest_backup/SHA256SUMS") ))
(( backup_age >= 0 && backup_age <= 7200 )) || { echo "Son yedek iki saatten eski; önce yedek-al.sh çalıştırın." >&2; exit 1; }
(cd "$latest_backup" && shasum -a 256 -c SHA256SUMS && gzip -t mongodb.ejson.gz && tar -tf media.tar >/dev/null)
printf 'DOGRULANMIS_YEDEK=%s\nSURUM=%s GIRIS=%s\n' "$latest_backup" "$commit" "$index_js"

remote_package="/root/oldsocks-release-${commit}.tar.gz"
scp "$package" "$server:$remote_package"
ssh "$server" bash -s -- "$remote_package" "$expected_sha" "$commit" "$index_js" <<'REMOTE'
set -Eeuo pipefail
umask 027

package="$1"; expected_sha="$2"; commit="$3"; index_js="$4"
app='/home/oldscks/app'
api="$app/api"
web="$app/www"
tag="${commit}-$(date -u +%Y%m%dT%H%M%SZ)"
stage="/home/oldscks/deploy-stage/$tag"
backup="/home/oldscks/deploy-backups/$tag"
api_moved=0
web_moved=0
worker_stopped=0
succeeded=0

pm2_as_app() { sudo -u oldscks -H pm2 "$@"; }
site() { curl -ksS --max-time 10 --resolve www.oldscks.com:443:127.0.0.1 "$@"; }

rollback() {
  local code=$?
  trap - ERR INT TERM EXIT
  set +e
  if [[ "$succeeded" -eq 1 ]]; then exit 0; fi
  if [[ "$api_moved" -eq 0 && "$web_moved" -eq 0 ]]; then
    if [[ "$worker_stopped" -eq 1 ]]; then pm2_as_app restart oldscks-media --update-env; pm2_as_app save; fi
    echo 'Hazırlık başarısız oldu; canlı uygulama değişmedi.' >&2
    exit "$code"
  fi
  echo 'Dağıtım kontrolü başarısız; önceki sürüm geri yükleniyor.' >&2
  if [[ "$web_moved" -eq 1 ]]; then
    if [[ -d "$web" ]]; then mv "$web" "$backup/failed-www"; fi
    mv "$backup/www" "$web"
  fi
  if [[ "$api_moved" -eq 1 ]]; then
    if [[ -d "$api" ]]; then mv "$api" "$backup/failed-api"; fi
    mv "$backup/api" "$api"
    pm2_as_app restart oldscks-api --update-env
  fi
  if [[ "$worker_stopped" -eq 1 ]]; then pm2_as_app restart oldscks-media --update-env; fi
  pm2_as_app save
  echo "GERI_DONUS_DIZINI=$backup" >&2
  exit "$code"
}
trap rollback ERR INT TERM EXIT

# --- Ön koşullar (canlıya dokunmadan) ---
[[ "$(id -u)" -eq 0 ]]
[[ -f "$api/server.js" && -s "$api/.env" && -f "$web/index.html" ]]
previous_index="$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' "$web/index.html" | head -1)"
[[ -n "$previous_index" && -f "$web$previous_index" ]]
[[ "$(sha256sum "$package" | awk '{print $1}')" == "$expected_sha" ]]

install -d -o oldscks -g oldscks -m 0750 /home/oldscks/deploy-stage "$stage"
install -d -o root -g root -m 0700 /home/oldscks/deploy-backups "$backup"
tar --warning=no-unknown-keyword -xzf "$package" -C "$stage"
chown oldscks:oldscks "$stage"
[[ -f "$stage/backend/server.js" && -f "$stage/backend/package-lock.json" && -f "$stage/frontend/dist/index.html" ]]
grep -qx "commit=$commit" "$stage/RELEASE.txt"
grep -qF "$index_js" "$stage/frontend/dist/index.html"
grep -Rqs 'https://api.oldscks.com/api/v1' "$stage/frontend/dist/assets"
if grep -RqsE 'localhost:5050|localhost:5173|127\.0\.0\.1:5050' "$stage/frontend/dist"; then
  echo 'Arayüz paketi üretim dışı API adresi içeriyor.' >&2; exit 1
fi
if find "$stage" -type f -name '.env*' -print -quit | grep -q .; then
  echo 'Paket içinde ortam dosyası bulundu.' >&2; exit 1
fi

pm2_as_app jlist | node -e '
let json=""; process.stdin.on("data",c=>json+=c); process.stdin.on("end",()=>{
  const list=JSON.parse(json);
  for (const [name, expected] of Object.entries({
    "oldscks-api": "/home/oldscks/app/api/server.js",
    "oldscks-media": "/home/oldscks/app/api/media-worker.js",
  })) {
    const item=list.find(p=>p.name===name);
    if (!item || item.pm2_env.pm_exec_path!==expected || item.pm2_env.status!=="online") {
      console.error(`Beklenmeyen PM2 yolu veya durum: ${name}`); process.exitCode=1;
    }
  }
});'

chown -R oldscks:oldscks "$stage/backend" "$stage/frontend/dist"
# Nginx siteyi okuyabilsin: arayüz herkese okunur, API kodu yalnız uygulama kullanıcısı ve
# grubuna. (.env aşağıda 0600 olarak ayrıca yerleşir.)
chmod -R u=rwX,go=rX "$stage/frontend/dist"
chmod -R u=rwX,g=rX,o= "$stage/backend"
install -o oldscks -g oldscks -m 0600 "$api/.env" "$stage/backend/.env"
sudo -u oldscks -H bash -c 'set -euo pipefail; cd "$1"; npm ci --omit=dev --no-audit --no-fund' bash "$stage/backend"
sudo -u oldscks -H bash -c '
  set -euo pipefail; cd "$1"
  node --check server.js; node --check media-worker.js
  node --test tests/*.test.js
  node -e '\''require("dotenv").config({quiet:true});
    const e=process.env;
    if (e.PAYTR_TEST_MODE!=="0" || String(e.PAY_PROVIDER||"").toLowerCase()==="mock" || !e.MONGO_URI || !e.PAYTR_MERCHANT_ID || !e.PAYTR_MERCHANT_KEY || !e.PAYTR_MERCHANT_SALT) {
      console.error("Üretim ortam değişkenleri beklenen durumda değil."); process.exit(1);
    }'\''
' bash "$stage/backend"
nginx -t

# Açık sekmeler için önceki sürümün hash'li dosyalarını yeni derlemeye taşı.
bash "$stage/deploy/scripts/keepPreviousAssets.sh" "$web" "$stage/frontend/dist"
# Geçişten önce: Nginx kullanıcısı yeni arayüz dosyalarını okuyabiliyor mu?
nginx_user="$(awk '$1=="user"{gsub(";","",$2); print $2; exit}' /etc/nginx/nginx.conf)"
if [[ -n "$nginx_user" ]] && id "$nginx_user" >/dev/null 2>&1; then
  sudo -u "$nginx_user" test -r "$stage/frontend/dist/index.html"
  sudo -u "$nginx_user" test -r "$stage/frontend/dist$index_js"
fi

# --- Geçiş ---
pm2_as_app stop oldscks-media
worker_stopped=1
mv "$api" "$backup/api"
api_moved=1
mv "$stage/backend" "$api"
pm2_as_app restart oldscks-api --update-env
ready=0
for attempt in $(seq 1 20); do
  if curl -fs --max-time 2 http://127.0.0.1:5000/readyz >/dev/null; then ready=1; break; fi
  sleep 1
done
[[ "$ready" -eq 1 ]]
curl -fsS --max-time 8 http://127.0.0.1:5000/api/v1/storefront | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const x=JSON.parse(s); if(!Array.isArray(x.sectionOrder)) process.exit(1)})'
curl -fsS --max-time 15 'http://127.0.0.1:5000/api/v1/products?view=compact' | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{if(!Array.isArray(JSON.parse(s))) process.exit(1)})'
curl -fsS --max-time 8 http://127.0.0.1:5000/api/v1/site-content | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{if(!JSON.parse(s).about) process.exit(1)})'
[[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1:5000/api/v1/site-content/admin)" == '401' ]]
echo 'API_KONTROLLERI=tamam'

mv "$web" "$backup/www"
web_moved=1
mv "$stage/frontend/dist" "$web"
html="$(site -f "https://www.oldscks.com/?release=$tag")"
grep -qF "$index_js" <<<"$html"
site -f -o /dev/null "https://www.oldscks.com$index_js"
site -f -o /dev/null "https://www.oldscks.com$previous_index"
headers="$(site -D - -o /dev/null https://www.oldscks.com/)"
grep -qi '^cache-control: no-cache' <<<"$headers"
echo 'ARAYUZ_KONTROLLERI=tamam'

pm2_as_app restart oldscks-media --update-env
sleep 2
pm2_as_app jlist | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{for(const n of ["oldscks-api","oldscks-media"]){const v=JSON.parse(s).find(x=>x.name===n); if(!v||v.pm2_env.status!=="online") process.exitCode=1; else console.log(n,"online")}})'
pm2_as_app save

succeeded=1
trap - ERR INT TERM EXIT

# --- Temizlik (başarılı dağıtımdan sonra) ---
rm -rf "$stage"
# Yalnız kod ve arayüz kopyası tutan geri dönüş dizinleri; en yeni 5'i kalır.
(cd /home/oldscks/deploy-backups && ls -1 | grep -E '^[0-9a-f]{7,12}-[0-9]{8}T[0-9]{6}Z$' | sort -t- -k2 | head -n -5 | xargs -r rm -rf --)
ls -1t /root/oldsocks-release-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f --

printf 'YENI_SURUM=%s\nONCEKI_GIRIS=%s\nGERI_DONUS_DIZINI=%s\n' "$commit" "$previous_index" "$backup"
REMOTE

tag="canli-$(date +%Y%m%d-%H%M)"
if git -C "$root" rev-parse -q --verify "$commit^{commit}" >/dev/null; then
  git -C "$root" tag -a "$tag" "$commit" -m "Deploy $commit"
  echo "Yerel etiket: $tag (git push origin $tag ile gönderin)"
fi
