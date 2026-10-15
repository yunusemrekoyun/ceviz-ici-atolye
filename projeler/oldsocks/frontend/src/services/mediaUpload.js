import api from "../../api";

const MIB = 1024 * 1024;
const SESSION_STORAGE_KEY = "oldscks.mediaUploadSessions.v1";
const preparedUploads = new WeakMap();
const preparationQueue = [];
const MAX_BACKGROUND_UPLOADS = 2;
let activePreparations = 0;

const PURPOSES = Object.freeze({
  product_image: { kind: "image", maxBytes: 15 * MIB },
  product_video: { kind: "video", maxBytes: 200 * MIB },
  category_image: { kind: "image", maxBytes: 15 * MIB },
  campaign_image: { kind: "image", maxBytes: 15 * MIB },
  mini_campaign_image: { kind: "image", maxBytes: 15 * MIB },
  blog_cover: { kind: "image", maxBytes: 15 * MIB },
  hero_image: { kind: "image", maxBytes: 15 * MIB },
  hero_video: { kind: "video", maxBytes: 200 * MIB },
  profile_image: { kind: "image", maxBytes: 5 * MIB },
  site_logo: { kind: "image", maxBytes: 15 * MIB },
  about_image: { kind: "image", maxBytes: 15 * MIB },
});

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm"]);
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export class MediaUploadError extends Error {
  constructor(payload = {}, fallback = "Medya yüklenemedi.") {
    super(payload.message || fallback);
    this.name = "MediaUploadError";
    this.code = payload.code || "MEDIA_INTERNAL_ERROR";
    this.details = payload.details;
    this.retryAfter = Number(payload.retryAfter || 0);
    this.requestId = payload.requestId || "";
  }
}

function errorFrom(error, fallback) {
  if (error instanceof MediaUploadError) return error;
  return new MediaUploadError(error?.response?.data || {}, fallback);
}

function fileExtension(file) {
  return String(file?.name || "").split(".").pop().toLowerCase();
}

function fileKind(file) {
  const mime = String(file?.type || "").toLowerCase();
  const extension = fileExtension(file);
  if (IMAGE_MIME_TYPES.has(mime) || IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_MIME_TYPES.has(mime) || VIDEO_EXTENSIONS.has(extension)) return "video";
  return "unknown";
}

export function validateMediaFile(file, purpose) {
  const policy = PURPOSES[purpose];
  if (!policy) throw new MediaUploadError({ message: "Geçersiz medya kullanım alanı." });
  if (!(file instanceof File) || file.size <= 0) {
    throw new MediaUploadError({ message: "Dosya okunamadı. Galeriden yeniden seçin." });
  }
  if (fileKind(file) !== policy.kind) {
    throw new MediaUploadError({
      code: "MEDIA_UNSUPPORTED_FORMAT",
      message:
        policy.kind === "image"
          ? "JPG, PNG, WebP, HEIC veya HEIF bir fotoğraf seçin."
          : "MP4, MOV veya WebM bir video seçin.",
    });
  }
  if (file.size > policy.maxBytes) {
    throw new MediaUploadError({
      code: "MEDIA_FILE_TOO_LARGE",
      message: `${file.name} izin verilen ${Math.round(policy.maxBytes / MIB)} MB sınırını aşıyor.`,
      details: { limitBytes: policy.maxBytes, actualBytes: file.size },
    });
  }
  return policy;
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveSessions(value) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Depolama engelliyse yükleme yine çalışır; yalnızca sayfa yenilemede resume kaybolur.
  }
}

function fingerprint(file, purpose) {
  return [purpose, file.name, file.size, file.lastModified].join(":");
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Yükleme iptal edildi.", "AbortError"));
      },
      { once: true }
    );
  });
}

async function withRetry(operation, options = {}) {
  const attempts = Number(options.attempts || 4);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = errorFrom(error);
      const status = error?.response?.status;
      const retryable =
        !error?.response || status === 408 || status === 429 || status >= 500;
      if (!retryable || attempt === attempts) break;
      const serverDelay = Number(lastError.retryAfter || 0) * 1000;
      await wait(Math.max(serverDelay, Math.min(8_000, 500 * 2 ** (attempt - 1))), options.signal);
    }
  }
  throw lastError;
}

