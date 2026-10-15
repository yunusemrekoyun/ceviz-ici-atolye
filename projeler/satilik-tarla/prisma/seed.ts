import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { auth } from '../src/lib/auth';
import { slugify } from '../src/lib/slugify';
import { TYPE_MAP } from '../src/lib/mappers';
import { deriveStructured } from '../src/lib/structured-specs';
import { parsePrice } from '../src/lib/format';
import { defaultContent } from '../src/content';
import { LEGAL_DEFAULTS } from '../src/lib/legal-defaults';

const prisma = new PrismaClient();

async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@kutahyasatiliktarla.com';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error('SEED_ADMIN_PASSWORD tanımlı değil (.env).');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  // better-auth'un kendi server API'si üzerinden oluştur — şifre hash'ini
  // elle üretmeye çalışmak yerine resmi/desteklenen yol budur.
  await auth.api.signUpEmail({ body: { email, password, name: 'Admin' } });

  return prisma.user.update({
    where: { email },
    data: { emailVerified: true, role: 'admin' },
  });
}

async function seedContent(adminId: string) {
  const c = defaultContent;

  await prisma.siteContent.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      brand: c.brand,
      heroBadge: c.hero.badge,
      heroTitleLine1: c.hero.titleLine1,
      heroTitleAccent: c.hero.titleAccent,
      heroSubtitle: c.hero.subtitle,
      sections: c.sections,
      contactPhone: c.contact.phone,
      contactWhatsapp: c.contact.whatsapp,
      contactEmail: c.contact.email,
    },
    update: {
      brand: c.brand,
      heroBadge: c.hero.badge,
      heroTitleLine1: c.hero.titleLine1,
      heroTitleAccent: c.hero.titleAccent,
      heroSubtitle: c.hero.subtitle,
      sections: c.sections,
      contactPhone: c.contact.phone,
      contactWhatsapp: c.contact.whatsapp,
      contactEmail: c.contact.email,
    },
  });

  await prisma.stat.deleteMany();
  await prisma.stat.createMany({
    data: c.stats.map((s, i) => ({ value: s.value, label: s.label, position: i })),
  });

  await prisma.feature.deleteMany();
  await prisma.feature.createMany({
    data: c.features.map((f, i) => ({
      iconKey: f.iconKey,
      title: f.title,
      text: f.text,
      position: i,
    })),
  });

  for (const [i, d] of c.districts.entries()) {
    await prisma.district.upsert({
      where: { name: d.name },
      create: { name: d.name, count: d.count, text: d.text, position: i },
      update: { count: d.count, text: d.text, position: i },
    });
  }

  for (const l of c.listings) {
    const structured = deriveStructured(l.specs);
    const numeric = {
      priceValue: BigInt(parsePrice(l.price)),
      areaM2: Math.round(parsePrice(l.area)),
    };
    const listing = await prisma.listing.upsert({
      where: { slug: l.id },
      create: {
        ...structured,
        ...numeric,
        slug: l.id,
        ownerId: adminId,
        title: l.title,
        purpose: 'satilik',
        type: TYPE_MAP[l.type],
        location: l.location,
        district: l.district,
        area: l.area,
        price: l.price,
        pricePerM2: l.pricePerM2,
        badge: l.badge,
        lat: l.lat,
        lng: l.lng,
        tags: l.tags,
        description: l.description,
        highlights: l.highlights,
        specs: l.specs,
        status: 'aktif',
      },
      update: {
        title: l.title,
        type: TYPE_MAP[l.type],
        location: l.location,
        district: l.district,
        area: l.area,
        price: l.price,
        pricePerM2: l.pricePerM2,
        badge: l.badge,
        lat: l.lat,
        lng: l.lng,
        tags: l.tags,
        description: l.description,
        highlights: l.highlights,
        specs: l.specs,
      },
    });

    await prisma.media.deleteMany({ where: { listingId: listing.id } });
    await prisma.media.createMany({
      data: [
        ...l.images.map((url, i) => ({
          listingId: listing.id,
          type: 'image' as const,
          variants: [{ width: 1200, format: 'source', url }],
          position: i,
        })),
        {
          listingId: listing.id,
          type: 'video' as const,
          variants: [{ width: 0, format: 'mp4', url: l.droneVideo }],
          position: l.images.length,
        },
      ],
    });
  }

  // Seed'in aktif ilanlarına yayın tarihi (sıralama/JSON-LD için)
  await prisma.listing.updateMany({
    where: { status: 'aktif', publishedAt: null },
    data: { publishedAt: new Date() },
  });

  // content.ts'teki articles'ın stabil bir id'si yok (slug title'dan türetiliyor) —
  // Stat/Feature ile aynı desen: upsert yerine tam yeniden yazım.
  await prisma.blogPost.deleteMany();
  await prisma.blogPost.createMany({
    data: c.articles.map((a) => ({
      title: a.title,
      slug: slugify(a.title),
      category: a.category,
      body: a.text,
      status: 'yayinda',
      source: 'manuel',
    })),
  });

  const legalKeys = ['kvkk', 'gizlilik', 'cerez', 'kosullar', 'iys'] as const;
  for (const key of legalKeys) {
    const draft = LEGAL_DEFAULTS[key];
    await prisma.legalDoc.upsert({
      where: { key },
      create: { key, title: draft.title, body: draft.body },
      update: {}, // admin düzenlemeleri seed'le ezilmez
    });
  }
}

async function main() {
  const admin = await ensureAdmin();
  await seedContent(admin.id);
  console.log('[seed] tamamlandı — admin:', admin.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    // auth import zinciri BullMQ/ioredis bağlantısı açıyor; açık soket event
    // loop'u sonsuza dek canlı tutuyor — işi bitince açıkça çık.
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
