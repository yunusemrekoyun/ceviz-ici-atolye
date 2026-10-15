const fsp = require("node:fs/promises");
const mongoose = require("mongoose");
const { pipeline } = require("node:stream/promises");
const MediaAsset = require("../models/MediaAsset");
const MediaProcessingJob = require("../models/MediaProcessingJob");
const { PURPOSE_POLICIES } = require("../config/media");
const { mediaError } = require("../services/media/errors");
const { byteLimitTransform } = require("../services/media/fileInspection");
const {
  absolutePathForKey,
  createAppendStream,
  ensureParent,
  statOrNull,
} = require("../services/media/storage");
const {
  cancelUploadSession,
  commitUploadChunk,
  createUploadSession,
  finalizeCompletedUpload,
  getOwnedUploadSession,
  lockUploadChunk,
  unlockUploadChunk,
} = require("../services/media/uploadSessions");
const {
  serializeAsset,
  serializeUploadSession,
} = require("../services/media/serializers");

function parseOffset(value) {
  const offset = Number(value);
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: "Yükleme konumu okunamadı. Yükleme güvenli noktadan yeniden denenecek.",
    });
  }
  return offset;
}

function parseContentLength(value) {
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw mediaError("MEDIA_INVALID_REQUEST", 411, {
      message: "Yüklenecek parçanın boyutu okunamadı.",
    });
  }
  return bytes;
}

async function ownedAsset(assetId, user) {
  if (!mongoose.isValidObjectId(assetId)) {
    throw mediaError("MEDIA_SESSION_NOT_FOUND", 404, {
      message: "Medya kaydı bulunamadı.",
    });
  }
  const query = { _id: assetId };
  if (user.role !== "admin") query.createdBy = user.userId;
  const asset = await MediaAsset.findOne(query);
  if (!asset) {
    throw mediaError("MEDIA_SESSION_NOT_FOUND", 404, {
      message: "Medya kaydı bulunamadı.",
    });
  }
  return asset;
}

exports.createUpload = async (req, res) => {
  const session = await createUploadSession({
    createdBy: req.user.userId,
    role: req.user.role,
    purpose: req.body?.purpose,
    fileName: req.body?.fileName,
    declaredMime: req.body?.mime,
    expectedBytes: req.body?.bytes,
    clientUploadId: req.body?.clientUploadId,
  });
  const isExisting = Number(session.receivedBytes) > 0 || session.status !== "reserved";
  res.status(isExisting ? 200 : 201).json({ upload: serializeUploadSession(session) });
};

exports.getUpload = async (req, res) => {
  const session = await getOwnedUploadSession(req.params.id, req.user.userId);
  const asset = await MediaAsset.findById(session.asset);
  res.setHeader("Upload-Offset", String(session.receivedBytes));
  res.json({
    upload: serializeUploadSession(session),
    asset: serializeAsset(asset),
  });
};