async function createOrResumeSession(file, purpose, signal, forceNew = false) {
  const sessions = loadSessions();
  const key = fingerprint(file, purpose);
  const remembered = forceNew ? null : sessions[key];
  const clientUploadId = remembered?.clientUploadId || randomId();
  const response = await withRetry(
    () =>
      api.post(
        "/media/uploads",
        {
          purpose,
          fileName: file.name,
          mime: file.type || "application/octet-stream",
          bytes: file.size,
          clientUploadId,
        },
        { signal }
      ),
    { signal }
  );
  if (["cancelled", "expired", "failed"].includes(response.data.upload.status)) {
    delete sessions[key];
    saveSessions(sessions);
    if (!forceNew) return createOrResumeSession(file, purpose, signal, true);
  }
  sessions[key] = {
    clientUploadId,
    sessionId: response.data.upload.id,
    assetId: response.data.upload.assetId,
    updatedAt: Date.now(),
  };
  saveSessions(sessions);
  return { key, sessions, ...response.data };
}

async function appendChunk({ file, upload, signal, onProgress }) {
  const offset = Number(upload.receivedBytes || 0);
  const end = Math.min(file.size, offset + Number(upload.chunkBytes));
  const chunk = file.slice(offset, end);
  let response;
  try {
    response = await withRetry(
      () =>
        api.patch(`/media/uploads/${upload.id}`, chunk, {
        signal,
        timeout: 0,
        headers: {
          "Content-Type": "application/offset+octet-stream",
          "Upload-Offset": String(offset),
        },
        onUploadProgress: (event) => {
          const loaded = Math.min(chunk.size, Number(event.loaded || 0));
          onProgress?.({
            phase: "uploading",
            loadedBytes: offset + loaded,
            totalBytes: file.size,
            percent: Math.min(100, Math.round(((offset + loaded) / file.size) * 100)),
          });
        },
        }),
      { signal }
    );
  } catch (error) {
    const normalized = errorFrom(error);
    if (normalized.code !== "MEDIA_OFFSET_MISMATCH") throw normalized;
    const current = await api.get(`/media/uploads/${upload.id}`, { signal });
    return current.data;
  }
  return response.data;
}

export async function waitForMediaReady(assetId, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 15 * 60 * 1000);
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const response = await withRetry(
      () => api.get(`/media/assets/${assetId}`, { signal: options.signal }),
      { signal: options.signal }
    );
    const asset = response.data.asset;
    if (asset.status === "ready") return asset;
    if (["failed", "quarantined", "missing", "deleted"].includes(asset.status)) {
      throw new MediaUploadError(
        {
          code: asset.processing?.errorCode || "MEDIA_PROCESSING_FAILED",
          message:
            asset.processing?.errorMessage ||
            "Dosya yüklendi ancak hazırlanamadı. Dosyayı yeniden seçip deneyin.",
        },
        "Medya hazırlanamadı."
      );
    }
    options.onProgress?.({
      phase: "processing",
      loadedBytes: options.totalBytes || 0,
      totalBytes: options.totalBytes || 0,
      percent: 100,
      asset,
    });
    await wait(1_500, options.signal);
  }
  throw new MediaUploadError({
    code: "MEDIA_NOT_READY",
    message: "Dosya yüklendi ve arka planda hazırlanıyor. Biraz sonra tekrar kontrol edin.",
  });
}

