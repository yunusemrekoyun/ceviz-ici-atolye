export const SCHOOL_NAME_LINE_1 = "GALATASARAY SPOR OKULLARI";
export const SCHOOL_NAME_LINE_2 = "KÜTAHYA FUTBOL OKULU";
export const FORM_TITLE = "ÖN KAYIT FORMU";

export const PUBLIC_FORM_PATH = "/on-kayit";
export const ADMIN_PATH = "/admin";

export const SUCCESS_MESSAGE_LINE_1 = "Bilgileriniz başarıyla alınmıştır.";
export const SUCCESS_MESSAGE_LINE_2 = "Lütfen fiziksel kayıt formunuzu da görevliye teslim ediniz.";
export const DUPLICATE_MESSAGE = "Bu öğrenci için daha önce kayıt oluşturulmuş.";

export const CONTACT_PARENT_TYPES = ["anne", "baba", "diger"] as const;
export type ContactParentType = (typeof CONTACT_PARENT_TYPES)[number];

export const CONTACT_PARENT_LABELS: Record<ContactParentType, string> = {
  anne: "Anne",
  baba: "Baba",
  diger: "Diğer",
};

export const BLOOD_GROUPS = [
  "A Rh+",
  "A Rh-",
  "B Rh+",
  "B Rh-",
  "AB Rh+",
  "AB Rh-",
  "0 Rh+",
  "0 Rh-",
  "Bilinmiyor",
] as const;

export const BRAND_NAME = "Kütahya Galatasaray Futbol Okulları";
export const INSTAGRAM_URL = "https://www.instagram.com/kutahyagsfutbolokulu/";
export const INSTAGRAM_HANDLE = "@kutahyagsfutbolokulu";
