const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const BackupJob = require("../../models/BackupJob");
const BackupSettings = require("../../models/BackupSettings");
const MediaAsset = require("../../models/MediaAsset");
const { directoryPath } = require("../media/storage");
const { readDatabaseArchive, writeDatabaseArchive } = require("./database");
const { ensureRepository, restic, withRuntime } = require("./commands");
const { SETTINGS_SELECT } = require("./googleOAuth");
const { verifyMediaInStage, verifyMediaTree } = require("./media");
const { applyCatalog, copyMissingMedia, getSnapshot, impactReport } = require("./restore");
const { sendAdminAlertMail } = require("../../utils/mailer");

const JOB_LABELS = { backup: "Yedekleme", preview: "Geri dönüş raporu", restore: "Geri dönüş" };
const STALE_ALERT_AFTER_MS = 26 * 60 * 60 * 1000;
const ALERT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function alertAdmins(subject, lines) {
  return sendAdminAlertMail({ subject, lines }).catch((error) =>
    console.error("Backup alert mail failed:", error?.code || error?.message || "Error")
  );
}

// Günlük takvim açıkken son başarılı yedek 26 saatten eskiyse günde en fazla bir uyarı.
async function alertIfBackupStale() {
  const settings = await BackupSettings.findOne({ key: "primary" }).select("enabled lastSuccessAt lastAlertAt connectedAt");
  if (!settings?.enabled) return;
  const now = Date.now();
  const lastSuccess = settings.lastSuccessAt?.getTime() || settings.connectedAt?.getTime() || 0;
  if (!lastSuccess || now - lastSuccess < STALE_ALERT_AFTER_MS) return;
  if (settings.lastAlertAt && now - settings.lastAlertAt.getTime() < ALERT_INTERVAL_MS) return;
  await BackupSettings.updateOne({ key: "primary" }, { $set: { lastAlertAt: new Date(now) } });
  await alertAdmins("Yedek güncel değil", [
    settings.lastSuccessAt
      ? `Son başarılı yedek: ${settings.lastSuccessAt.toISOString()}`
      : "Henüz başarılı bir yedek alınmadı.",
    "Yönetim panelindeki Yedekler sayfasından durumu kontrol edin.",
  ]);
}

const POLL_MS = 60 * 1000;
const STALE_MS = 2 * 60 * 60 * 1000;

function istanbulDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

async function queueScheduledBackup() {
  if (await BackupJob.exists({ status: { $in: ["queued", "running"] } })) return;
  const now = istanbulDateParts();
  const settings = await BackupSettings.findOneAndUpdate(
    {
      key: "primary",
      enabled: true,
      tokenEncrypted: { $ne: "" },
      recoveryKitVerifiedAt: { $ne: null },
      dailyTime: { $lte: now.time },
      lastScheduledOn: { $ne: now.date },
    },
    { $set: { lastScheduledOn: now.date } },
    { new: true }
  );
  if (settings) {
    try {
      await BackupJob.create({ kind: "backup", status: "queued" });
    } catch (error) {
      await BackupSettings.updateOne({ key: "primary", lastScheduledOn: now.date }, { $set: { lastScheduledOn: "" } });
      throw error;
    }
  }
}

async function ensureNoActiveJob() {
  const existing = await BackupJob.exists({ status: { $in: ["queued", "running"] } });
  if (existing) {
    const error = new Error("Devam eden bir yedekleme veya geri yükleme var.");
    error.statusCode = 409;
    throw error;
  }
}

async function queueBackup(requestedBy) {
  await ensureNoActiveJob();
  return BackupJob.create({ kind: "backup", requestedBy, status: "queued" });
}

async function queuePreview(snapshotId, requestedBy) {
  await ensureNoActiveJob();
  return BackupJob.create({ kind: "preview", requestedBy, snapshotId, status: "queued" });
}

