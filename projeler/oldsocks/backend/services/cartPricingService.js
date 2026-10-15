const mongoose = require("mongoose");
const Product = require("../models/Product");
const ShippingMethod = require("../models/ShippingMethod");
const CartCampaign = require("../models/CartCampaign");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const CouponUsage = require("../models/CouponUsage");
const { normalizeCouponCode } = require("../utils/couponUsageService");
const { COUPON_USED_STATUSES, customerIdentity } = require("./couponRules");

const PENDING_HOLD_MS = 24 * 60 * 60 * 1000;

class HttpError extends Error {
  constructor(status, message, extras = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extras);
  }
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function normalizeSize(size) {
  if (size === null || size === undefined) return "";
  return String(size).trim();
}

function nowInRange(startAt, endAt, now = new Date()) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const ts = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  return start <= ts && ts <= end;
}

function buildAggregatedItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, "Sepet boş veya geçersiz.");
  }
  if (rawItems.length > 100) {
    throw new HttpError(400, "Sepette izin verilenden fazla ürün satırı var.");
  }

  const aggregated = new Map();

  rawItems.forEach((item) => {
    const id = String(item?.id || item?.productId || "").trim();
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw new HttpError(400, "Geçersiz ürün kimliği.");
    }

    const qty = Number(item?.qty);
    if (!Number.isSafeInteger(qty) || qty <= 0 || qty > 1000) {
      throw new HttpError(400, "Geçersiz adet değeri.");
    }

    const sizeKey = normalizeSize(item?.size);
    const key = `${id}:::${sizeKey}`;
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        id,
        size: sizeKey,
        qty,
      });
    } else {
      const nextQty = aggregated.get(key).qty + qty;
      if (!Number.isSafeInteger(nextQty) || nextQty > 1000) {
        throw new HttpError(400, "Geçersiz adet değeri.");
      }
      aggregated.get(key).qty = nextQty;
    }
  });

  return aggregated;
}

function sumCheapestUnits(lines, neededUnits, useOriginal = false) {
  let remaining = Math.floor(Number(neededUnits || 0));
  if (remaining <= 0) return 0;

  const buckets = lines
    .map((line) => ({
      unitPrice: useOriginal
        ? Number(line.originalPrice || 0)
        : Number(line.price || 0),
      qty: Number(line.qty || 0),
    }))
    .filter((b) => Number.isFinite(b.unitPrice) && b.unitPrice >= 0 && b.qty > 0)
    .sort((a, b) => a.unitPrice - b.unitPrice);

  let total = 0;
  for (const bucket of buckets) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, bucket.qty);
    total += take * bucket.unitPrice;
    remaining -= take;
  }

  return round2(total);
}

function computePercentDiscount({
  currentSubtotal,
  originalSubtotal,
  discountPercent,
  stackWithCatalogDiscount,
}) {
  const current = Number(currentSubtotal || 0);
  const original = Number(originalSubtotal || 0);
  const percent = Number(discountPercent || 0);

  if (!Number.isFinite(current) || current <= 0) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return 0;

  if (stackWithCatalogDiscount) {
    return round2((current * percent) / 100);
  }

  const campaignOnlyTotal = round2(original * (1 - percent / 100));
  return round2(Math.max(0, current - campaignOnlyTotal));
}

