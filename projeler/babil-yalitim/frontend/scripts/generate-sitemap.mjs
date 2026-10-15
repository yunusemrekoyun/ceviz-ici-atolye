import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";

const SITE_FALLBACK = "https://babilyalitim.com";
const STATIC_PATHS = [
  "/",
  "/services",
  "/projects",
  "/blog",
  "/journal",
  "/about",
  "/whyus",
  "/iletisim",
  "/kvkk",
];

const cwd = process.cwd();
const env = loadEnv("prod", cwd, "");

const normalizeOrigin = (value, fallback = "") => {
  const input = String(value || fallback || "").trim();
  if (!input) return "";
  return input.replace(/\/+$/g, "");
};

const toApiBase = (value = "") => {
  const normalized = normalizeOrigin(value);
  if (!normalized) return "";
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
};

const siteOrigin = normalizeOrigin(env.VITE_SITE_ORIGIN, SITE_FALLBACK);
const apiBase = toApiBase(env.VITE_API_BASE_URL || `${siteOrigin}/api`);

const localizePath = (pathname = "/", locale = "tr") => {
  const normalized = String(pathname || "/").startsWith("/")
    ? String(pathname || "/")
    : `/${String(pathname || "")}`;
  if (locale !== "en") return normalized;
  return normalized === "/" ? "/en" : `/en${normalized}`;
};

const withOrigin = (pathname) => `${siteOrigin}${pathname}`;

const escapeXml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;");

const renderEntry = (basePath) => {
  const trPath = localizePath(basePath, "tr");
  const enPath = localizePath(basePath, "en");

  return [
    `  <url>`,
    `    <loc>${escapeXml(withOrigin(trPath))}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="tr" href="${escapeXml(withOrigin(trPath))}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(withOrigin(enPath))}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(withOrigin(trPath))}" />`,
    `  </url>`,
    `  <url>`,
    `    <loc>${escapeXml(withOrigin(enPath))}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="tr" href="${escapeXml(withOrigin(trPath))}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(withOrigin(enPath))}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(withOrigin(trPath))}" />`,
    `  </url>`,
  ].join("\n");
};

const fetchJson = async (pathname) => {
  const url = `${apiBase}${pathname}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[sitemap] ${pathname} alınamadı: ${error.message}`);
    return [];
  }
};

const encodeId = (value = "") => encodeURIComponent(String(value || "").trim());

const buildDynamicPaths = async () => {
  if (!apiBase) return [];

  const [blogs, journals, projects, services] = await Promise.all([
    fetchJson("/blogs"),
    fetchJson("/journals"),
    fetchJson("/projects"),
    fetchJson("/services"),
  ]);

  const blogPaths = (Array.isArray(blogs) ? blogs : [])
    .map((item) => item?._id)
    .filter(Boolean)
    .map((id) => `/blog/${encodeId(id)}`);

  const journalPaths = (Array.isArray(journals) ? journals : [])
    .map((item) => item?._id)
    .filter(Boolean)
    .map((id) => `/journals/${encodeId(id)}`);

  const projectPaths = (Array.isArray(projects) ? projects : [])
    .map((item) => item?._id)
    .filter(Boolean)
    .map((id) => `/project-detail/${encodeId(id)}`);

  const servicePaths = [];

  (Array.isArray(services) ? services : []).forEach((service) => {
    const serviceId = service?._id;
    if (!serviceId) return;

    const encodedServiceId = encodeId(serviceId);
    servicePaths.push(`/services/${encodedServiceId}`);

    (Array.isArray(service?.subServices) ? service.subServices : []).forEach((subService) => {
      const subServiceId = subService?._id || subService?.id;
      if (!subServiceId) return;
      servicePaths.push(
        `/services/${encodedServiceId}/sub-services/${encodeId(subServiceId)}`
      );
    });
  });

  return [...blogPaths, ...journalPaths, ...projectPaths, ...servicePaths];
};

const buildXml = async () => {
  const allPaths = [...STATIC_PATHS, ...(await buildDynamicPaths())];
  const uniqueBasePaths = [...new Set(allPaths)].sort((left, right) =>
    left.localeCompare(right)
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset`,
    `  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `  xmlns:xhtml="http://www.w3.org/1999/xhtml"`,
    `>`,
    uniqueBasePaths.map(renderEntry).join("\n"),
    `</urlset>`,
    ``,
  ].join("\n");
};

const outputPath = path.join(cwd, "public", "sitemap.xml");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, await buildXml(), "utf8");
console.log(`[sitemap] oluşturuldu: ${outputPath}`);
