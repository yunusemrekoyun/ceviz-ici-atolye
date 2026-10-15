// Test dönemi demo verisi — worker toolbox'uyla çalıştırılır:
//   docker compose run --rm worker npx tsx prisma/demo-data.ts
// Idempotenttir: sabit slug/e-postalarla upsert eder, tekrar koşulabilir.
// Test üyelerinin şifresi env'den gelir (DEMO_TESTER_PASSWORD) — repoda şifre yok.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { auth } from '../src/lib/auth';
import { deriveStructured } from '../src/lib/structured-specs';

const prisma = new PrismaClient();

const TESTERS = [
  { email: 'tester1@kutahyasatiliktarla.com', name: 'Ayşe Deneme' },
  { email: 'tester2@kutahyasatiliktarla.com', name: 'Mehmet Deneme' },
];

async function ensureTester(email: string, name: string) {
  const password = process.env.DEMO_TESTER_PASSWORD;
  if (!password) throw new Error('DEMO_TESTER_PASSWORD tanımlı değil (.env).');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  await auth.api.signUpEmail({ body: { email, password, name } });
  return prisma.user.update({
    where: { email },
    data: { emailVerified: true },
  });
}

type DemoListing = {
  slug: string;
  title: string;
  purpose: 'satilik' | 'kiralik';
  type: 'tarla' | 'arsa' | 'bag_bahce' | 'koy_ici';
  district: string;
  location: string;
  areaM2: number;
  priceTRY: number;
  lat: number;
  lng: number;
  badge?: string;
  tags: string[];
  description: string;
  highlights: string[];
  specs: { label: string; value: string }[];
  images: string[];
  status: 'aktif' | 'incelemede' | 'cekimBekliyor' | 'reddedildi';
  owner: 'admin' | 0 | 1; // 0/1 = TESTERS index
  rejectReason?: string;
  droneRequested?: boolean;
};

