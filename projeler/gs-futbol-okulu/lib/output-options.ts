/** Çıktı seçenekleri (tarayıcı ve sunucu ortak; pdfmake içermez). */
export type RosterPreset = "antrenor" | "iletisim" | "aidat" | "tam";

export const ROSTER_PRESETS: { key: RosterPreset; label: string; hint: string; billing?: boolean }[] = [
  { key: "antrenor", label: "Antrenör listesi", hint: "Ad, yaş, kaleci, veli, telefon, acil durum, kan grubu, devam" },
  { key: "iletisim", label: "İletişim listesi", hint: "Ad, yaş, veli ve telefonu" },
  { key: "aidat", label: "Aidat listesi", hint: "Veli, telefon, aidat durumu, ödeme günü, beklenen tutar", billing: true },
  { key: "tam", label: "Tam liste", hint: "İletişim, aidat durumu, devam ve forma bir arada", billing: true },
];
