const fsp = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");
const MediaAsset = require("../../models/MediaAsset");
const MediaReference = require("../../models/MediaReference");
const MediaUploadSession = require("../../models/MediaUploadSession");
const {
  absolutePathForKey,
  assetAbsolutePath,
  directoryPath,
  initializeMediaStorage,
  statOrNull,
} = require("./storage");

const SAMPLE_LIMIT = 50;

async function listDirectories(root) {
  try {
    const entries = await fsp.readdir(root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function findMissingReadyAssets({ repair }) {
  const missing = [];
  const cursor = MediaAsset.find({ status: "ready" })
    .select({ manifestKey: 1, variants: 1 })
    .lean()
    .cursor();

  for await (const asset of cursor) {
    const expectedKeys = [asset.manifestKey, ...(asset.variants || []).map((item) => item.key)]
      .filter(Boolean);
    let missingKey = "";
    for (const key of expectedKeys) {
      if (!(await statOrNull(assetAbsolutePath(key)))) {
        missingKey = key;
        break;
      }
    }
    if (!expectedKeys.length) missingKey = "manifest-or-variants-empty";
    if (!missingKey) continue;
    missing.push({ assetId: String(asset._id), missingKey });
    if (repair) {
      await MediaAsset.updateOne(
        { _id: asset._id, status: "ready" },
        {
          $set: {
            status: "missing",
            "processing.errorCode": "MEDIA_FILE_MISSING",
            "processing.errorMessage":
              "Veritabanı kaydı var ancak diskte beklenen dosyalardan biri bulunamadı.",
          },
        }
      );
    }
  }
  return missing;
}

async function reconcileReferenceCounts({ repair }) {
  const [assets, counts, dangling] = await Promise.all([
    MediaAsset.find({ status: { $ne: "deleted" } })
      .select({ referenceCount: 1 })
      .lean(),
    MediaReference.aggregate([
      { $group: { _id: "$asset", count: { $sum: 1 } } },
    ]),
    MediaReference.aggregate([
      {
        $lookup: {
          from: MediaAsset.collection.name,
          localField: "asset",
          foreignField: "_id",
          as: "assetRecord",
        },
      },
      { $match: { assetRecord: { $size: 0 } } },
      { $project: { _id: 1, asset: 1, ownerType: 1, ownerId: 1, field: 1 } },
    ]),
  ]);
  const byId = new Map(counts.map((item) => [String(item._id), Number(item.count)]));
  const drift = assets
    .map((asset) => ({
      assetId: String(asset._id),
      stored: Number(asset.referenceCount || 0),
      actual: Number(byId.get(String(asset._id)) || 0),
    }))
    .filter((item) => item.stored !== item.actual);

  if (repair && drift.length) {
    await MediaAsset.bulkWrite(
      drift.map((item) => ({
        updateOne: {
          filter: { _id: item.assetId },
          update: { $set: { referenceCount: item.actual } },
        },
      }))
    );
  }
  if (repair && dangling.length) {
    await MediaReference.deleteMany({ _id: { $in: dangling.map((item) => item._id) } });
  }
  return {
    drift,
    dangling: dangling.map((item) => ({
      referenceId: String(item._id),
      assetId: String(item.asset),
      ownerType: item.ownerType,
      ownerId: String(item.ownerId),
      field: item.field,
    })),
  };
}

async function findOrphanAssetDirectories() {
  const root = directoryPath("assets");
  const result = [];
  for (const purpose of await listDirectories(root)) {
    for (const assetId of await listDirectories(path.join(root, purpose))) {
      if (!mongoose.isValidObjectId(assetId)) {
        result.push({ purpose, assetId, reason: "invalid-directory-name" });
        continue;
      }
      if (!(await MediaAsset.exists({ _id: assetId }))) {
        result.push({ purpose, assetId, reason: "database-record-not-found" });
      }
    }
  }
  return result;
}

async function reconcileExpiredSessions({ repair }) {
  const sessions = await MediaUploadSession.find({
    status: { $in: ["reserved", "uploading"] },
    expiresAt: { $lt: new Date() },
  }).lean();
  if (!repair) {
    return sessions.map((session) => ({
      sessionId: String(session._id),
      assetId: String(session.asset),
      receivedBytes: Number(session.receivedBytes || 0),
    }));
  }

  for (const session of sessions) {
    const sourceDirectory = path.dirname(absolutePathForKey(session.stagingKey));
    const quarantineDirectory = path.join(directoryPath("quarantine"), String(session._id));
    if (await statOrNull(sourceDirectory)) {
      if (!(await statOrNull(quarantineDirectory))) {
        await fsp.rename(sourceDirectory, quarantineDirectory);
      }
    }
    await Promise.all([
      MediaUploadSession.updateOne(
        { _id: session._id, status: { $in: ["reserved", "uploading"] } },
        {
          $set: {
            status: "expired",
            chunkLocked: false,
            failureCode: "MEDIA_UPLOAD_EXPIRED",
            failureMessage: "Yükleme süresi dolduğu için yarım dosya karantinaya taşındı.",
          },
        }
      ),
      MediaAsset.updateOne(
        { _id: session.asset, status: { $in: ["reserved", "uploading"] } },
        {
          $set: {
            status: "quarantined",
            "processing.errorCode": "MEDIA_UPLOAD_EXPIRED",
            "processing.errorMessage":
              "Yükleme tamamlanmadığı için yarım dosya karantinaya taşındı.",
          },
        }
      ),
    ]);
  }
  return sessions.map((session) => ({
    sessionId: String(session._id),
    assetId: String(session.asset),
    receivedBytes: Number(session.receivedBytes || 0),
  }));
}

async function findOrphanStagingDirectories({ repair }) {
  const root = directoryPath("staging");
  const directories = await listDirectories(root);
  const result = [];
  for (const sessionId of directories) {
    const exists = mongoose.isValidObjectId(sessionId)
      ? await MediaUploadSession.exists({ _id: sessionId })
      : false;
    if (exists) continue;
    result.push({ sessionId });
    if (repair) {
      const destination = path.join(
        directoryPath("quarantine"),
        `orphan-staging-${sessionId}-${Date.now()}`
      );
      await fsp.rename(path.join(root, sessionId), destination);
    }
  }
  return result;
}

async function findCompletedSessionStagingDirectories({ repair }) {
  const sessions = await MediaUploadSession.aggregate([
    { $match: { status: "completed" } },
    {
      $lookup: {
        from: MediaAsset.collection.name,
        localField: "asset",
        foreignField: "_id",
        as: "assetRecord",
      },
    },
    { $unwind: "$assetRecord" },
    {
      $match: {
        "assetRecord.status": { $in: ["ready", "trashed", "deleted"] },
        "assetRecord.original.stagingKey": { $in: ["", null] },
      },
    },
    { $project: { _id: 1, asset: 1, stagingKey: 1 } },
  ]);
  const result = [];
  for (const session of sessions) {
    const sourceDirectory = path.dirname(absolutePathForKey(session.stagingKey));
    const stats = await statOrNull(sourceDirectory);
    if (!stats?.isDirectory()) continue;
    result.push({
      sessionId: String(session._id),
      assetId: String(session.asset),
    });
    if (repair) {
      await fsp.rm(sourceDirectory, { recursive: true, force: true });
    }
  }
  return result;
}

function section(items) {
  return { count: items.length, samples: items.slice(0, SAMPLE_LIMIT) };
}

async function reconcileMedia(options = {}) {
  const repair = options.repair === true;
  await initializeMediaStorage();
  const [
    missingAssets,
    references,
    orphanAssetDirectories,
    expiredSessions,
    orphanStaging,
    completedSessionStaging,
  ] = await Promise.all([
      findMissingReadyAssets({ repair }),
      reconcileReferenceCounts({ repair }),
      findOrphanAssetDirectories(),
      reconcileExpiredSessions({ repair }),
      findOrphanStagingDirectories({ repair }),
      findCompletedSessionStagingDirectories({ repair }),
    ]);
  const issueCount =
    missingAssets.length +
    references.drift.length +
    references.dangling.length +
    orphanAssetDirectories.length +
    expiredSessions.length +
    orphanStaging.length +
    completedSessionStaging.length;

  return {
    generatedAt: new Date().toISOString(),
    mode: repair ? "repair" : "check",
    healthy: issueCount === 0,
    issueCount,
    missingAssets: section(missingAssets),
    referenceCountDrift: section(references.drift),
    danglingReferences: section(references.dangling),
    orphanAssetDirectories: section(orphanAssetDirectories),
    expiredUploadSessions: section(expiredSessions),
    orphanStagingDirectories: section(orphanStaging),
    completedSessionStagingDirectories: section(completedSessionStaging),
    note:
      "Sahipsiz nihai medya klasörleri güvenlik amacıyla otomatik silinmez veya taşınmaz.",
  };
}

module.exports = { reconcileMedia };
