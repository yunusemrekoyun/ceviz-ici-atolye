// Entegrasyon testleri gerçek sunucuyu ayrı bir süreç olarak ve her çalıştırmada
// benzersiz bir veritabanıyla başlatır. Varsayılan hedef, dev/yerel-ortam.sh'nin
// başlattığı yerel MongoDB'dir; TEST_MONGO_URI ile değiştirilebilir. Atlas'a bağlanmaz.
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");

const BACKEND_DIR = path.resolve(__dirname, "..", "..");
const BASE_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27117/?directConnection=true";
const PAYTR_KEY = "entegrasyon-test-anahtari";
const PAYTR_SALT = "entegrasyon-test-tuzu";

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function databaseUri(name) {
  const url = new URL(BASE_URI);
  url.pathname = `/${name}`;
  return url.toString();
}

async function startTestServer(extraEnv = {}) {
  if (/mongodb\.net/i.test(BASE_URI)) throw new Error("Entegrasyon testleri Atlas'a bağlanamaz.");
  const port = await freePort();
  const dbName = `oldsocks_it_${process.pid}_${crypto.randomBytes(3).toString("hex")}`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oldsocks-it-"));
  const envFile = path.join(tmp, "test.env");
  const env = {
    NODE_ENV: "test",
    PORT: String(port),
    MONGO_URI: databaseUri(dbName),
    FRONTEND_ORIGIN: "http://localhost:5173",
    BACKEND_PUBLIC_URL: `http://127.0.0.1:${port}`,
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString("hex"),
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    PAY_PROVIDER: "mock",
    PAYTR_TEST_MODE: "1",
    PAYTR_MERCHANT_ID: "000000",
    PAYTR_MERCHANT_KEY: PAYTR_KEY,
    PAYTR_MERCHANT_SALT: PAYTR_SALT,
    MAIL_FROM: "magaza@oldscks.local",
    MAIL_TO: "yonetici@oldscks.local",
    MAIL_PASS: "",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "1126",
    SMTP_USER: "test",
    SMTP_PASS: "test",
    RAPIDAPI_KEY: "",
    MEDIA_ROOT: path.join(tmp, "media"),
    MEDIA_PUBLIC_BASE_URL: `http://127.0.0.1:${port}/media`,
    MEDIA_INLINE_WORKER: "false",
    BACKUP_KEY_FILE: path.join(tmp, "backup", "master.key"),
    // Testler aynı yerel IP'den çok sayıda ödeme oturumu açar.
    STOCK_HOLDS_PER_IP: "1000",
    ...extraEnv,
  };
  fs.writeFileSync(envFile, Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n"));

  const child = spawn(process.execPath, ["server.js"], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ...env, OLDSOCKS_ENV_FILE: envFile },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 20_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`Sunucu başlamadı:\n${output}`);
    try {
      const res = await fetch(`${base}/readyz`);
      if (res.ok) break;
    } catch {
      // henüz dinlemiyor
    }
    if (Date.now() > deadline) {
      child.kill("SIGKILL");
      throw new Error(`Sunucu 20 sn içinde hazır olmadı:\n${output}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  await mongoose.connect(env.MONGO_URI);

  async function stop() {
    child.kill("SIGTERM");
    await new Promise((r) => (child.exitCode !== null ? r() : child.once("exit", r)));
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return { base, port, stop, env, output: () => output };
}

function paytrHash(merchantOid, status, totalAmount) {
  return crypto
    .createHmac("sha256", PAYTR_KEY)
    .update(merchantOid + PAYTR_SALT + status + totalAmount)
    .digest("base64");
}

async function paytrCallback(base, { merchantOid, status = "success", totalAmount, hash }) {
  const body = new URLSearchParams({
    merchant_oid: merchantOid,
    status,
    total_amount: String(totalAmount),
    hash: hash || paytrHash(merchantOid, status, String(totalAmount)),
  });
  const res = await fetch(`${base}/api/v1/payment/callback/paytr`, { method: "POST", body });
  return { status: res.status, text: await res.text() };
}

async function postJson(base, pathName, body, headers = {}) {
  const res = await fetch(`${base}${pathName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// Ödeme başlatma uçlarının istediği mesafeli satış onayı.
const CONSENT = { preInformation: true, distanceSales: true, version: "test-2026-09-27" };

module.exports = { startTestServer, paytrCallback, paytrHash, postJson, CONSENT };

// Yerel Mailpit (dev/yerel-ortam.sh) API'si: belirli alıcıya giden e-postaları getirir.
const MAILPIT_API = process.env.TEST_MAILPIT_API || "http://127.0.0.1:8126/api/v1";
async function mailsTo(email, { waitMs = 5000 } = {}) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    const res = await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const data = await res.json();
    if (data.messages?.length || Date.now() > deadline) {
      return Promise.all(
        (data.messages || []).map(async (m) => (await fetch(`${MAILPIT_API}/message/${m.ID}`)).json())
      );
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

module.exports.mailsTo = mailsTo;
