const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");
const { decrypt } = require("./secrets");

const execFileAsync = promisify(execFile);
const REMOTE_NAME = "oldsocks_drive";
const REPOSITORY = `rclone:${REMOTE_NAME}:OLDSOCKS-Backups/restic`;
let binaryCache = { checkedAt: 0, value: null, pending: null };

async function run(binary, args, options = {}) {
  const result = await execFileAsync(binary, args, {
    env: options.env || process.env,
    timeout: options.timeoutMs || 30 * 60 * 1000,
    // restic --json uzun işlerde çok satır üretebilir; tampon dolarsa iş öldürülür.
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    cwd: options.cwd,
  });
  return result.stdout;
}

async function binaryStatus() {
  if (binaryCache.value && Date.now() - binaryCache.checkedAt < 60 * 1000) return binaryCache.value;
  if (!binaryCache.pending) {
    binaryCache.pending = Promise.allSettled([
      run("rclone", ["version"], { timeoutMs: 5000 }),
      run("restic", ["version"], { timeoutMs: 5000 }),
    ]).then((checks) => {
      binaryCache = {
        checkedAt: Date.now(),
        value: { rclone: checks[0].status === "fulfilled", restic: checks[1].status === "fulfilled" },
        pending: null,
      };
      return binaryCache.value;
    }).catch((error) => { binaryCache.pending = null; throw error; });
  }
  return binaryCache.pending;
}

async function connectionValues(settings) {
  if (!settings?.tokenEncrypted) throw new Error("Google Drive is not connected");
  const [clientId, clientSecret, token, password] = await Promise.all([
    decrypt(settings.clientIdEncrypted),
    decrypt(settings.clientSecretEncrypted),
    decrypt(settings.tokenEncrypted),
    decrypt(settings.resticPasswordEncrypted),
  ]);
  if (
    !/^[A-Za-z0-9_.-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
    !/^[A-Za-z0-9_-]+$/.test(clientSecret) ||
    !token?.refresh_token ||
    typeof password !== "string"
  ) {
    throw new Error("Backup connection settings are invalid");
  }
  return { clientId, clientSecret, token, password };
}

function rcloneConfig({ clientId, clientSecret, token }) {
  return `[${REMOTE_NAME}]\ntype = drive\nclient_id = ${clientId}\nclient_secret = ${clientSecret}\nscope = drive.file\ntoken = ${JSON.stringify(token)}\n`;
}

async function withRuntime(settings, action) {
  const values = await connectionValues(settings);
  const runtime = await fs.mkdtemp(path.join(os.tmpdir(), "oldsocks-backup-runtime-"));
  await fs.chmod(runtime, 0o700);
  const configPath = path.join(runtime, "rclone.conf");
  const passwordPath = path.join(runtime, "restic-password");
  try {
    await Promise.all([
      fs.writeFile(configPath, rcloneConfig(values), { mode: 0o600, flag: "wx" }),
      fs.writeFile(passwordPath, `${values.password}\n`, { mode: 0o600, flag: "wx" }),
    ]);
    const env = {
      ...process.env,
      RCLONE_CONFIG: configPath,
      RESTIC_PASSWORD_FILE: passwordPath,
      RESTIC_CACHE_DIR: path.resolve(runtime, "cache"),
      // --json ilerleme durumunu dakikada bir yazsın (varsayılan saniyede 60).
      RESTIC_PROGRESS_FPS: "0.016",
    };
    return await action({ env, repository: REPOSITORY, values });
  } finally {
    await fs.rm(runtime, { recursive: true, force: true });
  }
}

async function restic(args, runtime, options = {}) {
  return run("restic", ["--repo", runtime.repository, ...args], {
    env: runtime.env,
    timeoutMs: options.timeoutMs || 60 * 60 * 1000,
  });
}

async function ensureRepository(runtime) {
  try {
    await restic(["snapshots", "--json"], runtime, { timeoutMs: 2 * 60 * 1000 });
  } catch (error) {
    // `init` refuses to overwrite a repository. Authentication and network
    // failures still fail here, leaving any existing repository untouched.
    await restic(["init"], runtime, { timeoutMs: 5 * 60 * 1000 });
  }
}

function newResticPassword() {
  return crypto.randomBytes(32).toString("base64url");
}

module.exports = {
  REPOSITORY,
  binaryStatus,
  connectionValues,
  ensureRepository,
  newResticPassword,
  rcloneConfig,
  restic,
  run,
  withRuntime,
};
