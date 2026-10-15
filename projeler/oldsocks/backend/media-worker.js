require("./config/env").loadEnv();

// Medya işleme, tek çekirdekli sunucuda API ile aynı CPU'yu paylaşır. Düşük öncelik
// (nice) vitrin isteklerinin öne geçmesini sağlar; sonradan açılan iş parçacıkları ve
// ffmpeg alt süreçleri bu önceliği devralır, bu yüzden her şeyden önce ayarlanır.
{
  const niceValue = Number(process.env.MEDIA_WORKER_NICE ?? 10);
  try {
    if (Number.isInteger(niceValue) && niceValue !== 0) require("node:os").setPriority(niceValue);
  } catch (error) {
    console.warn("[media-worker] Öncelik ayarlanamadı:", error?.message || error);
  }
}

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { initializeMediaStorage } = require("./services/media/storage");
const { startMediaWorker } = require("./services/media/worker");
const { startBackupWorker } = require("./services/backups/jobs");

let worker;
let backupWorker;

async function start() {
  await Promise.all([connectDB(), initializeMediaStorage()]);
  worker = startMediaWorker();
  backupWorker = startBackupWorker();
}

async function shutdown(signal) {
  console.log(`\n${signal} alındı. Medya işçisi kapanıyor...`);
  await worker?.stop();
  await backupWorker?.stop();
  await mongoose.connection.close();
  process.exit(0);
}

start().catch((error) => {
  console.error("Medya işçisi başlatılamadı:", error?.message || error);
  process.exit(1);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