exports.appendUploadChunk = async (req, res) => {
  const contentType = String(req.headers["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!["application/octet-stream", "application/offset+octet-stream"].includes(contentType)) {
    throw mediaError("MEDIA_INVALID_REQUEST", 415, {
      message: "Yükleme parçasının içerik türü geçersiz.",
    });
  }

  const offset = parseOffset(req.headers["upload-offset"]);
  const contentLength = parseContentLength(req.headers["content-length"]);
  const session = await lockUploadChunk({
    sessionId: req.params.id,
    userId: req.user.userId,
    offset,
  });
  const remaining = Number(session.expectedBytes) - Number(session.receivedBytes);
  const allowedBytes = Math.min(Number(session.chunkBytes), remaining);
  const destination = absolutePathForKey(session.stagingKey);

  let bytesWritten;
  try {
    if (contentLength > allowedBytes) {
      throw mediaError("MEDIA_FILE_TOO_LARGE", 413, {
        details: { limitBytes: allowedBytes, actualBytes: contentLength },
      });
    }

    await ensureParent(destination);
    const stats = await statOrNull(destination);
    const diskOffset = Number(stats?.size || 0);
    if (diskOffset !== offset) {
      throw mediaError("MEDIA_OFFSET_MISMATCH", 409, {
        details: { expectedOffset: diskOffset },
      });
    }

    const limiter = byteLimitTransform(allowedBytes);
    await pipeline(req, limiter, createAppendStream(destination));
    bytesWritten = limiter.bytesReceived();
    if (bytesWritten !== contentLength) {
      throw mediaError("MEDIA_CORRUPT", 422, {
        details: { expectedBytes: contentLength, actualBytes: bytesWritten },
      });
    }

  } catch (error) {
    await fsp.truncate(destination, offset).catch(() => {});
    await unlockUploadChunk(session._id, error).catch(() => {});
    throw error;
  }

  let updated;
  try {
    updated = await commitUploadChunk(session, bytesWritten);
  } catch (error) {
    await fsp.truncate(destination, offset).catch(() => {});
    await unlockUploadChunk(session._id, error).catch(() => {});
    throw error;
  }

  let asset = await MediaAsset.findById(updated.asset);
  if (updated.status === "completed") {
    await finalizeCompletedUpload(updated);
    asset = await MediaAsset.findById(updated.asset);
  }

  res.setHeader("Upload-Offset", String(updated.receivedBytes));
  res.status(updated.status === "completed" ? 202 : 200).json({
    upload: serializeUploadSession(updated),
    asset: serializeAsset(asset),
  });
};

exports.cancelUpload = async (req, res) => {
  const session = await getOwnedUploadSession(req.params.id, req.user.userId);
  const cancelled = await cancelUploadSession(session);
  res.json({ upload: serializeUploadSession(cancelled) });
};

exports.getAsset = async (req, res) => {
  const asset = await ownedAsset(req.params.id, req.user);
  res.json({ asset: serializeAsset(asset) });
};

exports.retryAsset = async (req, res) => {
  const asset = await ownedAsset(req.params.id, req.user);
  if (!["failed", "uploaded", "processing"].includes(asset.status)) {
    throw mediaError("MEDIA_UPLOAD_CONFLICT", 409, {
      message: "Bu medya şu anda yeniden işlenemez.",
    });
  }
  if (!asset.original?.stagingKey) {
    throw mediaError("MEDIA_PROCESSING_FAILED", 409, {
      message: "Orijinal yükleme artık bulunmuyor. Dosyayı yeniden seçmeniz gerekiyor.",
    });
  }
  const source = await statOrNull(absolutePathForKey(asset.original.stagingKey));
  if (!source?.isFile()) {
    throw mediaError("MEDIA_PROCESSING_FAILED", 409, {
      message: "Orijinal yükleme artık bulunmuyor. Dosyayı yeniden seçmeniz gerekiyor.",
    });
  }

  asset.status = "uploaded";
  asset.processing.errorCode = "";
  asset.processing.errorMessage = "";
  await asset.save();
  const job = await MediaProcessingJob.findOneAndUpdate(
    { asset: asset._id },
    {
      $set: {
        status: "queued",
        attempts: 0,
        nextAttemptAt: new Date(),
        lockedAt: null,
        workerId: "",
        errorCode: "",
        errorMessage: "",
      },
      $setOnInsert: {
        asset: asset._id,
        priority: asset.kind === "image" ? 50 : 100,
      },
    },
    { new: true, upsert: true }
  );
  res.status(202).json({ asset: serializeAsset(asset), jobId: String(job._id) });
};

exports.getPolicies = async (_req, res) => {
  const purposes = Object.entries(PURPOSE_POLICIES).map(([purpose, policy]) => ({
    purpose,
    kind: policy.kind,
    maxBytes: policy.maxBytes,
    maxDurationSeconds: policy.profile.maxDurationSeconds || null,
  }));
  res.json({ purposes });
};
