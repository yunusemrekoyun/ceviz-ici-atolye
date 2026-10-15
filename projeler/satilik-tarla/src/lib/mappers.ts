// Prisma satırları ile mevcut görünüm tipleri (src/content.ts) arasındaki
// dönüşümün TEK yeri: enum <-> Türkçe etiket eşlemeleri ve satır mapper'ları.
import type {
  Listing as DbListing,
  ListingStatus,
  ListingType,
  Media,
  BlogPost,
  District as DbDistrict,
  Feature as DbFeature,
  SiteContent as DbSiteContent,
  Stat as DbStat,
} from '@prisma/client';
import type {
  Article,
  District,
  Feature,
  LandType,
  Listing,
  SiteContent,
  Spec,
  Stat,
} from '@/content';

export type SiteChrome = Omit<SiteContent, 'listings'>;

export const TYPE_MAP: Record<LandType, ListingType> = {
  Tarla: 'tarla',
  Arsa: 'arsa',
  'Bağ / Bahçe': 'bag_bahce',
  'Köy İçi': 'koy_ici',
};

export const TYPE_LABELS: Record<ListingType, LandType> = {
  tarla: 'Tarla',
  arsa: 'Arsa',
  bag_bahce: 'Bağ / Bahçe',
  koy_ici: 'Köy İçi',
};

export const PURPOSE_LABELS: Record<'satilik' | 'kiralik', string> = {
  satilik: 'Satılık',
  kiralik: 'Kiralık',
};

export const IMAR_LABELS: Record<string, string> = {
  imarsiz: 'Tarla (imarsız)',
  koyYerlesik: 'Köy yerleşik alanı',
  konutImarli: 'Konut imarlı',
  sanayiTicari: 'Sanayi / Ticari',
  diger: 'Diğer',
};

export const YOL_LABELS: Record<string, string> = {
  cepheli: 'Yola cepheli',
  yakin: 'Yola yakın',
  yok: 'Yolu yok',
};

export const TAPU_LABELS: Record<string, string> = {
  mustakil: 'Müstakil',
  hisseli: 'Hisseli',
  tahsisli: 'Tahsisli',
};

export const STATUS_LABELS: Record<
  ListingStatus,
  { label: string; tone: 'muted' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  taslak: { label: 'Taslak', tone: 'muted' },
  incelemede: { label: 'İncelemede', tone: 'info' },
  cekimBekliyor: { label: 'Çekim Bekleniyor', tone: 'warning' },
  aktif: { label: 'Yayında', tone: 'success' },
  kiralandi: { label: 'Kiralandı', tone: 'muted' },
  satildi: { label: 'Satıldı', tone: 'muted' },
  pasif: { label: 'Pasif', tone: 'muted' },
  reddedildi: { label: 'Reddedildi', tone: 'danger' },
};

type MediaVariant = { width: number; format: string; url: string };

function firstVariantUrl(m: Media): string {
  const variants = (m.variants as MediaVariant[] | null) ?? [];
  return variants[0]?.url ?? '';
}

/** Medyayı galeri sırasına dizer: yüklenen dosyalar (çekim görselleri) her
 * zaman harici URL görsellerinin önünde; kendi içlerinde position, sonra
 * createdAt. Kaydet'teki media-sync position'ları da bu kurala oturtur —
 * bu sıralama kaydedilmemiş aradaki pencerede de kapağı doğru seçer. */
function sortMedia(media: Media[]): Media[] {
  const uploaded = (m: Media) => (firstVariantUrl(m).startsWith('/m/') ? 0 : 1);
  return [...media].sort(
    (a, b) =>
      uploaded(a) - uploaded(b) ||
      a.position - b.position ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

/** Prisma Listing (+media) satırını mevcut UI Listing tipine çevirir.
 * `id` alanına SLUG konur: URL'ler ve bileşen sözleşmesi id bekliyor,
 * seed slug'ları eski content id'leriyle birebir aynı. */
export function mapListingRow(row: DbListing & { media: Media[] }): Listing {
  const media = sortMedia(row.media);
  const images = media
    .filter((m) => m.type === 'image')
    .map(firstVariantUrl)
    .filter(Boolean);
  const video = media.find((m) => m.type === 'video');
  return {
    id: row.slug,
    title: row.title,
    location: row.location,
    district: row.district,
    type: TYPE_LABELS[row.type],
    area: row.area,
    price: row.price,
    pricePerM2: row.pricePerM2,
    badge: row.badge ?? '',
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    tags: row.tags,
    droneVideo: video ? firstVariantUrl(video) : '',
    dronePoster: video?.poster ?? undefined,
    images,
    description: row.description,
    highlights: row.highlights,
    specs: mergeStructuredSpecs(row),
  };
}

/** Yapısal alanlar "Arazi bilgileri" tablosunun başında gösterilir; serbest
 * satırlardaki imar/tapu/yol/su/elektrik kopyaları elenir (çift satır olmasın).
 * Yapısal alan hiç girilmemişse (eski kayıt) serbest satırlar aynen kalır. */
const STRUCTURED_KEYS = ['imar', 'tapu', 'yol', 'su', 'elektrik'];

function mergeStructuredSpecs(row: DbListing): Spec[] {
  const free = ((row.specs as Spec[] | null) ?? []).filter(Boolean);
  const hasStructured = row.imarDurumu || row.tapuDurumu || row.yolDurumu;
  if (!hasStructured) return free;

  const structured: Spec[] = [];
  if (row.tapuDurumu) structured.push({ label: 'Tapu Durumu', value: TAPU_LABELS[row.tapuDurumu] });
  if (row.imarDurumu) structured.push({ label: 'İmar Durumu', value: IMAR_LABELS[row.imarDurumu] });
  if (row.yolDurumu) structured.push({ label: 'Yol Durumu', value: YOL_LABELS[row.yolDurumu] });
  structured.push({ label: 'Su', value: row.suVar ? 'Var' : 'Yok' });
  structured.push({ label: 'Elektrik', value: row.elektrikVar ? 'Var' : 'Yok' });

  const rest = free.filter(
    (s) => !STRUCTURED_KEYS.some((k) => s.label.toLocaleLowerCase('tr-TR').includes(k)),
  );
  return [...structured, ...rest];
}

/** Chrome (site geneli içerik) parçalarını tek SiteChrome nesnesinde toplar. */
export function assembleChrome(input: {
  siteContent: DbSiteContent;
  stats: DbStat[];
  districts: DbDistrict[];
  features: DbFeature[];
  posts: BlogPost[];
}): SiteChrome {
  const { siteContent: sc, stats, districts, features, posts } = input;
  return {
    brand: sc.brand,
    hero: {
      badge: sc.heroBadge,
      titleLine1: sc.heroTitleLine1,
      titleAccent: sc.heroTitleAccent,
      subtitle: sc.heroSubtitle,
    },
    stats: stats.map((s): Stat => ({ value: s.value, label: s.label })),
    sections: sc.sections as SiteContent['sections'],
    districts: districts.map((d): District => ({ name: d.name, count: d.count, text: d.text })),
    features: features.map((f): Feature => ({ iconKey: f.iconKey, title: f.title, text: f.text })),
    articles: posts.map((p): Article => ({ category: p.category, title: p.title, text: p.body })),
    contact: {
      phone: sc.contactPhone,
      whatsapp: sc.contactWhatsapp,
      email: sc.contactEmail,
    },
  };
}
