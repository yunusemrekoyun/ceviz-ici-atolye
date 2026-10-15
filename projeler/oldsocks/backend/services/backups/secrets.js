const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { rootPath } = require("../media/storage");

const KEY_BYTES = 32;
let keyPromise;

function keyPath() {
  const configured = String(process.env.BACKUP_KEY_FILE || "").trim();
  return configured || path.resolve(rootPath(), "..", "backup", "master.key");
}

// Anahtar yalnız ilk kurulumda oluşturulur. Kurulumdan sonra kaybolursa sessizce yenisi
// üretilmez; aksi hâlde kayıtlı Drive ayarları çözülemez hâle gelir ve bu fark edilmez.
async function ensureMasterKey() {
  const file = keyPath();
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  try {
    const handle = await fs.open(file, "wx", 0o600);
    try {
      await handle.writeFile(crypto.randomBytes(KEY_BYTES));
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  keyPromise = undefined;
}

async function loadKey() {
  const file = keyPath();
  let key;
  try {
    key = await fs.readFile(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const missing = new Error(
      "Yedek şifreleme anahtarı bulunamadı. Kurtarma kitindeki master.key dosyasını sunucuya geri koyun; yeni anahtar üretilmedi."
    );
    missing.code = "BACKUP_KEY_MISSING";
    missing.statusCode = 409;
    throw missing;
  }
  if (key.length !== KEY_BYTES) throw new Error("Backup master key is invalid");
  const stat = await fs.stat(file);
  if (stat.mode & 0o077) throw new Error("Backup master key permissions are too open");
  return key;
}

function masterKey() {
  keyPromise ||= loadKey().catch((error) => {
    keyPromise = undefined;
    throw error;
  });
  return keyPromise;
}

async function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", await masterKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), body]).toString("base64");
}

async function decrypt(encoded) {
  const bytes = Buffer.from(String(encoded || ""), "base64");
  if (bytes.length < 29 || bytes[0] !== 1) throw new Error("Encrypted backup setting is invalid");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    await masterKey(),
    bytes.subarray(1, 13)
  );
  decipher.setAuthTag(bytes.subarray(13, 29));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(29)), decipher.final()]).toString());
}

async function makeRecoveryKit(payload, passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < 16) {
    const error = new Error("Kurtarma parolası en az 16 karakter olmalıdır.");
    error.statusCode = 400;
    throw error;
  }
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = await new Promise((resolve, reject) =>
    crypto.scrypt(passphrase, salt, KEY_BYTES, (error, result) =>
      error ? reject(error) : resolve(result)
    )
  );
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload))),
    cipher.final(),
  ]);
  key.fill(0);
  return {
    format: "oldsocks-recovery-kit-v1",
    kdf: "scrypt",
    cipher: "aes-256-gcm",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: body.toString("base64"),
  };
}

async function openRecoveryKit(kit, passphrase) {
  if (kit?.format !== "oldsocks-recovery-kit-v1" || kit.kdf !== "scrypt" || kit.cipher !== "aes-256-gcm") {
    throw new Error("Kurtarma kiti biçimi tanınmıyor.");
  }
  const salt = Buffer.from(kit.salt, "base64");
  const iv = Buffer.from(kit.iv, "base64");
  const tag = Buffer.from(kit.tag, "base64");
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16) throw new Error("Kurtarma kiti bozuk.");
  const key = await new Promise((resolve, reject) =>
    crypto.scrypt(passphrase, salt, KEY_BYTES, (error, result) => error ? reject(error) : resolve(result))
  );
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(kit.data, "base64")), decipher.final(),
    ]).toString("utf8"));
    if (payload?.version !== 1 || !payload.rcloneConfig || !payload.resticPassword ||
        Buffer.from(payload.masterKey || "", "base64").length !== KEY_BYTES) {
      throw new Error("Kurtarma kiti içeriği geçersiz.");
    }
    return payload;
  } finally {
    key.fill(0);
  }
}

module.exports = { decrypt, encrypt, ensureMasterKey, keyPath, makeRecoveryKit, masterKey, openRecoveryKit };
