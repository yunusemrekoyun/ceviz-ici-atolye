// Arama motorları için site haritası. Adresler mağaza alan adındadır; dosyanın
// kendisi API sunucusundan verilir (robots.txt'deki "Sitemap:" satırı bunu geçerli kılar).
const Product = require("../models/Product");
const Category = require("../models/Category");
const Blog = require("../models/Blog");
const { timedCache } = require("./timedCache");

const STATIC_PATHS = ["/", "/shop", "/about", "/blog", "/contact", "/agreement", "/kvkk", "/cookies"];
const cache = timedCache(60 * 60 * 1000);

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return "https://www.oldscks.com";
  const first = String(process.env.FRONTEND_ORIGIN || "").split(",")[0].trim();
  return (first || "http://localhost:5173").replace(/\/+$/, "");
}

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[ch]);

function entry(base, path, lastmod) {
  const date = lastmod ? new Date(lastmod) : null;
  const mod = date && !Number.isNaN(date.getTime()) ? `<lastmod>${date.toISOString().slice(0, 10)}</lastmod>` : "";
  return `<url><loc>${escapeXml(base + path)}</loc>${mod}</url>`;
}

async function buildSitemap() {
  const base = siteUrl();
  const [products, categories, posts] = await Promise.all([
    Product.find({ archivedAt: null }).select("_id updatedAt").lean(),
    Category.find({ archivedAt: null }).select("_id updatedAt").lean(),
    Blog.find({ status: "published" }).select("slug updatedAt").lean(),
  ]);
  const urls = [
    ...STATIC_PATHS.map((path) => entry(base, path)),
    ...categories.map((c) => entry(base, `/shop?kategori=${c._id}`, c.updatedAt)),
    ...products.map((p) => entry(base, `/product-details/${p._id}`, p.updatedAt)),
    ...posts.filter((b) => b.slug).map((b) => entry(base, `/blog/${encodeURIComponent(b.slug)}`, b.updatedAt)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

async function sendSitemap(_req, res) {
  try {
    const xml = await cache.get(buildSitemap);
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("[sitemap] oluşturulamadı:", error?.message || error);
    res.status(503).type("text/plain").send("Site haritası şu an oluşturulamadı.");
  }
}

module.exports = { sendSitemap, buildSitemap, siteUrl };
