// All editable site content lives here as a single JSON-serializable object.
// The admin panel edits a copy of this and persists it to localStorage.

export type Spec = { label: string; value: string };

export const LAND_TYPES = ['Tarla', 'Arsa', 'Bağ / Bahçe', 'Köy İçi'] as const;
export type LandType = (typeof LAND_TYPES)[number];

export type Listing = {
  id: string;
  title: string;
  location: string;
  district: string;
  type: LandType;
  area: string;
  price: string;
  pricePerM2: string;
  badge: string;
  lat: number;
  lng: number;
  tags: string[];
  droneVideo: string;
  dronePoster?: string;
  images: string[];
  description: string;
  highlights: string[];
  specs: Spec[];
};

export type District = { name: string; count: string; text: string };
export type Feature = { iconKey: string; title: string; text: string };
export type Article = { category: string; title: string; text: string };
export type Stat = { value: string; label: string };

export type SiteContent = {
  brand: string;
  hero: {
    badge: string;
    titleLine1: string;
    titleAccent: string;
    subtitle: string;
  };
  stats: Stat[];
  sections: {
    listingsTitle: string;
    listingsSubtitle: string;
    mapTitle: string;
    mapSubtitle: string;
    districtsTitle: string;
    districtsSubtitle: string;
    aboutTitle: string;
    aboutSubtitle: string;
    guideTitle: string;
    guideSubtitle: string;
    contactTitle: string;
    contactSubtitle: string;
    matchTitle: string;
    matchSubtitle: string;
  };
  listings: Listing[];
  districts: District[];
  features: Feature[];
  articles: Article[];
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
  };
};

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4';

