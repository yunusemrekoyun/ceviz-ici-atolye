// Saf biçimlendirme yardımcıları — hem client (store re-export'u üzerinden)
// hem server (JSON-LD, server action'lar) kullanır; direktifsiz modül.
export function parsePrice(s: string): number {
  const n = Number(String(s).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatTRY(n: number): string {
  return '₺' + Math.round(n).toLocaleString('tr-TR');
}

export function waLink(phone: string, text: string): string {
  const num = String(phone).replace(/[^\d]/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  return 'tel:' + String(phone).replace(/[^\d+]/g, '');
}

/** m² sayısını "12.500 m²" görünümüne çevirir. */
export function formatArea(m2: number): string {
  return `${Math.round(m2).toLocaleString('tr-TR')} m²`;
}

/** Fiyat ve m²'den "₺148 / m²" birim metni üretir. */
export function formatPricePerM2(priceTRY: number, m2: number): string {
  if (!m2) return '';
  return `${formatTRY(priceTRY / m2)} / m²`;
}

/** Özel ada ünlü uyumu + ünsüz sertleşmesiyle bulunma eki takar:
 * Tavşanlı'da, Emet'te, Gediz'de, Altıntaş'ta. */
export function inLocative(name: string): string {
  const w = name.trim();
  let vowel = 'e';
  for (let i = w.length - 1; i >= 0; i--) {
    if ('eiöüEİÖÜ'.includes(w[i])) break;
    if ('aıouAIOU'.includes(w[i])) {
      vowel = 'a';
      break;
    }
  }
  const consonant = 'pçtksşhfPÇTKSŞHF'.includes(w[w.length - 1]) ? 't' : 'd';
  return `${w}'${consonant}${vowel}`;
}
