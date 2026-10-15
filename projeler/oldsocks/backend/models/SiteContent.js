const mongoose = require("mongoose");

const HEADER_BRAND_OPTIONS = Object.freeze({
  mode: ["logo", "text", "both"],
  font: ["pirata", "grenze", "fraktur"],
  style: ["chrome", "dark"],
});

const DEFAULT_SITE_CONTENT = Object.freeze({
  vision: {
    heading: "Vizyonumuz",
    body: "Oldsocks olarak amacımız; Kütahya’dan doğan sokak kültürü ve casual şıklığı, yüksek kalite ve özgün tasarımla birleştirip Türkiye’nin her yerine ulaştırmak. Erkek giyimde trendleri sadece takip eden değil, aynı zamanda belirleyen; zamansız, rahat ve karakterli bir stil anlayışını yaygınlaştıran ilham verici bir marka olmak.",
  },
  mission: {
    heading: "Misyonumuz",
    body: "Günlük hayatta giyilebilir sokak stilini; iyi kalıp, kaliteli kumaş ve özenli işçilikle herkes için ulaşılabilir kılmak. Koleksiyonlarımızı zamansız parçalar etrafında kurgularken, müşterimize sadece kıyafet değil, tarz ve özgüven deneyimi sunmak. Kütahya’dan büyüyen yerel enerjimizi koruyup, dürüst fiyat politikası ve tutarlı kalite ile ulusal çapta sürdürülebilir bir marka kültürü inşa etmek.",
  },
  history: {
    heading: "2021 → 2025",
    body: "2021’de Kütahya’da küçük bir seçkiyle başlayan Oldsocks, sokak tarzını günlük hayata taşıyan rahat ve şık parçalara odaklandı. 2022’de çevrim içi satışa açılarak Instagram topluluğunu büyüttü; 2023’te fit ve malzeme kalitesini standart hâle getirip kapsül koleksiyonlara geçti. 2024’te yerli üretim partnerleriyle tedarik zincirini güçlendirdi, kalite kontrolünü sıkılaştırdı. 2025’te e‑ticaret altyapısını yenileyip Türkiye geneline daha hızlı teslimat ve daha zengin bir ürün gamı ile yayıldı. Bugün Oldsocks; rahat kesim, temiz çizgiler ve uzun ömürlü kumaş anlayışıyla, “şık ama zahmetsiz” erkek stilinin güvenilir adresi.",
  },
  footer: {
    description: "Kaliteyi ve tarzı bir araya getiren OLDSOCKS, her adımda konforu sunmayı hedefler. Siz de stilinize yön vermek istiyorsanız doğru yerdesiniz.",
    address: "Alipaşa mahallesi üçbey sokak no7/A Kütahya Merkez",
    facebookUrl: "https://www.facebook.com/Oldsockscollection/",
    instagramUrl: "https://www.instagram.com/oldscks/",
  },
  // Header'daki marka: logo görseli, yazı ya da ikisi birden.
  header: { mode: "both", text: "OLDSOCKS", font: "pirata", style: "chrome" },
  contact: {
    address: "Alipaşa, Üçbey Sk. No:7, 43020 Kütahya Merkez/Kütahya",
    phone: "+90 541 428 29 89",
    email: "oldscks@gmail.com",
    hours: "Pazartesi-Cumartesi 09:00-20:00",
  },
});

const assetField = { type: mongoose.Schema.Types.ObjectId, ref: "MediaAsset", default: null };
const siteContentSchema = new mongoose.Schema({
  key: { type: String, default: "main", unique: true, immutable: true },
  logoAsset: assetField,
  headerBrandMode: { type: String, enum: ["logo", "text", "both"], default: DEFAULT_SITE_CONTENT.header.mode },
  headerBrandText: { type: String, trim: true, maxlength: 30, default: DEFAULT_SITE_CONTENT.header.text },
  headerBrandFont: { type: String, enum: ["pirata", "grenze", "fraktur"], default: DEFAULT_SITE_CONTENT.header.font },
  headerBrandStyle: { type: String, enum: ["chrome", "dark"], default: DEFAULT_SITE_CONTENT.header.style },
  visionHeading: { type: String, trim: true, maxlength: 100, default: DEFAULT_SITE_CONTENT.vision.heading },
  visionBody: { type: String, trim: true, maxlength: 5000, default: DEFAULT_SITE_CONTENT.vision.body },
  visionImageAsset: assetField,
  missionHeading: { type: String, trim: true, maxlength: 100, default: DEFAULT_SITE_CONTENT.mission.heading },
  missionBody: { type: String, trim: true, maxlength: 5000, default: DEFAULT_SITE_CONTENT.mission.body },
  missionImageAsset: assetField,
  historyHeading: { type: String, trim: true, maxlength: 100, default: DEFAULT_SITE_CONTENT.history.heading },
  historyBody: { type: String, trim: true, maxlength: 5000, default: DEFAULT_SITE_CONTENT.history.body },
  footerDescription: { type: String, trim: true, maxlength: 1000, default: DEFAULT_SITE_CONTENT.footer.description },
  footerAddress: { type: String, trim: true, maxlength: 300, default: DEFAULT_SITE_CONTENT.footer.address },
  contactAddress: { type: String, trim: true, maxlength: 300, default: DEFAULT_SITE_CONTENT.contact.address },
  contactPhone: { type: String, trim: true, maxlength: 50, default: DEFAULT_SITE_CONTENT.contact.phone },
  contactEmail: { type: String, trim: true, maxlength: 160, default: DEFAULT_SITE_CONTENT.contact.email },
  contactHours: { type: String, trim: true, maxlength: 160, default: DEFAULT_SITE_CONTENT.contact.hours },
  facebookUrl: { type: String, trim: true, maxlength: 300, default: DEFAULT_SITE_CONTENT.footer.facebookUrl },
  instagramUrl: { type: String, trim: true, maxlength: 300, default: DEFAULT_SITE_CONTENT.footer.instagramUrl },
}, { timestamps: true });

module.exports = mongoose.model("SiteContent", siteContentSchema);
module.exports.DEFAULT_SITE_CONTENT = DEFAULT_SITE_CONTENT;
module.exports.HEADER_BRAND_OPTIONS = HEADER_BRAND_OPTIONS;
