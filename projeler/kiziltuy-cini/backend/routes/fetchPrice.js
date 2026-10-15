/* ------------------------------------------------------------------ */
/*  Trendyol fiyat çekici – v4 (API > HTML > Puppeteer)               */
/* ------------------------------------------------------------------ */
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0 Safari/537.36";

/* TL metnini → Number  -------------------------------------------- */
const textToNumber = (txt) =>
  parseFloat(
    txt
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.]/g, "")
  );

/* Trendyol “kuruş bazlı” değerler → TL                              */
const normalize = (n) => (n >= 1e4 ? n / 100 : n);

/* ------------------------------------------------------------------ */
/*  0)  RESMÎ JSON API  (en sağlam yol)                               */
/* ------------------------------------------------------------------ */
async function scrapeWithApi(url) {
  const idMatch = url.match(/-p-(\d+)(\?|$)/);
  if (!idMatch) throw new Error("ProductId bulunamadı (URL)");

  const apiUrl =
    "https://public.trendyol.com/discovery-web-productgw-service/api/product/detail?productId=" +
    idMatch[1];

  const { data } = await axios.get(apiUrl, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    timeout: 10_000,
  });

  const p =
    data?.result?.price?.discountedPrice ??
    data?.result?.price?.sellingPrice ??
    data?.result?.price?.originalPrice;

  if (!p) throw new Error("API → fiyat yok");
  return normalize(p); // API değeri hep kuruş bazlı döner
}

/* ------------------------------------------------------------------ */
/*  1)  HTML (Axios + Cheerio) - yedek                               */
/* ------------------------------------------------------------------ */
const MAIN_SPANS = ["span.prc-dsc", "span.prc-org", "span[class*='priceText']"];
const GREEN_AXIOS = '*[style*="#008040"], [class*="008040"]';

async function scrapeWithHtml(url) {
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    timeout: 10_000,
  });
  const $ = cheerio.load(html);

  /* __NEXT_DATA__  / JSON-LD */
  const jsonRaw =
    $("script#__NEXT_DATA__").html() ||
    $('script[type="application/ld+json"]').first().text();
  if (jsonRaw) {
    try {
      const obj = JSON.parse(jsonRaw);
      const any = findPriceRec(obj);
      if (any) return any;
    } catch (_) {}
  }

  /* meta */
  const meta =
    $('meta[property="product:price:amount"]').attr("content") ||
    $('meta[itemprop="price"]').attr("content");
  if (meta) return normalize(textToNumber(meta));

  /* indirim yeşili */
  const green = $(GREEN_AXIOS).first().text().trim();
  if (green) return normalize(textToNumber(green));

  /* span fall-back */
  for (const sel of MAIN_SPANS) {
    const txt = $(sel).first().text().trim();
    if (txt) return normalize(textToNumber(txt));
  }

  throw new Error("HTML’de fiyat bulunamadı");
}

/* fiyatı JSON objesinde derin arar (BFS) */
function findPriceRec(o) {
  const q = [o];
  while (q.length) {
    const cur = q.shift();
    if (cur && typeof cur === "object") {
      for (const [k, v] of Object.entries(cur)) {
        if (/price|selling|discount|amount|current/i.test(k)) {
          if (typeof v === "number") return normalize(v);
          if (typeof v === "string") {
            const n = textToNumber(v);
            if (!isNaN(n) && n > 0) return normalize(n);
          }
        }
        q.push(v);
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  2)  PUPPETEER (son çare)                                          */
/* ------------------------------------------------------------------ */
const GREEN_PUP = '*[style*="#008040"], [class*="008040"]';

async function scrapeWithPuppeteer(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    /* indirim yeşili */
    const green = await page
      .$eval(GREEN_PUP, (el) => el.textContent.trim())
      .catch(() => null);
    if (green) return normalize(textToNumber(green));

    /* span’ler */
    for (const sel of MAIN_SPANS) {
      const txt = await page
        .$eval(sel, (el) => el.textContent.trim())
        .catch(() => null);
      if (txt) return normalize(textToNumber(txt));
    }

    throw new Error("Puppeteer’de fiyat bulunamadı");
  } finally {
    await browser.close();
  }
}

/* ------------------------------------------------------------------ */
/*  DIŞA AKTARIM                                                      */
/* ------------------------------------------------------------------ */
module.exports = async function fetchPrice(url) {
  try {
    return await scrapeWithApi(url); // 1 – public JSON API
  } catch (eApi) {
    console.warn("API başarısız → HTML:", eApi.message);
    try {
      return await scrapeWithHtml(url); // 2 – HTML
    } catch (eHtml) {
      console.warn("HTML başarısız → Puppeteer:", eHtml.message);
      return await scrapeWithPuppeteer(url); // 3 – Puppeteer
    }
  }
};
