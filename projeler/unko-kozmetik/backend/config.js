/********************************************************
 * backend/config.js
 * Tüm ortam değişkenleri tek yerden okunur.
 ********************************************************/
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const isProduction = process.env.NODE_ENV === "production";

// Production'da zorunlu, geliştirmede varsayılan değerle devam eden değişkenler
const read = (name, devFallback) => {
  const value = process.env[name];
  if (value) return value;
  if (isProduction || devFallback === undefined) {
    throw new Error(
      `${name} ortam değişkeni tanımlı değil (.env dosyasını kontrol edin).`
    );
  }
  console.warn(
    `${name} tanımlı değil, geliştirme için varsayılan değer kullanılıyor.`
  );
  return devFallback;
};

// Birden fazla frontend adresi virgülle verilebilir; ödeme dönüşlerinde ilki kullanılır
const clientDomains = (process.env.CLIENT_DOMAIN || "http://localhost:5173")
  .split(",")
  .map((d) => d.trim().replace(/\/+$/, ""))
  .filter(Boolean);

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 5001,
  mongoUri: read("MONGO_URI", "mongodb://127.0.0.1:27017/unko-kozmetik"),
  jwtSecret: read("SECRET_KEY", "dev_access_secret"),
  refreshSecret: read("REFRESH_SECRET", "dev_refresh_secret"),
  clientDomains,
  clientDomain: clientDomains[0],
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};
