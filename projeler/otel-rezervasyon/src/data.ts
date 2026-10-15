import { Cabin, ExperienceItem, Review } from './types';

export const cabins: Cabin[] = [
  {
    id: 'single-room',
    name: 'Tek Kişilik Standart Oda',
    location: 'Şehir Merkezi',
    price: 45,
    rating: 4.2,
    reviewsCount: 1450,
    description: 'Şehir merkezinde, tek kişilik konaklamalar ve iş seyahatleri için tasarlanmış temiz, pratik ve uygun fiyatlı konaklama seçeneği.',
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200&auto=format&fit=crop', // Business single room
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1598928506311-c55dedbfc1a2?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522771731478-44bf104a8f4c?q=80&w=1200&auto=format&fit=crop'
    ],
    amenities: ['Ücretsiz Wi-Fi', 'Klima', 'Minibar', 'LCD TV', 'Çalışma Masası', 'Şehir Manzarası'],
    specs: {
      guests: '1 Misafir',
      beds: '1 Tek Kişilik Yatak',
      baths: '1 Banyo',
      size: '18 m²'
    },
    climate: {
      temperature: 22,
      humidity: 50,
      windSpeed: 0,
      airQuality: 'İyi'
    }
  },
  {
    id: 'double-room',
    name: 'Çift Kişilik Standart Oda',
    location: 'Şehir Merkezi',
    price: 65,
    rating: 4.3,
    reviewsCount: 2310,
    description: 'Kütahya merkezde, çiftler ve kısa süreli tatiller için ideal, konforlu ve samimi bir konaklama deneyimi sunan standart odamız.',
    imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1200&auto=format&fit=crop', // Standard double room
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1200&auto=format&fit=crop'
    ],
    amenities: ['Ücretsiz Wi-Fi', 'Klima', 'Saç Kurutma Makinesi', 'Geniş Yatak', 'Uydu Yayınlı TV'],
    specs: {
      guests: '2 Misafir',
      beds: '1 Çift Kişilik Yatak',
      baths: '1 Banyo',
      size: '22 m²'
    },
    climate: {
      temperature: 22,
      humidity: 50,
      windSpeed: 0,
      airQuality: 'İyi'
    }
  },
  {
    id: 'family-room',
    name: 'Geniş Aile Odası',
    location: 'Şehir Merkezi',
    price: 90,
    rating: 4.4,
    reviewsCount: 840,
    description: 'Öğrenci grupları ve aileler için uygun, rahat bir oturma alanı sağlayan, ekonomik ve geniş odamız. Kafeler sokağına sadece birkaç adım mesafede.',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop', // Family/Triple room
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop'
    ],
    amenities: ['Oturma Alanı', 'Hızlı Wi-Fi', 'Büyük Ekran TV', 'Ekstra Yatak İmkanı', 'Balkon Seçeneği'],
    specs: {
      guests: '3-4 Misafir',
      beds: '1 Çift, 2 Tekli Yatak',
      baths: '1 Geniş Banyo',
      size: '35 m²'
    },
    climate: {
      temperature: 21,
      humidity: 55,
      windSpeed: 0,
      airQuality: 'İyi'
    }
  },
  {
    id: 'sultan-suite',
    name: 'Sultan Suit (Jakuzili)',
    location: 'Kütahya Garden Premium',
    price: 130,
    rating: 4.7,
    reviewsCount: 650,
    description: 'Çiftlere özel, tamamen yenilenmiş lüks "Sultan Oda". Ortopedik yatak, oda içi jakuzi ve ekstra konfor detaylarıyla premium bir kaçamak sunuyor.',
    imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28ce8f52f49?q=80&w=1200&auto=format&fit=crop', // Premium suite with nice bath/jacuzzi hint
    images: [
      'https://images.unsplash.com/photo-1583847268964-b28ce8f52f49?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607688969-a5bfcd64bd28?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1534595038511-9f219fe0c979?q=80&w=1200&auto=format&fit=crop'
    ],
    amenities: ['Oda İçi Jakuzi', 'Ortopedik Yatak', 'Özel Buklet Malzemeleri', 'Premium Dekorasyon', 'Sessiz Konum', 'İkram Tepsisi', 'Geniş Ekran Smart TV'],
    specs: {
      guests: '2 Misafir',
      beds: '1 King Ortopedik Yatak',
      baths: '1 Jakuzili Banyo',
      size: '42 m²'
    },
    climate: {
      temperature: 24,
      humidity: 50,
      windSpeed: 0,
      airQuality: 'Mükemmel'
    }
  }
];

export const reviews: Review[] = [
  {
    id: 'rev-1',
    userName: 'Ayşe Yılmaz',
    rating: 5,
    date: 'May 12, 2026',
    comment: 'Fiyatına göre çok iyi bir otel. Çalışanlar inanılmaz güler yüzlü ve samimi. Kafeler sokağına ve merkeze yürüyerek gitmek çok büyük avantaj.',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop'
  },
  {
    id: 'rev-2',
    userName: 'Burak Demir',
    rating: 5,
    date: 'April 28, 2026',
    comment: 'Eşimle Sultan odada konakladık. Jakuzi ve ortopedik yatak gerçekten harikaydı, oda yenilenmiş ve çok konforluydu. Kahvaltısı da gayet yeterliydi.',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'
  },
  {
    id: 'rev-3',
    userName: 'Mehmet K.',
    rating: 3,
    date: 'March 15, 2026',
    comment: 'Personel ilgili ama odamızın banyosu biraz eski kalmıştı ve temizlik standartları biraz daha iyi olabilirdi. Konumu için tekrar tercih edilebilir.',
    avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&auto=format&fit=crop'
  }
];

export const experiencesData: ExperienceItem[] = [
  {
    id: 'city-tour',
    name: 'Kütahya Merkez & Kafeler Sokağı',
    price: 0,
    duration: 'Sınırsız',
    rating: 4.8,
    teaser: 'Şehrin kalbinde',
    description: 'Aracınızı otoparka bırakın ve birkaç adımda Kütahya’nın canlı merkezine, popüler kafelere ve restoranlara kolayca ulaşın.',
  },
  {
    id: 'sultan-jacuzzi',
    name: 'Sultan Oda Jakuzi Keyfi',
    price: 35,
    duration: 'Oda İçi',
    rating: 4.9,
    teaser: 'Çiftlere özel premium rahatlık',
    description: 'Yenilenmiş Sultan odalarımızda yer alan özel jakuzide, günün yorgunluğunu atın ve lüks konaklamanın tadını çıkarın.',
  },
  {
    id: 'history-tour',
    name: 'Tarihi Germiyan Sokağı & Saat Kulesi',
    price: 0,
    duration: 'Yürüme Mesafesi',
    rating: 4.7,
    teaser: 'Tarihi doku ve kültür',
    description: 'Otelimizden yürüyerek Kütahya’nın ünlü Kent Tarihi Müzesi’ni, Saat Kulesi’ni ve otantik Germiyan Sokağı’nı keşfedin.',
  },
];
