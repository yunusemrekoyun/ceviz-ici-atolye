import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { getDb, resolveDatabasePath } from "@/lib/db";
import { files, type StoredFile } from "@/lib/db/schema";

export type FileKind = "photo" | "receipt";

export class FileRejectedError extends Error {}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
/** Kaydedilen görselin uzun kenarı: fotoğraf kart için yeterli, dekont okunabilir kalsın. */
const MAX_EDGE: Record<FileKind, number> = { photo: 900, receipt: 1800 };

export function filesDir(): string {
  return path.join(path.dirname(resolveDatabasePath()), "files");
}

type Sniffed = "jpeg" | "png" | "webp" | "heic" | "pdf" | null;

/** Dosya uzantısına ya da tarayıcının söylediği türe değil, içeriğin ilk baytlarına bakılır. */
export function sniff(buf: Buffer): Sniffed {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 4, 8) === "ftyp" && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(buf.toString("ascii", 8, 12))) return "heic";
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "pdf";
  return null;
}

type Prepared = { data: Buffer; mime: string; width: number | null; height: number | null };

async function prepare(buf: Buffer, kind: FileKind): Promise<Prepared> {
  if (buf.length === 0) throw new FileRejectedError("Dosya boş.");
  if (buf.length > MAX_UPLOAD_BYTES) throw new FileRejectedError("Dosya en fazla 10 MB olabilir.");
  const type = sniff(buf);
  if (!type) throw new FileRejectedError("Yalnız fotoğraf (JPG, PNG, WEBP, HEIC) veya PDF yüklenebilir.");
  if (type === "pdf") {
    if (kind !== "receipt") throw new FileRejectedError("Fotoğraf için görsel dosyası seçin.");
    if (buf.length > MAX_PDF_BYTES) throw new FileRejectedError("PDF en fazla 5 MB olabilir.");
    return { data: buf, mime: "application/pdf", width: null, height: null };
  }
  try {
    // Yeniden kodlama: EXIF (konum dahil) atılır, yön düzeltilir, boyut küçülür, gömülü içerik temizlenir.
    const edge = MAX_EDGE[kind];
    const { data, info } = await sharp(buf, { failOn: "error", limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: kind === "photo" ? 84 : 80, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data, mime: "image/jpeg", width: info.width, height: info.height };
  } catch {
    throw new FileRejectedError("Görsel okunamadı. Başka bir fotoğraf deneyin.");
  }
}

export async function saveUpload(
  buf: Buffer,
  kind: FileKind,
  owner: { registrationId: number | null; userId: number | null },
): Promise<StoredFile> {
  const prepared = await prepare(buf, kind);
  const storageKey = crypto.randomBytes(18).toString("base64url");
  const dir = filesDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const target = path.join(dir, storageKey);
  fs.writeFileSync(target, prepared.data, { mode: 0o600, flag: "wx" });
  try {
    return getDb()
      .insert(files)
      .values({
        kind,
        storageKey,
        mime: prepared.mime,
        size: prepared.data.length,
        width: prepared.width,
        height: prepared.height,
        sha256: crypto.createHash("sha256").update(prepared.data).digest("hex"),
        registrationId: owner.registrationId,
        createdBy: owner.userId,
      })
      .returning()
      .get();
  } catch (err) {
    fs.rmSync(target, { force: true });
    throw err;
  }
}

export function getFile(id: number): StoredFile | null {
  return getDb().select().from(files).where(eq(files.id, id)).get() ?? null;
}

export function readFileData(file: StoredFile): Buffer | null {
  // storageKey yalnız base64url karakterleri içerir; yine de dizin dışına çıkılmadığı doğrulanır.
  if (!/^[A-Za-z0-9_-]+$/.test(file.storageKey)) return null;
  try {
    return fs.readFileSync(path.join(filesDir(), file.storageKey));
  } catch {
    return null;
  }
}

export function deleteFile(id: number): void {
  const file = getFile(id);
  if (!file) return;
  getDb().delete(files).where(eq(files.id, id)).run();
  if (/^[A-Za-z0-9_-]+$/.test(file.storageKey)) fs.rmSync(path.join(filesDir(), file.storageKey), { force: true });
}

/** Form verisinden gelen File'ı Buffer'a çevirir (boyut sınırı okumadan önce kontrol edilir). */
export async function fileToBuffer(file: File): Promise<Buffer> {
  if (file.size > MAX_UPLOAD_BYTES) throw new FileRejectedError("Dosya en fazla 10 MB olabilir.");
  return Buffer.from(await file.arrayBuffer());
}
