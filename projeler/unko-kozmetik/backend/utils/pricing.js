/********************************************************
 * backend/utils/pricing.js
 * Sepet tutarı her zaman sunucuda, veritabanındaki fiyatlardan hesaplanır.
 * Tüm ara hesaplar kuruş (tam sayı) cinsindendir.
 ********************************************************/
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const { HttpError, exactMatch } = require("./http");
const { imageUrl } = require("./productSerializer");

const FREE_SHIPPING_THRESHOLD = 1750; // TL
const SHIPPING_FEE = 200; // TL
const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

const toTL = (kurus) => Math.round(kurus) / 100;

// Ürün indirimi uygulanmış birim fiyat (kuruş)
const baseUnitKurus = (price) => {
  const current = Number(price?.current) || 0;
  const discount = Number(price?.discount) || 0;
  return Math.round(current * 100 * (1 - discount / 100));
};

const findCoupon = async (code) => {
  const trimmed = typeof code === "string" ? code.trim() : "";
  if (!trimmed) return null;
  return Coupon.findOne({ code: exactMatch(trimmed) });
};

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, "Sepetiniz boş.");
  }
  if (items.length > MAX_ITEMS) {
    throw new HttpError(
      400,
      `Sepette en fazla ${MAX_ITEMS} farklı ürün olabilir.`
    );
  }
  return items.map((it) => {
    const quantity = Number(it?.quantity);
    if (!mongoose.isValidObjectId(it?.productId)) {
      throw new HttpError(400, "Sepette geçersiz bir ürün var.");
    }
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      throw new HttpError(
        400,
        `Ürün adedi 1 ile ${MAX_QUANTITY} arasında olmalıdır.`
      );
    }
    return {
      productId: String(it.productId),
      quantity,
      color: it.color ? String(it.color) : null,
      size: it.size ? String(it.size) : null,
    };
  });
};

/**
 * items: [{ productId, quantity, color, size }]
 * Dönüş: satırlar, eksik/uyumsuz ürünler, kupon ve toplamlar (TL)
 */
const buildQuote = async (rawItems, couponCode) => {
  const items = normalizeItems(rawItems);

  const products = await Product.find({
    _id: { $in: items.map((it) => it.productId) },
  })
    .select("name brand price colors sizes category img._id")
    .populate("category", "name");

  let coupon = null;
  let couponError = null;
  if (couponCode) {
    coupon = await findCoupon(couponCode);
    if (!coupon) couponError = "Kupon kodu geçersiz veya süresi dolmuş.";
  }
  const couponPercent = coupon?.discountPercent || 0;

  const lines = [];
  const issues = [];

  for (const it of items) {
    const p = products.find((prod) => prod._id.equals(it.productId));
    if (!p) {
      issues.push({
        productId: it.productId,
        reason: "missing",
        message: "Ürün artık satışta değil.",
      });
      continue;
    }
    if (p.colors?.length && (!it.color || !p.colors.includes(it.color))) {
      issues.push({
        productId: it.productId,
        reason: "variant",
        message: `${p.name} için geçerli bir renk seçin.`,
      });
      continue;
    }
    if (p.sizes?.length && (!it.size || !p.sizes.includes(it.size))) {
      issues.push({
        productId: it.productId,
        reason: "variant",
        message: `${p.name} için geçerli bir boyut seçin.`,
      });
      continue;
    }

    const base = baseUnitKurus(p.price);
    const unit = Math.round(base * (1 - couponPercent / 100));
    lines.push({
      productId: p._id,
      name: p.name,
      brand: p.brand || "",
      category: p.category?.name || "",
      image: p.img?.[0] ? imageUrl(p._id, p.img[0]._id) : null,
      color: p.colors?.length ? it.color : null,
      size: p.sizes?.length ? it.size : null,
      quantity: it.quantity,
      baseUnitKurus: base,
      unitKurus: unit,
    });
  }

  const subtotalKurus = lines.reduce(
    (s, l) => s + l.baseUnitKurus * l.quantity,
    0
  );
  const itemsTotalKurus = lines.reduce(
    (s, l) => s + l.unitKurus * l.quantity,
    0
  );
  const shippingKurus =
    lines.length === 0 || itemsTotalKurus >= FREE_SHIPPING_THRESHOLD * 100
      ? 0
      : SHIPPING_FEE * 100;

  return {
    lines,
    issues,
    coupon: coupon
      ? { code: coupon.code, discountPercent: coupon.discountPercent }
      : null,
    couponError,
    subtotalKurus,
    couponDiscountKurus: subtotalKurus - itemsTotalKurus,
    itemsTotalKurus,
    shippingKurus,
    totalKurus: itemsTotalKurus + shippingKurus,
  };
};

// İstemciye dönecek sade, TL cinsinden özet
const quoteToJSON = (quote) => ({
  items: quote.lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    color: l.color,
    size: l.size,
    quantity: l.quantity,
    unitPrice: toTL(l.baseUnitKurus),
    finalUnitPrice: toTL(l.unitKurus),
    lineTotal: toTL(l.unitKurus * l.quantity),
  })),
  issues: quote.issues,
  coupon: quote.coupon,
  couponError: quote.couponError,
  subtotal: toTL(quote.subtotalKurus),
  couponDiscount: toTL(quote.couponDiscountKurus),
  shipping: toTL(quote.shippingKurus),
  total: toTL(quote.totalKurus),
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  shippingFee: SHIPPING_FEE,
});

module.exports = {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  toTL,
  findCoupon,
  buildQuote,
  quoteToJSON,
};
