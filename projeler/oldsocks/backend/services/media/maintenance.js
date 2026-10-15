const fsp = require("node:fs/promises");
const path = require("node:path");
const MediaAsset = require("../../models/MediaAsset");
const MediaReference = require("../../models/MediaReference");
const MediaUploadSession = require("../../models/MediaUploadSession");
const { MEDIA_RUNTIME } = require("../../config/media");
const { mediaError } = require("./errors");
const { mediaCapabilities } = require("./capabilities");
const {
  absolutePathForKey,
  assetDirectoryKey,
  directoryPath,
  getDiskStats,
  statOrNull,
} = require("./storage");

async function directoryUsage(root) {
  let bytes = 0;
  let files = 0;
  let directories = 0;
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    directories += 1;
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile()) {
        const stats = await fsp.stat(entryPath);
        bytes += Number(stats.size);
        files += 1;
      }
    }
  }
  return { bytes, files, directories };
}

async function assetBreakdown() {
  return MediaAsset.aggregate([
    {
      $project: {
        kind: 1,
        status: 1,
        optimizedBytes: { $sum: "$variants.bytes" },
        sourceBytes: "$original.bytes",
        referenceCount: 1,
      },
    },
    {
      $group: {
        _id: { kind: "$kind", status: "$status" },
        count: { $sum: 1 },
        optimizedBytes: { $sum: "$optimizedBytes" },
        sourceBytes: { $sum: "$sourceBytes" },
        referenced: { $sum: { $cond: [{ $gt: ["$referenceCount", 0] }, 1, 0] } },
      },
    },
    { $sort: { "_id.kind": 1, "_id.status": 1 } },
  ]);
}

async function inFlightReservations() {
  const [result] = await MediaUploadSession.aggregate([
    { $match: { status: { $in: ["reserved", "uploading"] } } },
    {
      $group: {
        _id: null,
        reservationBytes: { $sum: "$reservationBytes" },
        receivedBytes: { $sum: "$receivedBytes" },
        sessions: { $sum: 1 },
      },
    },
  ]);
  return result || { reservationBytes: 0, receivedBytes: 0, sessions: 0 };
}

async function maintenanceSummary() {
  const [disk, breakdown, inFlight, capabilities, directoryEntries] = await Promise.all([
    getDiskStats(),
    assetBreakdown(),
    inFlightReservations(),
    mediaCapabilities(),
    Promise.all(
      ["assets", "staging", "processing", "quarantine", "trash", "nginxTemp"].map(
        async (name) => [name, await directoryUsage(directoryPath(name))]
      )
    ),
  ]);
  const directories = Object.fromEntries(directoryEntries);
  const safetyFloorBytes = disk.baseReserveBytes + disk.operationMarginBytes;
  const uploadableBytes = Math.max(
    0,
    disk.availableBytes - safetyFloorBytes - Number(inFlight.reservationBytes || 0)
  );
  const usableTotalBytes = Math.max(1, disk.totalBytes - disk.baseReserveBytes);
  const usedBytes = Math.max(0, disk.totalBytes - disk.availableBytes);
  const usageRatio = usedBytes / usableTotalBytes;
  let level = "healthy";
  if (uploadableBytes === 0 || disk.availableBytes <= safetyFloorBytes) level = "blocked";
  else if (usageRatio >= 0.8 || uploadableBytes < MEDIA_RUNTIME.globalStagingBytes) level = "warning";

  return {
    generatedAt: new Date().toISOString(),
    health: { level, acceptingUploads: level !== "blocked" },
    disk: {
      totalBytes: disk.totalBytes,
      availableBytes: disk.availableBytes,
      usedBytes,
      baseReserveBytes: disk.baseReserveBytes,
      operationMarginBytes: disk.operationMarginBytes,
      uploadableBytes,
    },
    directories,
    inFlight: {
      reservationBytes: Number(inFlight.reservationBytes || 0),
      receivedBytes: Number(inFlight.receivedBytes || 0),
      sessions: Number(inFlight.sessions || 0),
    },
    assets: breakdown.map((entry) => ({
      kind: entry._id.kind,
      status: entry._id.status,
      count: entry.count,
      optimizedBytes: entry.optimizedBytes,
      sourceBytes: entry.sourceBytes,
      referenced: entry.referenced,
    })),
    capabilities,
  };
}

