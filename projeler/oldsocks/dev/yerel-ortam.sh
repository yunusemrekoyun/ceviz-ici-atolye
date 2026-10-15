#!/usr/bin/env bash
# Canlıdan yalıtılmış yerel geliştirme ortamı.
# Mevcut backend/.env dosyasına dokunmaz; ayrı bir backend/.env.docker.local kullanır.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
compose=(docker compose -f "$root/dev/docker-compose.yml")
env_file="$root/backend/.env.docker.local"
media_root="$root/storage/dev-media"

guvenlik_kontrolu() {
  if grep -qiE 'mongodb\.net|oldscks\.com' "$env_file"; then
    echo "Durdu: $env_file canlı veya Atlas adresi içeriyor." >&2
    exit 1
  fi
}

ortam_dosyasi() {
  [[ -f "$env_file" ]] && return
  umask 077
  local r1 r2
  r1="$(openssl rand -hex 32)"
  r2="$(openssl rand -hex 32)"
  # backend/.env'de bulunabilecek bütün anahtarlar burada açıkça tanımlı.
  # Böylece bir betik yanlışlıkla .env'i yüklese bile canlı değerler geçmez.
  cat > "$env_file" <<EOF
NODE_ENV=development
PORT=5050
MONGO_URI=mongodb://127.0.0.1:27117/oldsocks_dev?directConnection=true
FRONTEND_ORIGIN=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:5050
JWT_SECRET=$r1
JWT_REFRESH_SECRET=$r2
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PAY_PROVIDER=mock
PAYTR_TEST_MODE=1
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
IYZIPAY_API_KEY=
IYZIPAY_SECRET_KEY=
IYZIPAY_BASE_URL=
RAPIDAPI_KEY=
RAPIDAPI_HOST=
MAIL_FROM=magaza@oldscks.local
MAIL_TO=yonetici@oldscks.local
ADMIN_EMAILS=yonetici@oldscks.local
MAIL_PASS=
SMTP_HOST=127.0.0.1
SMTP_PORT=1126
SMTP_SECURE=false
SMTP_USER=yerel
SMTP_PASS=yerel
MEDIA_ROOT=$media_root
MEDIA_PUBLIC_BASE_URL=http://localhost:5050/media
MEDIA_INLINE_WORKER=true
MEDIA_SHARED_VOLUME=true
MEDIA_RESERVE_PERCENT=5
MEDIA_RESERVE_BYTES=5368709120
BACKUP_KEY_FILE=$root/storage/dev-backup/master.key
EOF
  mkdir -p "$media_root" "$root/storage/dev-backup"
  chmod 700 "$root/storage/dev-backup"
  echo "Oluşturuldu: $env_file"
}

ortami_yukle() {
  # Kabuk olarak kaynak göstermek yerine satır satır oku: yollarda boşluk olabilir.
  local key value
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
    export "$key=$value"
  done < "$env_file"
}

baslat() {
  "${compose[@]}" up -d --wait
  "${compose[@]}" exec -T mongo mongosh --quiet --eval '
    try { rs.status().ok } catch (e) {
      rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] }).ok
    }' >/dev/null
  ortam_dosyasi
  guvenlik_kontrolu
  cat <<EOF
Yerel ortam hazır.
  MongoDB : mongodb://127.0.0.1:27117/?directConnection=true
  Mailpit : http://127.0.0.1:8126 (giden e-postalar)
  API     : dev/yerel-ortam.sh api
  Arayüz  : cd frontend && npm run dev   (frontend/.env → http://localhost:5050/api/v1)
EOF
}

api() {
  guvenlik_kontrolu
  cd "$root/backend"
  ortami_yukle
  OLDSOCKS_ENV_FILE="$env_file" exec node server.js
}

ornek_veri() {
  guvenlik_kontrolu
  local seed="$root/backend/scripts/seedDemoData.local.js"
  if [[ ! -f "$seed" ]]; then
    echo "Örnek veri betiği yok: $seed" >&2
    exit 1
  fi
  local images="$root/storage/dev-seed-images"
  mkdir -p "$images/hero"
  local i=0 name size
  while IFS= read -r name; do
    i=$((i + 1))
    [[ "$name" == hero/* ]] && size="1920x1080" || size="1200x1500"
    [[ -f "$images/$name" ]] || ffmpeg -loglevel error -y -f lavfi -i "testsrc2=size=${size},hue=h=$(( (i * 37) % 360 ))" -frames:v 1 -q:v 3 "$images/$name"
  done < <(grep -oE '"[^"]+\.(jpg|jpeg)"' "$seed" | tr -d '"' | sort -u)
  cd "$root/backend"
  ortami_yukle
  DEMO_IMAGE_ROOT="$images" DEMO_API_BASE="http://localhost:5050/api/v1" node "$seed"
}

durdur() { "${compose[@]}" stop; }
sifirla() { "${compose[@]}" down -v; rm -rf "$root/storage/dev-media"; echo "Yerel veritabanı ve medya silindi."; }

case "${1:-}" in
  baslat) baslat ;;
  api) api ;;
  ornek-veri) ornek_veri ;;
  durdur) durdur ;;
  sifirla) sifirla ;;
  *) echo "Kullanım: dev/yerel-ortam.sh baslat | api | ornek-veri | durdur | sifirla" >&2; exit 2 ;;
esac
