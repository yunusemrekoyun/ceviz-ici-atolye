#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");
const { readDatabaseArchive } = require("../services/backups/database");
const { verifyMediaInStage, verifyMediaTree } = require("../services/backups/media");

async function mustBeAbsent(file, label) {
  try {
    await fs.lstat(file);
    throw new Error(`${label} zaten var; yalnızca boş kurulum kabul edilir.`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function main() {
  const source = path.resolve(process.argv[2] || "");
  const uri = process.env.RECOVERY_MONGODB_URI;
  const databaseName = process.env.RECOVERY_DATABASE_NAME;
  const mediaRoot = process.env.RECOVERY_MEDIA_ROOT && path.resolve(process.env.RECOVERY_MEDIA_ROOT);
  if (!process.argv[2] || !uri || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(databaseName || "") ||
      ["admin", "local", "config"].includes(databaseName) || !mediaRoot) {
    throw new Error("Kullanım: RECOVERY_MONGODB_URI=... RECOVERY_DATABASE_NAME=... RECOVERY_MEDIA_ROOT=... node importRecoveredBackup.js ACILAN_YEDEK_KLASORU");
  }
  const keyFile = path.resolve(process.env.RECOVERY_BACKUP_KEY_FILE || path.join(mediaRoot, "..", "backup", "master.key"));
  if (keyFile.startsWith(`${mediaRoot}${path.sep}`)) throw new Error("Anahtar dosyası medya dizininin dışında olmalı.");
  // Mac'e elle alınan yedeklerde (deploy/scripts/yedek-al.sh) anahtar yoktur; Drive hiç
  // bağlanmadıysa gerekmez. Varsa geri konur.
  const key = await fs.readFile(path.join(source, "master.key")).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (key && key.length !== 32) throw new Error("Kurtarma anahtarı geçersiz.");
  const archive = await readDatabaseArchive(path.join(source, "mongodb.ejson.gz"));
  await verifyMediaTree(source);
  const verifiedMedia = await verifyMediaInStage(archive, source);
  console.log(`Medya doğrulandı: ${verifiedMedia.readyAssets} hazır kayıt, ${verifiedMedia.referencedFiles} dosya.`);
  await mustBeAbsent(mediaRoot, "Medya hedefi");
  if (key) await mustBeAbsent(keyFile, "Yedek anahtarı hedefi");
  const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  try {
    const db = client.db(databaseName);
    const existing = await db.listCollections({}, { nameOnly: true }).toArray();
    if (existing.length) throw new Error("Hedef veritabanı boş değil. Var olan veri korunmak için aktarım durduruldu.");
    for (const entry of archive.collections) {
      const collection = await db.createCollection(entry.name, entry.options || {});
      for (let index = 0; index < entry.documents.length; index += 250) {
        await collection.insertMany(entry.documents.slice(index, index + 250), { ordered: true });
      }
      for (const spec of entry.indexes) {
        if (spec.name === "_id_") continue;
        const { key: indexKey, v: _version, ns: _namespace, ...options } = spec;
        void _version; void _namespace;
        await collection.createIndex(indexKey, options);
      }
      const count = await collection.countDocuments();
      if (count !== entry.documents.length) throw new Error(`${entry.name} belge sayısı uyuşmuyor.`);
      console.log(`${entry.name}: ${count}`);
    }
    await fs.mkdir(mediaRoot, { recursive: true, mode: 0o750 });
    for (const name of ["assets", "trash", "quarantine"]) {
      await fs.cp(path.join(source, "media", name), path.join(mediaRoot, name), { recursive: true, errorOnExist: true });
    }
    if (key) {
      await fs.mkdir(path.dirname(keyFile), { recursive: true, mode: 0o700 });
      await fs.writeFile(keyFile, key, { mode: 0o600, flag: "wx" });
    } else {
      console.log("Yedekte anahtar yok: Google Drive yedeği kuruluysa panelden yeniden bağlanmalı.");
    }
    console.log(`Aktarım tamamlandı: ${databaseName}. Uygulama ayarlarında MongoDB, medya yolu ve anahtar yolu bu hedefleri göstermeli.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Aktarım başarısız: ${error.message}`);
  process.exitCode = 1;
});
