// src/data/articles.js
export const ARTICLES = [
  {
    id: 1,
    title: "Arabuluculukta Stratejik Yaklaşım",
    summary: "Ticari uyuşmazlıklarda erken arabuluculuğun avantajları.",
    date: "2025-08-12",
    tags: ["Ticaret", "Arabuluculuk"],
    slug: "arabuluculukta-stratejik-yaklasim",
    image: "/img/articles/adr-strategy.jpg",
    imageAlt: "Arabuluculuk toplantısı, masa başında anlaşma",
    content: `
      <p>Arabuluculuk, ticari uyuşmazlıklarda maliyet ve süre avantajı sağlayan önemli bir enstrümandır.</p>
      <p>Erken aşamada tarafların beklentilerinin netleştirilmesi ve gizlilik, müzakere gücünü artırır.</p>
      <ul>
        <li>Taraf analizinin doğru yapılması</li>
        <li>Gerçekçi risk senaryoları</li>
        <li>İyi hazırlanmış teklif stratejisi</li>
      </ul>
    `,
  },
  {
    id: 2,
    title: "Ceza Soruşturmasında Haklar",
    summary: "Gözaltı, ifade ve müdafi talep haklarına kısa bakış.",
    date: "2025-07-02",
    tags: ["Ceza"],
    slug: "ceza-sorusturmasinda-haklar",
    image: "/img/articles/criminal-rights.jpg",
    imageAlt: "Adliye koridorunda savunma hazırlığı",
    content: `
      <p>Ceza soruşturması sırasında şüphelinin en temel hakkı müdafi yardımından yararlanmaktır.</p>
      <p>İfade öncesi dosya inceleme ve susma hakkının kullanımı, süreçte belirleyicidir.</p>
    `,
  },
  {
    id: 3,
    title: "İş Sözleşmelerinde Rekabet Yasağı",
    summary: "Geçerlilik şartları ve uygulamadaki sınırlar.",
    date: "2025-05-20",
    tags: ["İş Hukuku", "Sözleşme"],
    slug: "is-sozlesmelerinde-rekabet-yasagi",
    image: "/img/articles/non-compete.jpg",
    imageAlt: "Sözleşme üzerinde kalem",
    content: `
      <p>Rekabet yasağı hükümleri süre, yer ve konu bakımından makul sınırlar içinde olmalıdır.</p>
      <p>Fahiş cezai şartlar ve belirsiz kapsam, geçerlilik riskini artırır.</p>
    `,
  },
];

// Basit yardımcılar
export function getArticleBySlug(slug) {
  return ARTICLES.find((a) => a.slug === slug);
}
