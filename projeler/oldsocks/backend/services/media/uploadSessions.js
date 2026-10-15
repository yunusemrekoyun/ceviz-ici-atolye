const fsp = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");
const MediaAsset = require("../../models/MediaAsset");
const MediaProcessingJob = require("../../models/MediaProcessingJob");
const MediaUploadSession = require("../../models/MediaUploadSession");
const {
  MEDIA_KINDS,
  MEDIA_RUNTIME,
  getPurposePolicy,
} = require("../../config/media");
const { mediaError } = require("./errors");
const {
  absolutePathForKey,
  directoryPath,
  ensureParent,
  getDiskStats,
  stagingKeyForSession,
  statOrNull,
} = require("./storage");
const { fileSize, inspectFileType } = require("./fileInspection");

const ACTIVE_UPLOAD_STATUSES = ["reserved", "uploading"];
const TEN_MINUTES_MS = 10 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function normalizeFileName(value) {
  const base = path.basename(String(value || "").trim()).replace(/[\u0000-\u001f]/g, "");
  if (!base) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: "Dosya adı alınamadı. Dosyayı yeniden seçin.",
    });
  }
  return base.slice(0, 240);
}

function normalizeExpectedBytes(value) {
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: "Dosya boyutu okunamadı. Dosyayı yeniden seçin.",
    });
  }
  return bytes;
}

function normalizeClientUploadId(value) {
  const id = String(value || "").trim();
  if (!id) return "";
  if (!/^[a-zA-Z0-9._-]{8,100}$/.test(id)) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: "Yükleme kimliği geçersiz. Sayfayı yenileyip tekrar deneyin.",
    });
  }
  return id;
}

function reservationFor(policy, expectedBytes) {
  const multiplier = policy.kind === MEDIA_KINDS.IMAGE ? 3 : 1.35;
  return Math.ceil(expectedBytes * multiplier);
}

async function sumForMatch(match, field) {
  const [result] = await MediaUploadSession.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return Number(result?.total || 0);
}

// Müşteri (yönetici olmayan) yalnız profil fotoğrafı yükleyebilir; günlük kotası dar tutulur.
const CUSTOMER_DAILY_UPLOADS = 10;
const CUSTOMER_DAILY_BYTES = 25 * 1024 * 1024;

