const MiniCampaign = require("../models/MiniCampaign");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { MediaError } = require("../services/media/errors");
const { timedCache } = require("../services/timedCache");
const { trafficMonitor } = require("../services/trafficMonitor");
const {
  applyProductMedia,
  legacyAssetUrl,
  publicAsset,
  removeOwnerMediaReferences,
  requireReadyAssets,
  syncOwnerMediaReferences,
} = require("../services/media/assets");

const campaignListCache = timedCache(() => trafficMonitor.publicTtlMs(15 * 1000));
const activeCampaignCaches = new Map([0, 1, 2].map((slot) => [slot, timedCache(() => trafficMonitor.publicTtlMs(15 * 1000))]));

function invalidateMiniCampaigns() {
  campaignListCache.invalidate();
  for (const cache of activeCampaignCaches.values()) cache.invalidate();
}

function parseArrayField(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSlot(raw) {
  const slot = Number(raw);
  return [1, 2].includes(slot) ? slot : null;
}

async function validateTargets(products, categories) {
  const [productCount, categoryCount] = await Promise.all([
    Product.countDocuments({ _id: { $in: products }, archivedAt: null }),
    Category.countDocuments({ _id: { $in: categories }, archivedAt: null }),
  ]);
  if (productCount !== new Set(products.map(String)).size) {
    const error = new Error("Geçersiz ürün seçimi.");
    error.statusCode = 400;
    throw error;
  }
  if (categoryCount !== new Set(categories.map(String)).size) {
    const error = new Error("Geçersiz kategori seçimi.");
    error.statusCode = 400;
    throw error;
  }
}

function miniQuery(query) {
  return query
    .populate("imageAsset")
    .populate({
      path: "products",
      match: { archivedAt: null },
      select: "name images imageAssets video videoAsset price originalPrice discount",
      populate: [{ path: "imageAssets" }, { path: "videoAsset" }],
    })
    .populate({ path: "categories", match: { archivedAt: null }, select: "name image imageAsset" });
}

function serializeMini(campaign, context = "list") {
  const value = typeof campaign?.toObject === "function" ? campaign.toObject() : { ...campaign };
  if (value.imageAsset && typeof value.imageAsset === "object") {
    value.imageUrl = legacyAssetUrl(value.imageAsset, context);
    value.media = publicAsset(value.imageAsset, context);
    value.imageAssetId = String(value.imageAsset._id);
  }
  if (Array.isArray(value.products)) {
    value.products = value.products.filter(Boolean).map((product) => applyProductMedia(product, "list"));
  }
  return value;
}

async function syncMini(campaign) {
  await syncOwnerMediaReferences({
    ownerType: "MiniCampaign",
    ownerId: campaign._id,
    fields: { image: campaign.imageAsset ? [campaign.imageAsset] : [] },
  });
}

exports.createMiniCampaign = async (req, res) => {
  try {
    // Slot boşsa kampanya kaydedilir ama sitede görünmez (yayında değil).
    const slot = parseSlot(req.body.slot);
    if (!req.body.title) {
      return res.status(400).json({ message: "Başlık zorunludur." });
    }
    const products = parseArrayField(req.body.products);
    const categories = parseArrayField(req.body.categories);
    await validateTargets(products, categories);
    const [asset] = await requireReadyAssets(req.body.imageAssetId, {
      purpose: "mini_campaign_image",
      kind: "image",
      min: 1,
      max: 1,
    });
    if (slot) await MiniCampaign.updateMany({ slot }, { $set: { slot: null } });
    const campaign = await MiniCampaign.create({
      title: req.body.title,
      slot,
      products,
      categories,
      imageAsset: asset._id,
      imageUrl: legacyAssetUrl(asset, "detail"),
    });
    await syncMini(campaign);
    invalidateMiniCampaigns();
    res.status(201).json(serializeMini(await miniQuery(MiniCampaign.findById(campaign._id))));
  } catch (error) {
    if (error instanceof MediaError || error.statusCode) throw error;
    console.error(error);
    res.status(500).json({ message: "Mini kampanya oluşturulamadı." });
  }
};

exports.getMiniCampaigns = async (_req, res) => {
  try {
    const campaigns = await campaignListCache.get(async () =>
      (await miniQuery(MiniCampaign.find().sort({ slot: 1, createdAt: -1 })))
        .map((campaign) => serializeMini(campaign)));
    res.set("Cache-Control", "public, max-age=5, s-maxage=5");
    res.json(campaigns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Mini kampanyalar getirilemedi." });
  }
};

exports.getMiniCampaign = async (req, res) => {
  try {
    const campaign = await miniQuery(MiniCampaign.findById(req.params.id));
    if (!campaign) return res.status(404).json({ message: "Mini kampanya bulunamadı." });
    res.json(serializeMini(campaign, "detail"));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Mini kampanya getirilemedi." });
  }
};

exports.updateMiniCampaign = async (req, res) => {
  try {
    const campaign = await MiniCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Mini kampanya bulunamadı." });
    const slot = parseSlot(req.body.slot);
    if (!req.body.title) {
      return res.status(400).json({ message: "Başlık zorunludur." });
    }
    const products = parseArrayField(req.body.products);
    const categories = parseArrayField(req.body.categories);
    await validateTargets(products, categories);
    if (slot) {
      await MiniCampaign.updateMany(
        { slot, _id: { $ne: campaign._id } },
        { $set: { slot: null } }
      );
    }
    campaign.title = req.body.title;
    campaign.slot = slot;
    campaign.products = products;
    campaign.categories = categories;
    if (req.body.imageAssetId !== undefined) {
      const [asset] = await requireReadyAssets(req.body.imageAssetId, {
        purpose: "mini_campaign_image",
        kind: "image",
        min: 1,
        max: 1,
      });
      campaign.imageAsset = asset._id;
      campaign.imageUrl = legacyAssetUrl(asset, "detail");
    }
    await campaign.save();
    await syncMini(campaign);
    invalidateMiniCampaigns();
    res.json(serializeMini(await miniQuery(MiniCampaign.findById(campaign._id))));
  } catch (error) {
    if (error instanceof MediaError || error.statusCode) throw error;
    console.error(error);
    res.status(500).json({ message: "Mini kampanya güncellenemedi." });
  }
};

exports.deleteMiniCampaign = async (req, res) => {
  try {
    const campaign = await MiniCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Mini kampanya bulunamadı." });
    await removeOwnerMediaReferences("MiniCampaign", campaign._id);
    invalidateMiniCampaigns();
    res.json({ message: "Mini kampanya silindi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Mini kampanya silinemedi." });
  }
};

exports.setActiveMiniCampaign = async (req, res) => {
  try {
    const slot = parseSlot(req.query.slot);
    if (!slot) return res.status(400).json({ message: "Slot 1 veya 2 olmalıdır." });
    const campaign = await MiniCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Mini kampanya bulunamadı." });
    await MiniCampaign.updateMany({ slot }, { $set: { slot: null } });
    campaign.slot = slot;
    await campaign.save();
    invalidateMiniCampaigns();
    res.json({ message: `Mini kampanya ${slot}. slota alındı.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Slot güncellenemedi." });
  }
};

exports.deactivateMiniCampaign = async (req, res) => {
  try {
    const result = await MiniCampaign.updateOne({ _id: req.params.id }, { $set: { slot: null } });
    if (!result.matchedCount) return res.status(404).json({ message: "Mini kampanya bulunamadı." });
    invalidateMiniCampaigns();
    res.json({ message: "Mini kampanya yayından kaldırıldı." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Mini kampanya yayından kaldırılamadı." });
  }
};

exports.getActiveMiniCampaigns = async (req, res) => {
  try {
    const slot = parseSlot(req.query.slot);
    const result = await activeCampaignCaches.get(slot || 0).get(async () => {
      const campaign = await miniQuery(
        MiniCampaign.findOne(slot ? { slot } : { slot: { $in: [1, 2] } }).sort("slot")
      );
      if (!campaign) return null;
      let items = campaign.products?.filter(Boolean).map((product) => applyProductMedia(product, "list")) || [];
      if (!items.length && campaign.categories?.length) {
        const subs = await Category.find({ parent: { $in: campaign.categories }, archivedAt: null }).select("_id");
        const categoryIds = [
          ...campaign.categories.map((category) => category._id || category),
          ...subs.map((category) => category._id),
        ];
        const products = await Product.find({ category: { $in: categoryIds }, archivedAt: null })
          .select("name images imageAssets video videoAsset price originalPrice discount")
          .populate("imageAssets")
          .populate("videoAsset")
          .lean();
        items = products.map((product) => applyProductMedia(product, "list"));
      }
      return { ...serializeMini(campaign, "detail"), items };
    });
    if (!result) return res.status(404).json({ message: "Mini kampanya bulunamadı." });
    res.set("Cache-Control", "public, max-age=5, s-maxage=5");
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Mini kampanya getirilemedi." });
  }
};
