// backend/server.js
require("./config/env").loadEnv();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const apiRoutes = require("./routes");
const requestId = require("./middleware/requestId");
const { cloudflareClientIp, edgeCacheOnlyForSite } = require("./middleware/cloudflare");
const { siteUrl } = require("./services/sitemap");
const { publicAssetFilter } = require("./middleware/publicAssetFilter");
const { trafficMonitor } = require("./services/trafficMonitor");
const { MediaError, toMediaErrorPayload } = require("./services/media/errors");
const {
  directoryPath,
  initializeMediaStorage,
} = require("./services/media/storage");
const { startMediaWorker } = require("./services/media/worker");
const { startOrderMailSweeper } = require("./services/orderMailQueue");

const app = express();

/* 1) DB */
const databaseReady = connectDB();
// Bağlantı koparsa site sahibine e-posta (services/dbWatch).
require("./services/dbWatch").startDbWatch();
const mediaStorageReady = initializeMediaStorage();

/* 2) Güven / Proxy (Render, Railway vb. için) */
app.set("trust proxy", 1); // gerçek istemci IP’si için
app.use(cloudflareClientIp); // Cloudflare arkasında ziyaretçinin kendi adresi
app.disable("x-powered-by");
app.use(requestId);

/* Ürün sayfası HTML'i (paylaşım önizlemesi). Güvenlik başlıklarından (helmet CSP) önce:
   bu yanıt mağaza sayfasının kendisidir, API'nin sıkı politikası sayfayı bozardı. */
app.get("/product-details/:id", require("./services/sharePreview").sendProductPage);
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/v1")) return next();
  const finish = trafficMonitor.begin();
  res.once("finish", () => finish(res.statusCode));
  res.once("close", () => finish(res.writableEnded ? res.statusCode : 499));
  next();
});

/* 3) CORS (çoklu origin whitelist) */
const ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptionsDelegate = (req, cb) => {
  const origin = req.header("Origin");
  const opts = { credentials: true, origin: true };

  if (!origin) return cb(null, opts);
  if (ALLOWED_ORIGINS.includes(origin)) return cb(null, opts);

  return cb(new Error(`CORS blocked for origin: ${origin}`));
};

app.use(cors(corsOptionsDelegate));
app.use("/api/v1", edgeCacheOnlyForSite(siteUrl()));

/* 4) Güvenlik başlıkları */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/* 5) Sıkıştırma */
app.use(compression());

/* Geliştirmede medya dosyalarını Express sunar; canlıda bu yolu yalnızca Nginx sunar. */
const serveMediaWithExpress =
  process.env.NODE_ENV !== "production" ||
  String(process.env.MEDIA_SERVE_STATIC || "").toLowerCase() === "true";
if (serveMediaWithExpress) {
  app.use(
    "/media",
    express.static(directoryPath("assets"), {
      dotfiles: "deny",
      fallthrough: true,
      immutable: true,
      index: false,
      maxAge: "1y",
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Access-Control-Allow-Origin", "*");
      },
    })
  );
}

/* 6) Loglama */
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

/* --- Rate Limit Helpers --- */
// HEAD isteği GET işleyicisini tam çalıştırır (yalnız gövde gönderilmez); bu yüzden sayılır.
const skipPreflight = (req) => req.method === "OPTIONS";
const keyByIp = (req) => ipKeyGenerator(req.ip);

// Sunucu içi önbellekten sunulan herkese açık okuma uçları. Maliyetleri çok düşük
// olduğundan aynı IP'yi paylaşan mobil kullanıcılar (CGNAT) kalabalıkta
// engellenmesin diye ayrı ve geniş bir sınıra tabidir.
const PUBLIC_READ_PATHS = [
  "/api/v1/products",
  "/api/v1/categories",
  "/api/v1/mini-campaigns",
  "/api/v1/shipping",
  "/api/v1/announcement-bar",
  "/api/v1/cart-campaigns/header",
  "/api/v1/storefront",
  "/api/v1/site-content",
  "/api/v1/hero-videos",
  "/api/v1/campaigns/active",
];
const isPublicRead = (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const path = req.originalUrl.split("?")[0];
  if (path.includes("/admin")) return false;
  return PUBLIC_READ_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

/* 7) Rate limit (rotaya göre) */

/**
 * Genel limit (catch-all)
 * - 10 dakikada 1200 istek/IP
 * - OPTIONS sayılmaz
 * - Başarılı istekler de sayılır; aksi halde botlar limiti aşabilir
 */
const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipPreflight(req) || isPublicRead(req),
  keyGenerator: keyByIp,
  skipSuccessfulRequests: false,
});

/**
 * Önbellekli herkese açık okumalar (GET/HEAD)
 * - 1 dakikada 2000 istek/IP
 * - Başarılılar da sayılır
 */
const readHeavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isPublicRead(req),
  keyGenerator: keyByIp,
  skipSuccessfulRequests: false,
});

