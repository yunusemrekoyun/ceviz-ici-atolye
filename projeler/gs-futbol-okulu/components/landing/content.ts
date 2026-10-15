/**
 * Landing page copy. Everything the page says lives here so it can be edited without touching components.
 */

export const BRAND = {
  wordmark: "GS KÜTAHYA",
  org: "Galatasaray Spor Okulları",
  school: "Kütahya Futbol Okulu",
  fullName: "Galatasaray Spor Okulları Kütahya Futbol Okulu",
};

export const REGISTER_PATH = "/on-kayit";

export type SectionId = "hero" | "about" | "training" | "register";

export type NavItem = { id: SectionId; label: string };

export const NAV_ITEMS: NavItem[] = [
  { id: "hero", label: "Ana Sayfa" },
  { id: "about", label: "Hakkımızda" },
  { id: "training", label: "Antrenmanlar" },
  { id: "register", label: "Kayıt" },
];

export const HERO = {
  titleLines: ["GALATASARAY", "KÜTAHYA"],
  eyebrow: "Galatasaray Spor Okulları",
  subtitle: "Kütahya Futbol Okulu",
  lead: "Sarı-kırmızı disiplini, yaşa uygun antrenman programı ve takım ruhuyla geleceğin futbolcularını yetiştiriyoruz.",
  primaryCta: "Ön Kayıt Yap",
  secondaryCta: "Keşfet",
};

export const ABOUT = {
  eyebrow: "Hakkımızda",
  title: "Sahada disiplin, hayatta karakter.",
  text: "Galatasaray Spor Okulları çatısı altında, Kütahya'daki çocuk ve gençlere futbolu doğru temellerle öğretiyor; sporun yanında saygı, sorumluluk ve takım olma bilincini kazandırmayı hedefliyoruz.",
  cards: [
    {
      title: "Eğitim Yaklaşımı",
      items: [
        "Yaş gruplarına göre planlanmış antrenmanlar",
        "Oyun içinde öğrenmeye dayalı yöntem",
        "Her sporcuya bireysel gelişim takibi",
      ],
    },
    {
      title: "Değerlerimiz",
      items: ["Fair play", "Takım ruhu", "Disiplin ve süreklilik", "Saygı ve sorumluluk"],
    },
  ],
};

export const TRAINING = {
  eyebrow: "Antrenmanlar",
  title: "Yaşa uygun, ölçülü ve eğlenceli.",
  text: "Antrenmanlarımız temel tekniklerden oyun anlayışına uzanan bir bütün olarak planlanır; her sporcu kendi seviyesinde ilerler.",
  cards: [
    {
      title: "Temel Teknik",
      text: "Top kontrolü, pas, şut ve dribling çalışmalarıyla sağlam bir teknik altyapı.",
    },
    {
      title: "Taktik ve Oyun Anlayışı",
      text: "Pozisyon alma, alan kullanımı ve küçük alan oyunlarıyla oyunu okumayı öğrenme.",
    },
    {
      title: "Fiziksel Gelişim",
      text: "Koordinasyon, çeviklik ve denge çalışmalarıyla yaşa uygun fiziksel gelişim.",
    },
  ],
};

export const REGISTER = {
  eyebrow: "Kayıt",
  title: "Ön kaydınızı birkaç dakikada yapın.",
  text: "Online ön kayıt formu, fiziksel kayıt formunun yerine geçmez; bilgilerin hızlı ve doğru alınmasını sağlar.",
  steps: [
    "Online ön kayıt formunu doldurun.",
    "Fiziksel kayıt formunu doldurup imzalayın ve görevliye teslim edin.",
    "Kaydınız tamamlanır.",
  ],
  cta: "Ön Kayıt Formu",
};

/** Leave a field empty to hide it in the footer. */
export const CONTACT = {
  phone: "",
  email: "",
  address: "Kütahya",
  instagram: "",
};
