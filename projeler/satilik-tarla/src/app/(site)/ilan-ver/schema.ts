// Ayrı dosya: 'use server' modüllerinden fonksiyon-olmayan export yasak.
import { z } from 'zod';
import { LAND_TYPES } from '@/content';

export const listingApplicationSchema = z.object({
  title: z.string().trim().max(120, 'Başlık en fazla 120 karakter.').optional(),
  district: z.string().trim().min(1, 'İlçe seçin.').max(40),
  location: z
    .string()
    .trim()
    .min(10, 'Konumu biraz daha ayrıntılı tarif edin (en az 10 karakter).')
    .max(300),
  type: z.enum(LAND_TYPES, { error: 'Arazi türü seçin.' }),
  purpose: z.enum(['satilik', 'kiralik'], { error: 'Satılık mı kiralık mı seçin.' }),
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
  description: z
    .string()
    .trim()
    .min(30, 'Açıklama en az 30 karakter olmalı.')
    .max(3000, 'Açıklama en fazla 3000 karakter.'),
  droneRequested: z.coerce.boolean(),
});

export type ListingApplicationInput = z.infer<typeof listingApplicationSchema>;
