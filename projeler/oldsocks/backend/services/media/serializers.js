const { assetPublicUrl } = require("./storage");

function serializeVariant(variant) {
  return {
    name: variant.name,
    kind: variant.kind,
    format: variant.format,
    url: variant.key ? assetPublicUrl(variant.key) : variant.url,
    mime: variant.mime,
    bytes: variant.bytes,
    width: variant.width,
    height: variant.height,
    durationSeconds: variant.durationSeconds,
  };
}

function serializeAsset(asset) {
  if (!asset) return null;
  return {
    id: String(asset._id),
    purpose: asset.purpose,
    kind: asset.kind,
    status: asset.status,
    original: {
      fileName: asset.original?.fileName || "",
      mime: asset.original?.detectedMime || asset.original?.declaredMime || "",
      bytes: Number(asset.original?.bytes || 0),
    },
    metadata: asset.metadata,
    variants: (asset.variants || []).map(serializeVariant),
    primaryVariant: asset.primaryVariant || "",
    optimizedBytes: (asset.variants || []).reduce(
      (total, variant) => total + Number(variant.bytes || 0),
      0
    ),
    referenceCount: Number(asset.referenceCount || 0),
    trashedAt: asset.trashedAt || null,
    backupStatus: asset.backup?.status || "not_configured",
    processing: {
      attempts: Number(asset.processing?.attempts || 0),
      completedAt: asset.processing?.completedAt || null,
      errorCode: asset.processing?.errorCode || "",
      errorMessage: asset.processing?.errorMessage || "",
    },
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

function serializeUploadSession(session) {
  return {
    id: String(session._id),
    assetId: String(session.asset),
    status: session.status,
    expectedBytes: Number(session.expectedBytes),
    receivedBytes: Number(session.receivedBytes),
    chunkBytes: Number(session.chunkBytes),
    expiresAt: session.expiresAt,
    failure:
      session.failureCode || session.failureMessage
        ? {
            code: session.failureCode || "MEDIA_INTERNAL_ERROR",
            message: session.failureMessage || "Yükleme tamamlanamadı.",
          }
        : null,
  };
}

module.exports = { serializeAsset, serializeUploadSession };
