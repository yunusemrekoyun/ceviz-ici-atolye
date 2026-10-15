// backend/config/env.js
// Ortam dosyasını yükler. OLDSOCKS_ENV_FILE verilirse yalnız o dosya okunur;
// verilmezse eski davranış sürer (çalışma dizinindeki .env).
const path = require("node:path");
const dotenv = require("dotenv");

function loadEnv() {
  const file = String(process.env.OLDSOCKS_ENV_FILE || "").trim();
  if (file) {
    const resolved = path.resolve(file);
    const result = dotenv.config({ path: resolved });
    if (result.error) {
      throw new Error(`OLDSOCKS_ENV_FILE okunamadı: ${resolved}`);
    }
  } else {
    dotenv.config();
  }

  const uri = String(process.env.MONGO_URI || "");
  if (process.env.NODE_ENV !== "production" && /mongodb\.net/i.test(uri)) {
    console.warn(
      "[env] Geliştirme ortamı Atlas'taki bir kümeye bağlanıyor. Canlıyla aynı kümeyse yerel testler canlıyı etkileyebilir; yerel ortam için dev/yerel-ortam.sh kullanın."
    );
  }
}

module.exports = { loadEnv };
