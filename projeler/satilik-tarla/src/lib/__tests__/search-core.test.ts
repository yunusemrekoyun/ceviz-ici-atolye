import { describe, expect, it } from 'vitest';
import { buildWhere, parseSearchParams } from '@/lib/search-core';

describe('parseSearchParams', () => {
  it('boş girdide varsayılanları döner', () => {
    const f = parseSearchParams({});
    expect(f).toMatchObject({ sirala: 'one-cikan', sayfa: 1 });
    expect(f.ilce).toBeUndefined();
    expect(f.su).toBeUndefined();
  });

  it('enum dışı imar/tapu/yol değerlerini eler', () => {
    const f = parseSearchParams({ imar: 'saray', tapu: 'hisseli', yol: 'ucan' });
    expect(f.imar).toBeUndefined();
    expect(f.tapu).toBe('hisseli');
    expect(f.yol).toBeUndefined();
  });

  it('biçimli sayıları ve bayrakları çözer', () => {
    const f = parseSearchParams({
      minFiyat: '1.500.000',
      maxAlan: '25 000',
      su: '1',
      elektrik: '0',
    });
    expect(f.minFiyat).toBe(1500000);
    expect(f.maxAlan).toBe(25000);
    expect(f.su).toBe(true);
    expect(f.elektrik).toBeUndefined();
  });

  it('geçersiz sayfa numarasını 1e sabitler, dizi paramı yok sayar', () => {
    expect(parseSearchParams({ sayfa: '-3' }).sayfa).toBe(1);
    expect(parseSearchParams({ sayfa: 'abc' }).sayfa).toBe(1);
    expect(parseSearchParams({ ilce: ['Emet', 'Gediz'] }).ilce).toBeUndefined();
  });
});

describe('buildWhere', () => {
  it('her zaman yalnızca aktif ilanları hedefler', () => {
    expect(buildWhere(parseSearchParams({}))).toEqual({ status: 'aktif' });
  });

  it('görünüm tipini DB enumuna çevirir', () => {
    const where = buildWhere(parseSearchParams({ tur: 'Bağ / Bahçe' }));
    expect(where.type).toBe('bag_bahce');
  });

  it('fiyat aralığını BigInt, alanı sayı olarak kurar', () => {
    const where = buildWhere(
      parseSearchParams({ minFiyat: '500.000', maxFiyat: '2.000.000', minAlan: '1000' }),
    );
    expect(where.priceValue).toEqual({ gte: BigInt(500000), lte: BigInt(2000000) });
    expect(where.areaM2).toEqual({ gte: 1000 });
  });

  it('serbest metni dört alanda insensitive arar', () => {
    const where = buildWhere(parseSearchParams({ q: 'gölcük' }));
    expect(where.OR).toHaveLength(4);
    expect(where.OR?.[0]).toEqual({ title: { contains: 'gölcük', mode: 'insensitive' } });
  });
});
