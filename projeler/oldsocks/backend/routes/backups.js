const express = require("express");
const bcrypt = require("bcrypt");
const { rateLimit } = require("express-rate-limit");
const User = require("../models/User");
const BackupJob = require("../models/BackupJob");
const BackupSettings = require("../models/BackupSettings");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { binaryStatus, connectionValues, rcloneConfig, REPOSITORY, restic, withRuntime } = require("../services/backups/commands");
const { queueBackup, queuePreview, queueRestore } = require("../services/backups/jobs");
const { makeRecoveryKit, masterKey, openRecoveryKit } = require("../services/backups/secrets");
const {
  SETTINGS_SELECT,
  adminUrl,
  callbackUri,
  configureClient,
  finishConnection,
  getSettings,
  startConnection,
} = require("../services/backups/googleOAuth");

const router = express.Router();
const sensitiveLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false });

router.get("/google/callback", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.query.error || !req.query.code) return res.redirect(adminUrl("cancelled"));
    await finishConnection({ state: req.query.state, code: req.query.code });
    return res.redirect(adminUrl("connected"));
  } catch (error) {
    console.error("Google backup OAuth callback failed:", error?.name || "Error");
    return res.redirect(adminUrl("error"));
  }
});

router.use(verifyToken, allowRoles("admin"));
router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

router.get("/status", async (_req, res, next) => {
  try {
    const [settings, binaries, latestJob] = await Promise.all([
      getSettings(),
      binaryStatus(),
      BackupJob.findOne().sort({ createdAt: -1 }).lean(),
    ]);
    res.json({
      clientConfigured: Boolean(settings?.clientIdEncrypted && settings?.clientSecretEncrypted),
      connected: Boolean(settings?.tokenEncrypted),
      connectedAt: settings?.connectedAt || null,
      recoveryKitVerifiedAt: settings?.recoveryKitVerifiedAt || null,
      enabled: Boolean(settings?.enabled),
      dailyTime: settings?.dailyTime || "02:00",
      lastSuccessAt: settings?.lastSuccessAt || null,
      lastSnapshotId: settings?.lastSnapshotId || "",
      lastErrorAt: settings?.lastErrorAt || null,
      lastError: settings?.lastError || "",
      binaries,
      latestJob,
      callbackUri: callbackUri(),
    });
  } catch (error) { next(error); }
});

router.post("/google/client", sensitiveLimiter, async (req, res, next) => {
  try {
    await configureClient(req.body?.clientId, req.body?.clientSecret);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.post("/google/connect", sensitiveLimiter, async (req, res, next) => {
  try { res.json({ url: await startConnection(req.user.userId) }); }
  catch (error) { next(error); }
});

router.post("/recovery-kit", sensitiveLimiter, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !(await bcrypt.compare(String(req.body?.adminPassword || ""), user.password))) {
      return res.status(403).json({ message: "Yönetici parolası hatalı." });
    }
    const settings = await getSettings();
    const values = await connectionValues(settings);
    const kit = await makeRecoveryKit(
      {
        version: 1,
        createdAt: new Date().toISOString(),
        repository: REPOSITORY,
        rcloneConfig: rcloneConfig(values),
        resticPassword: values.password,
        masterKey: (await masterKey()).toString("base64"),
      },
      req.body?.passphrase
    );
    await BackupSettings.updateOne({ key: "primary" }, { $set: { recoveryKitVerifiedAt: null, enabled: false } });
    res.setHeader("Content-Disposition", 'attachment; filename="oldsocks-kurtarma-kiti.json"');
    res.type("application/json").send(JSON.stringify(kit, null, 2));
  } catch (error) { next(error); }
});

router.post("/recovery-kit/verify", sensitiveLimiter, async (req, res, next) => {
  try {
    const payload = await openRecoveryKit(req.body?.kit, req.body?.passphrase);
    const values = await connectionValues(await getSettings());
    const expected = {
      repository: REPOSITORY,
      rcloneConfig: rcloneConfig(values),
      resticPassword: values.password,
      masterKey: (await masterKey()).toString("base64"),
    };
    if (Object.entries(expected).some(([key, value]) => payload[key] !== value)) {
      return res.status(409).json({ message: "Bu kit geçerli Drive bağlantısına ait değil. Yeni kiti indirin." });
    }
    const verifiedAt = new Date();
    await BackupSettings.updateOne({ key: "primary" }, { $set: { recoveryKitVerifiedAt: verifiedAt } });
    res.json({ verifiedAt });
  } catch (error) {
    if (error?.statusCode) return next(error);
    res.status(400).json({ message: "Kit veya parola doğrulanamadı." });
  }
});

