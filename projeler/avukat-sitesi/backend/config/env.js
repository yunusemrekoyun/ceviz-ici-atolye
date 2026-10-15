// config/env.js
import "dotenv/config";

function bool(v, d = false) {
  if (v == null) return d;
  return String(v).toLowerCase() === "true";
}
function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

const REQUIRED = ["MONGODB_URI", "JWT_SECRET", "SMTP_USER", "SMTP_PASS"];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV ${key}`);
  }
}

const ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: num(process.env.PORT, 4000),

  // DB
  MONGODB_URI: process.env.MONGODB_URI,

  // CORS
  ORIGINS, // dizi halinde (çoklu origin desteği)

  // Cookies / Auth
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME || "access_token",
  JWT_SECRET: process.env.JWT_SECRET,

  // Mailer
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: num(process.env.SMTP_PORT, 465),
  SMTP_SECURE: bool(process.env.SMTP_SECURE ?? process.env.SMTP_PORT === "465"),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM || process.env.SMTP_USER,

  // Cloudinary
  CLOUDINARY: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    folder_articles: process.env.CLOUDINARY_FOLDER_ARTICLES || "articles",
    folder_decisions: process.env.CLOUDINARY_FOLDER_DECISIONS || "decisions",
  },
};
