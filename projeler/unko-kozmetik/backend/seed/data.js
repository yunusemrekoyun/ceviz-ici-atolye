/********************************************************
 * backend/seed/data.js — demo verisi
 * Ürün görselleri: seed/images/<image>-1.jpg ve <image>-2.jpg
 * Kaynaklar için seed/images/CREDITS.md dosyasına bakın.
 ********************************************************/

// Header'daki menü grupları ve kategoriler (menüde bu sırayla listelenir)
const categories = [
  {
    group: "Saç Bakımı",
    name: "Saç Bakımı",
    brands: ["Olaplex", "Keune", "Kevin.Murphy"],
  },
  {
    group: "Saç Bakımı",
    name: "Şampuan",
    brands: ["Keune", "Kevin.Murphy", "Olaplex"],
  },
  { group: "Saç Bakımı", name: "Saç Kremi", brands: ["Keune"] },
  { group: "Saç Bakımı", name: "Saç Maskesi", brands: ["Act+Acre", "Olaplex"] },
  { group: "Saç Bakımı", name: "Saç Serumu", brands: ["ÜnKo Professional"] },
  {
    group: "Saç Bakımı",
    name: "Saç Bakım Yağı",
    brands: ["ÜnKo Professional", "Olaplex"],
  },
  {
    group: "Saç Bakımı",
    name: "Saç Şekillendiriciler",
    brands: ["Apothecary 87", "Redken"],
  },
  { group: "Saç Bakımı", name: "Saç Spreyi", brands: ["Redken"] },
  { group: "Saç Bakımı", name: "Saç Boyaları", brands: ["BioMagic"] },
  { group: "Saç Bakımı", name: "Saç Açıcılar", brands: ["ÜnKo Professional"] },
  {
    group: "Saç Bakımı",
    name: "Erkek Saç Bakımı",
    brands: ["Apothecary 87", "Wahl"],
  },
  { group: "Cilt Bakımı", name: "Serumlar", brands: ["The Ordinary"] },
  { group: "Cilt Bakımı", name: "Yüz Maskesi", brands: ["Mary&May"] },
  { group: "Cilt Bakımı", name: "Yüz Kremi", brands: ["Grown Alchemist"] },
  {
    group: "El ve Ayak Bakımı",
    name: "El ve Ayak Bakımı",
    brands: ["ÜnKo Professional"],
  },
  { group: "Elektronik", name: "Fön Makinaları", brands: ["GA.MA"] },
  {
    group: "Elektronik",
    name: "Saç Düzleştiriciler",
    brands: ["ÜnKo Professional"],
  },
  { group: "Elektronik", name: "Saç Maşaları", brands: ["ÜnKo Professional"] },
  { group: "Elektronik", name: "Saç Kesim Makinaları", brands: ["Wahl"] },
];