export const defaultContent: SiteContent = {
  brand: 'Kütahya Satılık Tarla',
  hero: {
    badge: 'Kütahya ve ilçeleri · yerel arazi platformu',
    titleLine1: 'Kütahya’da toprağın',
    titleAccent: 'güvenilir adresi',
    subtitle:
      'Gerçek fotoğraflar, net tapu ve arazi bilgisiyle; ilçe ilçe tarla, arsa ve arazi. Aradığınızı bulun ya da arazinizi ücretsiz ilana verin.',
  },
  stats: [
    { value: '6', label: 'İlçe ve çevresi' },
    { value: '100%', label: 'Drone destekli çekim' },
    { value: '09–19', label: 'Her gün telefon desteği' },
  ],
  sections: {
    listingsTitle: 'Öne çıkan ilanlar',
    listingsSubtitle: 'Her ilan gerçek fotoğraf, konum ve doğrulanmış arazi bilgisiyle hazırlanır.',
    mapTitle: 'Arazileri Haritada Keşfedin',
    mapSubtitle:
      'Haritada gezinin, aktif ilanlar göründükçe yüklenir. Bir pine tıklayın, arazinin drone görüntüsünü ve detaylarını anında açın.',
    districtsTitle: 'İlçe ilçe Kütahya',
    districtsSubtitle:
      'Merkez ve ilçelerdeki tarla, arsa ve arazi fırsatlarını ilçelere göre inceleyin.',
    aboutTitle: 'Neden Kütahya Satılık Tarla?',
    aboutSubtitle:
      'Yerel bilgi, drone çekimleri ve doğrulanmış detaylarla doğru araziyi bulmanıza yardımcı oluyoruz.',
    guideTitle: 'Arazi Yatırımı İçin Bilmeniz Gerekenler',
    guideSubtitle: 'Doğru kararlar için sade ve uygulanabilir rehber içerikleri.',
    contactTitle: 'Size Uygun Araziyi Birlikte Bulalım',
    contactSubtitle:
      'Bütçenizi, aradığınız bölgeyi ve yatırım hedefinizi paylaşın; size en uygun ilanları önerelim.',
    matchTitle: 'Bana Uygun Araziyi Bul',
    matchSubtitle:
      'Birkaç bilgi paylaşın; ekibimiz bütçenize ve hedefinize en uygun arazileri sizin için seçip iletsin.',
  },
  listings: [
    {
      id: 'tavsanli-yola-yakin',
      title: 'Tavşanlı’da Yola Yakın Satılık Tarla',
      location: 'Tavşanlı / Kütahya',
      district: 'Tavşanlı',
      type: 'Tarla',
      area: '12.500 m²',
      price: '₺1.850.000',
      pricePerM2: '₺148 / m²',
      badge: 'Yola Yakın',
      lat: 39.5471,
      lng: 29.4912,
      tags: ['Müstakil Tapu', 'Yola Cepheli', 'Hissesiz'],
      droneVideo: BG_VIDEO,
      images: [
        'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      ],
      description:
        'Ana yola yakın konumu ve geniş kullanım alanıyla yatırım için güçlü seçenek. Asfalt yola cepheli, traktör ve iş makinesi girişine elverişli, verimli taban–kıraç karakterli arazi.',
      highlights: [
        'Asfalt yola yaklaşık 120 m cepheli, kolay erişim',
        'Köy yerleşimine 2 km, elektrik hattına yakın',
        'Bölünmeye ve uzun vadeli değerlenmeye uygun parsel',
        'Tamamı tek tapuda, ortak/hisse karmaşası yok',
      ],
      specs: [
        { label: 'Tapu Durumu', value: 'Müstakil Tapu' },
        { label: 'İmar Durumu', value: 'Tarla' },
        { label: 'Ada / Parsel', value: '1428 / 12' },
        { label: 'Yol Durumu', value: 'Asfalt yola cepheli (~120 m)' },
        { label: 'Elektrik', value: 'Yakınında mevcut' },
        { label: 'Su', value: 'Sulu tarım, DSİ kanalına yakın' },
        { label: 'Arazi Eğimi', value: 'Düz – hafif eğimli' },
        { label: 'Hisse Durumu', value: 'Hissesiz (Tam)' },
        { label: 'Krediye Uygunluk', value: 'Tarım kredisine uygun' },
        { label: 'Koordinat', value: '39.5471, 29.4912' },
      ],
    },
    {
      id: 'gediz-yatirimlik',
      title: 'Gediz’de Yatırımlık Arazi',
      location: 'Gediz / Kütahya',
      district: 'Gediz',
      type: 'Tarla',
      area: '8.200 m²',
      price: '₺1.250.000',
      pricePerM2: '₺152 / m²',
      badge: 'Yatırımlık',
      lat: 39.0412,
      lng: 29.3897,
      tags: ['Müstakil Tapu', 'Gelişim Aksı', 'Hissesiz'],
      droneVideo: BG_VIDEO,
      images: [
        'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80',
      ],
      description:
        'Gelişim aksına yakın, uzun vadeli değer artışı potansiyeli taşıyan arazi. Ulaşım bağlantıları güçlenen bölgede, hem tarımsal hem yatırımsal kullanıma uygun konum.',
      highlights: [
        'İlçe gelişim aksına ve sanayi bölgesine yakın',
        'Stabilize yol cephesi, araç erişimi rahat',
        'Düzgün geometrili, kullanışlı parsel formu',
        'Orta-uzun vadede güçlü değerlenme beklentisi',
      ],
      specs: [
        { label: 'Tapu Durumu', value: 'Müstakil Tapu' },
        { label: 'İmar Durumu', value: 'Tarla' },
        { label: 'Ada / Parsel', value: '0 / 314' },
        { label: 'Yol Durumu', value: 'Stabilize yola cepheli' },
        { label: 'Elektrik', value: 'Hat güzergâhına yakın' },
        { label: 'Su', value: 'Kuyu açmaya uygun' },
        { label: 'Arazi Eğimi', value: 'Hafif eğimli' },
        { label: 'Hisse Durumu', value: 'Hissesiz (Tam)' },
        { label: 'Krediye Uygunluk', value: 'Uygun' },
        { label: 'Koordinat', value: '39.0412, 29.3897' },
      ],
    },
    {
      id: 'merkez-koy-ici',
      title: 'Merkez’e Yakın Köy İçi Arsa',
      location: 'Merkez / Kütahya',
      district: 'Merkez',
      type: 'Köy İçi',
      area: '1.450 m²',
      price: '₺980.000',
      pricePerM2: '₺676 / m²',
      badge: 'Köy İçi',
      lat: 39.4192,
      lng: 29.9833,
      tags: ['Müstakil Tapu', 'Köy İçi', 'Altyapı Yakın'],
      droneVideo: BG_VIDEO,
      images: [
        'https://images.unsplash.com/photo-1517022812141-23620dba5c23?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80',
      ],
      description:
        'Şehir merkezine kısa mesafede, köy içi konum avantajı sunan arsa. Altyapıya yakın, müstakil ev veya bağ-bahçe kullanımı için ideal, ulaşımı kolay konumda.',
      highlights: [
        'Şehir merkezine kısa sürüş mesafesi',
        'Köy içi, elektrik ve su altyapısına komşu',
        'Müstakil ev / bağ evi için uygun konum',
        'Net sınırlı, ölçülü ve sorunsuz tapu',
      ],
      specs: [
        { label: 'Tapu Durumu', value: 'Müstakil Tapu' },
        { label: 'İmar Durumu', value: 'Köy yerleşik alanı / Arsa' },
        { label: 'Ada / Parsel', value: '112 / 5' },
        { label: 'Yol Durumu', value: 'Köy içi yola cepheli' },
        { label: 'Elektrik', value: 'Mevcut' },
        { label: 'Su', value: 'Şebeke suyu mevcut' },
        { label: 'Arazi Eğimi', value: 'Düz' },
        { label: 'Hisse Durumu', value: 'Hissesiz (Tam)' },
        { label: 'Krediye Uygunluk', value: 'Konut kredisine uygun' },
        { label: 'Koordinat', value: '39.4192, 29.9833' },
      ],
    },
    {
      id: 'simav-bag-bahce',
      title: 'Simav’da Doğayla İç İçe Bağ-Bahçe Arazisi',
      location: 'Simav / Kütahya',
      district: 'Simav',
      type: 'Bağ / Bahçe',
      area: '4.800 m²',
      price: '₺720.000',
      pricePerM2: '₺150 / m²',
      badge: 'Doğa İçinde',
      lat: 39.0897,
      lng: 28.9789,
      tags: ['Müstakil Tapu', 'Su Kaynağı', 'Manzaralı'],
      droneVideo: BG_VIDEO,
      images: [
        'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
      ],
      description:
        'Doğayla iç içe, temiz havalı bir konumda bağ-bahçe ve hobi tarımı için ideal arazi. Su kaynağına yakın, manzaralı ve sakin bir çevrede.',
      highlights: [
        'Temiz hava ve sakin doğa konumu',
        'Su kaynağına ve köy yoluna yakın',
        'Hobi bahçesi ve bağ için verimli toprak',
        'Manzaralı, hafif eğimli kullanışlı parsel',
      ],
      specs: [
        { label: 'Tapu Durumu', value: 'Müstakil Tapu' },
        { label: 'İmar Durumu', value: 'Bağ / Bahçe' },
        { label: 'Ada / Parsel', value: '208 / 19' },
        { label: 'Yol Durumu', value: 'Köy yoluna cepheli' },
        { label: 'Elektrik', value: 'Yakınında mevcut' },
        { label: 'Su', value: 'Doğal su kaynağı yakın' },
        { label: 'Arazi Eğimi', value: 'Hafif eğimli' },
        { label: 'Hisse Durumu', value: 'Hissesiz (Tam)' },
        { label: 'Krediye Uygunluk', value: 'Uygun' },
        { label: 'Koordinat', value: '39.0897, 28.9789' },
      ],
    },
    {
      id: 'altintas-ova-tarla',
      title: 'Altıntaş Ovası’nda Verimli Sulu Tarla',
      location: 'Altıntaş / Kütahya',
      district: 'Altıntaş',
      type: 'Tarla',
      area: '20.000 m²',
      price: '₺2.400.000',
      pricePerM2: '₺120 / m²',
      badge: 'Sulu Tarım',
      lat: 39.0667,
      lng: 30.1167,
      tags: ['Müstakil Tapu', 'Sulu Tarım', 'Geniş Cephe'],
      droneVideo: BG_VIDEO,
      images: [
        'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80',
      ],
      description:
        'Altıntaş Ovası’nın verimli topraklarında, sulu tarıma elverişli geniş tarla. Düz zemini ve geniş cephesiyle modern tarım ve yatırım için güçlü seçenek.',
      highlights: [
        'Verimli ova toprağı, yüksek tarımsal verim',
        'Sulu tarıma uygun, su altyapısı güçlü',
        'Geniş yol cephesi, makine erişimi kolay',
        'Tek tapu, bölünmeye uygun büyük parsel',
      ],
      specs: [
        { label: 'Tapu Durumu', value: 'Müstakil Tapu' },
        { label: 'İmar Durumu', value: 'Tarla' },
        { label: 'Ada / Parsel', value: '345 / 8' },
        { label: 'Yol Durumu', value: 'Asfalt yola cepheli' },
        { label: 'Elektrik', value: 'Mevcut' },
        { label: 'Su', value: 'Sulu tarım, sulama kanalı mevcut' },
        { label: 'Arazi Eğimi', value: 'Düz' },
        { label: 'Hisse Durumu', value: 'Hissesiz (Tam)' },
        { label: 'Krediye Uygunluk', value: 'Tarım kredisine uygun' },
        { label: 'Koordinat', value: '39.0667, 30.1167' },
      ],
    },
    {
      id: 'emet-uygun-arsa',
      title: 'Emet’te Uygun Bütçeli Köy İçi Arsa',
      location: 'Emet / Kütahya',
      district: 'Emet',
      type: 'Köy İçi',
      area: '900 m²',
      price: '₺540.000',
      pricePerM2: '₺600 / m²',
      badge: 'Uygun Fiyat',
      lat: 39.3447,
      lng: 29.2606,
      tags: ['Müstakil Tapu', 'Köy İçi', 'Uygun Bütçe'],
      droneVideo: BG_VIDEO,
      images: [
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      ],
      description:
        'Emet ilçesinde, uygun bütçeyle köy içi konum arayanlar için ideal arsa. Altyapıya yakın, müstakil ev veya yazlık için elverişli.',
      highlights: [
        'Uygun bütçeli giriş fırsatı',
        'Köy içi, elektrik ve su altyapısına komşu',
        'Müstakil ev / yazlık için uygun konum',
        'Net sınırlı, sorunsuz tapu',
      ],
      specs: [
        { label: 'Tapu Durumu', value: 'Müstakil Tapu' },
        { label: 'İmar Durumu', value: 'Köy yerleşik alanı / Arsa' },
        { label: 'Ada / Parsel', value: '76 / 22' },
        { label: 'Yol Durumu', value: 'Köy içi yola cepheli' },
        { label: 'Elektrik', value: 'Mevcut' },
        { label: 'Su', value: 'Şebeke suyu mevcut' },
        { label: 'Arazi Eğimi', value: 'Düz' },
        { label: 'Hisse Durumu', value: 'Hissesiz (Tam)' },
        { label: 'Krediye Uygunluk', value: 'Konut kredisine uygun' },
        { label: 'Koordinat', value: '39.3447, 29.2606' },
      ],
    },
  ],
  districts: [
    { name: 'Merkez', count: '24 ilan', text: 'Şehre yakın yatırım fırsatları' },
    { name: 'Tavşanlı', count: '18 ilan', text: 'Geniş tarla ve köy arazileri' },
    { name: 'Gediz', count: '15 ilan', text: 'Gelişim potansiyeli yüksek bölgeler' },
    { name: 'Simav', count: '12 ilan', text: 'Doğa ve tarım odaklı alanlar' },
    { name: 'Emet', count: '9 ilan', text: 'Uygun bütçeli arazi seçenekleri' },
    { name: 'Altıntaş', count: '11 ilan', text: 'Ulaşım aksına yakın fırsatlar' },
  ],
  features: [
    {
      iconKey: 'local',
      title: 'Yerel Bölge Bilgisi',
      text: 'Kütahya merkez ve ilçelerindeki arazi potansiyelini yerel bilgiyle değerlendiriyoruz.',
    },
    {
      iconKey: 'drone',
      title: 'Drone ile Çekim',
      text: 'Her arazi için havadan drone görüntüleri ile konumu ve sınırları net şekilde gösteriyoruz.',
    },
    {
      iconKey: 'verified',
      title: 'Doğrulanmış Detaylar',
      text: 'Tapu, imar, ada-parsel ve altyapı bilgilerini tek tek kontrol ederek sunuyoruz.',
    },
    {
      iconKey: 'invest',
      title: 'Yatırım Odaklı Danışmanlık',
      text: 'Bütçenize ve beklentinize göre doğru lokasyonları öne çıkarıyoruz.',
    },
  ],
  articles: [
    {
      category: 'Satın Alma Rehberi',
      title: 'Tarla Alırken Nelere Dikkat Edilmeli?',
      text: 'Tapu, yol, su, imar ve hisse durumu gibi kritik başlıkları kontrol etmeden karar vermeyin.',
    },
    {
      category: 'Resmi Süreçler',
      title: 'İmar Durumu Nasıl Sorgulanır?',
      text: 'Bir arazinin gelecekteki kullanım potansiyelini anlamak için imar sorgusu önemlidir.',
    },
    {
      category: 'Bölge Analizi',
      title: 'Kütahya’da Arazi Yatırımı Mantıklı mı?',
      text: 'İlçe gelişimi, ulaşım aksları ve tarımsal potansiyel yatırım kararlarında belirleyici olabilir.',
    },
  ],
  contact: {
    phone: '+90 500 000 00 00',
    whatsapp: '+90 500 000 00 00',
    email: 'iletisim@kutahyasatiliktarla.com',
  },
};
