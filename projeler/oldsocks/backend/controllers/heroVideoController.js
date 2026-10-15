const mongoose = require("mongoose");
const HeroVideo = require("../models/HeroVideo");
const { MediaError } = require("../services/media/errors");
const { timedCache } = require("../services/timedCache");
const { trafficMonitor } = require("../services/trafficMonitor");
const {
  legacyAssetUrl,
  publicAsset,
  removeOwnerMediaReferences,
  requireReadyAssets,
  syncOwnerMediaReferences,
} = require("../services/media/assets");

function serializeHero(item) {
  const value = typeof item?.toObject === "function" ? item.toObject() : { ...item };
  if (value.mediaAsset && typeof value.mediaAsset === "object") {
    value.url = legacyAssetUrl(value.mediaAsset, "detail");
    value.media = publicAsset(value.mediaAsset, "detail");
    value.mediaAssetId = String(value.mediaAsset._id);
  }
  return value;
}

const ORDER_SORT = { order: 1, createdAt: 1 };
const heroCache = timedCache(() => trafficMonitor.publicTtlMs(15 * 1000));

function listHeroVideos() {
  return HeroVideo.find().populate("mediaAsset").sort(ORDER_SORT);
}

// Silme veya sıralama sonrası boşlukları kapatır: 0,1,2 ...
async function compactOrder() {
  const items = await HeroVideo.find({}, { _id: 1 }).sort(ORDER_SORT).lean();
  if (!items.length) return;
  await HeroVideo.bulkWrite(
    items.map((item, index) => ({
      updateOne: { filter: { _id: item._id }, update: { $set: { order: index } } },
    }))
  );
}

exports.uploadVideo = async (req, res) => {
  try {
    const total = await HeroVideo.countDocuments();
    if (total >= 3) {
      return res.status(409).json({ message: "En fazla 3 hero medyası ekleyebilirsiniz." });
    }
    const [asset] = await requireReadyAssets(req.body.mediaAssetId, {
      purposes: ["hero_image", "hero_video"],
      min: 1,
      max: 1,
    });
    const item = await HeroVideo.create({
      mediaAsset: asset._id,
      url: legacyAssetUrl(asset, "detail"),
      kind: asset.kind,
      order: total,
    });
    await syncOwnerMediaReferences({
      ownerType: "HeroVideo",
      ownerId: item._id,
      fields: { media: [asset._id] },
    });
    heroCache.invalidate();
    const populated = await HeroVideo.findById(item._id).populate("mediaAsset");
    res.status(201).json(serializeHero(populated));
  } catch (error) {
    if (error instanceof MediaError) throw error;
    console.error("Hero media create error:", error);
    res.status(500).json({ message: "Hero medyası eklenemedi." });
  }
};

exports.getHeroVideos = async (_req, res) => {
  try {
    const items = await heroCache.get(async () => (await listHeroVideos()).map(serializeHero));
    res.set("Cache-Control", "public, max-age=5, s-maxage=5");
    res.json(items);
  } catch (error) {
    console.error("Hero media list error:", error);
    res.status(500).json({ message: "Hero medyaları getirilemedi." });
  }
};

exports.reorderHeroVideos = async (req, res) => {
  try {
    const raw = req.body?.ids;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ message: "Sıralama listesi geçersiz." });
    }

    const ids = raw.map((id) => String(id ?? "").trim());
    if (ids.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: "Sıralama listesi geçersiz." });
    }
    if (new Set(ids).size !== ids.length) {
      return res
        .status(400)
        .json({ message: "Sıralama listesinde tekrar eden kayıt var." });
    }

    // Liste, veritabanındaki kayıtların tamamını birebir karşılamalı. Aksi halde
    // başka bir sekmede silinen/eklenen bir öğe sessizce sıranın dışında kalır.
    const existing = await HeroVideo.find({}, { _id: 1 }).lean();
    const existingIds = new Set(existing.map((item) => String(item._id)));
    const matches =
      existing.length === ids.length && ids.every((id) => existingIds.has(id));
    if (!matches) {
      return res.status(409).json({
        message: "Hero listesi değişmiş. Sayfayı yenileyip tekrar deneyin.",
      });
    }

    await HeroVideo.bulkWrite(
      ids.map((id, index) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: { $set: { order: index } },
        },
      }))
    );

    heroCache.invalidate();
    const items = await listHeroVideos();
    res.json(items.map(serializeHero));
  } catch (error) {
    console.error("Hero media reorder error:", error);
    res.status(500).json({ message: "Sıralama güncellenemedi." });
  }
};

exports.deleteHeroVideo = async (req, res) => {
  try {
    const deleted = await HeroVideo.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Kayıt bulunamadı." });
    await removeOwnerMediaReferences("HeroVideo", deleted._id);
    await compactOrder();
    heroCache.invalidate();
    res.json({ message: "Hero medyası silindi." });
  } catch (error) {
    console.error("Hero media delete error:", error);
    res.status(500).json({ message: "Hero medyası silinemedi." });
  }
};
