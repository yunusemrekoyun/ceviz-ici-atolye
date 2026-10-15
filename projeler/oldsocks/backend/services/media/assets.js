const mongoose = require("mongoose");
const MediaAsset = require("../../models/MediaAsset");
const MediaReference = require("../../models/MediaReference");
const { mediaError } = require("./errors");
const { assetPublicUrl } = require("./storage");

function publicVariantUrl(variant) {
  return variant?.key ? assetPublicUrl(variant.key) : variant?.url || "";
}

function parseAssetIds(value) {
  if (value === null || value === undefined || value === "") return [];
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = [value];
    }
  }
  if (!Array.isArray(parsed)) parsed = [parsed];
  const ids = parsed.map((item) => String(item || "").trim()).filter(Boolean);
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: "Seçilen medya kayıtlarından biri geçersiz.",
    });
  }
  if (new Set(ids).size !== ids.length) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message: "Aynı medya birden fazla kez seçilmiş.",
    });
  }
  return ids;
}

async function requireReadyAssets(value, options = {}) {
  const ids = parseAssetIds(value);
  const min = Number(options.min || 0);
  const max = Number(options.max || Number.MAX_SAFE_INTEGER);
  if (ids.length < min || ids.length > max) {
    throw mediaError("MEDIA_INVALID_REQUEST", 400, {
      message:
        min === max
          ? `${min} medya seçmelisiniz.`
          : `En az ${min}, en fazla ${max} medya seçebilirsiniz.`,
      details: { min, max, actual: ids.length },
    });
  }
  if (!ids.length) return [];
  const query = { _id: { $in: ids }, status: "ready" };
  if (options.purposes) query.purpose = { $in: options.purposes };
  if (options.purpose) query.purpose = options.purpose;
  if (options.kind) query.kind = options.kind;
  if (options.createdBy) query.createdBy = options.createdBy;
  const assets = await MediaAsset.find(query);
  const byId = new Map(assets.map((asset) => [String(asset._id), asset]));
  if (byId.size !== ids.length) {
    throw mediaError("MEDIA_NOT_READY", 409, {
      message: "Seçilen medyalardan biri henüz hazır değil veya bu alanda kullanılamıyor.",
    });
  }
  return ids.map((id) => byId.get(id));
}

function imageVariants(asset) {
  return (asset?.variants || [])
    .filter((variant) => variant.kind === "image")
    .sort((a, b) => Number(a.width || 0) - Number(b.width || 0));
}

function videoVariants(asset) {
  return (asset?.variants || []).filter((variant) => variant.kind === "video");
}

function closestImageVariant(asset, targetWidth = Infinity) {
  const variants = imageVariants(asset).filter((variant) => variant.format === "webp");
  if (!variants.length) return imageVariants(asset)[0] || null;
  return (
    variants.find((variant) => Number(variant.width || 0) >= targetWidth) ||
    variants.at(-1)
  );
}

function selectedVideoVariant(asset, context = "detail") {
  const variants = videoVariants(asset);
  return (
    variants.find((variant) => variant.name === context) ||
    variants.find((variant) => variant.name === "detail") ||
    variants.at(-1) ||
    null
  );
}

function publicAsset(asset, context = "detail") {
  if (!asset || typeof asset !== "object" || !asset._id) return null;
  const images = imageVariants(asset);
  const videos = videoVariants(asset);
  const primary =
    asset.kind === "image"
      ? closestImageVariant(asset, context === "list" ? 640 : Infinity)
      : selectedVideoVariant(asset, context);
  return {
    id: String(asset._id),
    kind: asset.kind,
    purpose: asset.purpose,
    url: publicVariantUrl(primary),
    width: primary?.width || null,
    height: primary?.height || null,
    durationSeconds: asset.metadata?.durationSeconds || null,
    sources: images.map((variant) => ({
      name: variant.name,
      url: publicVariantUrl(variant),
      format: variant.format,
      mime: variant.mime,
      width: variant.width,
      height: variant.height,
    })),
    videos: videos.map((variant) => ({
      name: variant.name,
      url: publicVariantUrl(variant),
      mime: variant.mime,
      width: variant.width,
      height: variant.height,
    })),
    posters: images
      .filter((variant) => String(variant.name).startsWith("poster-"))
      .map((variant) => ({
        name: variant.name,
        url: publicVariantUrl(variant),
        width: variant.width,
        height: variant.height,
      })),
  };
}

