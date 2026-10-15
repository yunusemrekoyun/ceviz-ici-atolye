const crypto = require("node:crypto");
const BackupOAuthState = require("../../models/BackupOAuthState");
const BackupSettings = require("../../models/BackupSettings");
const { decrypt, encrypt, ensureMasterKey } = require("./secrets");
const { newResticPassword } = require("./commands");

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const SETTINGS_SELECT =
  "+clientIdEncrypted +clientSecretEncrypted +tokenEncrypted +resticPasswordEncrypted";

function callbackUri() {
  const base = String(process.env.BACKEND_PUBLIC_URL || "").replace(/\/+$/, "");
  if (!base || (process.env.NODE_ENV === "production" && !base.startsWith("https://"))) {
    throw new Error("BACKEND_PUBLIC_URL must be configured for Google Drive");
  }
  return `${base}/api/v1/backups/google/callback`;
}

function adminUrl(result) {
  const origin = String(process.env.FRONTEND_ORIGIN || "").split(",")[0].trim();
  if (!origin) throw new Error("FRONTEND_ORIGIN must be configured for Google Drive");
  const url = new URL("/admin/backups", origin);
  url.searchParams.set("google", result);
  return url.toString();
}

async function getSettings() {
  return BackupSettings.findOne({ key: "primary" }).select(SETTINGS_SELECT);
}

async function configureClient(clientId, clientSecret) {
  const id = String(clientId || "").trim();
  const secret = String(clientSecret || "").trim();
  if (!/^[A-Za-z0-9_.-]+\.apps\.googleusercontent\.com$/.test(id)) {
    const error = new Error("Geçerli bir Google OAuth istemci kimliği girin.");
    error.statusCode = 400;
    throw error;
  }
  if (!/^[A-Za-z0-9_-]{8,256}$/.test(secret)) {
    const error = new Error("Geçerli bir Google OAuth istemci gizlisi girin.");
    error.statusCode = 400;
    throw error;
  }
  const existing = await getSettings();
  if (existing?.tokenEncrypted) {
    const error = new Error("Bağlı Drive hesabının istemcisi değiştirilemez.");
    error.statusCode = 409;
    throw error;
  }
  // İlk kurulum: henüz şifrelenmiş hiçbir ayar yoksa anahtarı oluştur.
  if (!existing?.clientIdEncrypted && !existing?.resticPasswordEncrypted) {
    await ensureMasterKey();
  }
  const encrypted = await Promise.all([
    encrypt(id),
    encrypt(secret),
    existing?.resticPasswordEncrypted || encrypt(newResticPassword()),
  ]);
  await BackupSettings.findOneAndUpdate(
    { key: "primary" },
    {
      $set: {
        clientIdEncrypted: encrypted[0],
        clientSecretEncrypted: encrypted[1],
        resticPasswordEncrypted: encrypted[2],
      },
      $setOnInsert: { key: "primary" },
    },
    { upsert: true, new: true }
  );
}

async function startConnection(adminId) {
  const settings = await getSettings();
  if (!settings?.clientIdEncrypted || !settings?.clientSecretEncrypted) {
    const error = new Error("Önce Google OAuth istemcisini kaydedin.");
    error.statusCode = 409;
    throw error;
  }
  const state = crypto.randomBytes(32).toString("base64url");
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  await BackupOAuthState.create({
    stateHash,
    requestedBy: adminId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", await decrypt(settings.clientIdEncrypted));
  url.searchParams.set("redirect_uri", callbackUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function finishConnection({ state, code }) {
  if (typeof state !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(state)) {
    throw new Error("Invalid OAuth state");
  }
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  const pending = await BackupOAuthState.findOneAndDelete({
    stateHash,
    expiresAt: { $gt: new Date() },
  });
  if (!pending || typeof code !== "string" || !code) {
    throw new Error("Expired or invalid OAuth response");
  }
  const settings = await getSettings();
  if (!settings?.clientIdEncrypted || !settings?.clientSecretEncrypted) {
    throw new Error("OAuth client is not configured");
  }
  const clientId = await decrypt(settings.clientIdEncrypted);
  const clientSecret = await decrypt(settings.clientSecretEncrypted);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`OAuth token exchange failed (${response.status})`);
  const result = await response.json();
  const refreshToken = result.refresh_token;
  if (!refreshToken || !result.access_token) {
    throw new Error("Google did not issue an offline refresh token");
  }
  const token = {
    access_token: result.access_token,
    token_type: result.token_type || "Bearer",
    refresh_token: refreshToken,
    expiry: new Date(Date.now() + Number(result.expires_in || 3600) * 1000).toISOString(),
  };
  await BackupSettings.updateOne(
    { key: "primary" },
    {
      $set: {
        tokenEncrypted: await encrypt(token),
        connectedAt: new Date(),
        enabled: false,
        recoveryKitVerifiedAt: null,
        lastError: "",
      },
    }
  );
}

module.exports = {
  SETTINGS_SELECT,
  adminUrl,
  callbackUri,
  configureClient,
  finishConnection,
  getSettings,
  startConnection,
};
