import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, resolveDatabasePath } from "@/lib/db";
import { coachProfiles, type CoachProfile } from "@/lib/db/schema";
import { sniff } from "@/lib/files";
import type { HomeCoach } from "@/lib/home-coaches";

export class CoachProfileError extends Error {}
export const MAX_COACH_PHOTO_BYTES = 10 * 1024 * 1024;
const photoKeyPattern = /^[A-Za-z0-9_-]{24}\.webp$/;

export const coachProfileSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı.").max(120),
  role: z.string().trim().min(2, "Görev en az 2 karakter olmalı.").max(120),
  bio: z.string().trim().min(10, "Tanıtım en az 10 karakter olmalı.").max(1000, "Tanıtım en fazla 1000 karakter olabilir."),
  sortOrder: z.number().int().min(0).max(999),
  isPublished: z.boolean(),
  isDemo: z.boolean(),
});
export type CoachProfileValues = z.infer<typeof coachProfileSchema>;

export function coachPhotosDir(): string {
  return path.join(path.dirname(resolveDatabasePath()), "coach-photos");
}

export function coachPhotoUrl(key: string): string {
  return `/medya/hocalar/${key}`;
}

export function listCoachProfiles(): CoachProfile[] {
  return getDb().select().from(coachProfiles).orderBy(asc(coachProfiles.sortOrder), asc(coachProfiles.id)).all();
}

export function loadPublishedCoaches(): HomeCoach[] {
  return getDb().select().from(coachProfiles)
    .where(and(eq(coachProfiles.isPublished, true), isNotNull(coachProfiles.photoKey)))
    .orderBy(asc(coachProfiles.sortOrder), asc(coachProfiles.id)).all()
    .map(profile => ({ id: String(profile.id), name: profile.name, role: profile.role, bio: profile.bio,
      photo: coachPhotoUrl(profile.photoKey!), isDemo: profile.isDemo }));
}

async function preparePhoto(buf: Buffer): Promise<Buffer> {
  if (!buf.length) throw new CoachProfileError("Fotoğraf dosyası boş.");
  if (buf.length > MAX_COACH_PHOTO_BYTES) throw new CoachProfileError("Fotoğraf en fazla 10 MB olabilir.");
  if (!["jpeg", "png", "webp"].includes(sniff(buf) ?? "")) throw new CoachProfileError("JPG, PNG veya WebP fotoğraf seçin.");
  try {
    // Keep alpha for cutout portraits; remove EXIF, normalize orientation and limit decoding size.
    return await sharp(buf, { failOn: "error", limitInputPixels: 32_000_000 }).rotate()
      .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 }).toBuffer();
  } catch {
    throw new CoachProfileError("Fotoğraf okunamadı. Başka bir görsel deneyin.");
  }
}

export async function saveCoachProfile(id: number | null, input: CoachProfileValues, photo?: Buffer): Promise<CoachProfile> {
  const values = coachProfileSchema.parse(input);
  if (id !== null && (!Number.isSafeInteger(id) || id < 1)) throw new CoachProfileError("Geçersiz hoca profili.");
  const previous = id === null ? null : getDb().select().from(coachProfiles).where(eq(coachProfiles.id, id)).get();
  if (id !== null && !previous) throw new CoachProfileError("Hoca profili bulunamadı.");
  let photoKey = previous?.photoKey ?? null;
  if (values.isPublished && !photo && !photoKey) throw new CoachProfileError("Ana sayfada göstermek için bir fotoğraf ekleyin.");
  let newPath: string | null = null;
  if (photo) {
    const prepared = await preparePhoto(photo);
    photoKey = `${crypto.randomBytes(18).toString("base64url")}.webp`;
    fs.mkdirSync(coachPhotosDir(), { recursive: true, mode: 0o700 });
    newPath = path.join(coachPhotosDir(), photoKey);
    fs.writeFileSync(newPath, prepared, { mode: 0o600, flag: "wx" });
  }
  try {
    const record = { ...values, photoKey, updatedAt: new Date().toISOString() };
    const saved = id === null
      ? getDb().insert(coachProfiles).values(record).returning().get()
      : getDb().update(coachProfiles).set(record).where(eq(coachProfiles.id, id)).returning().get();
    if (!saved) throw new CoachProfileError("Hoca profili bulunamadı.");
    // Previous files remain for consistent database backups; only currently referenced keys are served.
    return saved;
  } catch (error) {
    if (newPath) fs.rmSync(newPath, { force: true });
    throw error;
  }
}

export function readCoachPhoto(key: string, allowDraft = false): { data: Buffer; published: boolean } | null {
  if (!photoKeyPattern.test(key)) return null;
  const profile = getDb().select().from(coachProfiles).where(eq(coachProfiles.photoKey, key)).get();
  if (!profile || (!profile.isPublished && !allowDraft)) return null;
  try {
    return { data: fs.readFileSync(path.join(coachPhotosDir(), key)), published: profile.isPublished };
  } catch {
    return null;
  }
}
