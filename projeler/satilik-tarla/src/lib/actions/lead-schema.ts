// Ayrı dosya: 'use server' modüllerinden fonksiyon-olmayan export yasak.
import { z } from 'zod';

export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Adınızı yazın.').max(100, 'Ad çok uzun.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+90|0)?\s*5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, {
      message: 'Geçerli bir cep telefonu girin (05xx ...).',
    }),
  email: z.union([z.literal(''), z.string().trim().email('Geçerli bir e-posta girin.')]).optional(),
  budget: z.string().trim().max(60).optional(),
  district: z.string().trim().max(40).optional(),
  purpose: z.string().trim().max(60).optional(),
  note: z.string().trim().max(1000, 'Not en fazla 1000 karakter olabilir.').optional(),
  kvkkConsent: z.literal(true, {
    error: 'Devam etmek için KVKK aydınlatma metnini onaylamanız gerekir.',
  }),
});

export const LEAD_PURPOSES = ['Tarımsal kullanım', 'Yatırım', 'Konut / bağ evi', 'Diğer'] as const;
