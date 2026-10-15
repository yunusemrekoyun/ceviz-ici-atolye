import { writeFile, rm } from 'node:fs/promises';
import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireUser } from '@/lib/auth-guards';
import { redisConnection } from '@/lib/redis';
import { IMAGE_EXTS, ensureMediaDir, mediaFilePath, mediaUrl, safeExt } from '@/lib/media-store';

const MAX_BYTES = 5 * 1024 * 1024; // ekran görüntüsü için 5 MB yeter
const MAX_WIDTH = 2000; // SS için fazlası gereksiz — dev orijinaller küçültülür
const FOLDER = 'sikayet'; // /m/sikayet/... altından servis edilir

/** Şikayet ekran görüntüsü yükleme (üye) — tek dosya.
 * Üye yüklemesi olduğu için içerik sharp ile çözülüp webp'e yeniden kodlanır:
 * uzantı beyanına güvenilmez (bozuk/maskeli dosya 400 alır) ve EXIF/GPS
 * metaverisi çıktıya taşınmaz.
 * POST /api/hesap/sikayet-gorsel?filename=ss.png → { url } */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    const session = await requireUser();
    userId = session.user.id;
  } catch {
    return NextResponse.json({ error: 'Giriş yapın.' }, { status: 401 });
  }

  try {
    const key = `sikayet:rl:${userId}`;
    const count = await redisConnection.incr(key);
    if (count === 1) await redisConnection.expire(key, 3600);
    if (count > 10) {
      return NextResponse.json(
        { error: 'Çok fazla deneme — sonra tekrar deneyin.' },
        { status: 429 },
      );
    }
  } catch {
    // Redis düşükse engelleme
  }

  const filename = request.nextUrl.searchParams.get('filename') ?? '';
  if (!safeExt(filename, IMAGE_EXTS)) {
    return NextResponse.json({ error: 'jpg, png veya webp yükleyin.' }, { status: 400 });
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES || !request.body) {
    return NextResponse.json({ error: 'Dosya en fazla 5 MB olabilir.' }, { status: 413 });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      return NextResponse.json({ error: 'Dosya en fazla 5 MB olabilir.' }, { status: 413 });
    }
    chunks.push(value);
  }
  if (total === 0) {
    return NextResponse.json({ error: 'Dosya boş.' }, { status: 400 });
  }

  let processed: Buffer;
  try {
    // rotate(): EXIF yön bilgisini piksele uygular; metadata kopyalanmadığı
    // için (withMetadata yok) EXIF/GPS çıktıda bulunmaz.
    processed = await sharp(Buffer.concat(chunks))
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'Geçerli bir görsel dosyası yükleyin.' }, { status: 400 });
  }

  const name = `${userId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const filePath = mediaFilePath(FOLDER, name);
  try {
    await ensureMediaDir(FOLDER);
    await writeFile(filePath, processed);
    return NextResponse.json({ ok: true, url: mediaUrl(FOLDER, name) });
  } catch (err) {
    console.error('[şikayet] yükleme hatası:', err);
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: 'Yükleme başarısız.' }, { status: 500 });
  }
}
