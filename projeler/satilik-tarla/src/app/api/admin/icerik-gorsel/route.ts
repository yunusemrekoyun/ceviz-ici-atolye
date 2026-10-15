import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { once } from 'node:events';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-guards';
import { IMAGE_EXTS, ensureMediaDir, mediaFilePath, mediaUrl, safeExt } from '@/lib/media-store';

const MAX_BYTES = 10 * 1024 * 1024;
const FOLDER = 'icerik'; // hukuki/rehber gövdelerine gömülen görseller

/** Zengin editör görsel yüklemesi (yalnız admin) — ham akış, tek dosya.
 * POST /api/admin/icerik-gorsel?filename=gorsel.jpg → { url } */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 });
  }

  const filename = request.nextUrl.searchParams.get('filename') ?? '';
  const ext = safeExt(filename, IMAGE_EXTS);
  if (!ext) {
    return NextResponse.json({ error: 'jpg, png veya webp yükleyin.' }, { status: 400 });
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES || !request.body) {
    return NextResponse.json({ error: 'Dosya en fazla 10 MB olabilir.' }, { status: 413 });
  }

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = mediaFilePath(FOLDER, name);
  try {
    await ensureMediaDir(FOLDER);
    const reader = request.body.getReader();
    const out = createWriteStream(filePath);
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        out.destroy();
        await rm(filePath, { force: true });
        return NextResponse.json({ error: 'Dosya en fazla 10 MB olabilir.' }, { status: 413 });
      }
      if (!out.write(value)) await once(out, 'drain');
    }
    await new Promise<void>((resolve, reject) => {
      out.end(() => resolve());
      out.on('error', reject);
    });
    if (total === 0) {
      await rm(filePath, { force: true });
      return NextResponse.json({ error: 'Dosya boş.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url: mediaUrl(FOLDER, name) });
  } catch (err) {
    console.error('[içerik görseli] yükleme hatası:', err);
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: 'Yükleme başarısız.' }, { status: 500 });
  }
}