function evaluateCouponForLines(coupon, lines) {
  const coveredSet = new Set((coupon.productIds || []).map((id) => String(id)));
  const coveredLines = lines.filter((line) => coveredSet.has(String(line.productId)));
  if (!coveredLines.length) {
    throw new HttpError(409, "Kupon sepetinizdeki ürünler için geçerli değil.", {
      source: "coupon",
    });
  }

  const coveredSubtotal = round2(
    coveredLines.reduce(
      (sum, line) => sum + Number(line.price || 0) * Number(line.qty || 0),
      0
    )
  );

  const minimumSubtotal = Number(coupon.minimumSubtotal || 0);
  if (coveredSubtotal < minimumSubtotal) {
    throw new HttpError(
      409,
      `Kuponu kullanmak için kapsanan ürünlerde en az ₺${minimumSubtotal.toFixed(
        2
      )} sepet tutarına ulaşmalısınız.`,
      { source: "coupon" }
    );
  }

  let savings = 0;
  if (coupon.discountType === "percent") {
    savings = round2((coveredSubtotal * Number(coupon.discountValue || 0)) / 100);
  } else if (coupon.discountType === "fixed") {
    savings = round2(Number(coupon.discountValue || 0));
  }

  savings = round2(Math.max(0, Math.min(savings, coveredSubtotal)));
  if (savings <= 0) {
    throw new HttpError(409, "Kupon indirimi hesaplanamadı.", {
      source: "coupon",
    });
  }

  return {
    couponId: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue || 0),
    minimumSubtotal,
    savings,
    details: {
      coveredSubtotal,
      coveredProductCount: coveredLines.length,
    },
  };
}

function evaluateCampaignForLines(campaign, lines) {
  const coveredSet = new Set((campaign.productIds || []).map((id) => String(id)));
  const coveredLines = lines.filter((line) => coveredSet.has(String(line.productId)));
  if (!coveredLines.length) return null;

  const coveredQty = coveredLines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const coveredSubtotal = round2(
    coveredLines.reduce(
      (sum, line) => sum + Number(line.price || 0) * Number(line.qty || 0),
      0
    )
  );
  const coveredOriginalSubtotal = round2(
    coveredLines.reduce(
      (sum, line) =>
        sum + Number(line.originalPrice || line.price || 0) * Number(line.qty || 0),
      0
    )
  );

  const stackWithCatalogDiscount =
    campaign.templateType === "buy_x_get_y_free"
      ? true
      : campaign.stackWithCatalogDiscount !== false;

  let savings = 0;
  let details = {};

  if (campaign.templateType === "buy_x_get_y_free") {
    const xQty = Number(campaign.rules?.xQty || 0);
    const yQty = Number(campaign.rules?.yQty || 0);
    if (xQty < 1 || yQty < 1) return null;

    const cycle = xQty + yQty;
    const cycleCount = Math.floor(coveredQty / cycle);
    const freeUnits = cycleCount * yQty;
    if (freeUnits <= 0) return null;

    savings = sumCheapestUnits(coveredLines, freeUnits, false);
    details = {
      xQty,
      yQty,
      cycle,
      cycleCount,
      freeUnits,
      coveredQty,
    };
  } else if (campaign.templateType === "buy_x_get_percent") {
    const xQty = Number(campaign.rules?.xQty || 0);
    const discountPercent = Number(campaign.rules?.discountPercent || 0);
    if (xQty < 1 || discountPercent <= 0) return null;
    if (coveredQty < xQty) return null;

    savings = computePercentDiscount({
      currentSubtotal: coveredSubtotal,
      originalSubtotal: coveredOriginalSubtotal,
      discountPercent,
      stackWithCatalogDiscount,
    });
    details = {
      xQty,
      discountPercent,
      coveredQty,
      coveredSubtotal,
    };
  } else if (campaign.templateType === "spend_x_get_percent") {
    const thresholdAmount = Number(campaign.rules?.thresholdAmount || 0);
    const discountPercent = Number(campaign.rules?.discountPercent || 0);
    if (thresholdAmount <= 0 || discountPercent <= 0) return null;
    if (coveredSubtotal < thresholdAmount) return null;

    savings = computePercentDiscount({
      currentSubtotal: coveredSubtotal,
      originalSubtotal: coveredOriginalSubtotal,
      discountPercent,
      stackWithCatalogDiscount,
    });
    details = {
      thresholdAmount,
      discountPercent,
      coveredSubtotal,
    };
  } else {
    return null;
  }

  savings = round2(Math.max(0, Math.min(savings, coveredSubtotal)));
  if (savings <= 0) return null;

  return {
    campaignId: campaign._id,
    name: campaign.name,
    templateType: campaign.templateType,
    stackWithCatalogDiscount,
    headerPlacement: campaign.headerPlacement || "none",
    savings,
    details,
  };
}

