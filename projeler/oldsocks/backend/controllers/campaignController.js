const Campaign = require("../models/Campaign");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { MediaError } = require("../services/media/errors");
const { timedCache } = require("../services/timedCache");
const {
  applyProductMedia,
  legacyAssetUrl,
  publicAsset,
  removeOwnerMediaReferences,
  requireReadyAssets,
  syncOwnerMediaReferences,
} = require("../services/media/assets");

const activeCampaignCache = timedCache(15 * 1000);

function parseOpacity(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const result = Number(value);
  if (Number.isInteger(result) && result >= 0 && result <= 100) return result;
  const error = new Error(`${label} 0–100 arasında olmalıdır.`);
  error.statusCode = 400;
  throw error;
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

function campaignQuery(query) {
  return query
    .populate("imageAsset")
    .populate({
      path: "products",
      match: { archivedAt: null },
      select: "name images imageAssets video videoAsset price",
      populate: [{ path: "imageAssets" }, { path: "videoAsset" }],
    })
    .populate({ path: "categories", match: { archivedAt: null }, select: "name image imageAsset" });
}

function serializeCampaign(campaign, context = "list") {
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

async function syncCampaign(campaign) {
  await syncOwnerMediaReferences({
    ownerType: "Campaign",
    ownerId: campaign._id,
    fields: { image: campaign.imageAsset ? [campaign.imageAsset] : [] },
  });
}

exports.createCampaign = async (req, res) => {
  try {
    const { title, subtitle, buttonText } = req.body;
    if (!String(buttonText || "").trim()) {
      return res.status(400).json({ message: "Buton metni zorunludur." });
    }
    const products = parseArrayField(req.body.products);
    const categories = parseArrayField(req.body.categories);
    await validateTargets(products, categories);
    const [asset] = await requireReadyAssets(req.body.imageAssetId, {
      purpose: "campaign_image",
      kind: "image",
      min: 1,
      max: 1,
    });
    const campaign = await Campaign.create({
      title: String(title || "").trim(),
      subtitle,
      buttonText,
      overlayOpacity: parseOpacity(req.body.overlayOpacity, 0, "Görsel karartması"),
      buttonOpacity: parseOpacity(req.body.buttonOpacity, 30, "Buton opaklığı"),
      imageAsset: asset._id,
      imageUrl: legacyAssetUrl(asset, "detail"),
      products,
      categories,
    });
    await syncCampaign(campaign);
    activeCampaignCache.invalidate();
    const populated = await campaignQuery(Campaign.findById(campaign._id));
    res.status(201).json(serializeCampaign(populated));
  } catch (error) {
    if (error instanceof MediaError || error.statusCode) throw error;
    console.error(error);
    res.status(500).json({ message: "Kampanya oluşturulamadı." });
  }
};

exports.getCampaigns = async (_req, res) => {
  try {
    const campaigns = await campaignQuery(Campaign.find());
    res.set("Cache-Control", "private, no-store");
    res.json(campaigns.map((campaign) => serializeCampaign(campaign)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Kampanyalar getirilemedi." });
  }
};

exports.getCampaign = async (req, res) => {
  try {
    const campaign = await campaignQuery(Campaign.findById(req.params.id));
    if (!campaign) return res.status(404).json({ message: "Kampanya bulunamadı." });
    res.json(serializeCampaign(campaign, "detail"));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Kampanya getirilemedi." });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Kampanya bulunamadı." });
    if (!String(req.body.buttonText || "").trim()) {
      return res.status(400).json({ message: "Buton metni zorunludur." });
    }
    const products = parseArrayField(req.body.products);
    const categories = parseArrayField(req.body.categories);
    await validateTargets(products, categories);
    campaign.title = String(req.body.title || "").trim();
    campaign.buttonText = req.body.buttonText;
    campaign.overlayOpacity = parseOpacity(req.body.overlayOpacity, campaign.overlayOpacity ?? 0, "Görsel karartması");
    campaign.buttonOpacity = parseOpacity(req.body.buttonOpacity, campaign.buttonOpacity ?? 30, "Buton opaklığı");
    campaign.subtitle = req.body.subtitle ?? campaign.subtitle;
    campaign.products = products;
    campaign.categories = categories;
    if (req.body.imageAssetId !== undefined) {
      const [asset] = await requireReadyAssets(req.body.imageAssetId, {
        purpose: "campaign_image",
        kind: "image",
        min: 1,
        max: 1,
      });
      campaign.imageAsset = asset._id;
      campaign.imageUrl = legacyAssetUrl(asset, "detail");
    }
    await campaign.save();
    await syncCampaign(campaign);
    activeCampaignCache.invalidate();
    const populated = await campaignQuery(Campaign.findById(campaign._id));
    res.json(serializeCampaign(populated));
  } catch (error) {
    if (error instanceof MediaError || error.statusCode) throw error;
    console.error(error);
    res.status(500).json({ message: "Kampanya güncellenemedi." });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Kampanya bulunamadı." });
    await removeOwnerMediaReferences("Campaign", campaign._id);
    activeCampaignCache.invalidate();
    res.json({ message: "Kampanya silindi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Kampanya silinemedi." });
  }
};

exports.setActiveCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Kampanya bulunamadı." });
    await Campaign.updateMany({ _id: { $ne: campaign._id } }, { $set: { isActive: false } });
    campaign.isActive = true;
    await campaign.save();
    activeCampaignCache.invalidate();
    res.json({ message: "Kampanya aktif edildi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Kampanya aktifleştirilemedi." });
  }
};

exports.deactivateCampaign = async (req, res) => {
  try {
    const result = await Campaign.updateOne({ _id: req.params.id }, { $set: { isActive: false } });
    if (!result.matchedCount) return res.status(404).json({ message: "Kampanya bulunamadı." });
    activeCampaignCache.invalidate();
    res.json({ message: "Kampanya pasif yapıldı." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Kampanya pasif yapılamadı." });
  }
};

exports.getActiveCampaign = async (_req, res) => {
  try {
    const result = await activeCampaignCache.get(async () => {
      const campaign = await campaignQuery(Campaign.findOne({ isActive: true }));
      if (!campaign) return null;
      let items = [];
      if (campaign.products?.length) {
        items = campaign.products.filter(Boolean).map((product) => applyProductMedia(product, "list"));
      } else if (campaign.categories?.length) {
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
      const serialized = serializeCampaign(campaign, "detail");
      return { ...serialized, items };
    });
    if (!result) return res.status(404).json({ message: "Aktif kampanya bulunamadı." });
    res.set("Cache-Control", "public, max-age=5, s-maxage=5");
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Aktif kampanya getirilemedi." });
  }
};
