import { describe, expect, it } from 'vitest';
import { leadSchema } from '@/lib/actions/lead-schema';

const valid = {
  name: 'Ahmet Yılmaz',
  phone: '0555 123 45 67',
  email: '',
  budget: '2-3 milyon',
  district: 'Tavşanlı',
  purpose: 'Yatırım',
  note: 'Yola cepheli olsun.',
  kvkkConsent: true as const,
};

describe('leadSchema', () => {
  it('geçerli başvuruyu kabul eder', () => {
    expect(leadSchema.safeParse(valid).success).toBe(true);
  });

  it('cep telefonu biçimlerini kabul eder', () => {
    for (const phone of ['05551234567', '+90 555 123 45 67', '555 123 45 67', '0555-123-45-67']) {
      expect(leadSchema.safeParse({ ...valid, phone }).success).toBe(true);
    }
  });

  it('sabit hat / eksik numarayı reddeder', () => {
    for (const phone of ['0274 123 45 67', '555 123', 'telefonum yok']) {
      expect(leadSchema.safeParse({ ...valid, phone }).success).toBe(false);
    }
  });

  it('KVKK onayı olmadan reddeder', () => {
    expect(leadSchema.safeParse({ ...valid, kvkkConsent: false }).success).toBe(false);
  });

  it('boş e-postaya izin verir, bozuk e-postayı reddeder', () => {
    expect(leadSchema.safeParse({ ...valid, email: '' }).success).toBe(true);
    expect(leadSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('çok kısa adı reddeder', () => {
    expect(leadSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });
});
