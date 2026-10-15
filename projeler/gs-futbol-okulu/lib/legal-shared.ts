// İstemci bileşenlerinin de kullandığı sabitler (veritabanına dokunmaz).
export const CONSENT_TYPES = ["required", "optional", "info"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];
export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  required: "Onay zorunlu",
  optional: "İsteğe bağlı izin",
  info: "Yalnız bilgilendirme",
};
