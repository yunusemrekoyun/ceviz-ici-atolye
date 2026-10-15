#!/usr/bin/env bash
# Extracts the landing page hero video into WebP frame sequences used for scroll scrubbing.
# Requires ffmpeg and cwebp (brew install ffmpeg webp / apt install ffmpeg webp).
# Usage: scripts/extract-frames.sh path/to/video.mp4 [frame_count]
set -euo pipefail

VIDEO="${1:?usage: $0 video.mp4 [frame_count]}"
COUNT="${2:-120}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/landing/frames"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

command -v ffmpeg >/dev/null || { echo "ffmpeg is required"; exit 1; }
command -v cwebp  >/dev/null || { echo "cwebp is required"; exit 1; }

DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
FPS=$(python3 -c "print(($COUNT - 1) / $DURATION)")

rm -rf "$OUT"
mkdir -p "$OUT/lg" "$OUT/sm" "$TMP/lg" "$TMP/sm"

# lg: desktop (1280x720), sm: phones (640x360)
ffmpeg -v error -y -i "$VIDEO" -vf "fps=$FPS,scale=1280:-2" -frames:v "$COUNT" "$TMP/lg/f-%03d.png"
ffmpeg -v error -y -i "$VIDEO" -vf "fps=$FPS,scale=640:-2"  -frames:v "$COUNT" "$TMP/sm/f-%03d.png"

for size in lg sm; do
  q=78; [ "$size" = "sm" ] && q=72
  for png in "$TMP/$size"/*.png; do
    name="$(basename "${png%.png}")"
    cwebp -quiet -q "$q" -m 6 "$png" -o "$OUT/$size/$name.webp"
  done
done

# poster shown before the frames are loaded
cp "$OUT/lg/f-001.webp" "$OUT/poster.webp"

# frame count read by the landing page component
N=$(ls "$OUT/lg" | wc -l | tr -d ' ')
printf '{ "count": %s, "width": 1280, "height": 720 }\n' "$N" > "$OUT/manifest.json"

echo "lg: $(ls "$OUT/lg" | wc -l | tr -d ' ') frames, $(du -sh "$OUT/lg" | cut -f1)"
echo "sm: $(ls "$OUT/sm" | wc -l | tr -d ' ') frames, $(du -sh "$OUT/sm" | cut -f1)"
