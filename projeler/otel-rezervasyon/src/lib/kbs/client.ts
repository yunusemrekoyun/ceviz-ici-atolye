import type { KbsConfig } from './config';

// Hand-rolled SOAP 1.1 client for the KBS tesis web service (WCF
// BasicHttpsBinding). The wire format below was verified against the live
// WSDL/XSD (SrvShsYtkTml.svc?wsdl + ?xsd=xsd0/xsd2/xsd3, June 2026):
//   - operation wrappers (tempuri.org): KullaniciTC, TssKod, Sifre, musteri
//   - payload children (datacontract ns) in strict schema order
//   - Sonuc { Basarili, HataKodu (enum NAME on the wire), Mesaj }
// EGM and Jandarma share this contract; only the endpoint differs (config).

const TEMPURI = 'http://tempuri.org/';
const DATA_NS = 'http://schemas.datacontract.org/2004/07/KBS_Tesis_Servis';
const TIMEOUT_MS = 20_000;

// Wire enum name → the numeric code used in the official PDF (we store the
// number; it is what hotel staff find in KBS documentation).
const HATA_KODLARI: Record<string, number> = {
  BILINMEYEN: 0,
  Basarili: 100,
  KayitBulunamadi: 101,
  YeniKayitBasarisiz: 102,
  GuncellemeBasarisiz: 103,
  SilmeBasarisiz: 104,
  VTHatasi: 105,
  GenelHata: 106,
  GirdiHatasi: 107,
  YetkiHatasi: 108,
  KimlikDogrulamaHatasi: 109,
};

/** Errors where a retry can plausibly succeed (DB hiccup / transport). */
export const RETRYABLE_KODLAR = new Set([105, 106]);

export interface KbsSonuc {
  basarili: boolean;
  hataKodu: number;
  hataAdi: string;
  mesaj: string | null;
  /** Mernis'ten dönen ad/soyad (yalnız TC giriş yanıtında). */
  adi?: string | null;
  soyadi?: string | null;
}