async function assertQuotas({ createdBy, role, reservationBytes, expectedBytes }) {
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - TEN_MINUTES_MS);
  const hourAgo = new Date(now.getTime() - HOUR_MS);
  const dayAgo = new Date(now.getTime() - DAY_MS);

  const [recentSessions, adminInFlight, globalInFlight, hourlyBytes, dailyBytes] =
    await Promise.all([
      MediaUploadSession.countDocuments({
        createdBy,
        createdAt: { $gte: tenMinutesAgo },
      }),
      sumForMatch(
        { createdBy: new mongoose.Types.ObjectId(createdBy), status: { $in: ACTIVE_UPLOAD_STATUSES } },
        "reservationBytes"
      ),
      sumForMatch(
        { status: { $in: ACTIVE_UPLOAD_STATUSES } },
        "reservationBytes"
      ),
      sumForMatch(
        { createdBy: new mongoose.Types.ObjectId(createdBy), completedAt: { $gte: hourAgo } },
        "receivedBytes"
      ),
      sumForMatch(
        { createdBy: new mongoose.Types.ObjectId(createdBy), completedAt: { $gte: dayAgo } },
        "receivedBytes"
      ),
    ]);

  if (recentSessions >= 30) {
    throw mediaError("MEDIA_RATE_LIMITED", 429, { retryAfter: 60 });
  }
  if (role !== "admin") {
    const dailySessions = await MediaUploadSession.countDocuments({ createdBy, createdAt: { $gte: dayAgo } });
    if (dailySessions >= CUSTOMER_DAILY_UPLOADS || dailyBytes + expectedBytes > CUSTOMER_DAILY_BYTES) {
      throw mediaError("MEDIA_QUOTA_EXCEEDED", 429, {
        retryAfter: 60 * 60,
        message: "Günlük yükleme sınırına ulaştınız. Lütfen yarın tekrar deneyin.",
        details: { limitUploads: CUSTOMER_DAILY_UPLOADS, limitBytes: CUSTOMER_DAILY_BYTES },
      });
    }
  }
  if (adminInFlight + reservationBytes > MEDIA_RUNTIME.perAdminInFlightBytes) {
    throw mediaError("MEDIA_QUOTA_EXCEEDED", 429, {
      retryAfter: 60,
      details: {
        limitBytes: MEDIA_RUNTIME.perAdminInFlightBytes,
        reservedBytes: adminInFlight,
      },
    });
  }
  if (globalInFlight + reservationBytes > MEDIA_RUNTIME.globalStagingBytes) {
    throw mediaError("MEDIA_STORAGE_GUARD", 507);
  }
  if (hourlyBytes + expectedBytes > MEDIA_RUNTIME.hourlyIngestBytes) {
    throw mediaError("MEDIA_QUOTA_EXCEEDED", 429, {
      retryAfter: 15 * 60,
      details: { limitBytes: MEDIA_RUNTIME.hourlyIngestBytes },
    });
  }
  if (dailyBytes + expectedBytes > MEDIA_RUNTIME.dailyIngestBytes) {
    throw mediaError("MEDIA_QUOTA_EXCEEDED", 429, {
      retryAfter: 60 * 60,
      details: { limitBytes: MEDIA_RUNTIME.dailyIngestBytes },
    });
  }

  const disk = await getDiskStats();
  const uploadableBytes =
    disk.availableBytes -
    disk.baseReserveBytes -
    disk.operationMarginBytes -
    globalInFlight;
  if (reservationBytes > uploadableBytes) {
    throw mediaError("MEDIA_STORAGE_GUARD", 507, {
      details: {
        availableToUploadBytes: Math.max(0, uploadableBytes),
        requiredBytes: reservationBytes,
      },
    });
  }

  return {
    adminInFlight,
    globalInFlight,
    uploadableBytes: Math.max(0, uploadableBytes),
  };
}

async function createUploadSession({
  createdBy,
  role,
  purpose,
  fileName,
  declaredMime,
  expectedBytes,
  clientUploadId,
}) {
  const policy = getPurposePolicy(purpose);
  if (!policy) {
    throw mediaError("MEDIA_UNSUPPORTED_PURPOSE", 400);
  }
  if (role !== "admin" && purpose !== "profile_image") {
    throw mediaError("MEDIA_UNSUPPORTED_PURPOSE", 403, {
      message: "Bu medya alanına yükleme yapmaya yetkiniz yok.",
    });
  }

  const normalizedName = normalizeFileName(fileName);
  const normalizedBytes = normalizeExpectedBytes(expectedBytes);
  const normalizedClientUploadId = normalizeClientUploadId(clientUploadId);
  if (normalizedBytes > policy.maxBytes) {
    throw mediaError("MEDIA_FILE_TOO_LARGE", 413, {
      details: { limitBytes: policy.maxBytes, actualBytes: normalizedBytes },
    });
  }

  if (normalizedClientUploadId) {
    const existing = await MediaUploadSession.findOne({
      createdBy,
      clientUploadId: normalizedClientUploadId,
    });
    if (existing) {
      const sameUpload =
        existing.purpose === purpose &&
        existing.originalName === normalizedName &&
        Number(existing.expectedBytes) === normalizedBytes;
      if (!sameUpload) {
        throw mediaError("MEDIA_UPLOAD_CONFLICT", 409, {
          message: "Bu yükleme kimliği başka bir dosya için kullanılmış.",
        });
      }
      return existing;
    }
  }

  const reservationBytes = reservationFor(policy, normalizedBytes);
  await assertQuotas({ createdBy, role, reservationBytes, expectedBytes: normalizedBytes });

  const sessionId = new mongoose.Types.ObjectId();
  const assetId = new mongoose.Types.ObjectId();
  const stagingKey = stagingKeyForSession(sessionId.toString());
  const expiresAt = new Date(Date.now() + MEDIA_RUNTIME.sessionTtlMs);
  const asset = new MediaAsset({
    _id: assetId,
    purpose,
    kind: policy.kind,
    status: "reserved",
    createdBy,
    original: {
      fileName: normalizedName,
      declaredMime: String(declaredMime || "").slice(0, 120),
      bytes: normalizedBytes,
      stagingKey,
    },
  });
  const upload = new MediaUploadSession({
    _id: sessionId,
    asset: assetId,
    createdBy,
    clientUploadId: normalizedClientUploadId,
    purpose,
    kind: policy.kind,
    originalName: normalizedName,
    declaredMime: String(declaredMime || "").slice(0, 120),
    expectedBytes: normalizedBytes,
    reservationBytes,
    chunkBytes: Math.min(MEDIA_RUNTIME.chunkBytes, policy.maxBytes),
    stagingKey,
    status: "reserved",
    expiresAt,
  });

  try {
    await ensureParent(absolutePathForKey(stagingKey));
    await asset.save();
    await upload.save();
  } catch (error) {
    await Promise.allSettled([
      MediaAsset.deleteOne({ _id: assetId }),
      MediaUploadSession.deleteOne({ _id: sessionId }),
      fsp.rm(path.dirname(absolutePathForKey(stagingKey)), {
        recursive: true,
        force: true,
      }),
    ]);
    if (error?.code === 11000 && normalizedClientUploadId) {
      const existing = await MediaUploadSession.findOne({
        createdBy,
        clientUploadId: normalizedClientUploadId,
      });
      if (existing) return existing;
    }
    throw error;
  }

  return upload;
}

