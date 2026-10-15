// Medya işleme: yüklenen orijinalden görsel varyantları (webp) ve video
// posteri üretir. sharp yeniden kodlarken EXIF/GPS metaverisini de düşürür.
import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { VARIANT_WIDTHS, mediaFilePath, mediaUrl } from '../lib/media-store';

const execFileAsync = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

type Variant = { width: number; format: string; url: string };

/** variants[0].url sözleşmesi korunur: ilk kayıt her zaman en büyük webp,
 * kaynak dosya listenin sonunda kalır (yeniden işleme için). */
export async function processMedia(prisma: PrismaClient, mediaId: string) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { listing: { select: { slug: true } } },
  });
  if (!media) return null; // yükleme geri alınmış olabilir

  const variants = (media.variants as Variant[] | null) ?? [];
  const source = variants.find((v) => v.format === 'source' || v.format === 'mp4');
  if (!source?.url.startsWith('/m/')) return null; // harici URL — işlenecek dosya yok

  const fileName = source.url.split('/').pop()!;
  const origPath = mediaFilePath(media.listingId, fileName);
  await stat(origPath); // yoksa fırlat → BullMQ yeniden dener

  if (media.type === 'image') {
    const img = sharp(origPath).rotate(); // EXIF yönünü uygula
    const meta = await img.metadata();
    const sourceWidth = meta.width ?? VARIANT_WIDTHS[0];

    // Kaynaktan geniş varyant üretme (upscale yok) — ama en az bir varyant olsun
    const widths: number[] = VARIANT_WIDTHS.filter((w) => w <= sourceWidth);
    if (widths.length === 0) widths.push(Math.min(sourceWidth, VARIANT_WIDTHS[0]));

    const generated: Variant[] = [];
    for (const width of widths) {
      const name = `${media.id}-${width}.webp`;
      await sharp(origPath)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(mediaFilePath(media.listingId, name));
      generated.push({ width, format: 'webp', url: mediaUrl(media.listingId, name) });
    }

    await prisma.media.update({
      where: { id: media.id },
      data: { variants: [...generated, { width: 0, format: 'source', url: source.url }] },
    });
    return { kind: 'image', variants: generated.length, slug: media.listing.slug };
  }

  // Video: poster karesi (1. saniye) — dönüştürme yok, mp4 zaten oynatılabilir
  const posterName = `${media.id}-poster.jpg`;
  const posterPath = mediaFilePath(media.listingId, posterName);
  await execFileAsync(FFMPEG, [
    '-y',
    '-ss',
    '1',
    '-i',
    origPath,
    '-frames:v',
    '1',
    '-vf',
    "scale='min(1280,iw)':-2",
    '-q:v',
    '3',
    posterPath,
  ]);

  await prisma.media.update({
    where: { id: media.id },
    data: { poster: mediaUrl(media.listingId, posterName) },
  });
  return { kind: 'video', poster: posterName, slug: media.listing.slug };
}