async function queueRestore(previewId, requestedBy) {
  await ensureNoActiveJob();
  const preview = await BackupJob.findOne({
    _id: previewId,
    kind: "preview",
    status: "completed",
    completedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  if (!preview?.detail?.report?.currentFingerprint) {
    const error = new Error("Geçerli bir etki raporu bulunamadı. Önce önizleme oluşturun.");
    error.statusCode = 409;
    throw error;
  }
  return BackupJob.create({
    kind: "restore",
    requestedBy,
    snapshotId: preview.snapshotId,
    previewId: preview._id,
    expectedFingerprint: preview.detail.report.currentFingerprint,
    status: "queued",
  });
}

async function claimJob(workerId) {
  return BackupJob.findOneAndUpdate(
    {
      $or: [
        { status: "queued" },
        { kind: { $in: ["backup", "preview"] }, status: "running", lockedAt: { $lt: new Date(Date.now() - STALE_MS) } },
      ],
    },
    { $set: { status: "running", startedAt: new Date(), lockedAt: new Date(), workerId } },
    { new: true, sort: { createdAt: 1 } }
  );
}

const STAGE_PREFIX = "oldsocks-backup-stage-";

// Medya dosyaları yayınlandıktan sonra değişmez; kopyalamak yerine sabit bağlantı
// (hard link) oluşturulur, böylece yedek sırasında disk kullanımı katlanmaz.
// Farklı dosya sistemindeyse eskisi gibi kopyalanır.
async function linkTree(source, target) {
  // Hedef her durumda oluşur: doğrulama üç klasörün de var olmasını bekler.
  await fs.mkdir(target, { recursive: true, mode: 0o700 });
  let entries;
  try {
    entries = await fs.readdir(source, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await linkTree(from, to);
    } else if (entry.isFile()) {
      try {
        await fs.link(from, to);
      } catch (error) {
        if (!["EXDEV", "EPERM", "ENOTSUP"].includes(error.code)) throw error;
        await fs.copyFile(from, to, fs.constants.COPYFILE_EXCL);
      }
    }
  }
}

// Süreç yedek sırasında ölürse geride kalan geçici klasörleri temizle.
async function removeStaleStages() {
  const tmp = os.tmpdir();
  const entries = await fs.readdir(tmp).catch(() => []);
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const name of entries) {
    if (!name.startsWith(STAGE_PREFIX)) continue;
    const full = path.join(tmp, name);
    const stat = await fs.stat(full).catch(() => null);
    if (stat && stat.mtimeMs < cutoff) await fs.rm(full, { recursive: true, force: true });
  }
}

async function createStage() {
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), STAGE_PREFIX));
  await fs.chmod(stage, 0o700);
  const databasePath = path.join(stage, "mongodb.ejson.gz");
  try {
    const database = await writeDatabaseArchive(mongoose.connection.db, databasePath);
    for (const folder of ["assets", "trash", "quarantine"]) {
      await linkTree(directoryPath(folder), path.join(stage, "media", folder));
    }
    const archive = await readDatabaseArchive(databasePath);
    const tree = await verifyMediaTree(stage);
    const media = { ...(await verifyMediaInStage(archive, stage)), ...tree };
    const protectedAssetIds = (archive.collections.find((item) => item.name === "mediaassets")?.documents || [])
      .filter((asset) => asset.status === "ready")
      .map((asset) => asset._id);
    return { stage, database, media, protectedAssetIds };
  } catch (error) {
    await fs.rm(stage, { recursive: true, force: true });
    throw error;
  }
}

function parseBackupSummary(output) {
  const messages = String(output).split("\n").filter(Boolean);
  const summary = messages.map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).findLast((message) => message?.message_type === "summary");
  if (!summary?.snapshot_id || !/^[a-f0-9]{8,64}$/.test(summary.snapshot_id)) {
    throw new Error("Backup snapshot confirmation missing");
  }
  return summary;
}

async function uploadStage(settings, stage, tag) {
  return withRuntime(settings, async (runtime) => {
      await ensureRepository(runtime);
      const output = await restic(
        ["backup", "--json", "--group-by", "", "--tag", tag, stage],
        runtime,
        { timeoutMs: 2 * 60 * 60 * 1000 }
      );
      const confirmed = parseBackupSummary(output);
      await restic(["check"], runtime, { timeoutMs: 60 * 60 * 1000 });
      if (tag === "oldsocks-production") {
        try {
          await restic([
            "forget", "--tag", "oldsocks-production", "--group-by", "",
            "--keep-daily", "30", "--keep-weekly", "8", "--keep-monthly", "12", "--prune",
          ], runtime, { timeoutMs: 2 * 60 * 60 * 1000 });
        } catch (error) {
          console.error("Backup retention failed:", error?.code || error?.name || "Error");
          confirmed.retentionWarning = "RETENTION_FAILED";
        }
      }
      return confirmed;
  });
}

async function runBackup(job) {
  const settings = await BackupSettings.findOne({ key: "primary" }).select(SETTINGS_SELECT);
  if (!settings?.tokenEncrypted || !settings.recoveryKitVerifiedAt) {
    throw new Error("Drive connection or recovery kit is missing");
  }
  const snapshot = await createStage();
  try {
    const summary = await uploadStage(settings, snapshot.stage, "oldsocks-production");
    await MediaAsset.updateMany(
      { _id: { $in: snapshot.protectedAssetIds }, status: "ready" },
      { $set: { "backup.status": "protected", "backup.protectedAt": new Date(), "backup.lastError": "" } }
    );
    await Promise.all([
      BackupJob.updateOne(
        { _id: job._id, workerId: job.workerId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            lockedAt: null,
            snapshotId: summary.snapshot_id,
            detail: {
              database: snapshot.database,
              media: snapshot.media,
              filesNew: summary.files_new || 0,
              dataAdded: summary.data_added || 0,
              retentionWarning: summary.retentionWarning || "",
            },
          },
        }
      ),
      BackupSettings.updateOne(
        { key: "primary" },
        {
          $set: {
            lastSuccessAt: new Date(),
            lastSnapshotId: summary.snapshot_id,
            lastError: summary.retentionWarning ? "Yedek alındı; eski sürümleri temizleme işlemi başarısız oldu." : "",
            ...(summary.retentionWarning ? { lastErrorAt: new Date() } : {}),
          },
        }
      ),
    ]);
  } finally {
    await fs.rm(snapshot.stage, { recursive: true, force: true });
  }
}

