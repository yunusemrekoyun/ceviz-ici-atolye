#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../services/backups/commands");
const { openRecoveryKit } = require("../services/backups/secrets");
const { readDatabaseArchive } = require("../services/backups/database");
const { verifyMediaInStage, verifyMediaTree } = require("../services/backups/media");

async function hiddenPrompt() {
  if (!process.stdin.isTTY) throw new Error("Parola girişi için terminal gerekli.");
  process.stdout.write("Kurtarma kiti parolası: ");
  let value = "";
  process.stdin.setRawMode(true);
  process.stdin.resume();
  try {
    return await new Promise((resolve, reject) => {
      function onData(chunk) {
        for (const character of chunk.toString("utf8")) {
          if (character === "\r" || character === "\n") {
            process.stdin.off("data", onData);
            process.stdout.write("\n");
            resolve(value);
            return;
          }
          if (character === "\u0003") {
            process.stdin.off("data", onData);
            reject(new Error("İptal edildi."));
            return;
          }
          if (character === "\u007f") value = value.slice(0, -1);
          else value += character;
        }
      }
      process.stdin.on("data", onData);
    });
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

async function main() {
  const [mode, kitFile, snapshotId, outputDir] = process.argv.slice(2);
  if (!["list", "extract"].includes(mode) || !kitFile ||
      (mode === "extract" && (!/^[a-f0-9]{64}$/.test(snapshotId || "") || !outputDir))) {
    throw new Error("Kullanım: node recoverFromDrive.js list KIT.json | extract KIT.json SNAPSHOT_ID BOS_KLASOR");
  }
  const kit = JSON.parse(await fs.readFile(path.resolve(kitFile), "utf8"));
  const payload = await openRecoveryKit(kit, await hiddenPrompt());
  const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "oldsocks-recovery-"));
  await fs.chmod(runtime, 0o700);
  try {
    const config = path.join(runtime, "rclone.conf");
    const password = path.join(runtime, "restic-password");
    await fs.writeFile(config, payload.rcloneConfig, { mode: 0o600 });
    await fs.writeFile(password, `${payload.resticPassword}\n`, { mode: 0o600 });
    const env = { ...process.env, RCLONE_CONFIG: config, RESTIC_PASSWORD_FILE: password, RESTIC_CACHE_DIR: path.join(runtime, "cache") };
    const command = (args) => run("restic", ["--repo", payload.repository, ...args], { env, timeoutMs: 2 * 60 * 60 * 1000 });
    const snapshots = JSON.parse(await command(["snapshots", "--json"]));
    const allowed = snapshots.filter((item) => item.tags?.some((tag) => ["oldsocks-production", "oldsocks-pre-restore"].includes(tag)))
      .sort((left, right) => new Date(right.time) - new Date(left.time));
    if (mode === "list") {
      for (const item of allowed) console.log(`${item.id}  ${item.time}`);
      return;
    }
    const selected = allowed.find((item) => item.id === snapshotId);
    if (!selected || selected.paths?.length !== 1 || !path.isAbsolute(selected.paths[0]) ||
        selected.paths[0].split(path.sep).includes("..") ||
        !/^oldsocks-backup-stage-[A-Za-z0-9_-]+$/.test(path.basename(selected.paths[0]))) {
      throw new Error("Seçilen yedek bulunamadı veya biçimi geçersiz.");
    }
    const target = path.resolve(outputDir);
    await fs.mkdir(target, { mode: 0o700 });
    if ((await fs.readdir(target)).length) throw new Error("Hedef klasör boş olmalı.");
    const restoredRoot = path.join(runtime, "restore");
    await fs.mkdir(restoredRoot, { mode: 0o700 });
    await command(["restore", snapshotId, "--target", restoredRoot]);
    const source = path.join(restoredRoot, selected.paths[0].slice(1));
    const archive = await readDatabaseArchive(path.join(source, "mongodb.ejson.gz"));
    await verifyMediaTree(source);
    await verifyMediaInStage(archive, source);
    await fs.copyFile(path.join(source, "mongodb.ejson.gz"), path.join(target, "mongodb.ejson.gz"));
    await fs.cp(path.join(source, "media"), path.join(target, "media"), { recursive: true, errorOnExist: true });
    await fs.writeFile(path.join(target, "master.key"), Buffer.from(payload.masterKey, "base64"), { mode: 0o600 });
    console.log(`Yedek açıldı: ${target}`);
    console.log("Aktarmak için RECOVERY_MONGODB_URI ve RECOVERY_MEDIA_ROOT ayarlayıp importRecoveredBackup.js çalıştırın.");
  } finally {
    await fs.rm(runtime, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Kurtarma başarısız: ${error.message}`);
  process.exitCode = 1;
});