async function getOwnedUploadSession(sessionId, userId) {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw mediaError("MEDIA_SESSION_NOT_FOUND", 404);
  }
  const session = await MediaUploadSession.findOne({
    _id: sessionId,
    createdBy: userId,
  });
  if (!session) throw mediaError("MEDIA_SESSION_NOT_FOUND", 404);
  if (session.expiresAt <= new Date() && ACTIVE_UPLOAD_STATUSES.includes(session.status)) {
    session.status = "expired";
    session.chunkLocked = false;
    await session.save();
    await MediaAsset.updateOne(
      { _id: session.asset },
      { $set: { status: "failed", "processing.errorCode": "MEDIA_SESSION_EXPIRED" } }
    );
    throw mediaError("MEDIA_SESSION_EXPIRED", 410);
  }
  return session;
}

async function lockUploadChunk({ sessionId, userId, offset }) {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw mediaError("MEDIA_SESSION_NOT_FOUND", 404);
  }
  const locked = await MediaUploadSession.findOneAndUpdate(
    {
      _id: sessionId,
      createdBy: userId,
      status: { $in: ACTIVE_UPLOAD_STATUSES },
      receivedBytes: offset,
      chunkLocked: false,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        chunkLocked: true,
        status: "uploading",
        lastActivityAt: new Date(),
      },
    },
    { new: true }
  );
  if (locked) {
    await MediaAsset.updateOne(
      { _id: locked.asset, status: "reserved" },
      { $set: { status: "uploading" } }
    );
    return locked;
  }

  const current = await getOwnedUploadSession(sessionId, userId);
  if (current.chunkLocked) {
    throw mediaError("MEDIA_UPLOAD_CONFLICT", 409, { retryAfter: 2 });
  }
  if (Number(current.receivedBytes) !== Number(offset)) {
    throw mediaError("MEDIA_OFFSET_MISMATCH", 409, {
      details: { expectedOffset: current.receivedBytes },
    });
  }
  throw mediaError("MEDIA_SESSION_NOT_FOUND", 409);
}

async function unlockUploadChunk(sessionId, failure = null) {
  const updates = {
    chunkLocked: false,
    lastActivityAt: new Date(),
  };
  if (failure) {
    updates.failureCode = failure.code || "MEDIA_INTERNAL_ERROR";
    updates.failureMessage = String(failure.message || "").slice(0, 500);
  }
  await MediaUploadSession.updateOne({ _id: sessionId }, { $set: updates });
}