async function runPreview(job) {
  const settings = await BackupSettings.findOne({ key: "primary" }).select(SETTINGS_SELECT);
  if (!settings?.tokenEncrypted) throw new Error("Drive connection is missing");
  const report = await getSnapshot(settings, job.snapshotId, async ({ archive, media }) =>
    impactReport(archive, media)
  );
  await BackupJob.updateOne(
    { _id: job._id, workerId: job.workerId },
    { $set: { status: "completed", completedAt: new Date(), lockedAt: null, detail: { report } } }
  );
}

async function runRestore(job) {
  const settings = await BackupSettings.findOne({ key: "primary" }).select(SETTINGS_SELECT);
  if (!settings?.tokenEncrypted || !settings.recoveryKitVerifiedAt) {
    throw new Error("Drive connection or recovery kit is missing");
  }
  await getSnapshot(settings, job.snapshotId, async ({ archive, media, restored }) => {
    const report = await impactReport(archive, media);
    if (report.currentFingerprint !== job.expectedFingerprint) {
      const error = new Error("Katalog önizlemeden sonra değişti. Raporu yeniden hazırlayın.");
      error.code = "CATALOG_CHANGED";
      throw error;
    }
    const safety = await createStage();
    let safetySnapshotId;
    try {
      const summary = await uploadStage(settings, safety.stage, "oldsocks-pre-restore");
      safetySnapshotId = summary.snapshot_id;
      await BackupJob.updateOne({ _id: job._id, workerId: job.workerId }, {
        $set: { detail: { safetySnapshotId, report } },
      });
    } finally {
      await fs.rm(safety.stage, { recursive: true, force: true });
    }
    let copiedFiles = 0;
    for (const folder of ["assets", "trash", "quarantine"]) {
      copiedFiles += await copyMissingMedia(path.join(restored, "media", folder), directoryPath(folder));
    }
    await applyCatalog(archive, job.expectedFingerprint);
    await BackupJob.updateOne({ _id: job._id, workerId: job.workerId }, {
      $set: {
        status: "completed",
        completedAt: new Date(),
        lockedAt: null,
        detail: { safetySnapshotId, copiedFiles, report },
      },
    });
  });
}

function startBackupWorker() {
  const workerId = crypto.randomUUID();
  let stopped = false;
  let timer;
  let runningPromise;
  async function tick() {
    if (stopped) return;
    try {
      await BackupJob.updateMany(
        { kind: "restore", status: "running", lockedAt: { $lt: new Date(Date.now() - STALE_MS) } },
        { $set: { status: "failed", completedAt: new Date(), lockedAt: null, errorCode: "INTERRUPTED_RESTORE" } }
      );
      await queueScheduledBackup();
      await alertIfBackupStale();
      const job = await claimJob(workerId);
      if (job) {
        const heartbeat = setInterval(() => {
          BackupJob.updateOne({ _id: job._id, workerId, status: "running" }, { $set: { lockedAt: new Date() } })
            .catch((error) => console.error("Backup heartbeat failed:", error?.code || error?.name || "Error"));
        }, 30 * 1000);
        try {
          if (job.kind === "backup") await runBackup(job);
          else if (job.kind === "preview") await runPreview(job);
          else if (job.kind === "restore") await runRestore(job);
        } catch (error) {
          console.error("Backup job failed:", error?.code || error?.name || "Error");
          const errorCode = String(error?.code || "BACKUP_FAILED").slice(0, 80);
          alertAdmins(`${JOB_LABELS[job.kind] || "Yedek işi"} başarısız oldu`, [
            `İş: ${job.kind} (${String(job._id)})`,
            `Hata kodu: ${errorCode}`,
            "Yönetim panelindeki Yedekler sayfasından ayrıntıya bakın.",
          ]);
          await Promise.all([
            BackupJob.updateOne(
              { _id: job._id, workerId },
              {
                $set: {
                  status: "failed",
                  completedAt: new Date(),
                  lockedAt: null,
                  errorCode: String(error?.code || "BACKUP_FAILED").slice(0, 80),
                },
              }
            ),
            ...(job.kind === "backup" ? [BackupSettings.updateOne(
              { key: "primary" },
              { $set: { lastErrorAt: new Date(), lastError: `Yedekleme başarısız oldu (${String(error?.code || "BACKUP_FAILED").slice(0, 80)}).` } }
            )] : []),
          ]);
        } finally {
          clearInterval(heartbeat);
        }
      }
    } catch (error) {
      console.error("Backup worker tick failed:", error?.code || error?.name || "Error");
    } finally {
      if (!stopped) timer = setTimeout(() => { runningPromise = tick(); }, POLL_MS);
    }
  }
  removeStaleStages().catch((error) => console.error("Backup stage cleanup failed:", error?.code || "Error"));
  timer = setTimeout(() => { runningPromise = tick(); }, 5000);
  return { async stop() { stopped = true; clearTimeout(timer); await runningPromise; } };
}

module.exports = { alertIfBackupStale, linkTree, istanbulDateParts, queueBackup, queuePreview, queueRestore, startBackupWorker };