async function listAssets(filters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 30)));
  const query = {};
  if (filters.kind) query.kind = filters.kind;
  if (filters.status) query.status = filters.status;
  if (filters.purpose) query.purpose = filters.purpose;
  if (filters.usage === "unreferenced") query.referenceCount = 0;
  if (filters.usage === "referenced") query.referenceCount = { $gt: 0 };
  const search = String(filters.search || "").trim().slice(0, 100);
  if (search) {
    query["original.fileName"] = {
      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }
  const [items, total] = await Promise.all([
    MediaAsset.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    MediaAsset.countDocuments(query),
  ]);
  return { items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function moveIfPresent(source, destination) {
  const stats = await statOrNull(source);
  if (!stats) return false;
  await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
  await fsp.rename(source, destination);
  return true;
}

async function trashAsset(assetId) {
  const asset = await MediaAsset.findById(assetId);
  if (!asset) throw mediaError("MEDIA_SESSION_NOT_FOUND", 404, { message: "Medya bulunamadı." });
  if (asset.status === "trashed") return asset;
  if (["processing", "uploading", "reserved", "deleting"].includes(asset.status)) {
    throw mediaError("MEDIA_UPLOAD_CONFLICT", 409, {
      message: "Devam eden medya işlemi tamamlandıktan sonra temizleyebilirsiniz.",
    });
  }
  const references = await MediaReference.countDocuments({ asset: asset._id });
  if (references > 0 || asset.referenceCount > 0) {
    throw mediaError("MEDIA_UPLOAD_CONFLICT", 409, {
      message: "Bu medya hâlâ bir içerikte kullanılıyor. Önce içerikten kaldırın.",
      details: { referenceCount: Math.max(references, asset.referenceCount) },
    });
  }

  const session = await MediaUploadSession.findOne({ asset: asset._id });
  const trashKey = path.posix.join("trash", `${asset._id}-${Date.now()}`);
  const trashPath = absolutePathForKey(trashKey);
  await fsp.mkdir(trashPath, { recursive: false, mode: 0o750 });
  asset.statusBeforeTrash = asset.status;
  asset.status = "deleting";
  await asset.save();
  try {
    await moveIfPresent(
      absolutePathForKey(assetDirectoryKey(asset.purpose, String(asset._id))),
      path.join(trashPath, "assets")
    );
    if (session?.stagingKey) {
      await moveIfPresent(
        path.dirname(absolutePathForKey(session.stagingKey)),
        path.join(trashPath, "staging")
      );
      await moveIfPresent(
        path.join(directoryPath("quarantine"), String(session._id)),
        path.join(trashPath, "quarantine")
      );
    }
    asset.status = "trashed";
    asset.trashKey = trashKey;
    asset.trashedAt = new Date();
    await asset.save();
    return asset;
  } catch (error) {
    asset.status = "missing";
    asset.processing.errorCode = "MEDIA_INTERNAL_ERROR";
    asset.processing.errorMessage = "Temizleme işlemi yarıda kaldı; uzlaştırma gerekiyor.";
    await asset.save().catch(() => {});
    throw error;
  }
}

async function restoreAsset(assetId) {
  const asset = await MediaAsset.findOne({ _id: assetId, status: "trashed" });
  if (!asset) {
    throw mediaError("MEDIA_SESSION_NOT_FOUND", 404, {
      message: "Geri alınabilecek medya bulunamadı.",
    });
  }
  const trashPath = absolutePathForKey(asset.trashKey);
  const assetDestination = absolutePathForKey(
    assetDirectoryKey(asset.purpose, String(asset._id))
  );
  if (await statOrNull(assetDestination)) {
    throw mediaError("MEDIA_UPLOAD_CONFLICT", 409, {
      message: "Medya hedefinde başka dosyalar bulundu; otomatik geri alma durduruldu.",
    });
  }
  const session = await MediaUploadSession.findOne({ asset: asset._id });
  const restoredAssets = await moveIfPresent(path.join(trashPath, "assets"), assetDestination);
  if (session?.stagingKey) {
    await moveIfPresent(
      path.join(trashPath, "staging"),
      path.dirname(absolutePathForKey(session.stagingKey))
    );
    await moveIfPresent(
      path.join(trashPath, "quarantine"),
      path.join(directoryPath("quarantine"), String(session._id))
    );
  }
  await fsp.rm(trashPath, { recursive: true, force: true });
  asset.status = restoredAssets ? asset.statusBeforeTrash || "ready" : "failed";
  asset.trashKey = "";
  asset.statusBeforeTrash = "";
  asset.trashedAt = null;
  await asset.save();
  return asset;
}

async function purgeAsset(assetId, confirmation) {
  const asset = await MediaAsset.findOne({ _id: assetId, status: "trashed" });
  if (!asset) throw mediaError("MEDIA_SESSION_NOT_FOUND", 404, { message: "Çöp kaydı bulunamadı." });
  if (String(confirmation || "") !== String(asset._id)) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: "Kalıcı silme onayı medya kimliğiyle eşleşmiyor.",
    });
  }
  if (asset.trashKey) {
    await fsp.rm(absolutePathForKey(asset.trashKey), { recursive: true, force: true });
  }
  asset.status = "deleted";
  asset.deletedAt = new Date();
  asset.trashKey = "";
  asset.statusBeforeTrash = "";
  asset.variants = [];
  asset.primaryVariant = "";
  asset.manifestKey = "";
  await asset.save();
  return asset;
}

module.exports = {
  listAssets,
  maintenanceSummary,
  purgeAsset,
  restoreAsset,
  trashAsset,
};