async function getEligibleCampaigns(lines, now = new Date()) {
  const productIdsInCart = Array.from(
    new Set(lines.map((line) => String(line.productId)))
  );
  if (!productIdsInCart.length) return [];

  const campaigns = await CartCampaign.find({
    isEnabled: true,
    startAt: { $lte: now },
    endAt: { $gte: now },
    productIds: { $in: productIdsInCart },
  })
    .sort({ createdAt: 1 })
    .lean();

  return campaigns
    .filter((c) => nowInRange(c.startAt, c.endAt, now))
    .map((campaign) => evaluateCampaignForLines(campaign, lines))
    .filter(Boolean);
}

async function resolveCouponForLines(selectedCouponCode, lines, context = {}) {
  const code = normalizeCouponCode(selectedCouponCode);
  if (!code) return null;
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    throw new HttpError(400, "Kupon kodunu kontrol edin.", {
      source: "coupon",
    });
  }

  const coupon = await Coupon.findOne({
    code,
    isEnabled: true,
  }).lean();

  if (!coupon) {
    throw new HttpError(404, "Kupon bulunamadı veya aktif değil.", {
      source: "coupon",
    });
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) {
    throw new HttpError(409, "Bu kuponun süresi dolmuş.", { source: "coupon" });
  }

  // Ödenmiş siparişler ile başka müşterilerin son 24 saatte açtığı ödeme oturumları
  // kullanım sayılır. Aynı müşterinin aynı tarayıcıdaki önceki oturumu ödeme başlatılırken
  // önce kapatılır (services/stockReservation: releaseCustomerPendingOrders), böylece kartı
  // reddedilen müşteri tekrar deneyebilir. Açık oturum e-postayla eşleştirilip engellenmez
  // (e-postayı bilen biri müşteriyi kilitleyemesin); aynı müşterinin iki oturumu da
  // ödenirse ikincisi ödeme anında incelemeye düşer (services/couponRules).
  const identity = await customerIdentity(context);
  const usedFilter = { "coupon.couponId": coupon._id, status: { $in: COUPON_USED_STATUSES } };

  if (coupon.maxUses) {
    const othersPending = {
      "coupon.couponId": coupon._id,
      status: "pending",
      createdAt: { $gte: new Date(Date.now() - PENDING_HOLD_MS) },
      ...(identity.orderConditions.length ? { $nor: identity.orderConditions } : {}),
      ...(context.heldConversationId ? { conversationId: { $ne: context.heldConversationId } } : {}),
    };
    const used = await Order.countDocuments({ $or: [usedFilter, othersPending] });
    if (used >= coupon.maxUses) {
      throw new HttpError(409, "Bu kupon kullanım sınırına ulaştı.", { source: "coupon" });
    }
  }

  if (identity.orderConditions.length) {
    const alreadyUsed =
      (await CouponUsage.exists({ couponId: coupon._id, $or: identity.usageConditions })) ||
      (await Order.exists({ ...usedFilter, $or: identity.orderConditions }));
    if (alreadyUsed) {
      throw new HttpError(409, "Bu kuponu daha önce kullandınız.", {
        source: "coupon",
      });
    }
  }

  return evaluateCouponForLines(coupon, lines);
}

function selectCampaign(eligibleCampaigns, selectedCampaignId) {
  if (!selectedCampaignId) {
    return null;
  }

  const found = eligibleCampaigns.find(
    (item) => String(item.campaignId) === String(selectedCampaignId)
  );
  if (!found) {
    throw new HttpError(
      409,
      "Seçilen kampanya sepet koşullarını artık sağlamıyor.",
      { source: "campaign" }
    );
  }
  return found;
}

