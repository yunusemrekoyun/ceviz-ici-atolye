// Ürün linki WhatsApp, Instagram, Facebook gibi yerlerde paylaşılınca önizlemede ürünün adı,
// fiyatı ve görseli çıksın diye ürün sayfasının HTML'i sunucuda bu bilgilerle doldurulur.
// Bu uygulamalar JavaScript çalıştırmadığı için tarayıcıda eklenen etiketleri görmez.
// Nginx /product-details/ isteklerini buraya yollar; burası yanıt veremezse Nginx düz
// index.html'e döner. Sayfanın geri kalanı her zamanki gibi tarayıcıda çalışır.
const fs = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { assetPublicUrl } = require("./media/storage");
const { siteUrl } = require("./sitemap");

const SITE_NAME = "OLDSOCKS";
const CACHE_MS = 60 * 1000;
const CACHE_MAX = 500;

// Canlıda API /home/oldscks/app/api, site /home/oldscks/app/www altındadır.
const indexPath = () => process.env.SITE_INDEX_HTML || path.resolve(__dirname, "../../www/index.html");

let indexCache = { file: "", mtimeMs: 0, html: "" };
async function readIndex() {
  const file = indexPath();
  const stat = await fs.stat(file);
  if (indexCache.file !== file || indexCache.mtimeMs !== stat.mtimeMs) {
    indexCache = { file, mtimeMs: stat.mtimeMs, html: await fs.readFile(file, "utf8") };
  }
  return indexCache.html;
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

const clip = (text, max = 160) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

const formatTry = (value) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(value || 0));

// Paylaşım önizlemeleri en güvenilir JPEG'i gösterir; yoksa en büyük webp (en çok 1200 px).
function shareImage(product) {
  const asset = (product.imageAssets || []).find((item) => item && typeof item === "object");
  const variants = asset?.variants || [];
  const jpeg = variants.find((variant) => variant.kind === "image" && variant.format === "jpeg" && variant.key);
  const webp = variants
    .filter((variant) => variant.kind === "image" && variant.format === "webp" && variant.key && Number(variant.width) <= 1200)
    .sort((a, b) => Number(b.width || 0) - Number(a.width || 0))[0];
  const chosen = jpeg || webp;
  if (chosen) return { url: assetPublicUrl(chosen.key), width: chosen.width, height: chosen.height, mime: chosen.mime };
  const legacy = (product.images || []).find((url) => /^https?:\/\//i.test(String(url || "")));
  return legacy ? { url: legacy } : null;
}

const cache = new Map();
async function productPreview(id) {
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) return hit.value;
  const product = await Product.findOne({ _id: id, archivedAt: null })
    .select("name description price images imageAssets")
    .populate("imageAssets")
    .lean();
  const value = product
    ? {
        name: product.name,
        description: clip(product.description) || `${product.name} — ${formatTry(product.price)}. ${SITE_NAME} mağazasında.`,
        price: Number(product.price || 0),
        image: shareImage(product),
      }
    : null;
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(id, { value, expires: Date.now() + CACHE_MS });
  return value;
}

function injectMeta(html, { title, description, url, image, price }) {
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="product:price:amount" content="${price.toFixed(2)}" />`,
    `<meta property="product:price:currency" content="TRY" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  ];
  if (image?.url) {
    tags.push(`<meta property="og:image" content="${escapeHtml(image.url)}" />`);
    if (image.url.startsWith("https://")) tags.push(`<meta property="og:image:secure_url" content="${escapeHtml(image.url)}" />`);
    if (image.mime) tags.push(`<meta property="og:image:type" content="${escapeHtml(image.mime)}" />`);
    if (image.width && image.height) {
      tags.push(`<meta property="og:image:width" content="${Number(image.width)}" />`);
      tags.push(`<meta property="og:image:height" content="${Number(image.height)}" />`);
    }
    tags.push(`<meta property="og:image:alt" content="${escapeHtml(title)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image.url)}" />`);
  }
  // Sayfadaki genel başlık/açıklama/tür etiketleri ürününküyle değiştirilir (tekrar olmasın).
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/i, "")
    .replace(/<meta\s+property="og:(type|title)"[^>]*>/gi, "");
  return cleaned.replace(/<\/head>/i, `    ${tags.join("\n    ")}\n  </head>`);
}

async function sendProductPage(req, res, next) {
  let html;
  try {
    html = await readIndex();
  } catch {
    return next(); // index.html yoksa (yerel geliştirme) 404; Nginx düz sayfaya döner.
  }
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "no-cache");
  const id = String(req.params.id || "");
  try {
    const preview = mongoose.isValidObjectId(id) ? await productPreview(id) : null;
    if (!preview) return res.send(html);
    const url = `${siteUrl()}/product-details/${id}`;
    return res.send(injectMeta(html, { title: `${preview.name} | ${SITE_NAME}`, ...preview, url }));
  } catch (error) {
    console.error("[paylaşım önizlemesi]", error?.message || error);
    return res.send(html);
  }
}

module.exports = { sendProductPage, injectMeta, shareImage };
