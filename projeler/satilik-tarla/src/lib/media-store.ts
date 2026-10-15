// Yüklenen medyanın disk düzeni — app (upload/serve) ve worker (işleme) ortak
// kullanır; bu yüzden 'server-only' işaretli DEĞİL (worker Next dışında koşar).
// Düzen: {UPLOAD_DIR}/{listingId}/{mediaId}-{ek}.{uzantı}
//   orijinal: {mediaId}-orig.{ext} · varyant: {mediaId}-{width}.webp
//   video posteri: {mediaId}-poster.jpg
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');

export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const VIDEO_EXTS = ['mp4'] as const;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
/** Büyükten küçüğe — variants[0] her zaman en büyük webp olur. */
export const VARIANT_WIDTHS = [1600, 960, 480] as const;

const SEGMENT_RE = /^[A-Za-z0-9][\w.-]*$/;

/** Dosya adından güvenli küçük-harf uzantı; listede yoksa null. */
export function safeExt(filename: string, allowed: readonly string[]): string | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const norm = ext === 'jpeg' ? 'jpg' : ext;
  return allowed.includes(norm) ? norm : null;
}

export function isSafeSegment(s: string): boolean {
  return SEGMENT_RE.test(s) && !s.includes('..');
}

export function mediaDir(listingId: string): string {
  return path.join(UPLOAD_DIR, listingId);
}

export function mediaFilePath(listingId: string, fileName: string): string {
  return path.join(mediaDir(listingId), fileName);
}

export function mediaUrl(listingId: string, fileName: string): string {
  return `/m/${listingId}/${fileName}`;
}

export async function ensureMediaDir(listingId: string): Promise<string> {
  const dir = mediaDir(listingId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Bir medya kaydının diskteki tüm dosyalarını siler ({mediaId}-*). */
export async function removeMediaFiles(listingId: string, mediaId: string): Promise<void> {
  const dir = mediaDir(listingId);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return; // klasör hiç oluşmamış
  }
  await Promise.all(
    names
      .filter((n) => n.startsWith(`${mediaId}-`))
      .map((n) => rm(path.join(dir, n), { force: true })),
  );
}

/** İlanın tüm medya klasörünü siler (ilan silinirken). */
export async function removeListingDir(listingId: string): Promise<void> {
  await rm(mediaDir(listingId), { recursive: true, force: true });
}

export const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  png: 'image/png',
  mp4: 'video/mp4',
};
