// Ayrı dosya: 'use server' modüllerinden fonksiyon-olmayan export yasak.
import { z } from 'zod';
import { LAND_TYPES } from '@/content';
import { strToLines, strToSpecs, strToTags } from '@/components/admin/listing-form-helpers';

export const LISTING_STATUSES = [
  'taslak',
  'incelemede',
  'cekimBekliyor',
  'aktif',
  'kiralandi',
  'satildi',
  'pasif',
  'reddedildi',
] as const;

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.enum(values).optional());

const optionalNumber = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.coerce.number({ error: 'Sayı olarak yazın (örn. 39.4242).' }).optional(),
);

/** Admin ilan formu — üye başvurusundan farklı olarak koordinat, görseller,
 * rozet, etiketler, öne çıkanlar ve "Arazi bilgileri" satırları da düzenlenir.
 * Yayına alma (status=aktif) koordinat + ≥1 görsel + ≥1 bilgi satırı şart koşar. */
export const listingAdminSchema = z
  .object({
    title: z.string().trim().min(3, 'Başlık en az 3 karakter.').max(120),
    district: z.string().trim().min(1, 'İlçe girin.').max(40),
    location: z.string().trim().min(3, 'Konum girin.').max(300),
    type: z.enum(LAND_TYPES, { error: 'Arazi türü seçin.' }),
    purpose: z.enum(['satilik', 'kiralik'], { error: 'İlan amacı seçin.' }),
    status: z.enum(LISTING_STATUSES, { error: 'Durum seçin.' }),
    badge: z.string().trim().max(40, 'Rozet en fazla 40 karakter.'),
    areaM2: z.coerce
      .number({ error: 'Alanı m² olarak sayıyla yazın.' })
      .int('Alanı tam sayı olarak yazın.')
      .positive('Alan sıfırdan büyük olmalı.')
      .max(100_000_000),
    priceTRY: z.coerce
      .number({ error: 'Fiyatı ₺ olarak sayıyla yazın.' })
      .int('Fiyatı tam sayı olarak yazın.')
      .positive('Fiyat sıfırdan büyük olmalı.')
      .max(100_000_000_000),
    lat: optionalNumber,
    lng: optionalNumber,
    description: z
      .string()
      .trim()
      .min(30, 'Açıklama en az 30 karakter olmalı.')
      .max(5000, 'Açıklama en fazla 5000 karakter.'),
    droneVideo: z.string().trim().max(500),
    images: z.string().transform(strToLines),
    tags: z.string().transform(strToTags),
    highlights: z.string().transform(strToLines),
    specs: z.string().transform(strToSpecs),
    droneRequested: z.coerce.boolean(),
    imarDurumu: optionalEnum([
      'imarsiz',
      'koyYerlesik',
      'konutImarli',
      'sanayiTicari',
      'diger',
    ] as const),
    yolDurumu: optionalEnum(['cepheli', 'yakin', 'yok'] as const),
    tapuDurumu: optionalEnum(['mustakil', 'hisseli', 'tahsisli'] as const),
    suVar: z.coerce.boolean(),
    elektrikVar: z.coerce.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.status !== 'aktif') return;
    if (d.lat === undefined || d.lng === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['lat'],
        message: 'Yayına almak için koordinat (enlem/boylam) zorunlu.',
      });
    }
    if (!d.imarDurumu) {
      ctx.addIssue({
        code: 'custom',
        path: ['imarDurumu'],
        message: 'Yayın için imar durumu seçin.',
      });
    }
    if (!d.yolDurumu) {
      ctx.addIssue({
        code: 'custom',
        path: ['yolDurumu'],
        message: 'Yayın için yol durumu seçin.',
      });
    }
    if (!d.tapuDurumu) {
      ctx.addIssue({
        code: 'custom',
        path: ['tapuDurumu'],
        message: 'Yayın için tapu durumu seçin.',
      });
    }
    // Görsel şartı action'da denetlenir (yüklenen dosyalar formda görünmez);
    // arazi bilgisi tablosunu artık yapısal alanlar dolduruyor — serbest
    // satırlar (ada/parsel vb.) isteğe bağlı.
  });

export type ListingAdminInput = z.infer<typeof listingAdminSchema>;
