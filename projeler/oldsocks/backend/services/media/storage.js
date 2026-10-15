const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { MEDIA_RUNTIME } = require("../../config/media");
const { mediaError } = require("./errors");

const DIRECTORIES = Object.freeze({
  staging: "staging",
  processing: "processing",
  assets: "assets",
  quarantine: "quarantine",
  trash: "trash",
  nginxTemp: "nginx-temp",
});

function rootPath() {
  return MEDIA_RUNTIME.root;
}

function directoryPath(name) {
  const relative = DIRECTORIES[name];
  if (!relative) throw new Error(`Unknown media directory: ${name}`);
  return path.join(rootPath(), relative);
}

function assertSafeSegment(value, label = "path") {
  const normalized = String(value || "");
  if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: `Geçersiz medya ${label} değeri.`,
    });
  }
  return normalized;
}

function resolveInside(base, ...segments) {
  const resolvedBase = path.resolve(base);
  const resolved = path.resolve(resolvedBase, ...segments);
  if (resolved !== resolvedBase && !resolved.startsWith(`${resolvedBase}${path.sep}`)) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: "Geçersiz medya dosya yolu.",
    });
  }
  return resolved;
}

function stagingKeyForSession(sessionId) {
  const id = assertSafeSegment(sessionId, "session");
  return path.posix.join(DIRECTORIES.staging, id, "source.upload");
}

function processingKeyForAsset(assetId, jobId) {
  const asset = assertSafeSegment(assetId, "asset");
  const job = assertSafeSegment(jobId, "job");
  return path.posix.join(DIRECTORIES.processing, `${asset}-${job}`);
}

function assetDirectoryKey(purpose, assetId) {
  const safePurpose = assertSafeSegment(purpose, "purpose");
  const safeAsset = assertSafeSegment(assetId, "asset");
  return path.posix.join(DIRECTORIES.assets, safePurpose, safeAsset);
}

function absolutePathForKey(key) {
  const normalized = String(key || "").split("/").filter(Boolean);
  return resolveInside(rootPath(), ...normalized);
}

function assetAbsolutePath(relativeAssetKey) {
  const normalized = String(relativeAssetKey || "").split("/").filter(Boolean);
  return resolveInside(directoryPath("assets"), ...normalized);
}

function assetPublicUrl(relativeAssetKey) {
  const encoded = String(relativeAssetKey || "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${MEDIA_RUNTIME.publicBaseUrl}/${encoded}`;
}

async function initializeMediaStorage() {
  await fsp.mkdir(rootPath(), { recursive: true, mode: 0o750 });
  await Promise.all(
    Object.keys(DIRECTORIES).map((name) =>
      fsp.mkdir(directoryPath(name), { recursive: true, mode: 0o750 })
    )
  );
}

async function ensureParent(filePath) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true, mode: 0o750 });
}

async function ensureEmptyDirectory(dirPath) {
  await fsp.rm(dirPath, { recursive: true, force: true });
  await fsp.mkdir(dirPath, { recursive: true, mode: 0o750 });
}

async function removeKey(key) {
  if (!key) return;
  await fsp.rm(absolutePathForKey(key), { recursive: true, force: true });
}

async function statOrNull(filePath) {
  try {
    return await fsp.stat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function getDiskStats() {
  await initializeMediaStorage();
  const stats = await fsp.statfs(rootPath());
  const totalBytes = Number(stats.blocks) * Number(stats.bsize);
  const availableBytes = Number(stats.bavail) * Number(stats.bsize);
  const percentReserve = MEDIA_RUNTIME.reservePercent / 100;
  const absoluteReserve = MEDIA_RUNTIME.reserveBytes;
  const baseReserveBytes = Math.max(
    Math.floor(totalBytes * percentReserve),
    absoluteReserve
  );
  return {
    totalBytes,
    availableBytes,
    baseReserveBytes,
    operationMarginBytes: MEDIA_RUNTIME.operationMarginBytes,
    root: rootPath(),
  };
}

async function atomicMoveDirectory(source, destination) {
  await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
  await fsp.rename(source, destination);
}

function createAppendStream(filePath) {
  return fs.createWriteStream(filePath, { flags: "a", mode: 0o640 });
}

module.exports = {
  DIRECTORIES,
  absolutePathForKey,
  assetAbsolutePath,
  assetDirectoryKey,
  assetPublicUrl,
  atomicMoveDirectory,
  createAppendStream,
  directoryPath,
  ensureEmptyDirectory,
  ensureParent,
  getDiskStats,
  initializeMediaStorage,
  processingKeyForAsset,
  removeKey,
  rootPath,
  stagingKeyForSession,
  statOrNull,
};
