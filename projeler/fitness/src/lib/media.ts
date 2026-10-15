import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

export type ImageSize = "sm" | "md" | "lg";
export type ImageFormat = "avif" | "webp" | "jpeg";

export interface MediaFormats {
  avif: Record<ImageSize, string>;
  webp: Record<ImageSize, string>;
  jpeg: Record<ImageSize, string>;
}

const SIZES: Record<ImageSize, number> = { sm: 320, md: 640, lg: 1280 };
const QUALITY: Record<ImageFormat, number> = { avif: 65, webp: 75, jpeg: 82 };

/**
 * Returns the absolute path to the uploads root.
 * UPLOAD_DIR can be absolute (/var/www/uploads) or relative (public/uploads).
 */
function resolveUploadRoot(): string {
  const dir = process.env.UPLOAD_DIR ?? "public/uploads";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

function mediaBaseUrl(): string {
  return (process.env.MEDIA_BASE_URL ?? "http://localhost:3000/uploads").replace(/\/$/, "");
}

export async function processAndSaveImage(
  buffer: Buffer,
  folder = "general"
): Promise<{ filename: string; width: number; height: number; formats: MediaFormats }> {
  const id = globalThis.crypto.randomUUID();
  const dir = path.join(resolveUploadRoot(), folder);
  await fs.mkdir(dir, { recursive: true });

  const image = sharp(buffer);
  const meta  = await image.metadata();
  const origWidth  = meta.width  ?? 1280;
  const origHeight = meta.height ?? 720;

  const formats: MediaFormats = { avif: {} as Record<ImageSize, string>, webp: {} as Record<ImageSize, string>, jpeg: {} as Record<ImageSize, string> };

  for (const [size, maxW] of Object.entries(SIZES) as [ImageSize, number][]) {
    const w = Math.min(maxW, origWidth);
    for (const fmt of ["avif", "webp", "jpeg"] as ImageFormat[]) {
      const filename = `${id}-${size}.${fmt}`;
      await image
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        [fmt]({ quality: QUALITY[fmt] })
        .toFile(path.join(dir, filename));
      formats[fmt][size] = `${mediaBaseUrl()}/${folder}/${filename}`;
    }
  }

  return { filename: id, width: origWidth, height: origHeight, formats };
}

export async function deleteMediaFiles(folder: string, filename: string): Promise<void> {
  const dir = path.join(resolveUploadRoot(), folder);
  for (const size of Object.keys(SIZES) as ImageSize[]) {
    for (const fmt of ["avif", "webp", "jpeg"] as ImageFormat[]) {
      await fs.unlink(path.join(dir, `${filename}-${size}.${fmt}`)).catch(() => {});
    }
  }
}
