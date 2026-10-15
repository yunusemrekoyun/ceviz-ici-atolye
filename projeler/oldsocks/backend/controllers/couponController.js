const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
const Product = require("../models/Product");
const { HttpError } = require("../services/cartPricingService");
const { normalizeCouponCode } = require("../utils/couponUsageService");

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
        .map((id) => {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new HttpError(400, "Geçersiz ürün kimliği gönderildi.");
          }
          return id;
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

async function buildCouponPayload(body) {
  const code = normalizeCouponCode(body?.code);
  if (!code) throw new HttpError(400, "Kupon kodu zorunludur.");

  const discountType = String(body?.discountType || "").trim();
  if (!["percent", "fixed"].includes(discountType)) {
    throw new HttpError(400, "Geçersiz indirim tipi.");
  }

  const discountValue = parseNumber(body?.discountValue, "discountValue", {
    min: 0.01,
    max: discountType === "percent" ? 100 : null,
  });
  const minimumSubtotal = parseNumber(body?.minimumSubtotal ?? 0, "minimumSubtotal", {
    min: 0,
  });

  const productIds = parseObjectIdArray(body?.productIds || []);
  await ensureProductsExist(productIds);

  let expiresAt = null;
  if (body?.expiresAt) {
    expiresAt = new Date(body.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) throw new HttpError(400, "Geçersiz bitiş tarihi.");
  }
  let maxUses = null;
  if (body?.maxUses !== undefined && body?.maxUses !== null && body?.maxUses !== "") {
    maxUses = Number(body.maxUses);
    if (!Number.isSafeInteger(maxUses) || maxUses < 1) {
      throw new HttpError(400, "Kullanım sınırı 1 veya daha büyük bir tam sayı olmalıdır.");
    }
  }

  return {
    code,
    isEnabled: parseBoolean(body?.isEnabled, true),
    discountType,
    discountValue,
    minimumSubtotal,
    productIds,
    expiresAt,
    maxUses,
  };
}

exports.listAdminCoupons = async (_req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json(coupons);
  } catch (err) {
    console.error("[Coupon][list] error:", err);
    res.status(500).json({ message: "Kuponlar alınamadı." });
  }
};

exports.getAdminCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).lean();
    if (!coupon) return res.status(404).json({ message: "Kupon bulunamadı." });
    res.json(coupon);
  } catch (err) {
    console.error("[Coupon][get] error:", err);
    res.status(500).json({ message: "Kupon alınamadı." });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const payload = await buildCouponPayload(req.body);
    const existing = await Coupon.exists({ code: payload.code });
    if (existing) {
      return res.status(409).json({ message: "Bu kupon kodu zaten kullanılıyor." });
    }

    const created = await Coupon.create(payload);
    res.status(201).json(created.toObject());
  } catch (err) {
    const status = err?.status || 500;
    const message = err?.status ? err.message : "Kupon oluşturulamadı.";
    if (!err?.status) console.error("[Coupon][create] error:", err);
    res.status(status).json({ message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Kupon bulunamadı." });

    const payload = await buildCouponPayload(req.body);
    const duplicate = await Coupon.exists({
      _id: { $ne: coupon._id },
      code: payload.code,
    });
    if (duplicate) {
      return res.status(409).json({ message: "Bu kupon kodu zaten kullanılıyor." });
    }

    coupon.set(payload);
    await coupon.save();
    res.json(coupon.toObject());
  } catch (err) {
    const status = err?.status || 500;
    const message = err?.status ? err.message : "Kupon güncellenemedi.";
    if (!err?.status) console.error("[Coupon][update] error:", err);
    res.status(status).json({ message });
  }
};

exports.toggleCoupon = async (req, res) => {
  try {
    if (typeof req.body?.isEnabled !== "boolean") {
      return res.status(400).json({ message: "isEnabled boolean olmalıdır." });
    }

    const updated = await Coupon.findByIdAndUpdate(
      req.params.id,
      { isEnabled: req.body.isEnabled },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Kupon bulunamadı." });
    res.json(updated);
  } catch (err) {
    console.error("[Coupon][toggle] error:", err);
    res.status(500).json({ message: "Kupon durumu güncellenemedi." });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const deleted = await Coupon.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Kupon bulunamadı." });
    res.json({ message: "Kupon silindi." });
  } catch (err) {
    console.error("[Coupon][delete] error:", err);
    res.status(500).json({ message: "Kupon silinemedi." });
  }
};
