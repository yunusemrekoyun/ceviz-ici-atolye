#!/usr/bin/env bash
# Mac'te çalışır. Temiz çalışma ağacından test edilmiş bir sürüm paketi üretir.
# Kullanım: deploy/scripts/paketle.sh [commit]
#   commit verilmezse HEAD paketlenir. Verilirse o commit geçici bir çalışma
#   ağacında (mevcut node_modules ile) test edilip derlenir; sürümleri gruplar
#   hâlinde dağıtmak için.
# Çıktı: /tmp/oldsocks-release-<commit>.tar.gz ve yanında .sha256
set -euo pipefail
umask 077

root="$(cd "$(dirname "$0")/../.." && pwd)"
api_url="https://api.oldscks.com/api/v1"
media_origin="https://media.oldscks.com"
cd "$root"

ref="${1:-HEAD}"
commit="$(git rev-parse --short "$ref^{commit}")"
if [[ "$ref" == "HEAD" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Çalışma ağacı temiz değil; önce commit edin." >&2
    exit 1
  fi
else
  # Eski bir commit: geçici çalışma ağacında derlenir, bağımlılıklar bu klasörden bağlanır.
  worktree="$(mktemp -d /tmp/oldsocks-paket-agac-${commit}.XXXXXX)"
  git worktree add --detach "$worktree" "$commit" >/dev/null
  cleanup_worktree() { git -C "$root" worktree remove --force "$worktree" >/dev/null 2>&1 || true; }
  trap cleanup_worktree EXIT
  ln -s "$root/backend/node_modules" "$worktree/backend/node_modules"
  ln -s "$root/frontend/node_modules" "$worktree/frontend/node_modules"
  cd "$worktree"
fi
echo "==> Paketlenen commit: $commit"

echo "==> Backend testleri"
(cd backend && npm test >/tmp/oldsocks-paket-backend-test.log 2>&1) || {
  tail -30 /tmp/oldsocks-paket-backend-test.log >&2
  echo "Backend testleri başarısız." >&2
  exit 1
}

echo "==> Entegrasyon testleri (yerel MongoDB: dev/yerel-ortam.sh baslat)"
(cd backend && npm run test:integration >/tmp/oldsocks-paket-integration.log 2>&1) || {
  tail -30 /tmp/oldsocks-paket-integration.log >&2
  echo "Entegrasyon testleri başarısız veya yerel MongoDB kapalı (dev/yerel-ortam.sh baslat)." >&2
  exit 1
}

echo "==> Arayüz: lint, testler, üretim derlemesi"
(
  cd frontend
  npm run lint >/tmp/oldsocks-paket-lint.log 2>&1
  node --test src/utils/*.test.js >/tmp/oldsocks-paket-frontend-test.log 2>&1
  VITE_API_BASE_URL="$api_url" VITE_MEDIA_ORIGIN="$media_origin" npm run build >/tmp/oldsocks-paket-build.log 2>&1
  node scripts/precompress.mjs dist >>/tmp/oldsocks-paket-build.log 2>&1
) || {
  echo "Arayüz kontrolü başarısız; /tmp/oldsocks-paket-*.log dosyalarına bakın." >&2
  exit 1
}

index_js="$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' frontend/dist/index.html | head -1)"
[[ -n "$index_js" ]] || { echo "index.html içinde giriş dosyası bulunamadı." >&2; exit 1; }
grep -Rqs "$api_url" frontend/dist/assets || { echo "Derlemede üretim API adresi yok." >&2; exit 1; }
if grep -RqsE 'localhost:5050|localhost:5173|127\.0\.0\.1:5050' frontend/dist; then
  echo "Derleme yerel API adresi içeriyor." >&2
  exit 1
fi

stage="$(mktemp -d /tmp/oldsocks-paket-${commit}.XXXXXX)"
trap 'rm -rf "$stage"; if declare -f cleanup_worktree >/dev/null; then cleanup_worktree; fi' EXIT
git archive "$commit" backend deploy | tar -xf - -C "$stage"
mkdir -p "$stage/frontend"
cp -R frontend/dist "$stage/frontend/dist"
cat > "$stage/RELEASE.txt" <<EOF
commit=$commit
index_js=$index_js
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

# Çalışma dizini gizli (umask 077) oluşturulur; paketin içindeki izinler sunucudaki
# gibi olsun: arayüz herkese okunur, diğerleri sahip ve grup.
chmod -R u=rwX,go=rX "$stage/frontend"
chmod -R u=rwX,g=rX,o= "$stage/backend" "$stage/deploy" "$stage/RELEASE.txt"
package="/tmp/oldsocks-release-${commit}.tar.gz"
COPYFILE_DISABLE=1 tar -czf "$package" -C "$stage" backend deploy frontend RELEASE.txt
if tar -tzf "$package" | grep -qE '(^|/)(\.env[^/]*|node_modules|\.git)(/|$)'; then
  rm -f "$package"
  echo "Pakette .env, node_modules veya .git bulundu; paket silindi." >&2
  exit 1
fi
shasum -a 256 "$package" | awk '{print $1}' > "$package.sha256"

echo
echo "PAKET=$package"
echo "SHA256=$(cat "$package.sha256")"
echo "COMMIT=$commit  GIRIS=$index_js"