const products = [
  {
    image: "olaplex-no6",
    name: "Olaplex No.6 Bond Smoother Bakım Kremi 100 ml",
    category: "Saç Bakımı",
    brand: "Olaplex",
    price: { current: 1390, discount: 10 },
    description:
      "Durulanmayan, bağ onarıcı şekillendirme kremi. Elektriklenmeyi 72 saate kadar kontrol altında tutar, saçı yumuşak ve parlak bırakır. Nemli saça, uçlara yoğunlaşarak uygulayın.",
  },
  {
    image: "keune-volume",
    name: "Keune Care Absolute Volume Şampuan 300 ml",
    category: "Şampuan",
    brand: "Keune",
    price: { current: 689, discount: 0 },
    description:
      "İnce telli saçlar için hacim şampuanı. Saçı ağırlaştırmadan temizler, köklerden dolgunluk kazandırır. Sülfat içermeyen formülü boyalı saçlarda da kullanılabilir.",
  },
  {
    image: "keune-satin",
    name: "Keune Care Satin Oil Saç Kremi 250 ml",
    category: "Saç Kremi",
    brand: "Keune",
    price: { current: 649, discount: 15 },
    description:
      "Kuru ve mat saçlar için yağ bazlı bakım kremi. Taramayı kolaylaştırır, saç teline ipeksi bir parlaklık verir. Şampuan sonrası 2-3 dakika bekletip durulayın.",
  },
  {
    image: "kevin-angel",
    name: "Kevin.Murphy Angel.Wash Şampuan 250 ml",
    category: "Şampuan",
    brand: "Kevin.Murphy",
    price: { current: 1150, discount: 0 },
    description:
      "İnce ve boyalı saçlar için nazik, renk koruyucu şampuan. Bitkisel özler saçı yumuşatırken rengin solmasını yavaşlatır.",
  },
  {
    image: "actacre-mask",
    name: "Act+Acre Restorative Saç Maskesi 150 ml",
    category: "Saç Maskesi",
    brand: "Act+Acre",
    price: { current: 1250, discount: 0 },
    description:
      "Yıpranmış saçlar için haftalık onarıcı maske. Yoğun nem sağlar, kırılmayı azaltır. Temiz ve nemli saça uygulayıp 5-10 dakika bekletin.",
  },
  {
    image: "unko-serum",
    name: "ÜnKo Professional Argan Saç Serumu 50 ml",
    category: "Saç Serumu",
    brand: "ÜnKo Professional",
    price: { current: 459, discount: 20 },
    description:
      "Argan yağı içeren hafif saç serumu. Kabarmayı azaltır, uçları besler ve fön öncesi ısıya karşı koruma sağlar.",
  },
  {
    image: "unko-oil",
    name: "ÜnKo Professional Besleyici Saç Bakım Yağı 100 ml",
    category: "Saç Bakım Yağı",
    brand: "ÜnKo Professional",
    price: { current: 399, discount: 0 },
    description:
      "Jojoba ve badem yağı karışımı. Kuru saç uçlarına birkaç damla uygulayarak parlaklık kazandırın; yağlı his bırakmaz.",
  },
  {
    image: "redken-quickdry",
    name: "Redken Quick Dry 18 Saç Spreyi 400 ml",
    category: "Saç Spreyi",
    brand: "Redken",
    price: { current: 899, discount: 0 },
    description:
      "Hızlı kuruyan, güçlü tutuş sağlayan bitirici sprey. Nem ve rüzgâra karşı şekli gün boyu korur; fırçalayınca kolayca dağılır.",
  },
  {
    image: "apothecary-salt",
    name: "Apothecary 87 Salt Tonic Tuz Spreyi 100 ml",
    category: "Saç Şekillendiriciler",
    brand: "Apothecary 87",
    price: { current: 749, discount: 10 },
    description:
      "Deniz tuzu içeren doku spreyi. Saça mat bitişli, doğal hacim ve plaj dalgası görünümü verir. Fön öncesi nemli saça püskürtün.",
  },
  {
    image: "apothecary-pomade",
    name: "Apothecary 87 Clay Pomade 100 ml",
    category: "Erkek Saç Bakımı",
    brand: "Apothecary 87",
    price: { current: 699, discount: 0 },
    description:
      "Mat bitişli, güçlü tutuşlu kil wax. Kısa ve orta boy saçlarda dağınık, doğal şekiller için idealdir; suyla kolayca yıkanır.",
  },
  {
    image: "biomagic-dye",
    name: "BioMagic Organik Saç Boyası 60 ml",
    category: "Saç Boyaları",
    brand: "BioMagic",
    price: { current: 289, discount: 0 },
    colors: ["Siyah", "Koyu Kahve", "Açık Kahve", "Kumral"],
    description:
      "Amonyaksız, bitkisel içerikli kalıcı saç boyası. Beyazları kapatır, saç derisini tahriş etmeden yoğun renk sağlar.",
  },
  {
    image: "unko-colorkit",
    name: "ÜnKo Professional Boya ve Açıcı Uygulama Seti",
    category: "Saç Açıcılar",
    brand: "ÜnKo Professional",
    price: { current: 189, discount: 0 },
    description:
      "Karıştırma kasesi, iki farklı boya fırçası ve ayırma tarağından oluşan set. Saç açıcı ve boya uygulamalarında eşit dağılım sağlar.",
  },
  {
    image: "ordinary-hyaluronic",
    name: "The Ordinary Hyaluronic Acid %2 + B5 Serum 30 ml",
    category: "Serumlar",
    brand: "The Ordinary",
    price: { current: 449, discount: 0 },
    description:
      "Farklı molekül ağırlıklarında hyaluronik asit ve B5 vitamini içeren nem serumu. Sabah ve akşam, nemlendiriciden önce birkaç damla uygulayın.",
  },
  {
    image: "ordinary-niacinamide",
    name: "The Ordinary Niacinamide %10 + Zinc %1 Serum 30 ml",
    category: "Serumlar",
    brand: "The Ordinary",
    price: { current: 419, discount: 15 },
    description:
      "Gözenek görünümünü azaltmaya ve sebum dengesini düzenlemeye yardımcı su bazlı serum. Karma ve yağlı ciltler için uygundur.",
  },
  {
    image: "ordinary-ascorbic",
    name: "The Ordinary Ascorbic Acid %8 + Alpha Arbutin %2 Serum 30 ml",
    category: "Serumlar",
    brand: "The Ordinary",
    price: { current: 529, discount: 0 },
    description:
      "C vitamini ve alfa arbutin içeren aydınlatıcı serum. Cilt tonunu eşitlemeye yardımcı olur; gündüz kullanımında güneş koruyucu ile tamamlayın.",
  },
  {
    image: "marymay-mask",
    name: "Mary&May CICA Tea Tree Arındırıcı Kil Maskesi 125 g",
    category: "Yüz Maskesi",
    brand: "Mary&May",
    price: { current: 599, discount: 10 },
    description:
      "Centella asiatica ve çay ağacı içeren yıkanabilir kil maskesi. Gözenekleri arındırır, hassas cildi yatıştırır. Haftada 1-2 kez 10 dakika uygulayın.",
  },
  {
    image: "grown-daycream",
    name: "Grown Alchemist Hydra-Repair Gündüz Kremi 40 ml",
    category: "Yüz Kremi",
    brand: "Grown Alchemist",
    price: { current: 1890, discount: 0 },
    description:
      "Kamelya ve sardunya özlü, nem bariyerini destekleyen hafif gündüz kremi. Cildi ağırlaştırmadan gün boyu nemli tutar.",
  },
  {
    image: "unko-handcream",
    name: "ÜnKo Professional Yoğun Nemlendirici El Kremi 75 ml",
    category: "El ve Ayak Bakımı",
    brand: "ÜnKo Professional",
    price: { current: 149, discount: 0 },
    description:
      "Shea yağı ve gliserin içeren, hızlı emilen el kremi. Kuru ve çatlamış ellerde yumuşaklığı geri kazandırır; yapışkanlık bırakmaz.",
  },
  {
    image: "gama-iq",
    name: "GA.MA iQ Perfetto Profesyonel Fön Makinesi",
    category: "Fön Makinaları",
    brand: "GA.MA",
    price: { current: 5499, discount: 12 },
    description:
      "Fırçasız dijital motorlu, hafif profesyonel fön makinesi. Yüksek hava akışıyla kurutma süresini kısaltır, iyon teknolojisiyle elektriklenmeyi azaltır.",
  },
  {
    image: "unko-straightener",
    name: "ÜnKo Professional Seramik Saç Düzleştirici",
    category: "Saç Düzleştiriciler",
    brand: "ÜnKo Professional",
    price: { current: 1299, discount: 0 },
    description:
      "Seramik kaplama plakalar, 5 kademeli ısı ayarı ve 230°C'ye kadar hızlı ısınma. 60 dakika sonra otomatik kapanır.",
  },
  {
    image: "unko-curler",
    name: "ÜnKo Professional 25 mm Saç Maşası",
    category: "Saç Maşaları",
    brand: "ÜnKo Professional",
    price: { current: 999, discount: 0 },
    description:
      "25 mm seramik namlu ile belirgin ve kalıcı bukleler. Ayarlanabilir ısı, döner kablo ve ısıya dayanıklı uç.",
  },
  {
    image: "wahl-gold",
    name: "Wahl 5 Star Gold Magic Clip Kablosuz Saç Kesim Makinesi",
    category: "Saç Kesim Makinaları",
    brand: "Wahl",
    price: { current: 3999, discount: 0 },
    description:
      "Profesyonel kullanım için kablosuz saç kesim makinesi. 90 dakikaya kadar çalışma süresi, ayarlanabilir bıçak ve 8 tarak aparatı.",
  },
];

// Onaylı demo yorumları (demo kullanıcı adına)
const reviews = [
  {
    image: "olaplex-no6",
    rating: 5,
    text: "Fön sonrası kabarma tamamen bitti, çok az miktarı yetiyor.",
  },
  {
    image: "keune-volume",
    rating: 4,
    text: "İnce saçlarımda gerçekten hacim fark ettim. Kokusu da hafif.",
  },
  {
    image: "ordinary-niacinamide",
    rating: 5,
    text: "İki haftada gözeneklerimde belirgin fark oldu.",
  },
  {
    image: "gama-iq",
    rating: 5,
    text: "Çok hafif ve sessiz, saçımı eskisinin yarısı sürede kurutuyor.",
  },
  {
    image: "unko-serum",
    rating: 4,
    text: "Uçlardaki kırıkları gizliyor, saçı yağlı göstermiyor.",
  },
];

const coupons = [{ code: "HOSGELDIN10", discountPercent: 10 }];

module.exports = { categories, products, reviews, coupons };