const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const LISTINGS: DemoListing[] = [
  {
    slug: 'demo-merkez-sulu-tarla',
    title: "Merkez'de Kanala Cepheli Sulu Tarla",
    purpose: 'satilik',
    type: 'tarla',
    district: 'Merkez',
    location: 'Merkez / İnköy mevkii',
    areaM2: 18400,
    priceTRY: 3128000,
    lat: 39.4551,
    lng: 29.9614,
    badge: 'Sulu Tarım',
    tags: ['Sulu Tarım', 'Kanal Cepheli', 'Yatırımlık'],
    description:
      'DSİ sulama kanalına cepheli, yılda iki ürün alınabilen verimli taban arazi. Şehir merkezine 12 dakika; traktör ve biçerdöver girişi rahat, komşu parseller ekili.',
    highlights: ['Kanala doğrudan cephe', 'Yılda iki ürün', "Merkez'e 12 dk", 'Düz taban arazi'],
    specs: [
      { label: 'Ada / Parsel', value: '211 / 4' },
      { label: 'Toprak Yapısı', value: 'Killi-tınlı, birinci sınıf' },
      { label: 'Sulama', value: 'DSİ kanalı + damla sistemi kurulabilir' },
    ],
    images: [IMG('photo-1500382017468-9049fed747ef'), IMG('photo-1500076656116-558758c991c1')],
    status: 'aktif',
    owner: 'admin',
  },
  {
    slug: 'demo-tavsanli-koy-ici-arsa',
    title: "Tavşanlı'da Köy İçi İmarlı Arsa",
    purpose: 'satilik',
    type: 'koy_ici',
    district: 'Tavşanlı',
    location: 'Tavşanlı / Çukurköy köy içi',
    areaM2: 640,
    priceTRY: 448000,
    lat: 39.5872,
    lng: 29.4629,
    badge: 'Elektrik-Su Hazır',
    tags: ['Köy İçi', 'İmarlı', 'Bağ Evi Uygun'],
    description:
      'Köy yerleşik alanı içinde, yola cepheli köşe parsel. Elektrik ve şebeke suyu parselde; bağ evi ya da müstakil ev için ruhsat süreci kolay.',
    highlights: ['Köşe parsel', 'Elektrik + su parselde', 'Köy kahvesine 200 m'],
    specs: [
      { label: 'Ada / Parsel', value: '118 / 22' },
      { label: 'Altyapı', value: 'Elektrik, su, stabilize yol' },
    ],
    images: [IMG('photo-1449158743715-0a90ebb6d2d8'), IMG('photo-1464146072230-91cabc968266')],
    status: 'aktif',
    owner: 'admin',
  },
  {
    slug: 'demo-simav-ceviz-bahcesi',
    title: "Simav'da Kurulu Ceviz Bahçesi",
    purpose: 'satilik',
    type: 'bag_bahce',
    district: 'Simav',
    location: 'Simav / Yeşilova yolu 3. km',
    areaM2: 9600,
    priceTRY: 2352000,
    lat: 39.0742,
    lng: 28.9482,
    badge: 'Verimde Bahçe',
    tags: ['Ceviz', 'Damla Sulama', 'Gelir Getiren'],
    description:
      '8 yaşında 210 adet Chandler ceviz ağacıyla kurulu, damla sulamalı bahçe. Geçen sezon ürün verdi; bakım kayıtları düzenli, kuyu ruhsatlı.',
    highlights: ['210 adet Chandler', 'Ruhsatlı kuyu', 'Damla sulama kurulu', 'Verim başladı'],
    specs: [
      { label: 'Ağaç Sayısı', value: '210 (Chandler, 8 yaş)' },
      { label: 'Su', value: 'Ruhsatlı sondaj kuyusu' },
    ],
    images: [IMG('photo-1473448912268-2022ce9509d8'), IMG('photo-1471193945509-9ad0617afabf')],
    status: 'aktif',
    owner: 'admin',
  },
  {
    slug: 'demo-gediz-kiralik-tarla',
    title: "Gediz'de Kiralık Kuru Tarım Arazisi",
    purpose: 'kiralik',
    type: 'tarla',
    district: 'Gediz',
    location: 'Gediz / Akçaalan mevkii',
    areaM2: 25000,
    priceTRY: 95000,
    lat: 38.9931,
    lng: 29.3916,
    tags: ['Sezonluk', 'Kuru Tarım'],
    description:
      'Yıllık kiralık, tek parça 25 dönüm kuru tarım arazisi. Buğday-arpa rotasyonuna uygun; yol kenarı, römork girişi kolay. Kira bedeli yıllıktır.',
    highlights: ['Tek parça 25 dönüm', 'Yol kenarı', 'Uzun dönem kiralanabilir'],
    specs: [
      { label: 'Kira Dönemi', value: 'Yıllık (Eylül-Eylül)' },
      { label: 'Ürün Geçmişi', value: 'Buğday / arpa rotasyonu' },
    ],
    images: [IMG('photo-1500937386664-56d1dfef3854'), IMG('photo-1560493676-04071c5f467b')],
    status: 'aktif',
    owner: 'admin',
  },
  {
    slug: 'demo-emet-yatirimlik-arsa',
    title: "Emet'te Ana Yola Yakın Yatırımlık Arsa",
    purpose: 'satilik',
    type: 'arsa',
    district: 'Emet',
    location: 'Emet / Sanayi girişi',
    areaM2: 1250,
    priceTRY: 812500,
    lat: 39.3419,
    lng: 29.2588,
    badge: 'Ticari Potansiyel',
    tags: ['Yatırımlık', 'Sanayi Yakını'],
    description:
      'Emet sanayi bölgesi girişinde, ana yola 80 m cepheli arsa. Çevresinde depo ve atölye yapılaşması hızla sürüyor; ticari imar potansiyeli yüksek.',
    highlights: ['Ana yola 80 m', 'Sanayi bölgesi girişi', 'Hızla değerlenen bölge'],
    specs: [
      { label: 'Ada / Parsel', value: '77 / 9' },
      { label: 'Cephe', value: '25 m yol cephesi' },
    ],
    images: [IMG('photo-1486325212027-8081e485255e'), IMG('photo-1500530855697-b586d89ba3ee')],
    status: 'aktif',
    owner: 'admin',
  },
  {
    slug: 'demo-altintas-genis-tarla',
    title: "Altıntaş Ovası'nda Geniş Parsel",
    purpose: 'satilik',
    type: 'tarla',
    district: 'Altıntaş',
    location: 'Altıntaş / Ova mevkii',
    areaM2: 42000,
    priceTRY: 5040000,
    lat: 39.0614,
    lng: 30.1122,
    badge: 'Tek Tapu',
    tags: ['Büyük Parsel', 'Ova', 'Makineli Tarıma Uygun'],
    description:
      'Altıntaş ovasında tek tapu 42 dönüm. Eğimsiz, taşsız, yağmurlama sulamaya uygun; büyük ölçekli üretim planlayanlar için ideal.',
    highlights: ['Tek tapu 42 dönüm', 'Eğimsiz ova arazisi', 'Yağmurlama sulamaya uygun'],
    specs: [
      { label: 'Ada / Parsel', value: '305 / 1' },
      { label: 'Sulama', value: 'Yağmurlama sistemi kurulabilir' },
    ],
    images: [IMG('photo-1625246333195-78d9c38ad449'), IMG('photo-1499529112087-3cb3b73cec95')],
    status: 'aktif',
    owner: 'admin',
  },
  {
    slug: 'demo-domanic-orman-kenari',
    title: "Domaniç'te Orman Kenarı Bağ-Bahçe",
    purpose: 'satilik',
    type: 'bag_bahce',
    district: 'Domaniç',
    location: 'Domaniç / Çamlıca mevkii',
    areaM2: 3200,
    priceTRY: 736000,
    lat: 39.8014,
    lng: 29.6083,
    badge: 'Doğayla İç İçe',
    tags: ['Orman Kenarı', 'Hobi Bahçesi'],
    description:
      'Orman sınırında, kuzeyi çam korusuna bakan bahçelik arazi. İçinde 14 meyve ağacı; hafta sonu bahçesi ve arıcılık için çok uygun.',
    highlights: ['Çam korusu manzarası', '14 meyve ağacı', 'Arıcılığa uygun'],
    specs: [
      { label: 'Ağaçlar', value: 'Elma, armut, vişne (14 adet)' },
      { label: 'Su', value: 'Mevsimsel dere + depo' },
    ],
    images: [IMG('photo-1470252649378-9c29740c9fa8'), IMG('photo-1441974231531-c6227db76b6e')],
    status: 'aktif',
    owner: 'admin',
  },
  // tester2'nin YAYINDA ilanı — tester1 mesaj atabilsin, tester2 "İlanlarım"ı dolu görsün
  {
    slug: 'demo-aslanapa-tester-tarla',
    title: "Aslanapa'da Satılık Tarla",
    purpose: 'satilik',
    type: 'tarla',
    district: 'Aslanapa',
    location: 'Aslanapa / Kureyşler yolu üzeri',
    areaM2: 11500,
    priceTRY: 1265000,
    lat: 39.2211,
    lng: 29.8734,
    tags: ['Yola Yakın'],
    description:
      'Kureyşler barajı yoluna 400 m, hafif eğimli tarla. Çevre parsellerde ayçiçeği ve buğday ekimi yapılıyor; sınırları GPS ile işaretli.',
    highlights: ['Baraj yoluna 400 m', 'Sınırlar GPS işaretli'],
    specs: [
      { label: 'Ada / Parsel', value: '164 / 12' },
      { label: 'Eğim', value: 'Hafif (%3-5)' },
    ],
    images: [IMG('photo-1586771107445-d3ca888129ff'), IMG('photo-1500382017468-9049fed747ef')],
    status: 'aktif',
    owner: 1,
  },
  // Moderasyon kuyruğu: tester1'in bekleyen başvurusu (drone istekli)
  {
    slug: 'demo-tester1-basvuru',
    title: "Tavşanlı'da Satılık Tarla",
    purpose: 'satilik',
    type: 'tarla',
    district: 'Tavşanlı',
    location: 'Tavşanlı / Moymul mahallesi çıkışı, dere kenarı',
    areaM2: 8700,
    priceTRY: 1131000,
    lat: 0,
    lng: 0,
    tags: [],
    description:
      'Dere kenarında, söğüt ağaçlı sınırı olan tarla. Yol sorunu yok, elektrik direği parsel sınırında. Değerinde satılıktır.',
    highlights: [],
    specs: [],
    images: [],
    status: 'incelemede',
    owner: 0,
    droneRequested: true,
  },
  // Çekim bekleyen: tester2'nin onaylanmış başvurusu
  {
    slug: 'demo-tester2-cekim',
    title: "Gediz'de Satılık Bağ / Bahçe",
    purpose: 'satilik',
    type: 'bag_bahce',
    district: 'Gediz',
    location: 'Gediz / Gökler köyü üstü, eski bağlar mevkii',
    areaM2: 2400,
    priceTRY: 432000,
    lat: 0,
    lng: 0,
    tags: [],
    description:
      'Aile bağımız; üzüm omcaları yaşlı ama toprak çok iyi. İçinde küçük taş bağ evi temeli var. Uzaktan yönetemediğimiz için satıyoruz.',
    highlights: [],
    specs: [],
    images: [],
    status: 'cekimBekliyor',
    owner: 1,
  },
  // Reddedilmiş: tester1 "düzelt ve yeniden gönder"i test edebilsin
  {
    slug: 'demo-tester1-red',
    title: "Emet'te Satılık Arsa",
    purpose: 'satilik',
    type: 'arsa',
    district: 'Emet',
    location: 'Emet merkez',
    areaM2: 500,
    priceTRY: 5000000,
    lat: 0,
    lng: 0,
    tags: [],
    description:
      'Emet içinde arsa. Fiyat pazarlıklı. Detay için arayın, konum bilgisini telefonda veririm.',
    highlights: [],
    specs: [],
    images: [],
    status: 'reddedildi',
    owner: 0,
    rejectReason:
      'Konum tarifi çok belirsiz ve fiyat bölge ortalamasının belirgin üzerinde. Mahalle/mevkii bilgisi ekleyip fiyatı gözden geçirerek yeniden gönderebilirsiniz.',
  },
];