function legacyAssetUrl(asset, context = "detail") {
  return publicAsset(asset, context)?.url || "";
}

function applyProductMedia(product, context = "detail") {
  const value = typeof product?.toObject === "function" ? product.toObject() : { ...product };
  const imageAssets = Array.isArray(value.imageAssets)
    ? value.imageAssets.filter((asset) => asset && typeof asset === "object" && asset._id)
    : [];
  const videoAsset =
    value.videoAsset && typeof value.videoAsset === "object" && value.videoAsset._id
      ? value.videoAsset
      : null;
  if (imageAssets.length) value.images = imageAssets.map((asset) => legacyAssetUrl(asset, context));
  if (videoAsset) value.video = legacyAssetUrl(videoAsset, context);
  value.media = {
    images: imageAssets.map((asset) => publicAsset(asset, context)),
    video: publicAsset(videoAsset, context),
  };
  value.imageAssetIds = imageAssets.map((asset) => String(asset._id));
  value.videoAssetId = videoAsset ? String(videoAsset._id) : null;
  return value;
}

async function refreshReferenceCounts(assetIds) {
  const ids = [...new Set(assetIds.map(String))].filter(mongoose.isValidObjectId);
  if (!ids.length) return;
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const counts = await MediaReference.aggregate([
    { $match: { asset: { $in: objectIds } } },
    { $group: { _id: "$asset", count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((item) => [String(item._id), item.count]));
  await MediaAsset.bulkWrite(
    ids.map((id) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { referenceCount: Number(byId.get(id) || 0) } },
      },
    }))
  );
}

async function syncOwnerMediaReferences({ ownerType, ownerId, fields }) {
  const existing = await MediaReference.find({ ownerType, ownerId });
  const desired = [];
  Object.entries(fields).forEach(([field, assetIds]) => {
    parseAssetIds(assetIds).forEach((asset, position) => {
      desired.push({ asset, field, position });
    });
  });
  const key = (item) => `${item.field}:${item.position}:${String(item.asset)}`;
  const desiredKeys = new Set(desired.map(key));
  const removed = existing.filter((item) => !desiredKeys.has(key(item)));
  if (desired.length) {
    await MediaReference.bulkWrite(
      desired.map((item) => ({
        updateOne: {
          filter: { ownerType, ownerId, field: item.field, position: item.position },
          update: { $set: { asset: item.asset } },
          upsert: true,
        },
      }))
    );
  }
  const desiredPositions = new Set(desired.map((item) => `${item.field}:${item.position}`));
  const stalePositions = existing.filter(
    (item) => !desiredPositions.has(`${item.field}:${item.position}`)
  );
  if (stalePositions.length) {
    await MediaReference.deleteMany({ _id: { $in: stalePositions.map((item) => item._id) } });
  }
  await refreshReferenceCounts([
    ...existing.map((item) => item.asset),
    ...desired.map((item) => item.asset),
    ...removed.map((item) => item.asset),
  ]);
}

async function removeOwnerMediaReferences(ownerType, ownerId) {
  const existing = await MediaReference.find({ ownerType, ownerId });
  await MediaReference.deleteMany({ ownerType, ownerId });
  await refreshReferenceCounts(existing.map((item) => item.asset));
}

module.exports = {
  applyProductMedia,
  legacyAssetUrl,
  parseAssetIds,
  publicAsset,
  removeOwnerMediaReferences,
  requireReadyAssets,
  syncOwnerMediaReferences,
};