// held: bu tarayıcının açık ödeme oturumunun ayırdığı adetler ("ürün|beden" → adet);
// müşteriye mevcut sayılır (services/stockReservation: heldQuantities).
function heldFor(held, productId, sizeRecord) {
  return held instanceof Map ? held.get(`${productId}|${sizeRecord?.size || ""}`) || 0 : 0;
}

// Sepet eşitleme: her satırın güncel fiyatını ve stoğunu döner, hata fırlatmaz.
// status: ok | missing (ürün yok/arşivde) | size_missing | insufficient (stok az)
async function checkCartItems(rawItems, { held } = {}) {
  if (!Array.isArray(rawItems) || rawItems.length > 100) {
    throw new HttpError(400, "Sepet boş veya geçersiz.");
  }
  const lines = rawItems.map((item) => ({
    id: String(item?.id || item?.productId || "").trim(),
    size: normalizeSize(item?.size),
    qty: Number(item?.qty),
  }));
  const ids = [...new Set(lines.map((l) => l.id).filter((id) => mongoose.isObjectIdOrHexString(id)))];
  const products = ids.length
    ? await Product.find({ _id: { $in: ids }, archivedAt: null })
        .select("name price originalPrice sizes")
        .lean()
    : [];
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return lines.map((line) => {
    const product = byId.get(line.id);
    if (!product) return { id: line.id, size: line.size, status: "missing" };
    const sizeRecord = (product.sizes || []).find((s) => normalizeSize(s?.size) === line.size);
    const base = {
      id: line.id,
      size: line.size,
      name: product.name,
      price: Number(product.price),
      originalPrice: Number(product.originalPrice) > 0 ? Number(product.originalPrice) : Number(product.price),
    };
    if (!sizeRecord) return { ...base, status: "size_missing", available: 0 };
    const available = Math.max(0, Number(sizeRecord.stock || 0)) + heldFor(held, product._id, sizeRecord);
    const qty = Number.isSafeInteger(line.qty) && line.qty > 0 ? line.qty : 1;
    return { ...base, available, status: qty > available ? "insufficient" : "ok" };
  });
}

