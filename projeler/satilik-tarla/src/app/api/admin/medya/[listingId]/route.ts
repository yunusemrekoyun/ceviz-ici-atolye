import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { once } from 'node:events';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { TAGS } from '@/lib/cache-tags';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';
import { mediaQueue } from '@/lib/queue';
import {
  IMAGE_EXTS,
  VIDEO_EXTS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  ensureMediaDir,
  mediaFilePath,
  mediaUrl,
  safeExt,
} from '@/lib/media-store';

const MAX_MEDIA = 25;

/** Admin medya yükleme — gövde HAM dosya akışıdır (multipart değil: video
 * RAM'e sığmak zorunda kalmasın). Meta, query'den gelir:
 * POST /api/admin/medya/{listingId}?type=image|video&filename=foo.jpg */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    const code = e instanceof Error && e.message === 'UNAUTHORIZED' ? 401 : 403;
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: code });
  }

  const { listingId } = await params;
  const type = request.nextUrl.searchParams.get('type');
  const filename = request.nextUrl.searchParams.get('filename') ?? '';
  if (type !== 'image' && type !== 'video') {
    return NextResponse.json({ error: 'Geçersiz medya türü.' }, { status: 400 });
  }

  const ext = safeExt(filename, type === 'image' ? IMAGE_EXTS : VIDEO_EXTS);
  if (!ext) {
    return NextResponse.json(
      {
        error:
          type === 'image'
            ? 'Görsel için jpg, png veya webp yükleyin.'
            : 'Video için mp4 yükleyin.',
      },
      { status: 400 },
    );
  }

  const cap = type === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > cap) {
    return NextResponse.json(
      { error: `Dosya çok büyük (en fazla ${Math.round(cap / 1024 / 1024)} MB).` },
      { status: 413 },
    );
  }
  if (!request.body) {
    return NextResponse.json({ error: 'Dosya gövdesi boş.' }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true, _count: { select: { media: true } } },
  });
  if (!listing) {
    return NextResponse.json({ error: 'İlan bulunamadı.' }, { status: 404 });
  }
  if (listing._count.media >= MAX_MEDIA) {
    return NextResponse.json(
      { error: `En fazla ${MAX_MEDIA} medya öğesi eklenebilir.` },
      { status: 409 },
    );
  }
  if (type === 'video') {
    const existing = await prisma.media.findFirst({
      where: { listingId, type: 'video' },
      select: { id: true, variants: true },
    });
    if (existing) {
      const url = ((existing.variants as { url?: string }[] | null)?.[0]?.url ?? '').trim();
      if (url.startsWith('/m/')) {
        return NextResponse.json(
          { error: 'Zaten yüklenmiş bir video var — önce onu silin.' },
          { status: 409 },
        );
      }
      // Harici URL videosu yüklenen gerçek dosyayla değiştirilir
      await prisma.media.delete({ where: { id: existing.id } });
    }
  }

  // Satır önce açılır (dosya adı mediaId'den türetilir), yazım başarısızsa geri alınır
  const row = await prisma.media.create({
    data: { listingId, type, variants: [], position: listing._count.media },
  });
  const fileName = `${row.id}-orig.${ext}`;
  const filePath = mediaFilePath(listingId, fileName);

  try {
    await ensureMediaDir(listingId);
    const reader = request.body.getReader();
    const out = createWriteStream(filePath);
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > cap) throw new Error('TOO_LARGE');
        if (!out.write(value)) await once(out, 'drain');
      }
      await new Promise<void>((resolve, reject) => {
        out.end(() => resolve());
        out.on('error', reject);
      });
    } catch (err) {
      out.destroy();
      await rm(filePath, { force: true });
      throw err;
    }
    if (total === 0) {
      await rm(filePath, { force: true });
      throw new Error('EMPTY');
    }

    const url = mediaUrl(listingId, fileName);
    const updated = await prisma.media.update({
      where: { id: row.id },
      data: { variants: [{ width: 0, format: 'source', url }] },
    });

    try {
      await mediaQueue.add('process', { mediaId: row.id });
    } catch (err) {
      // Kuyruk düşükse orijinal yine de servis edilir; varyantlar sonra üretilir
      console.warn('[medya] kuyruğa eklenemedi:', err);
    }

    // Public ISR sayfaları yeni galeriyi bir sonraki istekte tazelesin
    revalidateTag(TAGS.listings, 'max');
    revalidateTag(TAGS.listing(listing.slug), 'max');

    return NextResponse.json({ ok: true, media: updated });
  } catch (err) {
    await prisma.media.delete({ where: { id: row.id } }).catch(() => {});
    if (err instanceof Error && err.message === 'TOO_LARGE') {
      return NextResponse.json(
        { error: `Dosya çok büyük (en fazla ${Math.round(cap / 1024 / 1024)} MB).` },
        { status: 413 },
      );
    }
    if (err instanceof Error && err.message === 'EMPTY') {
      return NextResponse.json({ error: 'Dosya gövdesi boş.' }, { status: 400 });
    }
    console.error('[medya] yükleme hatası:', err);
    return NextResponse.json({ error: 'Yükleme başarısız.' }, { status: 500 });
  }
}
