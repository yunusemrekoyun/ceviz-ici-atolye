import { SITE_DESCRIPTION, SITE_TITLE } from "../config/site";
import { getAboutContent } from "../content/aboutContent";
import {
  buildLocaleAlternates,
  localizePath,
  stripLocalePrefix,
} from "../i18n/routing.js";

const getDefaultMeta = (locale) => ({
  title:
    locale === "en"
      ? `${SITE_TITLE} | Waterproofing & Structural Protection Systems`
      : `${SITE_TITLE} | Su Yalitimi ve Yapi Koruma Sistemleri`,
  description: getAboutContent(locale).footerText || SITE_DESCRIPTION,
});

const MATCHERS = [
  {
    test: (pathname) => pathname === "/",
    getMeta: (locale) => ({
      title:
        locale === "en"
          ? `${SITE_TITLE} | Waterproofing & Structural Protection Systems`
          : `${SITE_TITLE} | Su Yalitimi ve Yapi Koruma Sistemleri`,
      description: getAboutContent(locale).footerText || SITE_DESCRIPTION,
    }),
  },
  {
    test: (pathname) => pathname.startsWith("/services"),
    getMeta: (locale) => ({
      title: `${
        locale === "en"
          ? "Waterproofing & Insulation Services"
          : "Su Yalitimi ve Izolasyon Hizmetleri"
      } | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "Professional waterproofing, insulation and structural protection services, application areas, and detailed solution pages."
          : "Profesyonel su yalitimi, izolasyon ve yapi koruma hizmetleri, uygulama alanlari ve detayli cozum sayfalari.",
    }),
  },
  {
    test: (pathname) => pathname.startsWith("/projects"),
    getMeta: (locale) => ({
      title: `${locale === "en" ? "Reference Projects" : "Referans Projeler"} | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "Reference waterproofing and structural protection projects completed with the right materials, the right application, and expert workmanship."
          : "Dogru malzeme, dogru uygulama ve uzman iscilikle tamamlanan su yalitimi ve yapi koruma referans projeleri.",
    }),
  },
  {
    test: (pathname) => pathname.startsWith("/project-detail"),
    getMeta: (locale) => ({
      title: `${locale === "en" ? "Project Details" : "Proje Detayi"} | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "Selected project media, scope, and execution details from our waterproofing and structural protection portfolio."
          : "Su yalitimi ve yapi koruma portfoyumuzdan secili projelere ait medya, kapsam ve uygulama bilgileri.",
    }),
  },
  {
    test: (pathname) => pathname.startsWith("/blog/"),
    getMeta: (locale) => ({
      title: `${locale === "en" ? "Technical Blog" : "Teknik Blog"} | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "Technical content, application insights, and field-based blog details on waterproofing and insulation."
          : "Su yalitimi ve izolasyon alaninda teknik icerikler, uygulama notlari ve saha odakli blog detaylari.",
    }),
  },
  {
    test: (pathname) => pathname === "/blog",
    getMeta: (locale) => ({
      title: `${locale === "en" ? "Technical Blog" : "Teknik Blog"} | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "Technical notes, guides, and recent blog posts on waterproofing, insulation, and structural protection."
          : "Su yalitimi, izolasyon ve yapi koruma alaninda teknik notlar, rehberler ve guncel blog yazilari.",
    }),
  },
  {
    test: (pathname) => pathname.startsWith("/journal") || pathname.startsWith("/journals"),
    getMeta: (locale) => ({
      title: `${
        locale === "en" ? "Field News & Announcements" : "Saha Haberleri ve Duyurular"
      } | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "News, announcements, and field updates from Babil's waterproofing and structural protection projects."
          : "Babil'in su yalitimi ve yapi koruma projelerinden haberler, duyurular ve saha guncellemeleri.",
    }),
  },
  {
    test: (pathname) => pathname === "/about",
    getMeta: (locale) => ({
      title: `${locale === "en" ? "About" : "Hakkimizda"} | ${SITE_TITLE}`,
      description: getAboutContent(locale).seoDescription,
    }),
  },
  {
    test: (pathname) => pathname === "/whyus",
    getMeta: (locale) => ({
      title: `${locale === "en" ? "Why Babil" : "Neden Babil"} | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "Discover why Babil's team, material selection, and application discipline make the difference."
          : "Babil'in ekibi, malzeme secimi ve uygulama disipliniyle neden fark yarattigini kesfedin.",
    }),
  },
  {
    test: (pathname) => pathname === "/iletisim",
    getMeta: (locale) => ({
      title: `${
        locale === "en" ? "Contact & Quote Request" : "Iletisim ve Teklif Talebi"
      } | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "Reach Babil Insulation for contact, site inspection, and quotation requests."
          : "Iletisim, kesif ve teklif talepleriniz icin Babil Yalitim ile iletisime gecin.",
    }),
  },
  {
    test: (pathname) => pathname === "/kvkk",
    getMeta: (locale) => ({
      title: `KVKK | ${SITE_TITLE}`,
      description:
        locale === "en"
          ? "Personal data protection and privacy notice."
          : "KVKK ve gizlilik bilgilendirmesi.",
    }),
  },
];

export function buildPageMeta(pathname = "/", origin = "", locale = "tr") {
  const normalizedPath = pathname || "/";
  const basePath = stripLocalePrefix(normalizedPath);
  const matched = MATCHERS.find((item) => item.test(basePath));
  const pageMeta = matched?.getMeta ? matched.getMeta(locale) : getDefaultMeta(locale);
  const safeOrigin =
    origin && /^https?:\/\//i.test(origin) ? origin.replace(/\/+$/, "") : "";
  const canonicalPath = localizePath(basePath, locale);
  const alternates = buildLocaleAlternates(basePath, safeOrigin);

  return {
    title: pageMeta.title || getDefaultMeta(locale).title,
    description: pageMeta.description || getDefaultMeta(locale).description,
    canonical: safeOrigin ? `${safeOrigin}${canonicalPath}` : canonicalPath,
    alternates,
  };
}