router.patch("/settings", async (req, res, next) => {
  try {
    const dailyTime = req.body?.dailyTime;
    const enabled = req.body?.enabled;
    if (typeof dailyTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(dailyTime) || typeof enabled !== "boolean") {
      return res.status(400).json({ message: "Geçersiz yedekleme ayarı." });
    }
    const settings = await BackupSettings.findOne({ key: "primary" }).select(SETTINGS_SELECT);
    if (!settings) return res.status(409).json({ message: "Önce Google Drive bağlantısını kurun." });
    if (enabled) {
      const binaries = await binaryStatus();
      if (!settings.tokenEncrypted || !settings.recoveryKitVerifiedAt || !binaries.rclone || !binaries.restic) {
        return res.status(409).json({ message: "Bağlantı, kurtarma kiti ve sunucu araçları tamamlanmalı." });
      }
    }
    settings.dailyTime = dailyTime;
    settings.enabled = enabled;
    await settings.save();
    res.json({ enabled, dailyTime });
  } catch (error) { next(error); }
});

router.post("/runs", async (req, res, next) => {
  try {
    const settings = await getSettings();
    const binaries = await binaryStatus();
    if (!settings?.tokenEncrypted || !settings.recoveryKitVerifiedAt || !binaries.rclone || !binaries.restic) {
      return res.status(409).json({ message: "Bağlantı, kurtarma kiti ve sunucu araçları tamamlanmalı." });
    }
    const job = await queueBackup(req.user.userId);
    res.status(202).json({ id: job.id, status: job.status });
  } catch (error) { next(error); }
});

router.get("/runs", async (_req, res, next) => {
  try {
    const jobs = await BackupJob.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .select("kind status snapshotId startedAt completedAt errorCode detail createdAt")
      .lean();
    res.json(jobs);
  } catch (error) { next(error); }
});

router.get("/snapshots", async (_req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.tokenEncrypted) return res.json([]);
    const snapshots = await withRuntime(settings, async (runtime) =>
      JSON.parse(await restic(["snapshots", "--json"], runtime, { timeoutMs: 2 * 60 * 1000 }))
    );
    res.json(snapshots.filter((item) => item.tags?.some((tag) => ["oldsocks-production", "oldsocks-pre-restore"].includes(tag))).map((item) => ({
      id: item.id,
      time: item.time,
      paths: item.paths,
      tags: item.tags,
    })).sort((left, right) => new Date(right.time) - new Date(left.time)));
  } catch (error) { next(error); }
});

router.post("/previews", sensitiveLimiter, async (req, res, next) => {
  try {
    const snapshotId = String(req.body?.snapshotId || "");
    if (!/^[a-f0-9]{64}$/.test(snapshotId)) {
      return res.status(400).json({ message: "Geçersiz yedek kimliği." });
    }
    const job = await queuePreview(snapshotId, req.user.userId);
    res.status(202).json({ id: job.id, status: job.status });
  } catch (error) { next(error); }
});

router.get("/jobs/:id", async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(String(req.params.id))) {
      return res.status(400).json({ message: "Geçersiz işlem kimliği." });
    }
    const job = await BackupJob.findById(req.params.id)
      .select("kind status snapshotId startedAt completedAt errorCode detail createdAt")
      .lean();
    if (!job) return res.status(404).json({ message: "İşlem bulunamadı." });
    res.json(job);
  } catch (error) { next(error); }
});

router.post("/restores", sensitiveLimiter, async (req, res, next) => {
  try {
    if (req.body?.confirmation !== "KATALOGU GERI YUKLE") {
      return res.status(400).json({ message: "Onay metni eşleşmiyor." });
    }
    const previewId = String(req.body?.previewId || "");
    if (!/^[a-f0-9]{24}$/i.test(previewId)) {
      return res.status(400).json({ message: "Geçersiz etki raporu." });
    }
    const user = await User.findById(req.user.userId);
    if (!user || !(await bcrypt.compare(String(req.body?.adminPassword || ""), user.password))) {
      return res.status(403).json({ message: "Yönetici parolası hatalı." });
    }
    const job = await queueRestore(previewId, req.user.userId);
    res.status(202).json({ id: job.id, status: job.status });
  } catch (error) { next(error); }
});

module.exports = router;
