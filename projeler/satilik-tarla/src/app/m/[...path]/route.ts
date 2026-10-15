import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/get-session';
import { CONTENT_TYPES, UPLOAD_DIR, isSafeSegment, mediaFilePath } from '@/lib/media-store';

/** Yüklenen medyayı diskten akıtır: /m/{listingId}/{dosya}.
 * Dosya adları içerik-adresli (mediaId + ek) olduğundan immutable cache'lenir.
 * Prod'da istenirse nginx aynı volume'u doğrudan servis edebilir. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  if (!Array.isArray(segments) || segments.length !== 2 || !segments.every(isSafeSegment)) {
    return new Response('Not found', { status: 404 });
  }

  const [listingId, fileName] = segments;

  // Şikayet ekran görüntüleri özel yazışma kanıtıdır: yalnız admin ya da
  // dosyayı yükleyen (ad, userId önekiyle başlar) görebilir; cache private.
  const isComplaint = listingId === 'sikayet';
  if (isComplaint) {
    const session = await getServerSession();
    const allowed =
      !!session &&
      (session.user.role === 'admin' || fileName.startsWith(session.user.id.slice(0, 8)));
    if (!allowed) return new Response('Not found', { status: 404 });
  }

  const filePath = mediaFilePath(listingId, fileName);
  // isSafeSegment '..' ve ayraçları eler; yine de kök dışına çıkışı reddet
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return new Response('Not found', { status: 404 });
  }

  let info;
  try {
    info = await stat(filePath);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!info.isFile()) return new Response('Not found', { status: 404 });

  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      'Content-Length': String(info.size),
      'Cache-Control': isComplaint ? 'private, max-age=600' : 'public, max-age=31536000, immutable',
    },
  });
}