const DEMO_LEADS = [
  {
    name: 'Hüseyin Karaca',
    phone: '+90 542 000 11 22',
    email: null,
    budget: '2.000.000 ₺',
    district: 'Tavşanlı',
    purpose: 'Sulu tarla arıyorum',
    note: 'Kanala yakın, en az 10 dönüm olsun. Hafta sonu gezmeye gelebilirim.',
  },
  {
    name: 'Zeynep Aydın',
    phone: '+90 555 333 44 55',
    email: 'zeynep.aydin@example.com',
    budget: '800.000 ₺',
    district: 'Merkez',
    purpose: 'Hobi bahçesi',
    note: null,
  },
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) throw new Error('Önce seed çalıştırılmalı (admin yok).');

  const testers = [];
  for (const t of TESTERS) testers.push(await ensureTester(t.email, t.name));
  console.log('[demo] test üyeleri hazır:', testers.map((t) => t.email).join(', '));

  for (const l of LISTINGS) {
    const structured =
      l.status === 'aktif'
        ? deriveStructured(l.specs)
        : { imarDurumu: null, yolDurumu: null, tapuDurumu: null, suVar: false, elektrikVar: false };
    // aktif ilanlarda yapısal alanlar dolu olsun (yayın kuralıyla tutarlı)
    if (l.status === 'aktif') {
      structured.imarDurumu =
        structured.imarDurumu ??
        (l.type === 'arsa' ? 'konutImarli' : l.type === 'koy_ici' ? 'koyYerlesik' : 'imarsiz');
      structured.tapuDurumu = structured.tapuDurumu ?? 'mustakil';
      structured.yolDurumu = structured.yolDurumu ?? 'cepheli';
    }
    const ownerId = l.owner === 'admin' ? admin.id : testers[l.owner].id;
    const area = `${l.areaM2.toLocaleString('tr-TR')} m²`;
    const price = `₺${l.priceTRY.toLocaleString('tr-TR')}`;
    const pricePerM2 = `₺${Math.round(l.priceTRY / l.areaM2).toLocaleString('tr-TR')} / m²`;

    const data = {
      ownerId,
      title: l.title,
      purpose: l.purpose,
      type: l.type,
      location: l.location,
      district: l.district,
      area,
      price,
      pricePerM2,
      priceValue: BigInt(l.priceTRY),
      areaM2: l.areaM2,
      badge: l.badge ?? null,
      lat: l.lat || null,
      lng: l.lng || null,
      tags: l.tags,
      description: l.description,
      highlights: l.highlights,
      specs: l.specs,
      status: l.status,
      droneRequested: l.droneRequested ?? false,
      rejectReason: l.rejectReason ?? null,
      publishedAt: l.status === 'aktif' ? new Date() : null,
      ...structured,
    };

    const listing = await prisma.listing.upsert({
      where: { slug: l.slug },
      create: { slug: l.slug, ...data },
      update: data,
    });

    if (l.images.length) {
      await prisma.media.deleteMany({ where: { listingId: listing.id } });
      await prisma.media.createMany({
        data: l.images.map((url, i) => ({
          listingId: listing.id,
          type: 'image' as const,
          variants: [{ width: 1200, format: 'source', url }],
          position: i,
        })),
      });
    }
  }
  console.log('[demo]', LISTINGS.length, 'demo ilan yazıldı');

  for (const lead of DEMO_LEADS) {
    const exists = await prisma.lead.findFirst({ where: { phone: lead.phone } });
    if (!exists) await prisma.lead.create({ data: { ...lead, kvkkConsent: true } });
  }
  console.log('[demo] örnek talepler hazır');
  console.log('[demo] tamamlandı ✓');
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