/**
 * Kritik uçlar (auth/payment/admin) — daha sıkı
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  keyGenerator: keyByIp,
  skipSuccessfulRequests: false,
});

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  // PayTR bildirimleri aynı sağlayıcı IP'sinden gelebilir. Geçerlilikleri HMAC ile
  // doğrulandığı için müşteri başlatma limitine dahil edilmeleri gerçek ödemeleri
  // yoğunluk altında düşürebilirdi; genel API limiti yine uygulanır.
  skip: (req) =>
    skipPreflight(req) || req.path === "/callback/paytr",
  keyGenerator: keyByIp,
  skipSuccessfulRequests: false,
});

const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  keyGenerator: keyByIp,
  skipSuccessfulRequests: false,
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  keyGenerator: keyByIp,
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  keyGenerator: keyByIp,
});

/* 8) Body parsers */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* 9) Healthcheck (limitleme yok) */
app.get("/healthz", (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    mongo: mongoose.connection.readyState, // 1 ise bağlı
  });
});

app.get("/sitemap.xml", require("./services/sitemap").sendSitemap);

app.get("/readyz", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ok: ready });
});

/* 10) Rate limit uygulaması (sıra önemli) */
/* Önbellekli herkese açık okumalar: geniş limiter (diğer istekler genel limiter'a) */
app.use("/api/v1", readHeavyLimiter);

/* Kritik uçlar */
app.use("/api/v1/auth", authLimiter);
app.use("/api/v1/payment", paymentLimiter);
app.use("/api/v1/admin", adminLimiter);
app.use("/api/v1/contact", contactLimiter);
app.use("/api/v1/newsletter/subscribe", newsletterLimiter);

/* Geri kalan tüm API: genel limiter */
app.use("/api/v1", generalLimiter);

/* 11) API routes */
app.use("/api/v1", publicAssetFilter);
app.use("/api/v1", apiRoutes);

/* 12) 404 */
app.use((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(404).json({ message: "Route not found" });
});

/* 13) Global error handler (CORS vb.) */
app.use((err, req, res, next) => {
  if (err instanceof MediaError) {
    if (err.retryAfter) res.setHeader("Retry-After", String(err.retryAfter));
    return res
      .status(err.statusCode)
      .json(toMediaErrorPayload(err, req.requestId));
  }
  console.error("Unhandled error:", err?.message || err);
  if (err && String(err.message || "").startsWith("CORS blocked")) {
    return res.status(403).json({ message: err.message, requestId: req.requestId });
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({
        message: "Yüklenen dosya çok büyük. Lütfen daha küçük bir dosya deneyin.",
        requestId: req.requestId,
      });
  }
  if (Number.isInteger(err?.statusCode)) {
    return res
      .status(err.statusCode)
      .json({
        message: err.message || "İşlem tamamlanamadı.",
        requestId: req.requestId,
      });
  }
  res.status(500).json({
    message: "Internal Server Error",
    requestId: req.requestId,
  });
});

/* 14) Server */
const PORT = process.env.PORT || 5000;
let server;
let mediaWorker;
let orderMailSweeper;

const inlineWorkerConfigured = String(process.env.MEDIA_INLINE_WORKER || "").trim();
const inlineWorkerEnabled = inlineWorkerConfigured
  ? inlineWorkerConfigured.toLowerCase() === "true"
  : !["production", "test"].includes(process.env.NODE_ENV);

Promise.all([databaseReady, mediaStorageReady])
  .then(() => {
    if (inlineWorkerEnabled) mediaWorker = startMediaWorker();
    orderMailSweeper = startOrderMailSweeper();
    // Üretimde yalnız Nginx'in eriştiği yerel adreste dinle; güvenlik duvarı tek katman kalmasın.
    const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "127.0.0.1" : undefined);
    server = app.listen(PORT, HOST, () => {
      console.log(`✅ Sunucu ayakta, ${HOST || "tüm arayüzler"}:${PORT}`);
      if (ALLOWED_ORIGINS.length) {
        console.log("🔒 CORS whitelist:", ALLOWED_ORIGINS.join(", "));
      } else {
        console.log(
          "⚠️  CORS whitelist boş. FRONTEND_ORIGIN env değişkenini ayarla (virgülle çoklu domain)."
        );
      }
    });
  })
  .catch((error) => {
    console.error("❌ Uygulama başlatılamadı:", error?.message || error);
    process.exit(1);
  });

/* 15) Graceful shutdown */
function shutdown(signal) {
  orderMailSweeper?.stop();
  console.log(`\n${signal} alındı. Kapanıyor...`);
  if (!server) {
    Promise.resolve(mediaWorker?.stop())
      .then(() => mongoose.connection.close())
      .finally(() => process.exit(0));
    return;
  }
  server.close(async () => {
    console.log("🔻 HTTP sunucusu kapandı.");
    try {
      await mediaWorker?.stop();
      await mongoose.connection.close();
      console.log("🔻 Mongo bağlantısı kapandı.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Mongo bağlantısı kapatılırken hata:", err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.warn("⏱  Zorunlu çıkış (timeout).");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
