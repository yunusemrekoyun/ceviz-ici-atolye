import { describe, expect, it } from 'vitest';
import {
  formatArea,
  formatPricePerM2,
  formatTRY,
  inLocative,
  parsePrice,
  telLink,
  waLink,
} from '@/lib/format';

describe('parsePrice', () => {
  it('biçimli fiyat metnini sayıya çevirir', () => {
    expect(parsePrice('₺1.250.000')).toBe(1250000);
    expect(parsePrice('1 500 000 TL')).toBe(1500000);
  });

  it('rakamsız girdide 0 döner', () => {
    expect(parsePrice('fiyat yok')).toBe(0);
    expect(parsePrice('')).toBe(0);
  });
});

describe('formatTRY / formatArea / formatPricePerM2', () => {
  it('tr-TR binlik ayracıyla biçimler', () => {
    expect(formatTRY(1250000)).toBe('₺1.250.000');
    expect(formatArea(12500)).toBe('12.500 m²');
  });

  it('birim fiyatı yuvarlayarak üretir, m²=0 için boş döner', () => {
    expect(formatPricePerM2(1850000, 12500)).toBe('₺148 / m²');
    expect(formatPricePerM2(1850000, 0)).toBe('');
  });
});

describe('waLink / telLink', () => {
  it('telefonu rakama indirger ve metni URL-encode eder', () => {
    expect(waLink('+90 (555) 123 45 67', 'Merhaba, ilan')).toBe(
      'https://wa.me/905551234567?text=Merhaba%2C%20ilan',
    );
  });

  it('tel: bağlantısında + işaretini korur', () => {
    expect(telLink('+90 555 123 45 67')).toBe('tel:+905551234567');
  });
});

describe('inLocative', () => {
  it('ünlü uyumu ve ünsüz sertleşmesini uygular', () => {
    expect(inLocative('Tavşanlı')).toBe("Tavşanlı'da");
    expect(inLocative('Emet')).toBe("Emet'te");
    expect(inLocative('Gediz')).toBe("Gediz'de");
    expect(inLocative('Altıntaş')).toBe("Altıntaş'ta");
    expect(inLocative('Kütahya')).toBe("Kütahya'da");
  });
});
