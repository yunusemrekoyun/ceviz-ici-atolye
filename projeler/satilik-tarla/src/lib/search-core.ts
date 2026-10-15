// Arama çekirdeği: URL/kayıtlı-arama paramları -> Prisma where. Hem /ilanlar
// sayfası hem worker'daki günlük özet BU kurucuyu kullanır (tek doğruluk
// kaynağı) — bu yüzden 'server-only' işaretli değil ve prisma import etmez.
import type { Prisma } from '@prisma/client';
import { TYPE_MAP } from './mappers';
import type { LandType } from '@/content';

export const PAGE_SIZE = 24;

export type SearchFilters = {
  ilce?: string;
  tur?: string;
  q?: string;
  imar?: string;
  tapu?: string;
  yol?: string;
  su?: boolean;
  elektrik?: boolean;
  minFiyat?: number;
  maxFiyat?: number;
  minAlan?: number;
  maxAlan?: number;
  sirala: string;
  sayfa: number;
};

const IMAR_VALUES = ['imarsiz', 'koyYerlesik', 'konutImarli', 'sanayiTicari', 'diger'];
const TAPU_VALUES = ['mustakil', 'hisseli', 'tahsisli'];
const YOL_VALUES = ['cepheli', 'yakin', 'yok'];

const num = (v: string | undefined) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseSearchParams(
  sp: Record<string, string | string[] | undefined>,
): SearchFilters {
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);
  return {
    ilce: get('ilce') || undefined,
    tur: get('tur') || undefined,
    q: get('q')?.trim() || undefined,
    imar: IMAR_VALUES.includes(get('imar') ?? '') ? get('imar') : undefined,
    tapu: TAPU_VALUES.includes(get('tapu') ?? '') ? get('tapu') : undefined,
    yol: YOL_VALUES.includes(get('yol') ?? '') ? get('yol') : undefined,
    su: get('su') === '1' || undefined,
    elektrik: get('elektrik') === '1' || undefined,
    minFiyat: num(get('minFiyat')),
    maxFiyat: num(get('maxFiyat')),
    minAlan: num(get('minAlan')),
    maxAlan: num(get('maxAlan')),
    sirala: get('sirala') ?? 'one-cikan',
    sayfa: Math.max(1, Number(get('sayfa')) || 1),
  };
}

export function buildWhere(f: SearchFilters): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: 'aktif' };
  if (f.ilce) where.district = f.ilce;
  if (f.tur && f.tur in TYPE_MAP) where.type = TYPE_MAP[f.tur as LandType];
  if (f.imar) where.imarDurumu = f.imar as never;
  if (f.tapu) where.tapuDurumu = f.tapu as never;
  if (f.yol) where.yolDurumu = f.yol as never;
  if (f.su) where.suVar = true;
  if (f.elektrik) where.elektrikVar = true;
  if (f.minFiyat || f.maxFiyat) {
    where.priceValue = {
      ...(f.minFiyat ? { gte: BigInt(f.minFiyat) } : {}),
      ...(f.maxFiyat ? { lte: BigInt(f.maxFiyat) } : {}),
    };
  }
  if (f.minAlan || f.maxAlan) {
    where.areaM2 = {
      ...(f.minAlan ? { gte: f.minAlan } : {}),
      ...(f.maxAlan ? { lte: f.maxAlan } : {}),
    };
  }
  if (f.q) {
    where.OR = [
      { title: { contains: f.q, mode: 'insensitive' } },
      { location: { contains: f.q, mode: 'insensitive' } },
      { district: { contains: f.q, mode: 'insensitive' } },
      { description: { contains: f.q, mode: 'insensitive' } },
    ];
  }
  return where;
}