export interface KbsMusteriGiris {
  /** TCKN/YKN — Türk vatandaşı / yabancı kimlik no'lu misafir. */
  kimlikNo?: string;
  /** Pasaport/belge no — yabancı misafir (kimlikNo yoksa zorunlu). */
  belgeNo?: string;
  adi?: string | null;
  soyadi?: string | null;
  dogumTarihi?: Date | null;
  girisTarihi: Date;
  odaNo: string;
  plakaNo?: string | null;
  telNo?: string | null;
  ileriTarihli?: boolean;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** xs:dateTime in Turkish local time (the service expects TR wall-clock). */
export function kbsDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

/** First text content of a tag regardless of namespace prefix. */
function tagValue(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([^<]*)</(?:\\w+:)?${name}>`));
  return m ? m[1] : null;
}

function parseSonuc(xml: string): KbsSonuc {
  const fault = tagValue(xml, 'faultstring');
  if (fault) {
    return { basarili: false, hataKodu: 0, hataAdi: 'SOAPFault', mesaj: fault };
  }
  const hataAdi = tagValue(xml, 'HataKodu') ?? 'BILINMEYEN';
  const basarili = tagValue(xml, 'Basarili') === 'true';
  return {
    basarili,
    hataKodu: HATA_KODLARI[hataAdi] ?? 0,
    hataAdi,
    mesaj: tagValue(xml, 'Mesaj'),
    adi: tagValue(xml, 'ADI'),
    soyadi: tagValue(xml, 'SOYADI'),
  };
}

async function call(config: KbsConfig, operation: string, innerXml: string): Promise<KbsSonuc> {
  if (!config.endpoint) {
    return {
      basarili: false, hataKodu: 0, hataAdi: 'ConfigEksik',
      mesaj: 'KBS servis adresi tanımlı değil (EGM adresi portaldan öğrenilip ayarlara girilmeli).',
    };
  }

  const envelope =
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>` +
    `<${operation} xmlns="${TEMPURI}">` +
    `<KullaniciTC>${esc(config.kullaniciTc)}</KullaniciTC>` +
    `<TssKod>${esc(config.tesisKodu)}</TssKod>` +
    `<Sifre>${esc(config.sifre)}</Sifre>` +
    innerXml +
    `</${operation}>` +
    `</s:Body></s:Envelope>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"${TEMPURI}ISrvShsYtkTml/${operation}"`,
      },
      body: envelope,
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok && !text.includes('Envelope')) {
      return {
        basarili: false, hataKodu: 0, hataAdi: 'HTTPHata',
        mesaj: `KBS servisi HTTP ${res.status} döndürdü. IP kaydı/erişim engeli olabilir.`,
      };
    }
    return parseSonuc(text);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      basarili: false, hataKodu: 0, hataAdi: aborted ? 'ZamanAsimi' : 'BaglantiHatasi',
      mesaj: aborted
        ? 'KBS servisi zaman aşımına uğradı.'
        : `KBS servisine bağlanılamadı: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Schema-ordered payload element (omits empty optionals). */
function musteriXml(fields: [name: string, value: string | null | undefined][]): string {
  const inner = fields
    .filter(([, v]) => v != null && v !== '')
    .map(([n, v]) => `<d:${n}>${esc(v as string)}</d:${n}>`)
    .join('');
  return `<musteri xmlns:d="${DATA_NS}">${inner}</musteri>`;
}

/** TC vatandaşı / YKN'li misafir girişi — isim Mernis'ten döner. */
export function musteriKimlikNoGiris(config: KbsConfig, m: KbsMusteriGiris): Promise<KbsSonuc> {
  return call(config, 'MusteriKimlikNoGiris', musteriXml([
    ['GRSTRH', kbsDateTime(m.girisTarihi)],
    ['ILERITARIHLI', m.ileriTarihli ? 'true' : 'false'],
    ['KIMLIKNO', m.kimlikNo],
    ['ODANO', m.odaNo],
    ['PLKNO', m.plakaNo],
    ['TELNO', m.telNo],
  ]));
}

export function musteriKimlikNoCikis(config: KbsConfig, kimlikNo: string, cikisTarihi: Date): Promise<KbsSonuc> {
  return call(config, 'MusteriKimlikNoCikis', musteriXml([
    ['CKSTRH', kbsDateTime(cikisTarihi)],
    ['KIMLIKNO', kimlikNo],
  ]));
}

/** Yabancı misafir girişi — kimliği biz göndeririz (Mernis yok). */
export function musteriYabanciGiris(config: KbsConfig, m: KbsMusteriGiris): Promise<KbsSonuc> {
  // Schema order: ADI, ANAADI, BABADI, BELGENO, DOGUMTARIHI, GRSTRH,
  // ILERITARIHLI, ODANO, PLKNO, SOYADI, TELNO (ANAADI/BABADI elimizde yok).
  return call(config, 'MusteriYabanciGiris', musteriXml([
    ['ADI', m.adi],
    ['BELGENO', m.belgeNo],
    ['DOGUMTARIHI', m.dogumTarihi ? kbsDateTime(m.dogumTarihi) : undefined],
    ['GRSTRH', kbsDateTime(m.girisTarihi)],
    ['ILERITARIHLI', m.ileriTarihli ? 'true' : 'false'],
    ['ODANO', m.odaNo],
    ['PLKNO', m.plakaNo],
    ['SOYADI', m.soyadi],
    ['TELNO', m.telNo],
  ]));
}

export function musteriYabanciCikis(config: KbsConfig, belgeNo: string, cikisTarihi: Date): Promise<KbsSonuc> {
  return call(config, 'MusteriYabanciCikis', musteriXml([
    ['BELGENO', belgeNo],
    ['CKSTRH', kbsDateTime(cikisTarihi)],
  ]));
}

/** Bağlantı testi — küçük bir parametre listesi çeker (CINSIYET). */
export function parametreListele(config: KbsConfig): Promise<KbsSonuc> {
  return call(config, 'ParametreListele', '<parametreTuru>CINSIYET</parametreTuru>');
}
