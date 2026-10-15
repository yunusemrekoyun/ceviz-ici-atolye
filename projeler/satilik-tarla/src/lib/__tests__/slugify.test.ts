import { describe, expect, it, vi } from 'vitest';

// slugify modülü uniqueListingSlug için prisma'yı import ediyor; testte
// client kurulmasın diye boş mock'lanır (saf slugify'ı test ediyoruz).
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { slugify } from '@/lib/slugify';

describe('slugify', () => {
  it('Türkçe karakterleri ASCII karşılıklarına çevirir', () => {
    expect(slugify('Şükrü Çavuş Bağı')).toBe('sukru-cavus-bagi');
    expect(slugify('Gölcük Köyü Üzüm Bağı')).toBe('golcuk-koyu-uzum-bagi');
  });

  it("büyük İ'yi noktasız artığa düşürmeden 'i' yapar", () => {
    // JS toLowerCase('İ') 'i' + birleşik nokta üretir; slugify bunu önlemeli.
    expect(slugify('İmar Durumu')).toBe('imar-durumu');
    expect(slugify('ILGIN')).toBe('ilgin');
  });

  it('ayraçları tekilleştirir, baştaki/sondaki tireyi kırpar', () => {
    expect(slugify('  Tavşanlı / Merkez — 12.500 m²  ')).toBe('tavsanli-merkez-12-500-m');
  });

  it('yalnızca sembol içeren girdide boş döner', () => {
    expect(slugify('!!! ***')).toBe('');
  });
});
