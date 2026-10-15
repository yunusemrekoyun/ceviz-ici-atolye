// backend/server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

dotenv.config();

const connectDB = require("./config/db");
const { MEDIA_PUBLIC_PATH, MEDIA_ROOT } = require("./storage");
const {
  IMAGE_SOFT_LIMIT_MB,
  VIDEO_SOFT_LIMIT_MB,
  HARD_LIMIT_MB,
} = require("./middleware/uploadMedia");
const { normalizeUploadError } = require("./utils/uploadErrors");

connectDB();

const app = express();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

/* ---------- TRUST PROXY (prod / dev) ---------- */
// Prod'da genelde Nginx / proxy arkasında çalışacağın için 1 hop güvenli.
// Local'de proxy yok, kapatıyoruz.
if (isProd) {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", false);
}

/* ---------- CORS ---------- */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.BASE_URL;
const EXTRA_ALLOWED = (process.env.EXTRA_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowPreview = process.env.VERCEL_PREVIEW_ALLOWED === "1";

// Prod için whitelist; dev'de işleri basitleştireceğiz
const WHITELIST = new Set([FRONTEND_ORIGIN, ...EXTRA_ALLOWED].filter(Boolean));

const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  if (WHITELIST.has(origin)) return true;
  if (allowPreview && /\.vercel\.app$/i.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, cb) => {
      // Postman, curl gibi origin göndermeyen istekler
      if (!origin) return cb(null, true);

      // DEV ORTAM: CORS ile uğraşma, hepsine izin ver
      if (!isProd) {
        // console.log("🧪 DEV CORS allowed:", origin);
        return cb(null, true);
      }

      // PROD ORTAM: Sadece whitelist'teki origin'lere izin ver
      if (isAllowedOrigin(origin)) {
        return cb(null, true);
      }

      console.warn("❌ CORS blocked (PROD):", origin, "Whitelist:", [
        ...WHITELIST,
      ]);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    // Preflight sonucunu 24 saat onbellekle. Varsayilanda bu header hic
    // gonderilmedigi icin tarayici her istekte yeniden OPTIONS atiyordu.
    maxAge: 86400,
  })
);

/* ---------- Parsers & Security ---------- */
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());

/* ---------- Global Rate Limit ---------- */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 0, // dev'de kapalı, prod'da genel sınırlama
  standardHeaders: true,
  legacyHeaders: false,
});
if (isProd) {
  app.use(globalLimiter);
}

/* ---------- Health & API ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use(
  MEDIA_PUBLIC_PATH,
  express.static(MEDIA_ROOT, {
    fallthrough: true,
    maxAge: isProd ? "30d" : 0,
    immutable: isProd,
  })
);

app.use("/api", (_req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  next();
});

app.use("/api", require("./routes/index"));

/* ---------- 404 & Error ---------- */
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "Not Found" });
  }
  next();
});

app.use((err, _req, res, _next) => {
  const uploadError = normalizeUploadError(err, {
    imageLimitMb: IMAGE_SOFT_LIMIT_MB,
    videoLimitMb: VIDEO_SOFT_LIMIT_MB,
    hardLimitMb: HARD_LIMIT_MB,
  });
  const status = uploadError?.status || err.status || 500;
  const payload =
    NODE_ENV === "production"
      ? { message: uploadError?.message || err.message || "Internal Server Error" }
      : {
          message: uploadError?.message || err.message || "Internal Server Error",
          stack: err.stack,
        };
  res.status(status).json(payload);
});

/* ---------- Listen ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Sunucu ${PORT} portunda çalışıyor`);
  console.log(`🌐 NODE_ENV: ${NODE_ENV}`);
  console.log(`🌐 CORS primary origin: ${FRONTEND_ORIGIN || "∅"}`);
  if (EXTRA_ALLOWED.length)
    console.log(`➕ Extra origins: ${EXTRA_ALLOWED.join(", ")}`);
  console.log(
    `🧪 Vercel previews allowed: ${allowPreview ? "YES (*.vercel.app)" : "NO"}`
  );
});
