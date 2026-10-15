const mongoose = require("mongoose");
const CartCampaign = require("../models/CartCampaign");
const Product = require("../models/Product");
const { timedCache } = require("../services/timedCache");
const { heldQuantities } = require("../services/stockReservation");
const {
  calculateCartPricing,
  checkCartItems,
  HttpError,
  nowInRange,
} = require("../services/cartPricingService");

const { TEMPLATE_TYPES, HEADER_PLACEMENTS } = require("../models/CartCampaign");
const headerCampaignCache = timedCache(15 * 1000);

function parseDate(value, fieldName) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new HttpError(400, `${fieldName} geçerli bir tarih olmalıdır.`);
  }
  return d;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseNumber(value, fieldName, { min = null, max = null } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new HttpError(400, `${fieldName} sayısal olmalıdır.`);
  }
  if (min !== null && n < min) {
    throw new HttpError(400, `${fieldName} en az ${min} olmalıdır.`);
  }
  if (max !== null && n > max) {
    throw new HttpError(400, `${fieldName} en fazla ${max} olmalıdır.`);
  }
  return n;
}

function parseObjectIdArray(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpError(400, "En az bir ürün seçmelisiniz.");
  }
  const ids = Array.from(
    new Set(
      raw
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .map((s) => {
          if (!mongoose.Types.ObjectId.isValid(s)) {
            throw new HttpError(400, "Geçersiz ürün kimliği gönderildi.");
          }
          return s;
        })
    )
  );
  if (!ids.length) {
    throw new HttpError(400, "En az bir ürün seçmelisiniz.");
  }
  return ids;
}

async function ensureProductsExist(productIds) {
  const existingCount = await Product.countDocuments({ _id: { $in: productIds } });
  if (existingCount !== productIds.length) {
    throw new HttpError(400, "Seçilen ürünlerden bazıları bulunamadı.");
  }
}

async function buildCampaignPayload(body) {
  const name = String(body?.name || "").trim();
  if (!name) throw new HttpError(400, "Kampanya adı zorunludur.");

  const templateType = String(body?.templateType || "");
  if (!TEMPLATE_TYPES.includes(templateType)) {
    throw new HttpError(400, "Geçersiz kampanya şablonu.");
  }

  const headerPlacement = String(body?.headerPlacement || "none");
  if (!HEADER_PLACEMENTS.includes(headerPlacement)) {
    throw new HttpError(400, "Geçersiz header konumu.");
  }

  const startAt = parseDate(body?.startAt, "startAt");
  const endAt = parseDate(body?.endAt, "endAt");
  if (endAt <= startAt) {
    throw new HttpError(400, "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.");
  }

  const productIds = parseObjectIdArray(body?.productIds || []);
  await ensureProductsExist(productIds);

  const stackWithCatalogDiscount = parseBoolean(
    body?.stackWithCatalogDiscount,
    true
  );

  const rules = {
    xQty: null,
    yQty: null,
    discountPercent: null,
    thresholdAmount: null,
  };

  if (templateType === "buy_x_get_y_free") {
    rules.xQty = parseNumber(body?.rules?.xQty, "rules.xQty", { min: 1 });
    rules.yQty = parseNumber(body?.rules?.yQty, "rules.yQty", { min: 1 });
  } else if (templateType === "buy_x_get_percent") {
    rules.xQty = parseNumber(body?.rules?.xQty, "rules.xQty", { min: 1 });
    rules.discountPercent = parseNumber(
      body?.rules?.discountPercent,
      "rules.discountPercent",
      { min: 0.01, max: 100 }
    );
  } else if (templateType === "spend_x_get_percent") {
    rules.thresholdAmount = parseNumber(
      body?.rules?.thresholdAmount,
      "rules.thresholdAmount",
      { min: 0.01 }
    );
    rules.discountPercent = parseNumber(
      body?.rules?.discountPercent,
      "rules.discountPercent",
      { min: 0.01, max: 100 }
    );
  }

  return {
    name,
    templateType,
    isEnabled: parseBoolean(body?.isEnabled, true),
    startAt,
    endAt,
    headerPlacement,
    productIds,
    stackWithCatalogDiscount,
    rules,
  };
}

function withLiveStatus(doc, now = new Date()) {
  return {
    ...doc,
    isLive:
      Boolean(doc.isEnabled) &&
      nowInRange(doc.startAt, doc.endAt, now),
  };
}

exports.listAdminCampaigns = async (_req, res) => {
  try {
    const list = await CartCampaign.find().sort({ createdAt: -1 }).lean();
    const now = new Date();
    res.json(list.map((item) => withLiveStatus(item, now)));
  } catch (err) {
    console.error("[CartCampaign][listAdmin] error:", err);
    res.status(500).json({ message: "Kampanyalar alınamadı." });
  }
};