async function calculateCartPricing(rawItems, options = {}) {
  const selectedCampaignId = options?.selectedCampaignId
    ? String(options.selectedCampaignId)
    : "";
  const selectedCouponCode = options?.couponCode ? String(options.couponCode) : "";
  const includeEligibleCampaigns = options?.includeEligibleCampaigns !== false;
  const now = options?.now instanceof Date ? options.now : new Date();

  const aggregated = buildAggregatedItems(rawItems);

  const productIds = Array.from(
    new Set(Array.from(aggregated.values()).map((it) => it.id))
  );
  const products = await Product.find({ _id: { $in: productIds }, archivedAt: null })
    .select("name price originalPrice sizes color")
    .lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let subTotal = 0;
  const orderItems = [];

  for (const entry of aggregated.values()) {
    const product = productMap.get(entry.id);
    if (!product) {
      throw new HttpError(400, "Sepetteki ürün bulunamadı.");
    }

    const unitPrice = Number(product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new HttpError(400, `Ürünün fiyatı geçersiz: ${product.name}`);
    }

    const unitOriginalPrice = Number(product.originalPrice);
    const normalizedOriginalPrice =
      Number.isFinite(unitOriginalPrice) && unitOriginalPrice > 0
        ? unitOriginalPrice
        : unitPrice;

    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const sizeRecord = sizes.find((s) => normalizeSize(s?.size) === entry.size);

    if (!sizeRecord) {
      throw new HttpError(409, `Seçilen beden stokta yok: ${product.name}`);
    }

    const available = Number(sizeRecord.stock || 0) + heldFor(options?.held, product._id, sizeRecord);
    if (entry.qty > available) {
      throw new HttpError(409, `Yetersiz stok: ${product.name}`);
    }

    subTotal += unitPrice * entry.qty;
    orderItems.push({
      productId: product._id,
      name: product.name,
      price: unitPrice,
      originalPrice: normalizedOriginalPrice,
      qty: entry.qty,
      size: sizeRecord.size || "",
      sizeId: sizeRecord._id || null,
      // Renk ürün varyantının sunucudaki kaydından gelir; istemci sipariş
      // içeriğini serbest bir renk metniyle değiştiremez.
      color: product.color ?? "",
    });
  }

  subTotal = round2(subTotal);

  const eligibleCampaigns = includeEligibleCampaigns
    ? await getEligibleCampaigns(orderItems, now)
    : [];

  const appliedCoupon = await resolveCouponForLines(selectedCouponCode, orderItems, {
    customerUserId: options?.customerUserId || null,
    customerEmail: options?.customerEmail || "",
    heldConversationId: options?.heldConversationId || null,
  });

  const appliedCampaign =
    includeEligibleCampaigns && !appliedCoupon
      ? selectCampaign(eligibleCampaigns, selectedCampaignId)
      : null;

  const campaignDiscount = round2(appliedCampaign?.savings || 0);
  const couponDiscount = round2(appliedCoupon?.savings || 0);
  const discountedSubTotal = round2(
    Math.max(0, subTotal - campaignDiscount - couponDiscount)
  );

  const shippingMethod = await ShippingMethod.findOne()
    .sort({ createdAt: -1 })
    .lean();

  let shippingFee = 0;
  let shippingName = null;
  let freeShippingThreshold = null;
  if (shippingMethod) {
    shippingName = shippingMethod.name || null;
    const baseFee = Number(shippingMethod.fee || 0);
    const threshold =
      shippingMethod.freeShippingThreshold === null ||
      shippingMethod.freeShippingThreshold === undefined
        ? null
        : Number(shippingMethod.freeShippingThreshold);
    const qualifiesForFree =
      threshold !== null && Number.isFinite(threshold) && subTotal >= threshold;
    shippingFee = qualifiesForFree ? 0 : baseFee;
    if (threshold !== null && Number.isFinite(threshold)) {
      freeShippingThreshold = threshold;
    }
  }

  shippingFee = round2(shippingFee);
  const grandTotal = round2(discountedSubTotal + shippingFee);

  return {
    items: orderItems.map((it) => ({
      ...it,
      productId: it.productId,
    })),
    eligibleCampaigns: appliedCoupon
      ? []
      : eligibleCampaigns.map((campaign) => ({
          campaignId: campaign.campaignId,
          name: campaign.name,
          templateType: campaign.templateType,
          savings: campaign.savings,
          details: campaign.details,
        })),
    appliedCampaign: appliedCampaign
      ? {
          campaignId: appliedCampaign.campaignId,
          name: appliedCampaign.name,
          templateType: appliedCampaign.templateType,
          savings: appliedCampaign.savings,
          details: appliedCampaign.details,
        }
      : null,
    appliedCoupon: appliedCoupon
      ? {
          couponId: appliedCoupon.couponId,
          code: appliedCoupon.code,
          discountType: appliedCoupon.discountType,
          discountValue: appliedCoupon.discountValue,
          minimumSubtotal: appliedCoupon.minimumSubtotal,
          savings: appliedCoupon.savings,
          details: appliedCoupon.details,
        }
      : null,
    summary: {
      subTotal,
      campaignDiscount,
      couponDiscount,
      discountedSubTotal,
      shippingFee,
      shippingName,
      grandTotal,
      isFree: shippingFee === 0,
      freeShippingThreshold,
      couponCode: appliedCoupon?.code || null,
    },
  };
}

module.exports = {
  HttpError,
  buildAggregatedItems,
  calculateCartPricing,
  checkCartItems,
  nowInRange,
};
