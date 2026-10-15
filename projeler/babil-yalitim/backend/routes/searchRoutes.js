// backend/routes/searchRoutes.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

// ✅ Linux case-sensitive: model dosya adları büyük harfle
const Blog = require("../models/Blog");
const Journal = require("../models/Journal");
const Project = require("../models/Project");
const Service = require("../models/Service");
const {
  buildMongoTokenQuery,
  buildExcerpt,
  normalizeSearchQuery,
  scoreSearchDocument,
} = require("../utils/search");

const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const normalizeLocale = (locale) => (locale === "en" ? "en" : "tr");

const localizePath = (path, locale) => {
  const normalized = String(path || "/").startsWith("/")
    ? String(path || "/")
    : `/${String(path || "")}`;
  if (locale !== "en") return normalized;
  return normalized === "/" ? "/en" : `/en${normalized}`;
};

const getLocalizedField = (item, field, locale) => {
  if (locale !== "en") return item?.[field];

  const translated = item?.translations?.en?.[field];
  if (Array.isArray(item?.[field])) {
    return Array.isArray(translated) && translated.length
      ? translated
      : item?.[field] || [];
  }

  return translated || item?.[field] || "";
};

router.get("/", searchLimiter, async (req, res) => {
  const query = normalizeSearchQuery(req.query.q || "");
  const locale = normalizeLocale(req.query.locale);
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 40);

  if (query.length < 2) {
    return res.json([]);
  }

  try {
    const isEn = locale === "en";

    const blogFields = isEn
      ? ["translations.en.title", "translations.en.content", "translations.en.tags"]
      : ["title", "content", "tags"];

    const journalFields = isEn
      ? ["translations.en.title", "translations.en.content"]
      : ["title", "content"];

    const projectFields = isEn
      ? ["translations.en.title", "translations.en.description", "translations.en.category"]
      : ["title", "description", "category"];

    const serviceFields = isEn
      ? [
          "translations.en.title",
          "translations.en.type",
          "translations.en.category",
          "translations.en.usageAreas",
          "translations.en.description",
          "subServices.translations.en.title",
          "subServices.translations.en.type",
          "subServices.translations.en.category",
          "subServices.translations.en.usageAreas",
          "subServices.translations.en.description",
        ]
      : [
          "title",
          "type",
          "category",
          "usageAreas",
          "description",
          "subServices.title",
          "subServices.type",
          "subServices.category",
          "subServices.usageAreas",
          "subServices.description",
        ];

    const [blogs, journals, projects, services] = await Promise.all([
      Blog.find(buildMongoTokenQuery(blogFields, query, locale) || {})
        .select("_id title content tags translations createdAt updatedAt")
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(80)
        .lean(),
      Journal.find(buildMongoTokenQuery(journalFields, query, locale) || {})
        .select("_id title content translations createdAt updatedAt")
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(80)
        .lean(),
      Project.find(buildMongoTokenQuery(projectFields, query, locale) || {})
        .select("_id title description category translations createdAt updatedAt")
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(80)
        .lean(),
      Service.find(buildMongoTokenQuery(serviceFields, query, locale) || {})
        .select(
          "_id title type category usageAreas description subServices translations createdAt updatedAt"
        )
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(80)
        .lean(),
    ]);

    const labels =
      locale === "en"
        ? {
            title: "Title",
            tags: "Tag",
            content: "Content",
            category: "Category",
            description: "Description",
            type: "Type",
            usageArea: "Usage Area",
            subService: "Sub-service",
            subServiceCategory: "Sub-service Category",
            subServiceArea: "Sub-service Area",
            subServiceDescription: "Sub-service Description",
            page: "Page",
            keyword: "Keyword",
          }
        : {
            title: "Başlık",
            tags: "Etiket",
            content: "İçerik",
            category: "Kategori",
            description: "Açıklama",
            type: "Tür",
            usageArea: "Kullanım Alanı",
            subService: "Alt Hizmet",
            subServiceCategory: "Alt Hizmet Kategorisi",
            subServiceArea: "Alt Hizmet Alanı",
            subServiceDescription: "Alt Hizmet Açıklaması",
            page: "Sayfa",
            keyword: "Anahtar Kelime",
          };

    const staticPages = [
      {
        _id: "static-about",
        type: "about",
        title: locale === "en" ? "About" : "Hakkımızda",
        path: localizePath("/about", locale),
        content:
          locale === "en"
            ? "Babil Insulation delivers durable insulation, structural protection, polyurethane foam, polyurea, epoxy flooring and concrete grinding solutions with modern application technologies."
            : "Babil Yalıtım; su yalıtımı, yapı koruma, poliüretan köpük, poliürea, epoksi zemin kaplama ve beton silim alanlarında modern teknolojiyle kalıcı çözümler sunar.",
        keywords:
          locale === "en"
            ? [
                "about",
                "babil",
                "waterproofing",
                "structural protection",
                "polyurea",
                "epoxy",
              ]
            : [
                "kurumsal",
                "babil",
                "su yalıtımı",
                "yapı koruma",
                "poliürea",
                "epoksi",
              ],
      },
      {
        _id: "static-whyus",
        type: "whyus",
        title: locale === "en" ? "Why Us" : "Neden Biz",
        path: localizePath("/whyus", locale),
        content:
          locale === "en"
            ? "Why choose Babil Insulation: field expertise, reliable execution and a quality-focused delivery model."
            : "Neden Babil Yalıtım tercih edilmeli, uzmanlık, uygulama kalitesi ve güven yaklaşımı.",
        keywords:
          locale === "en"
            ? ["why us", "trust", "quality", "expertise", "experience"]
            : ["neden biz", "güven", "kalite", "uzmanlık", "tecrübe"],
      },
      {
        _id: "static-contact",
        type: "contact",
        title: locale === "en" ? "Contact" : "İletişim",
        path: localizePath("/iletisim", locale),
        content:
          locale === "en"
            ? "Phone number, email address, office location and quotation request information."
            : "Telefon, e-posta, adres, keşif talebi ve iletişim bilgileri sayfası.",
        keywords:
          locale === "en"
            ? ["contact", "phone", "address", "email", "quotation"]
            : ["iletişim", "telefon", "adres", "mail", "keşif"],
      },
      {
        _id: "static-kvkk",
        type: "kvkk",
        title: "KVKK",
        path: localizePath("/kvkk", locale),
        content:
          locale === "en"
            ? "Personal data protection and privacy notice information."
            : "Kişisel verilerin korunması ve aydınlatma metni bilgileri.",
        keywords:
          locale === "en"
            ? ["kvkk", "privacy", "personal data"]
            : ["kvkk", "gizlilik", "kişisel veri"],
      },
    ];

    const scoredBlogs = blogs
      .map((item) => {
        const title = getLocalizedField(item, "title", locale);
        const content = getLocalizedField(item, "content", locale);
        const tags = getLocalizedField(item, "tags", locale);
        const { score, matchedFields } = scoreSearchDocument(
          [
            { value: title, weight: 16, label: labels.title },
            { value: tags, weight: 11, label: labels.tags },
            { value: content, weight: 5, label: labels.content },
          ],
          query,
          locale
        );

        return {
          _id: item._id,
          title,
          type: "blog",
          path: localizePath(`/blog/${item._id}`, locale),
          excerpt: buildExcerpt(content || tags?.join(", "), query, 180, locale),
          matchedFields,
          score,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
        };
      })
      .filter((item) => item.score > 0);

    const scoredJournals = journals
      .map((item) => {
        const title = getLocalizedField(item, "title", locale);
        const content = getLocalizedField(item, "content", locale);
        const { score, matchedFields } = scoreSearchDocument(
          [
            { value: title, weight: 16, label: labels.title },
            { value: content, weight: 6, label: labels.content },
          ],
          query,
          locale
        );

        return {
          _id: item._id,
          title,
          type: "journal",
          path: localizePath(`/journals/${item._id}`, locale),
          excerpt: buildExcerpt(content, query, 180, locale),
          matchedFields,
          score,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
        };
      })
      .filter((item) => item.score > 0);

    const scoredProjects = projects
      .map((item) => {
        const title = getLocalizedField(item, "title", locale);
        const category = getLocalizedField(item, "category", locale);
        const description = getLocalizedField(item, "description", locale);
        const { score, matchedFields } = scoreSearchDocument(
          [
            { value: title, weight: 16, label: labels.title },
            { value: category, weight: 11, label: labels.category },
            { value: description, weight: 7, label: labels.description },
          ],
          query,
          locale
        );

        return {
          _id: item._id,
          title,
          type: "project",
          path: localizePath(`/project-detail/${item._id}`, locale),
          excerpt: buildExcerpt(
            [category, description].filter(Boolean).join(" • "),
            query,
            180,
            locale
          ),
          matchedFields,
          score,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
        };
      })
      .filter((item) => item.score > 0);

    const scoredServices = services
      .map((item) => {
        const title = getLocalizedField(item, "title", locale);
        const type = getLocalizedField(item, "type", locale);
        const category = getLocalizedField(item, "category", locale);
        const usageAreas = getLocalizedField(item, "usageAreas", locale);
        const description = getLocalizedField(item, "description", locale);
        const localizedSubServices = (item.subServices || []).map((sub) => ({
          title: getLocalizedField(sub, "title", locale),
          category: getLocalizedField(sub, "category", locale),
          usageAreas: getLocalizedField(sub, "usageAreas", locale),
          description: getLocalizedField(sub, "description", locale),
        }));
        const subServiceTitles = localizedSubServices.map((sub) => sub.title);
        const subServiceCategories = localizedSubServices.map((sub) => sub.category);
        const subServiceDescriptions = localizedSubServices.map((sub) => sub.description);
        const subServiceAreas = localizedSubServices.flatMap(
          (sub) => sub.usageAreas || []
        );

        const { score, matchedFields } = scoreSearchDocument(
          [
            { value: title, weight: 16, label: labels.title },
            { value: type, weight: 12, label: labels.type },
            { value: category, weight: 11, label: labels.category },
            { value: usageAreas, weight: 9, label: labels.usageArea },
            { value: description, weight: 7, label: labels.description },
            { value: subServiceTitles, weight: 12, label: labels.subService },
            {
              value: subServiceCategories,
              weight: 8,
              label: labels.subServiceCategory,
            },
            { value: subServiceAreas, weight: 8, label: labels.subServiceArea },
            {
              value: subServiceDescriptions,
              weight: 5,
              label: labels.subServiceDescription,
            },
          ],
          query,
          locale
        );

        return {
          _id: item._id,
          title,
          type: "service",
          path: localizePath(`/services/${item._id}`, locale),
          excerpt: buildExcerpt(
            [
              type,
              category,
              description,
              ...subServiceTitles,
            ]
              .filter(Boolean)
              .join(" • "),
            query,
            180,
            locale
          ),
          matchedFields,
          score,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
        };
      })
      .filter((item) => item.score > 0);

    const scoredStaticPages = staticPages
      .map((item) => {
        const { score, matchedFields } = scoreSearchDocument(
          [
            { value: item.title, weight: 18, label: labels.page },
            { value: item.keywords, weight: 10, label: labels.keyword },
            { value: item.content, weight: 5, label: labels.content },
          ],
          query,
          locale
        );

        return {
          ...item,
          excerpt: buildExcerpt(
            [item.content, ...(item.keywords || [])].join(" • "),
            query,
            180,
            locale
          ),
          matchedFields,
          score,
        };
      })
      .filter((item) => item.score > 0);

    const results = [
      ...scoredBlogs,
      ...scoredJournals,
      ...scoredProjects,
      ...scoredServices,
      ...scoredStaticPages,
    ]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
        const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, limit)
      .map((item) => ({
        _id: item._id,
        title: item.title,
        type: item.type,
        path: item.path,
        excerpt: item.excerpt,
        matchedFields: item.matchedFields,
        score: item.score,
      }));

    res.json(results);
  } catch (err) {
    console.error("Arama hatası:", err);
    res.status(500).json({
      message:
        locale === "en"
          ? "An error occurred while searching"
          : "Arama işlemi sırasında hata oluştu",
    });
  }
});

module.exports = router;
