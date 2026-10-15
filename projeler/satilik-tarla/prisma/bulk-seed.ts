// Ölçek/performans testi için sentetik ilan üretici — GERÇEK İÇERİK DEĞİLDİR,
// yalnızca lokal geliştirmede kullanılır. Amaç: PostGIS bölge-arama sorgusunu
// ve /ilanlar sayfalamasını PDD'nin "binlerce ilan" hedefi ölçeğinde denemek.
// Görsel yok (Media satırı yazılmaz) — amaç DB/sorgu ölçeği, içerik değil.
//
// Kullanım:
//   npx tsx prisma/bulk-seed.ts             # 5000 sentetik ilan üretir
//   npx tsx prisma/bulk-seed.ts --count=2000
//   npx tsx prisma/bulk-seed.ts --clear      # ürettiği her şeyi siler (slug: bulk-*)
//
// İdempotent: slug deterministik (bulk-<ilçe>-<sıra>) — tekrar çalıştırmak
// çakışma yaratmaz (skipDuplicates: true).
import 'dotenv/config';
import {
  PrismaClient,
  type ImarDurumu,
  type ListingPurpose,
  type ListingStatus,
  type ListingType,
  type TapuDurumu,
  type YolDurumu,
} from '@prisma/client';
import { slugify } from '../src/lib/slugify';
import { formatArea, formatPricePerM2, formatTRY } from '../src/lib/format';
import { TYPE_LABELS } from '../src/lib/mappers';

const prisma = new PrismaClient();

const OWNER_ID = 'bulk-seed-owner';
const OWNER_EMAIL = 'toplu-veri@kutahyasatiliktarla.local';
const SLUG_PREFIX = 'bulk-';

// Yaklaşık ilçe merkezleri (WGS84) — ilk 8'i gerçek demo ilanlarıyla aynı
// (prisma/demo-data.ts), kalan 5'i (Kütahya'nın 13 ilçesi tamamlanır) kaba
// yaklaşık konum; sentetik test verisi için survey hassasiyeti gerekmiyor.
const DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: 'Merkez', lat: 39.4551, lng: 29.9614 },
  { name: 'Tavşanlı', lat: 39.5872, lng: 29.4629 },
  { name: 'Simav', lat: 39.0742, lng: 28.9482 },
  { name: 'Gediz', lat: 38.9931, lng: 29.3916 },
  { name: 'Emet', lat: 39.3419, lng: 29.2588 },
  { name: 'Altıntaş', lat: 39.0614, lng: 30.1122 },
  { name: 'Domaniç', lat: 39.8014, lng: 29.6083 },
  { name: 'Aslanapa', lat: 39.2211, lng: 29.8734 },
  { name: 'Çavdarhisar', lat: 39.3934, lng: 29.591 },
  { name: 'Dumlupınar', lat: 39.1667, lng: 29.9833 },
  { name: 'Hisarcık', lat: 39.1667, lng: 29.5 },
  { name: 'Pazarlar', lat: 39.2667, lng: 28.8333 },
  { name: 'Şaphane', lat: 39.1667, lng: 29.1167 },
];

const TYPES: ListingType[] = ['tarla', 'arsa', 'bag_bahce', 'koy_ici'];
const IMAR: ImarDurumu[] = ['imarsiz', 'koyYerlesik', 'konutImarli', 'sanayiTicari', 'diger'];
const YOL: YolDurumu[] = ['cepheli', 'yakin', 'yok'];
const TAPU: TapuDurumu[] = ['mustakil', 'hisseli', 'tahsisli'];
// Ağırlıklı durum dağılımı — asıl amaç harita/arama testi olduğu için 'aktif'
// baskın; diğerleri yalnızca admin listelerinin de boş kalmaması için.
const STATUS_WEIGHTS: [ListingStatus, number][] = [
  ['aktif', 80],
  ['incelemede', 8],
  ['cekimBekliyor', 5],
  ['pasif', 4],
  ['reddedildi', 3],
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedStatus(): ListingStatus {
  const total = STATUS_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [status, w] of STATUS_WEIGHTS) {
    r -= w;
    if (r <= 0) return status;
  }
  return 'aktif';
}

/** İlçe merkezinin ~±12 km çevresinde rastgele nokta (kaba derece jitter'ı). */
function jitter(center: number, deg = 0.11): number {
  return center + (Math.random() * 2 - 1) * deg;
}

function buildListing(i: number) {
  const d = pick(DISTRICTS);
  const type = pick(TYPES);
  const purpose: ListingPurpose = Math.random() < 0.85 ? 'satilik' : 'kiralik';
  const areaM2 = Math.round((300 + Math.random() * 49700) / 10) * 10;
  const perM2 = purpose === 'satilik' ? 80 + Math.random() * 900 : 0.5 + Math.random() * 6;
  const priceValue = Math.round((areaM2 * perM2) / 1000) * 1000;
  const status = weightedStatus();

  return {
    ownerId: OWNER_ID,
    slug: `${SLUG_PREFIX}${slugify(d.name)}-${String(i).padStart(6, '0')}`,
    // Başlıkta açık "Test" etiketi — bu satırların sentetik olduğu admin
    // panelinde/DB'de birebir görüldüğünde hiç kafa karıştırmasın.
    title: `Test #${i} — ${d.name} ${TYPE_LABELS[type]}`,
    purpose,
    type,
    location: `${d.name} / Test mevkii`,
    district: d.name,
    area: formatArea(areaM2),
    price: formatTRY(priceValue),
    pricePerM2: formatPricePerM2(priceValue, areaM2),
    tags: [] as string[],
    description: `Ölçek testi için üretilmiş sentetik ilan — ${d.name} bölgesinde ${areaM2} m² ${TYPE_LABELS[type].toLowerCase()}.`,
    highlights: [] as string[],
    status,
    imarDurumu: pick(IMAR),
    yolDurumu: pick(YOL),
    tapuDurumu: pick(TAPU),
    suVar: Math.random() < 0.5,
    elektrikVar: Math.random() < 0.6,
    priceValue: BigInt(priceValue),
    areaM2,
    lat: jitter(d.lat),
    lng: jitter(d.lng),
    publishedAt:
      status === 'aktif' ? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) : null,
  };
}

async function ensureOwner() {
  await prisma.user.upsert({
    where: { id: OWNER_ID },
    create: { id: OWNER_ID, name: 'Toplu Test Verisi', email: OWNER_EMAIL, emailVerified: true },
    update: {},
  });
}

async function clear() {
  const { count } = await prisma.listing.deleteMany({
    where: { slug: { startsWith: SLUG_PREFIX } },
  });
  console.log(`[bulk-seed] ${count} sentetik ilan silindi`);
}

async function generate(total: number) {
  await ensureOwner();
  const BATCH = 500;
  let written = 0;
  for (let start = 0; start < total; start += BATCH) {
    const size = Math.min(BATCH, total - start);
    const data = Array.from({ length: size }, (_, k) => buildListing(start + k));
    const { count } = await prisma.listing.createMany({ data, skipDuplicates: true });
    written += count;
    process.stdout.write(
      `\r[bulk-seed] ${Math.min(start + size, total)}/${total} işlendi (${written} yeni yazıldı)`,
    );
  }
  console.log('\n[bulk-seed] tamamlandı ✓');
}

const args = process.argv.slice(2);
const countArg = args.find((a) => a.startsWith('--count='));
const count = countArg ? Number(countArg.slice('--count='.length)) : 5000;

async function main() {
  if (args.includes('--clear')) {
    await clear();
    return;
  }
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`Geçersiz --count değeri: ${countArg}`);
  }
  await generate(count);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
