import { prisma } from './prisma';

export function slugify(s: string): string {
  // Türkçe harfleri lowercase'den ÖNCE değiştiriyoruz — JS'in locale-insensitive
  // toLowerCase()'ı 'İ'yi 'i' + birleşik nokta işaretine çeviriyor, bu da bozuk
  // slug'a yol açıyor (örn. "İmar" -> "i-mar").
  return s
    .replace(/[İIı]/g, 'i')
    .replace(/[Ğğ]/g, 'g')
    .replace(/[Şş]/g, 's')
    .replace(/[Öö]/g, 'o')
    .replace(/[Üü]/g, 'u')
    .replace(/[Çç]/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function randomSuffix(len = 5): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Üye başvurusu için benzersiz ilan slug'ı: başlık + kısa rastgele ek.
 * Çakışmada (unique ihlali riskine karşı) yeni ekle üç kez denenir. */
export async function uniqueListingSlug(title: string): Promise<string> {
  const base = slugify(title) || 'ilan';
  for (let i = 0; i < 3; i++) {
    const candidate = `${base}-${randomSuffix()}`;
    const exists = await prisma.listing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
