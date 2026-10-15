export const WHY_US_CONTENT = {
  tr: {
    home: {
      titlePrefix: "Neden",
      titleHighlight: "Babil",
      titleSuffix: "Yalıtım?",
      description:
        "10+ yıllık deneyim, doğru malzeme ve doğru uygulamayla değer üretiyoruz.",
      features: [
        {
          title: "Kaliteli Hizmet",
          desc: "Uzun ömürlü, garantili ve ölçülebilir performans.",
        },
        {
          title: "Uzman Kadro",
          desc: "Saha deneyimi yüksek, sertifikalı uygulama ekipleri.",
        },
        {
          title: "Ücretsiz Keşif",
          desc: "Yerinde inceleme + net fiyat ve takvim planı.",
        },
        {
          title: "7/24 Destek",
          desc: "Uygulama sonrası bakım ve danışmanlık.",
        },
      ],
      cta: "Daha fazlası",
    },
    page: {
      breadcrumbCurrent: "Neden Babil?",
      titlePrefix: "Neden",
      titleHighlight: "Babil",
      titleSuffix: "?",
      lead:
        "Doğru çözüm = doğru keşif + doğru detay + doğru uygulama. Bunu disiplinle sağlıyoruz.",
      valueCards: [
        {
          title: "Sistem Yaklaşımı",
          desc: "Ürün değil, sistem teklif ederiz; uzun ömürlü performans.",
        },
        {
          title: "Zamanında Teslim",
          desc: "Şantiye takvimlerine uyumlu, sürprizsiz yürütme.",
        },
        {
          title: "Belgelendirme & Garanti",
          desc: "Teslim öncesi testler, rapor ve yazılı garanti.",
        },
      ],
      processTitle: "Çalışma Sürecimiz",
      steps: [
        {
          title: "İlk İletişim",
          desc: "İhtiyacı dinleriz, hızlı ön analiz yaparız.",
        },
        {
          title: "Keşif & Teklif",
          desc: "Yerinde keşif, net kapsam ve takvim.",
        },
        {
          title: "Uygulama",
          desc: "Doğru detay çözümü, doğru malzeme.",
        },
        {
          title: "Teslim & Garanti",
          desc: "Testler, rapor ve garanti prosedürü.",
        },
      ],
      ribbon:
        "Onaylı sistemlerle çalışıyoruz; detay çözümünde üretici teknik föyleri esas alınır.",
      faqTitle: "Sık Sorulanlar",
      faqs: [
        {
          q: "Keşif ücretsiz mi?",
          a: "Evet. Bölgeye göre planlayıp ücretsiz keşif yapıyoruz.",
        },
        {
          q: "Garanti veriyor musunuz?",
          a: "Uygulama tipine göre yazılı garanti sağlıyoruz.",
        },
        {
          q: "Hangi ürünlerle çalışıyorsunuz?",
          a: "Sektörün önde gelen markalarının onaylı sistemleri.",
        },
      ],
      ctaTitle: "Projeniz için keşif talep edin",
      ctaDescription:
        "Kısa bir ön görüşme ile aynı gün randevu planlayalım.",
      ctaButton: "İletişime Geç",
    },
  },
  en: {
    home: {
      titlePrefix: "Why",
      titleHighlight: "Babil",
      titleSuffix: "Insulation?",
      description:
        "We create value through 10+ years of experience, the right materials, and the right application.",
      features: [
        {
          title: "Quality Service",
          desc: "Long-lasting, guaranteed, and measurable performance.",
        },
        {
          title: "Expert Team",
          desc: "Certified application crews with strong field experience.",
        },
        {
          title: "Free Site Inspection",
          desc: "On-site review with clear pricing and scheduling.",
        },
        {
          title: "24/7 Support",
          desc: "Post-application maintenance and consultancy.",
        },
      ],
      cta: "Learn more",
    },
    page: {
      breadcrumbCurrent: "Why Babil?",
      titlePrefix: "Why",
      titleHighlight: "Babil",
      titleSuffix: "?",
      lead:
        "The right solution = the right inspection + the right detail + the right application. We deliver that with discipline.",
      valueCards: [
        {
          title: "System Approach",
          desc: "We offer systems, not just products, for lasting performance.",
        },
        {
          title: "On-Time Delivery",
          desc: "Execution aligned with site schedules and no surprises.",
        },
        {
          title: "Documentation & Warranty",
          desc: "Tests, reports, and written warranty before handover.",
        },
      ],
      processTitle: "How We Work",
      steps: [
        {
          title: "First Contact",
          desc: "We listen to the need and make a quick preliminary assessment.",
        },
        {
          title: "Inspection & Proposal",
          desc: "On-site inspection, clear scope, and schedule.",
        },
        {
          title: "Application",
          desc: "The right detailing solution with the right material.",
        },
        {
          title: "Delivery & Warranty",
          desc: "Testing, reporting, and warranty procedures.",
        },
      ],
      ribbon:
        "We work with approved systems and base our detailing decisions on manufacturer technical datasheets.",
      faqTitle: "Frequently Asked Questions",
      faqs: [
        {
          q: "Is the site inspection free?",
          a: "Yes. We plan it according to the region and provide it free of charge.",
        },
        {
          q: "Do you provide a warranty?",
          a: "We provide a written warranty depending on the application type.",
        },
        {
          q: "Which products do you work with?",
          a: "Approved systems from leading brands in the sector.",
        },
      ],
      ctaTitle: "Request an inspection for your project",
      ctaDescription:
        "Let us schedule an appointment on the same day with a short preliminary call.",
      ctaButton: "Get in Touch",
    },
  },
};

export const getWhyUsContent = (locale = "tr") =>
  WHY_US_CONTENT[locale] || WHY_US_CONTENT.tr;
