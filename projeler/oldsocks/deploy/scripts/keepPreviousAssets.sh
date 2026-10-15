#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Kullanım: $0 ONCEKI_WWW YENI_WWW" >&2
  exit 2
fi

previous="$1"
current="$2"

if [[ ! -d "$previous/assets" || ! -d "$current/assets" ]]; then
  echo "Her iki sürümün assets dizini bulunmalı." >&2
  exit 1
fi

# Eski açık sekmeler kendi derleme sürümlerinin hash'li JS/CSS dosyalarını ister.
# Yeni sürümün dosyalarını değiştirmeden eskileri erişilebilir tut.
cp -a --update=none "$previous/assets/." "$current/assets/"
echo "Önceki sürümün statik dosyaları korundu."
