#!/usr/bin/env bash
# Mac'te çalışır. Cloudflare Turnstile anahtarlarını canlı API'nin .env dosyasına yazar.
# Kullanım: deploy/scripts/turnstile-anahtar.sh
# Anahtarlar komut satırına, geçmişe ya da ekrana düşmez (gizli anahtar yazılırken görünmez);
# sunucuya SSH'nin girişinden gider. Eski TURNSTILE_ satırları yenileriyle değiştirilir,
# bir sorun olursa .env'e dokunulmaz. Yeni kod deploy edilince ya da API yeniden
# başlatılınca devreye girer (eski sürüm bu satırları yok sayar).
set -euo pipefail

server="${OLDSOCKS_SERVER:-root@82.25.117.135}"

read -r -p "Site Key: " site_key
read -r -s -p "Secret Key (yazarken görünmez): " secret_key
echo

for value in "$site_key" "$secret_key"; do
  if [[ -z "$value" || "$value" =~ [[:space:]] || "$value" == *"="* ]]; then
    echo "HATA: anahtarlardan biri boş ya da geçersiz karakter içeriyor; hiçbir şey yazılmadı." >&2
    exit 1
  fi
done

remote=$(cat <<'REMOTE'
set -euo pipefail
f="${TURNSTILE_ENV_FILE:-/home/oldscks/app/api/.env}"
[[ -s "$f" ]] || { echo "HATA: $f bulunamadı; hiçbir şey yazılmadı." >&2; exit 1; }
t="$(mktemp)"
trap 'rm -f "$t"' EXIT
grep -v '^TURNSTILE_' "$f" > "$t" || true
cat >> "$t"
if [[ "$(grep -c '^TURNSTILE_' "$t")" != 2 ]]; then
  echo "HATA: anahtarlar okunamadı; .env değişmedi." >&2
  exit 1
fi
# Aynı dosyanın içeriği yenilenir; sahibi ve izinleri değişmez.
cat "$t" > "$f"
echo "Tamam: .env dosyasında $(grep -c '^TURNSTILE_' "$f") Turnstile satırı var."
REMOTE
)

printf 'TURNSTILE_SITE_KEY=%s\nTURNSTILE_SECRET_KEY=%s\n' "$site_key" "$secret_key" \
  | ssh "$server" "bash -c $(printf '%q' "$remote")"
unset site_key secret_key
