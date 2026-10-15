import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { mediaConfig, isImageMime } from './config';
import { saveFile } from './storage';
import { prisma } from '@/lib/prisma';

interface ProcessingResult {
  pathThumb: string | null;
  pathMedium: string | null;
  pathLarge: string | null;
}

/**
 * Process an uploaded image: create thumb, medium, and large WebP variants.
 * This is designed to run in the background after upload completes.
 * Updates the Media record in DB when done.
 */
export async function processImage(mediaId: string): Promise<void> {
  try {
    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.isProcessed) return;
    if (!isImageMime(media.mimeType)) {
      // Mark videos as processed immediately (no transcoding yet)
      await prisma.media.update({
        where: { id: mediaId },
        data: { isProcessed: true },
      });
      return;
    }

    const originalPath = path.join(mediaConfig.localRoot, media.pathOriginal);
    const originalBuffer = await fs.readFile(originalPath);
    const baseName = path.basename(media.pathOriginal, path.extname(media.pathOriginal));

    const result: ProcessingResult = {
      pathThumb: null,
      pathMedium: null,
      pathLarge: null,
    };

    // Generate each variant
    for (const [variant, preset] of Object.entries(mediaConfig.processing)) {
      const webpBuffer = await sharp(originalBuffer)
        .resize({ width: preset.width, withoutEnlargement: true })
        .webp({ quality: preset.quality })
        .toBuffer();

      const fileName = `${baseName}.webp`;
      const relativePath = await saveFile(webpBuffer, fileName, variant);

      if (variant === 'thumb') result.pathThumb = relativePath;
      else if (variant === 'medium') result.pathMedium = relativePath;
      else if (variant === 'large') result.pathLarge = relativePath;
    }

    // Update DB record with processed paths
    await prisma.media.update({
      where: { id: mediaId },
      data: {
        ...result,
        isProcessed: true,
      },
    });
  } catch (error) {
    console.error(`[media] Failed to process media ${mediaId}:`, error);
  }
}
