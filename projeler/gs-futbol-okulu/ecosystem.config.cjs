// PM2 süreç tanımı. Kullanım: pm2 start ecosystem.config.cjs
// Port, proje kökündeki .env dosyasındaki PORT değerinden okunur (yoksa 3000).
const fs = require("node:fs");
const path = require("node:path");

function readEnvPort() {
  try {
    const content = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    const match = content.match(/^\s*PORT\s*=\s*"?(\d{2,5})"?\s*$/m);
    if (match) return Number(match[1]);
  } catch {
    // .env yoksa varsayılan port
  }
  return 3000;
}

const port = readEnvPort();

module.exports = {
  apps: [
    {
      name: "gs-kayit",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      // Sadece localhost'a bağlanır; dışarıya nginx (HTTPS) üzerinden açılır, giriş uygulamanın içindedir.
      args: `start -H 127.0.0.1 -p ${port}`,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: String(port),
      },
    },
  ],
};
