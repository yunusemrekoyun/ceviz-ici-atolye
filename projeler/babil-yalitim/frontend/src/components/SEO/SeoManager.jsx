import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONES,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "../../config/site";
import { buildPageMeta } from "../../utils/seo";
import { useLocale } from "../../i18n/LocaleContext";

function ensureMeta(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }
  return element;
}

function ensureCanonical() {
  let link = document.head.querySelector("link[rel='canonical']");
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  return link;
}

function ensureAlternate(hrefLang) {
  let link = document.head.querySelector(
    `link[rel='alternate'][hreflang='${hrefLang}']`
  );
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "alternate");
    link.setAttribute("hreflang", hrefLang);
    document.head.appendChild(link);
  }
  return link;
}

function ensureJsonLd(id) {
  let script = document.head.querySelector(
    `script[type='application/ld+json'][data-schema-id='${id}']`
  );
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-schema-id", id);
    document.head.appendChild(script);
  }
  return script;
}

export default function SeoManager() {
  const location = useLocation();
  const { locale } = useLocale();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const meta = buildPageMeta(location.pathname, origin, locale);

    document.title = meta.title || SITE_TITLE;

    const description = ensureMeta("meta[name='description']", {
      name: "description",
    });
    description.setAttribute("content", meta.description || SITE_DESCRIPTION);

    const ogTitle = ensureMeta("meta[property='og:title']", {
      property: "og:title",
    });
    ogTitle.setAttribute("content", meta.title || SITE_TITLE);

    const ogDescription = ensureMeta("meta[property='og:description']", {
      property: "og:description",
    });
    ogDescription.setAttribute(
      "content",
      meta.description || SITE_DESCRIPTION
    );

    const ogUrl = ensureMeta("meta[property='og:url']", {
      property: "og:url",
    });
    ogUrl.setAttribute("content", meta.canonical);

    const twitterTitle = ensureMeta("meta[name='twitter:title']", {
      name: "twitter:title",
    });
    twitterTitle.setAttribute("content", meta.title || SITE_TITLE);

    const twitterDescription = ensureMeta("meta[name='twitter:description']", {
      name: "twitter:description",
    });
    twitterDescription.setAttribute(
      "content",
      meta.description || SITE_DESCRIPTION
    );

    const ogSiteName = ensureMeta("meta[property='og:site_name']", {
      property: "og:site_name",
    });
    ogSiteName.setAttribute("content", SITE_NAME);

    ensureCanonical().setAttribute("href", meta.canonical);
    Object.entries(meta.alternates || {}).forEach(([hrefLang, href]) => {
      ensureAlternate(hrefLang).setAttribute("href", href);
    });

    const logoUrl = `${origin}/favicon.png`;
    const primaryPhone = CONTACT_PHONES[0]?.link || "";
    const orgSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: origin,
      logo: logoUrl,
      email: CONTACT_EMAIL,
      telephone: primaryPhone,
      address: {
        "@type": "PostalAddress",
        streetAddress: CONTACT_ADDRESS,
      },
    };

    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_TITLE,
      url: origin,
      inLanguage: locale === "en" ? "en" : "tr",
    };

    ensureJsonLd("organization").textContent = JSON.stringify(orgSchema);
    ensureJsonLd("website").textContent = JSON.stringify(websiteSchema);
  }, [location.pathname, locale]);

  return null;
}