async function performMediaUpload(file, purpose, options = {}) {
  validateMediaFile(file, purpose);
  options.onProgress?.({
    phase: "starting",
    loadedBytes: 0,
    totalBytes: file.size,
    percent: 0,
  });
  const state = await createOrResumeSession(file, purpose, options.signal);
  try {
    let upload = state.upload;
    let asset = state.asset || null;
    while (Number(upload.receivedBytes) < file.size && upload.status !== "completed") {
      const result = await appendChunk({
        file,
        upload,
        signal: options.signal,
        onProgress: options.onProgress,
      });
      upload = result.upload;
      asset = result.asset;
    }
    options.onProgress?.({
      phase: "processing",
      loadedBytes: file.size,
      totalBytes: file.size,
      percent: 100,
      asset,
    });
    const readyAsset =
      asset?.status === "ready"
        ? asset
        : await waitForMediaReady(upload.assetId, {
            signal: options.signal,
            onProgress: options.onProgress,
            totalBytes: file.size,
            timeoutMs: options.processingTimeoutMs,
          });
    const sessions = loadSessions();
    delete sessions[state.key];
    saveSessions(sessions);
    options.onProgress?.({
      phase: "ready",
      loadedBytes: file.size,
      totalBytes: file.size,
      percent: 100,
      asset: readyAsset,
    });
    return readyAsset;
  } catch (error) {
    const normalized = errorFrom(error);
    if (
      [
        "MEDIA_PROCESSING_FAILED",
        "MEDIA_CORRUPT",
        "MEDIA_UNSUPPORTED_FORMAT",
        "MEDIA_PRORES_UNSUPPORTED",
        "MEDIA_DURATION_EXCEEDED",
      ].includes(normalized.code)
    ) {
      const sessions = loadSessions();
      delete sessions[state.key];
      saveSessions(sessions);
    }
    throw normalized;
  }
}

function preparedTask(file, purpose, options = {}) {
  let byPurpose = preparedUploads.get(file);
  if (!byPurpose) {
    byPurpose = new Map();
    preparedUploads.set(file, byPurpose);
  }
  const existing = byPurpose.get(purpose);
  if (existing) return existing;

  const task = {
    file,
    purpose,
    listeners: new Set(),
    latestProgress: null,
    resolve: null,
    reject: null,
    promise: null,
    signal: options.signal,
  };
  task.promise = new Promise((resolve, reject) => {
    task.resolve = resolve;
    task.reject = reject;
  });
  // Dosya seçiminde sessizce başlatılan görevler form kapatılsa bile unhandled rejection üretmez.
  task.promise.catch(() => {});
  byPurpose.set(purpose, task);
  preparationQueue.push(task);
  pumpPreparationQueue();
  return task;
}

function pumpPreparationQueue() {
  while (activePreparations < MAX_BACKGROUND_UPLOADS && preparationQueue.length) {
    const task = preparationQueue.shift();
    activePreparations += 1;
    performMediaUpload(task.file, task.purpose, {
      signal: task.signal,
      onProgress: (progress) => {
        task.latestProgress = progress;
        task.listeners.forEach((listener) => listener(progress));
      },
    })
      .then(task.resolve, (error) => {
        const byPurpose = preparedUploads.get(task.file);
        if (byPurpose?.get(task.purpose) === task) byPurpose.delete(task.purpose);
        task.reject(error);
      })
      .finally(() => {
        activePreparations -= 1;
        pumpPreparationQueue();
      });
  }
}

function subscribeToPreparedTask(task, options = {}) {
  const listener = options.onProgress;
  if (listener) {
    task.listeners.add(listener);
    if (task.latestProgress) listener(task.latestProgress);
  }
  return task.promise.finally(() => {
    if (listener) task.listeners.delete(listener);
  });
}

export function startMediaPreparation(file, purpose) {
  validateMediaFile(file, purpose);
  preparedTask(file, purpose);
}

export function uploadMediaFile(file, purpose, options = {}) {
  validateMediaFile(file, purpose);
  return subscribeToPreparedTask(preparedTask(file, purpose, options), options);
}

export async function uploadMediaFiles(files, purpose, options = {}) {
  const list = Array.from(files || []);
  const results = new Array(list.length);
  let cursor = 0;
  const concurrency = Math.min(Math.max(1, Number(options.concurrency || 2)), 3);
  async function worker() {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await uploadMediaFile(list[index], purpose, {
        ...options,
        onProgress: (progress) => options.onProgress?.(progress, index, list[index]),
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return results;
}

export function mediaErrorMessage(error, fallback = "Medya işlemi tamamlanamadı.") {
  const normalized = errorFrom(error, fallback);
  return normalized.requestId
    ? `${normalized.message} (Destek kodu: ${normalized.requestId})`
    : normalized.message || fallback;
}

export { PURPOSES as MEDIA_PURPOSES };