async function commitUploadChunk(session, bytesWritten) {
  const nextOffset = Number(session.receivedBytes) + Number(bytesWritten);
  if (nextOffset > session.expectedBytes) {
    throw mediaError("MEDIA_FILE_TOO_LARGE", 413, {
      details: { limitBytes: session.expectedBytes, actualBytes: nextOffset },
    });
  }
  const completed = nextOffset === session.expectedBytes;
  const updated = await MediaUploadSession.findOneAndUpdate(
    {
      _id: session._id,
      chunkLocked: true,
      receivedBytes: session.receivedBytes,
    },
    {
      $set: {
        receivedBytes: nextOffset,
        chunkLocked: false,
        lastActivityAt: new Date(),
        ...(completed ? { status: "completed", completedAt: new Date() } : { status: "uploading" }),
      },
    },
    { new: true }
  );
  if (!updated) {
    throw mediaError("MEDIA_INTERNAL_ERROR", 500);
  }
  return updated;
}

async function quarantineUpload(session, error) {
  const source = path.dirname(absolutePathForKey(session.stagingKey));
  const destination = path.join(directoryPath("quarantine"), session._id.toString());
  await fsp.rm(destination, { recursive: true, force: true });
  const sourceStats = await statOrNull(source);
  if (sourceStats) await fsp.rename(source, destination);
  await Promise.all([
    MediaUploadSession.updateOne(
      { _id: session._id },
      {
        $set: {
          status: "failed",
          chunkLocked: false,
          failureCode: error.code || "MEDIA_CORRUPT",
          failureMessage: String(error.message || "").slice(0, 500),
        },
      }
    ),
    MediaAsset.updateOne(
      { _id: session.asset },
      {
        $set: {
          status: "quarantined",
          "processing.errorCode": error.code || "MEDIA_CORRUPT",
          "processing.errorMessage": String(error.message || "").slice(0, 500),
        },
      }
    ),
  ]);
}

async function finalizeCompletedUpload(session) {
  const sourcePath = absolutePathForKey(session.stagingKey);
  try {
    const [detected, actualBytes] = await Promise.all([
      inspectFileType(sourcePath, session.originalName),
      fileSize(sourcePath),
    ]);
    if (actualBytes !== session.expectedBytes) {
      throw mediaError("MEDIA_CORRUPT", 422, {
        details: { expectedBytes: session.expectedBytes, actualBytes },
      });
    }
    if (detected.kind !== session.kind) {
      throw mediaError("MEDIA_UNSUPPORTED_FORMAT", 415, {
        details: { detectedMime: detected.mime },
      });
    }

    await MediaAsset.updateOne(
      { _id: session.asset },
      {
        $set: {
          status: "uploaded",
          "original.detectedMime": detected.mime,
          "original.detectedExtension": detected.extension,
          "original.bytes": actualBytes,
          "original.stagingKey": session.stagingKey,
          "processing.errorCode": "",
          "processing.errorMessage": "",
        },
      }
    );
    await MediaProcessingJob.findOneAndUpdate(
      { asset: session.asset },
      {
        $setOnInsert: {
          asset: session.asset,
          status: "queued",
          priority: session.kind === MEDIA_KINDS.IMAGE ? 50 : 100,
          nextAttemptAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    return { detected, actualBytes };
  } catch (error) {
    await quarantineUpload(session, error);
    throw error;
  }
}

async function cancelUploadSession(session) {
  if (["cancelled", "expired", "failed"].includes(session.status)) return session;
  if (session.status === "completed") {
    throw mediaError("MEDIA_UPLOAD_CONFLICT", 409, {
      message: "İşleme alınmış bir yükleme bu aşamada iptal edilemez.",
    });
  }
  session.status = "cancelled";
  session.chunkLocked = false;
  await session.save();
  await MediaAsset.updateOne(
    { _id: session.asset },
    { $set: { status: "deleted", deletedAt: new Date() } }
  );
  await fsp.rm(path.dirname(absolutePathForKey(session.stagingKey)), {
    recursive: true,
    force: true,
  });
  return session;
}

module.exports = {
  ACTIVE_UPLOAD_STATUSES,
  cancelUploadSession,
  commitUploadChunk,
  createUploadSession,
  finalizeCompletedUpload,
  getOwnedUploadSession,
  lockUploadChunk,
  unlockUploadChunk,
};