exports.getAdminCampaign = async (req, res) => {
  try {
    const doc = await CartCampaign.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Kampanya bulunamadı." });
    res.json(withLiveStatus(doc));
  } catch (err) {
    console.error("[CartCampaign][getAdmin] error:", err);
    res.status(500).json({ message: "Kampanya alınamadı." });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const payload = await buildCampaignPayload(req.body);
    const created = await CartCampaign.create(payload);
    headerCampaignCache.invalidate();
    const json = created.toObject();
    res.status(201).json(withLiveStatus(json));
  } catch (err) {
    const status = err?.status || 500;
    const message = err?.status ? err.message : "Kampanya oluşturulamadı.";
    if (!err?.status) {
      console.error("[CartCampaign][create] error:", err);
    }
    res.status(status).json({ message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const existing = await CartCampaign.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Kampanya bulunamadı." });

    const payload = await buildCampaignPayload(req.body);
    existing.set(payload);
    await existing.save();
    headerCampaignCache.invalidate();

    res.json(withLiveStatus(existing.toObject()));
  } catch (err) {
    const status = err?.status || 500;
    const message = err?.status ? err.message : "Kampanya güncellenemedi.";
    if (!err?.status) {
      console.error("[CartCampaign][update] error:", err);
    }
    res.status(status).json({ message });
  }
};

exports.toggleCampaign = async (req, res) => {
  try {
    if (typeof req.body?.isEnabled !== "boolean") {
      return res.status(400).json({ message: "isEnabled boolean olmalıdır." });
    }
    const updated = await CartCampaign.findByIdAndUpdate(
      req.params.id,
      { isEnabled: req.body.isEnabled },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: "Kampanya bulunamadı." });
    headerCampaignCache.invalidate();
    res.json(withLiveStatus(updated));
  } catch (err) {
    console.error("[CartCampaign][toggle] error:", err);
    res.status(500).json({ message: "Kampanya durumu güncellenemedi." });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const deleted = await CartCampaign.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Kampanya bulunamadı." });
    headerCampaignCache.invalidate();
    res.json({ message: "Kampanya silindi." });
  } catch (err) {
    console.error("[CartCampaign][delete] error:", err);
    res.status(500).json({ message: "Kampanya silinemedi." });
  }
};

exports.listHeaderCampaigns = async (_req, res) => {
  try {
    const campaigns = await headerCampaignCache.get(() => {
      const now = new Date();
      return CartCampaign.find({
        isEnabled: true,
        startAt: { $lte: now },
        endAt: { $gte: now },
        headerPlacement: { $in: ["top_panel", "sub_panel"] },
      })
        .sort({ createdAt: 1 })
        .select("name headerPlacement productIds templateType createdAt")
        .lean();
    });

    res.set("Cache-Control", "public, max-age=5, s-maxage=5");
    res.json(campaigns);
  } catch (err) {
    console.error("[CartCampaign][header] error:", err);
    res.status(500).json({ message: "Header kampanyaları alınamadı." });
  }
};

exports.checkCartItems = async (req, res) => {
  try {
    const { quantities } = await heldQuantities(req.body?.heldBy, { userId: req.user?.userId || null });
    const items = await checkCartItems(req.body?.cartItems, { held: quantities });
    res.set("Cache-Control", "no-store");
    return res.json({ items });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    console.error("[CartCampaign][check] error:", err);
    return res.status(500).json({ message: "Sepet kontrol edilemedi." });
  }
};

exports.previewCartPricing = async (req, res) => {
  try {
    const { cartItems, selectedCampaignId, couponCode, customerEmail, heldBy } =
      req.body || {};
    // Müşteri ödeme ekranından döndüyse kendi ayırdığı adetler ve kupon oturumu ona
    // engel sayılmaz; ödeme başlatılırken o oturum kapatılır.
    const userId = req.user?.userId || null;
    const held = await heldQuantities(heldBy, { userId });
    const pricing = await calculateCartPricing(cartItems, {
      selectedCampaignId,
      couponCode,
      customerEmail,
      customerUserId: userId,
      includeEligibleCampaigns: true,
      held: held.quantities,
      heldConversationId: held.conversationId,
    });
    return res.json({
      summary: pricing.summary,
      eligibleCampaigns: pricing.eligibleCampaigns,
      appliedCampaign: pricing.appliedCampaign,
      appliedCoupon: pricing.appliedCoupon,
    });
  } catch (err) {
    const status = err?.status || 500;
    const message = err?.status ? err.message : "Sepet fiyatlandırılamadı.";
    if (!err?.status) {
      console.error("[CartCampaign][preview] error:", err);
    }
    return res.status(status).json({ message, source: err?.source || null });
  }
};
