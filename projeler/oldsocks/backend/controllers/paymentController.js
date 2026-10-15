// backend/controllers/paymentController.js
const crypto = require("crypto");
const { getClientIp } = require("../utils/clientIp");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const Order = require("../models/Order");
const { queueOrderMails, queuePaymentReviewAlert } = require("../services/orderMailQueue");
const {
  RELEASED_REASONS,
  finalizeOrderPayment,
  StockUnavailableError,
  OrderPaymentStateError,
} = require("../utils/updateStock");
const { calculateCartPricing } = require("../services/cartPricingService");
const {
  PAYTR_TIMEOUT_MINUTES,
  createOrderWithReservation,
  HoldLimitError,
  holdKeyFor,
  releaseCustomerPendingOrders,
  releaseReservation,
} = require("../services/stockReservation");
const { recordCouponUsageForOrder } = require("../utils/couponUsageService");
const { consentVersionLabel } = require("../services/legalDocuments");

/* Frontend base (ilk origin) */
const FRONTEND_BASE = (() => {
  const raw = process.env.FRONTEND_ORIGIN || "";
  const first = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return first || "http://localhost:5173";
})();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/* helpers */
function tlToKurus(n) {
  return Math.round(Number(n || 0) * 100);
}
function asTL(n) {
  const v = Number(n || 0);
  return "₺" + v.toFixed(2);
}
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

// Mesafeli satış: ön bilgilendirme ve sözleşme onayı olmadan ödeme başlatılmaz.
// Onay; o an yayındaki metin sürümleri (sunucu belirler), zaman, IP ve tarayıcı
// bilgisiyle siparişe yazılır.
async function readConsent(req) {
  const consent = req.body?.consent;
  const version = typeof consent?.version === "string" ? consent.version.trim() : "";
  if (consent?.preInformation !== true || consent?.distanceSales !== true || !/^[\w.-]{1,40}$/.test(version)) {
    return null;
  }
  const now = new Date();
  return {
    preInformationAcceptedAt: now,
    distanceSalesAcceptedAt: now,
    version: await consentVersionLabel(),
    ip: String(getClientIp(req) || "").slice(0, 64) || null,
    userAgent: String(req.get("user-agent") || "").slice(0, 300) || null,
  };
}

// Ödeme başlatılırken son adet başka bir müşteriye ayrılmışsa sipariş oluşmaz.
const STOCK_TAKEN = {
  code: "STOCK_TAKEN",
  source: "stock",
  message:
    "Sepetinizdeki bir ürünün stoğu az önce tükendi ya da başka bir müşterinin ödemesi için ayrıldı. Sepetinizi kontrol edip tekrar deneyin.",
};
const TOO_MANY_HOLDS = {
  code: "TOO_MANY_HOLDS",
  message: "Bu bağlantıdan şu anda çok sayıda açık ödeme var. Birkaç dakika sonra tekrar deneyin.",
};
// Stok ayrılamadıysa müşteriye dönen yanıt: son adet başka müşteriye ayrıldı ya da
// bağlantının açık ayrım sınırı doldu.
function reservationRefusal(err) {
  if (err instanceof StockUnavailableError) return { status: 409, body: STOCK_TAKEN };
  if (err instanceof HoldLimitError) return { status: 429, body: TOO_MANY_HOLDS };
  throw err;
}

// Yöneticinin iptal ettiği ya da otomatik tamamlanamayan siparişe ödeme geldi: para
// alındı, sessizce geçme; incelemeye al ve yöneticiye haber ver. Ödemesi zaten işlenmiş
// (aynı paymentId) ya da iade kaydı olan sipariş için gelen bildirim, iade edilmiş
// ödemenin tekrarıdır: sipariş olduğu gibi kalır.
async function markPaidAfterCancel(orderId, paymentId) {
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: "cancelled", paymentId: { $ne: paymentId }, "refund.at": null },
    {
      $set: {
        status: "payment_review",
        paymentId,
        paymentReceivedAt: new Date(),
        cancelReason: "paid_after_cancel",
      },
    },
    { new: true }
  );
  if (updated) queuePaymentReviewAlert(updated._id);
  return updated;
}

const CONSENT_REQUIRED = {
  code: "CONSENT_REQUIRED",
  message:
    "Devam etmek için ön bilgilendirme formunu ve mesafeli satış sözleşmesini onaylayın. Sayfa açık kaldıysa yenileyip tekrar deneyin.",
};

// T.C. kimlik no misafir ödemesinde isteğe bağlıdır (müşterinin talebi). Girilmezse aynı
// uzunlukta 11111111111 atanır ve siparişte "otomatik atandı" olarak işaretlenir.
const IDENTITY_FALLBACK = "11111111111";
function normalizeIdentityNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeTrPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 10) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+90${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("90")) {
    return `+${digits}`;
  }

  return "";
}

async function persistCouponUsage(order, tag) {
  try {
    await recordCouponUsageForOrder(order);
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    const prefix = tag ? `[PAYMENT][${tag}]` : "[PAYMENT]";
    if (isDuplicate) {
      console.warn(`${prefix} coupon usage already recorded`, {
        orderId: String(order?._id || ""),
        couponId: String(order?.coupon?.couponId || ""),
      });
      return;
    }
    console.warn(`${prefix} coupon usage record failed:`, err?.message || err);
  }
}

// Ödeme alındı: sipariş tamamlanır. Kupon kuralı aşıldıysa ya da stok kalmadıysa
// sipariş incelemeye düşer; bu arada iptal edildiyse de para alınmış sipariş kaybolmaz.
// PayTR bildirimi ve mock ödeme aynı yolu kullanır. Dönüş: "paid" | "review"
async function completePaidOrder(order, paymentId, tag) {
  let finalized;
  try {
    // Serbest bırakılmış oturum kararı işlemin içinde, güncel kayda göre verilir:
    // bildirim okunduktan sonra sipariş kapatılmış olabilir.
    finalized = await finalizeOrderPayment(order._id, { allowReleased: true, enforceCoupon: true });
  } catch (e) {
    if (e instanceof OrderPaymentStateError) {
      const current = await Order.findById(order._id).select("status").lean();
      if (current?.status === "cancelled") await markPaidAfterCancel(order._id, paymentId);
      return "review";
    }
    if (!(e instanceof StockUnavailableError)) throw e;
    console.error(`[PAYMENT][${tag}] stock error:`, e.message);
    order.status = "payment_review";
    order.paymentId = paymentId;
    order.paymentReceivedAt = new Date();
    order.cancelReason = "stock_unavailable_after_payment";
    order.cancelledAt = null;
    order.stockUpdated = false;
    await order.save();
    queuePaymentReviewAlert(order._id);
    return "review";
  }

  finalized.paymentId = paymentId;
  finalized.paymentReceivedAt ||= new Date();
  if (finalized.status === "payment_review") {
    await finalized.save();
    queuePaymentReviewAlert(finalized._id);
    return "review";
  }
  await persistCouponUsage(finalized, tag);
  await finalized.save();
  // E-posta yanıt verildikten sonra arka planda gönderilir.
  queueOrderMails(finalized._id);
  return "paid";
}

function buildPaytrBasket(order) {
  const rawItems = Array.isArray(order?.items) ? order.items : [];
  const lines = rawItems
    .map((it) => {
      const qty = Math.max(0, Math.floor(Number(it?.qty || 0)));
      const unitPrice = Math.max(0, Number(it?.price || 0));
      const name = String(it?.name || "Ürün");
      return {
        name,
        qty,
        unitPrice,
        lineTotal: round2(unitPrice * qty),
      };
    })
    .filter((line) => line.qty > 0);

  if (lines.length === 0) return [];

  const baseSubtotal = round2(
    lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0)
  );
  const discountedSubTotal = Number(order?.pricing?.discountedSubTotal);

  const shouldScaleToDiscounted =
    Number.isFinite(discountedSubTotal) &&
    discountedSubTotal >= 0 &&
    discountedSubTotal < baseSubtotal &&
    baseSubtotal > 0;

  if (!shouldScaleToDiscounted) {
    return lines.map((line) => [
      line.name,
      Number(line.unitPrice || 0).toFixed(2),
      line.qty,
    ]);
  }

  const ratio = discountedSubTotal / baseSubtotal;
  const targetKurus = Math.round(discountedSubTotal * 100);

  const scaled = lines.map((line, idx) => {
    const rawKurus = Number(line.lineTotal || 0) * 100 * ratio;
    const floorKurus = Math.max(0, Math.floor(rawKurus));
    const fraction = rawKurus - floorKurus;
    return {
      idx,
      name: line.name,
      floorKurus,
      fraction,
      finalKurus: floorKurus,
    };
  });

  let currentKurus = scaled.reduce((sum, u) => sum + u.floorKurus, 0);
  let remainder = targetKurus - currentKurus;

  if (remainder > 0) {
    const byFraction = [...scaled].sort((a, b) => b.fraction - a.fraction);
    let i = 0;
    while (remainder > 0 && byFraction.length > 0) {
      byFraction[i % byFraction.length].finalKurus += 1;
      remainder -= 1;
      i += 1;
    }
  } else if (remainder < 0) {
    const byFractionAsc = [...scaled].sort((a, b) => a.fraction - b.fraction);
    let i = 0;
    while (remainder < 0 && byFractionAsc.length > 0) {
      const target = byFractionAsc[i % byFractionAsc.length];
      if (target.finalKurus > 0) {
        target.finalKurus -= 1;
        remainder += 1;
      }
      i += 1;
      if (i > byFractionAsc.length * 3 && remainder < 0) break;
    }
  }

  return scaled.map((u) => [u.name, (u.finalKurus / 100).toFixed(2), 1]);
}

exports.startGuestPaymentSession = async (req, res) => {
  try {
    const { cartItems, address, guest, selectedCampaignId, couponCode } =
      req.body || {};
    const consent = await readConsent(req);
    if (!consent) return res.status(400).json(CONSENT_REQUIRED);
    const normalizedGuest = {
      firstName: String(guest?.firstName || "").trim(),
      lastName: String(guest?.lastName || "").trim(),
      email: normalizeEmail(guest?.email),
      phone: normalizeTrPhone(guest?.phone),
      identityNumber: normalizeIdentityNumber(guest?.identityNumber),
      registrationAddress: String(guest?.registrationAddress || "").trim(),
    };
    const normalizedAddress = {
      title:
        String(address?.title || "Teslimat Adresi").trim() || "Teslimat Adresi",
      mainaddress: String(address?.mainaddress || "").trim(),
      street: String(address?.street || "").trim(),
      district: String(address?.district || "").trim(),
      city: String(address?.city || "").trim(),
      postalCode: String(address?.postalCode || "").trim(),
    };

    // 1) Basit zorunlu alan kontrolü (fallback YOK)
    const missing = [];
    if (!normalizedGuest.firstName) missing.push("guest.firstName");
    if (!normalizedGuest.lastName) missing.push("guest.lastName");
    if (!normalizedGuest.email) missing.push("guest.email");
    if (!String(guest?.phone || "").trim()) missing.push("guest.phone");
    if (!normalizedGuest.registrationAddress) missing.push("guest.registrationAddress");

    if (!normalizedAddress.title) missing.push("address.title");
    if (!normalizedAddress.mainaddress) missing.push("address.mainaddress");
    if (!normalizedAddress.street) missing.push("address.street");
    if (!normalizedAddress.city) missing.push("address.city");

    if (!Array.isArray(cartItems) || cartItems.length === 0)
      missing.push("cartItems");

    if (missing.length) {
      return res.status(400).json({
        message: "Eksik/Geçersiz alanlar var.",
        missing,
      });
    }

    const invalid = [];
    if (!EMAIL_REGEX.test(normalizedGuest.email)) invalid.push("guest.email");
    if (!normalizedGuest.phone) invalid.push("guest.phone");
    if (normalizedGuest.identityNumber && normalizedGuest.identityNumber.length !== 11) {
      invalid.push("guest.identityNumber");
    }
    const lengthLimits = {
      "guest.firstName": [normalizedGuest.firstName, 80],
      "guest.lastName": [normalizedGuest.lastName, 80],
      "guest.email": [normalizedGuest.email, 100],
      "guest.registrationAddress": [normalizedGuest.registrationAddress, 500],
      "address.title": [normalizedAddress.title, 80],
      "address.mainaddress": [normalizedAddress.mainaddress, 500],
      "address.street": [normalizedAddress.street, 180],
      "address.district": [normalizedAddress.district, 120],
      "address.city": [normalizedAddress.city, 100],
      "address.postalCode": [normalizedAddress.postalCode, 20],
    };
    for (const [field, [value, limit]] of Object.entries(lengthLimits)) {
      if (value.length > limit) invalid.push(field);
    }
    if (invalid.length) {
      return res.status(422).json({
        message: "Lütfen alıcı bilgilerinizi kontrol edin.",
        invalid,
      });
    }

    // Aynı tarayıcının önceki ödeme oturumu kapatılır; ayırdığı stok yeni denemeye engel olmasın.
    await releaseCustomerPendingOrders({ previousConversationId: req.body?.previousConversationId });

    let pricing;
    try {
      pricing = await calculateCartPricing(cartItems, {
        selectedCampaignId,
        couponCode,
        customerEmail: normalizedGuest.email,
        includeEligibleCampaigns: true,
      });
    } catch (err) {
      const status = err?.status || 500;
      const message = err?.status ? err.message : "Sepet doğrulanamadı.";
      return res.status(status).json({ message, source: err?.source || null });
    }
    if (!(Number(pricing?.summary?.grandTotal) >= 1)) {
      return res.status(422).json({ message: "Sipariş tutarı ödeme için çok düşük." });
    }

    // 2) merchant_oid / orderNumber üret
    const conversationId = uuidv4()
      .replace(/-/g, "")
      .toUpperCase()
      .slice(0, 64);
    const orderNumber = Math.floor(1e9 + Math.random() * 9e9).toString();

    // 3) Order yarat (user YOK, guest DOLU)

    // Stok bu siparişe ayrılır (ödeme ekranı); yetmezse sipariş oluşmaz.
    const createdOrder = await createOrderWithReservation({
      orderNumber,
      user: undefined,
      guest: {
        firstName: normalizedGuest.firstName,
        lastName: normalizedGuest.lastName,
        email: normalizedGuest.email,
        phone: normalizedGuest.phone,
        identityNumber: normalizedGuest.identityNumber || IDENTITY_FALLBACK,
        registrationAddress: normalizedGuest.registrationAddress,
        identityFallbackUsed: !normalizedGuest.identityNumber,
      },
      identityFallbackUsed: !normalizedGuest.identityNumber,
      items: pricing.items,
      totalPrice: pricing.summary.grandTotal,
      campaign: pricing.appliedCampaign
        ? {
            campaignId: pricing.appliedCampaign.campaignId,
            name: pricing.appliedCampaign.name,
            templateType: pricing.appliedCampaign.templateType,
            savings: pricing.appliedCampaign.savings,
            details: pricing.appliedCampaign.details,
          }
        : null,
      coupon: pricing.appliedCoupon
        ? {
            couponId: pricing.appliedCoupon.couponId,
            code: pricing.appliedCoupon.code,
            discountType: pricing.appliedCoupon.discountType,
            discountValue: pricing.appliedCoupon.discountValue,
            minimumSubtotal: pricing.appliedCoupon.minimumSubtotal,
            savings: pricing.appliedCoupon.savings,
            details: pricing.appliedCoupon.details,
          }
        : null,
      pricing: {
        subTotal: pricing.summary.subTotal,
        campaignDiscount: pricing.summary.campaignDiscount,
        couponDiscount: pricing.summary.couponDiscount,
        discountedSubTotal: pricing.summary.discountedSubTotal,
        shippingFee: pricing.summary.shippingFee,
        grandTotal: pricing.summary.grandTotal,
      },
      address: {
        title: normalizedAddress.title,
        mainaddress: normalizedAddress.mainaddress,
        street: normalizedAddress.street,
        district: normalizedAddress.district,
        city: normalizedAddress.city,
        postalCode: normalizedAddress.postalCode,
      },
      conversationId,
      consent,
      status: "pending",
      iyzInit: null,
      shipping: {
        name: pricing.summary.shippingName,
        fee: pricing.summary.shippingFee,
      },
    }, { holdKey: holdKeyFor(consent.ip) }).catch((err) => ({ refusal: reservationRefusal(err) }));
    if (createdOrder.refusal) return res.status(createdOrder.refusal.status).json(createdOrder.refusal.body);

    return res.json({
      conversationId,
      inlineUrl: `${process.env.BACKEND_PUBLIC_URL}/api/v1/payment/inline/${conversationId}`,
      reservedUntil: createdOrder.stockReservedUntil,
      summary: pricing.summary,
      appliedCampaign: pricing.appliedCampaign,
      appliedCoupon: pricing.appliedCoupon,
      eligibleCampaigns: pricing.eligibleCampaigns,
    });
  } catch (e) {
    console.error("[PAYMENT][start-guest] Hata:", e);
    res.status(500).json({ message: "Misafir ödemesi başlatılamadı." });
  }
};
/** 1) Ödeme oturumunu başlat (pending Order) */
exports.startPaymentSession = async (req, res) => {
  try {
    const { cartItems, addressId, selectedCampaignId, couponCode } =
      req.body;
    const consent = await readConsent(req);
    if (!consent) return res.status(400).json(CONSENT_REQUIRED);
    const userId = req.user.userId;
    const userDoc = await User.findById(userId).lean();

    // Adres seçimi
    const addr = userDoc?.addresses?.find(
      (a) => String(a._id) === String(addressId)
    ) || userDoc?.addresses?.[0];

    // Eksik müşteri verisi kontrolü
    const requiredMissing = [];
    const firstName = String(userDoc?.firstName || "").trim();
    if (!firstName) requiredMissing.push("firstName");
    const lastName = String(userDoc?.lastName || "").trim();
    if (!lastName) requiredMissing.push("lastName");
    const phone = normalizeTrPhone(userDoc?.phone);
    if (!phone) requiredMissing.push("phone");
    const email = normalizeEmail(userDoc?.email);
    if (!EMAIL_REGEX.test(email) || email.length > 100) requiredMissing.push("email");
    if (firstName.length > 80) requiredMissing.push("firstName");
    if (lastName.length > 80) requiredMissing.push("lastName");

    if (!addr) {
      return res.status(422).json({
        message:
          "Siparişe devam etmek için en az bir gönderim adresi eklemelisiniz.",
        missing: ["address"],
      });
    }

    const registrationAddress = String(addr?.mainaddress || "").trim();
    if (!registrationAddress) requiredMissing.push("address.mainaddress");
    const street = String(addr?.street || "").trim();
    if (!street) requiredMissing.push("address.street");
    const city = String(addr?.city || "").trim();
    if (!city) requiredMissing.push("address.city");
    const district = String(addr?.district || "").trim();
    const postalCode = String(addr?.postalCode || "").trim();

    if (requiredMissing.length) {
      return res.status(422).json({
        message: "Lütfen profilinizdeki eksik bilgileri tamamlayın.",
        missing: requiredMissing,
      });
    }

    await releaseCustomerPendingOrders({ userId, previousConversationId: req.body?.previousConversationId });

    let pricing;
    try {
      pricing = await calculateCartPricing(cartItems, {
        selectedCampaignId,
        couponCode,
        customerUserId: userId,
        customerEmail: email,
        includeEligibleCampaigns: true,
      });
    } catch (err) {
      const status = err?.status || 500;
      const message = err?.status ? err.message : "Sepet doğrulanamadı.";
      return res.status(status).json({ message, source: err?.source || null });
    }
    if (!(Number(pricing?.summary?.grandTotal) >= 1)) {
      return res.status(422).json({ message: "Sipariş tutarı ödeme için çok düşük." });
    }

    // PayTR merchant_oid şartına uygun benzersiz ID (alfanümerik, 64 max)
    const conversationId = uuidv4()
      .replace(/-/g, "")
      .toUpperCase()
      .slice(0, 64);
    const orderNumber = Math.floor(1e9 + Math.random() * 9e9).toString();

    // Pending Order

    // Stok bu siparişe ayrılır (ödeme ekranı); yetmezse sipariş oluşmaz.
    const createdOrder = await createOrderWithReservation({
      orderNumber,
      user: userId,
      // Üyeden kimlik no istenmez; eskiden olduğu gibi otomatik atandı sayılır.
      identityFallbackUsed: true,
      items: pricing.items,
      totalPrice: pricing.summary.grandTotal,
      campaign: pricing.appliedCampaign
        ? {
            campaignId: pricing.appliedCampaign.campaignId,
            name: pricing.appliedCampaign.name,
            templateType: pricing.appliedCampaign.templateType,
            savings: pricing.appliedCampaign.savings,
            details: pricing.appliedCampaign.details,
          }
        : null,
      coupon: pricing.appliedCoupon
        ? {
            couponId: pricing.appliedCoupon.couponId,
            code: pricing.appliedCoupon.code,
            discountType: pricing.appliedCoupon.discountType,
            discountValue: pricing.appliedCoupon.discountValue,
            minimumSubtotal: pricing.appliedCoupon.minimumSubtotal,
            savings: pricing.appliedCoupon.savings,
            details: pricing.appliedCoupon.details,
          }
        : null,
      pricing: {
        subTotal: pricing.summary.subTotal,
        campaignDiscount: pricing.summary.campaignDiscount,
        couponDiscount: pricing.summary.couponDiscount,
        discountedSubTotal: pricing.summary.discountedSubTotal,
        shippingFee: pricing.summary.shippingFee,
        grandTotal: pricing.summary.grandTotal,
      },
      address: {
        title: String(addr.title || "Adres").trim() || "Adres",
        mainaddress: registrationAddress,
        street,
        district,
        city,
        postalCode,
      },
      conversationId,
      consent,
      status: "pending",
      iyzInit: null,
      shipping: {
        name: pricing.summary.shippingName,
        fee: pricing.summary.shippingFee,
      },
    }).catch((err) => ({ refusal: reservationRefusal(err) }));
    if (createdOrder.refusal) return res.status(createdOrder.refusal.status).json(createdOrder.refusal.body);
    // Aynı anda başlatılmış eski oturumu varsa (ikinci sekme) kapatılır; stok geri eklenir.
    await releaseCustomerPendingOrders({ userId, olderThan: createdOrder._id });

    return res.json({
      conversationId,
      inlineUrl: `${process.env.BACKEND_PUBLIC_URL}/api/v1/payment/inline/${conversationId}`,
      reservedUntil: createdOrder.stockReservedUntil,
      summary: pricing.summary,
      appliedCampaign: pricing.appliedCampaign,
      appliedCoupon: pricing.appliedCoupon,
      eligibleCampaigns: pricing.eligibleCampaigns,
    });
  } catch (e) {
    console.error("[Payment][start] Hata:", e);
    res.status(500).json({ message: "Ödeme başlatılamadı." });
  }
};

/** 2) INLINE: PayTR token ya da MOCK HTML döner (JSON) */
exports.inlineCheckoutHtml = async (req, res) => {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[PAYTR][inline] ödeme formu hazırlanıyor.");
    }

    // cache kesin kapalı — tekrar kullanım/yeniden yükleme olmasın
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    const { conversationId } = req.params;
    const order = await Order.findOne({ conversationId }).lean();
    if (!order || order.status !== "pending") {
      return res.status(404).json({ message: "Geçersiz sipariş." });
    }
    // Stok ayrılmış siparişte ödeme sayfası ayrım bitmeden kapanmalı; sayfa yenilense de
    // kalan süreden uzun ödeme süresi verilmez.
    let timeoutMinutes = PAYTR_TIMEOUT_MINUTES;
    if (order.stockUpdated && order.stockReservedUntil) {
      const leftMinutes = Math.floor((new Date(order.stockReservedUntil).getTime() - Date.now()) / 60000) - 3;
      if (leftMinutes < 2) {
        return res.status(410).json({
          message: "Ödeme süresi doldu. Sepetinizden ödemeyi yeniden başlatın.",
        });
      }
      timeoutMinutes = Math.min(PAYTR_TIMEOUT_MINUTES, leftMinutes);
    }

    const useMock =
      String(process.env.PAY_PROVIDER || "").toLowerCase() === "mock";
    const paytrMissing =
      !process.env.PAYTR_MERCHANT_ID ||
      !process.env.PAYTR_MERCHANT_KEY ||
      !process.env.PAYTR_MERCHANT_SALT;

    if (!useMock && paytrMissing) {
      return res.status(503).json({
        message: "Ödeme sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      });
    }

    if (useMock) {
      // ---- MOCK ÖDEME SAYFASI ----
      const ok = `${FRONTEND_BASE}/payment-result?status=success&conversationId=${conversationId}&paymentId=mock_${conversationId}`;
      const fail = `${FRONTEND_BASE}/payment-result?status=failure&conversationId=${conversationId}&message=${encodeURIComponent(
        "Simülasyon: ödeme başarısız."
      )}`;

      const itemsHtml = (order.items || [])
        .map(
          (it) => `
            <li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
              <span>${escapeHtml(it.name)} ${
            it.size ? "• " + escapeHtml(it.size) : ""
          } ${
            it.color ? "• " + escapeHtml(it.color) : ""
          }</span>
              <b>${it.qty} × ${asTL(it.price)}</b>
            </li>`
        )
        .join("");

      const html = `<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;margin:0;background:#fff}
  .wrap{max-width:720px;margin:16px auto;padding:16px;border:1px solid #e5e7eb;border-radius:12px}
  .btn{display:inline-block;padding:10px 16px;border-radius:10px;text-decoration:none}
  .ok{background:#16a34a;color:#fff} .fail{background:#ef4444;color:#fff}
  ul{list-style:none;padding:0;margin:10px 0}
</style>
</head><body>
  <div class="wrap">
    <h2 style="margin:0 0 8px 0">Simüle Edilen Ödeme</h2>
    <p style="color:#6b7280;margin:0 0 10px 0">PayTR anahtarları tanımlı değil. Geliştirme için sahte bir ödeme ekranı gösteriliyor.</p>

    <h3 style="margin:12px 0 6px 0">Sepet</h3>
    <ul>${itemsHtml}</ul>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid #eee">
      <b>Toplam</b>
      <b>${asTL(order.totalPrice)}</b>
    </div>

    <div style="margin-top:16px;display:flex;gap:10px">
      <a class="btn ok" href="${ok}">Ödemeyi Başarılı Simüle Et</a>
      <a class="btn fail" href="${fail}">Ödemeyi Başarısız Simüle Et</a>
    </div>

    <p style="margin-top:10px;color:#6b7280;font-size:12px">
      Başarılıyı seçerseniz sonuç sayfası <code>/orders/confirm</code> çağırıp siparişi kesinleştirir.
    </p>
  </div>
</body></html>`;

      // ÖNEMLİ: Artık HTML'i direkt dönmüyoruz; JSON ile gönderiyoruz
      return res.json({ mode: "mock", html });
    }

    // ---- GERÇEK PAYTR AKIŞI ----
    // Kayıtlı kullanıcı varsa user, yoksa guest üzerinden bilgileri hazırla
    const user = order.user ? await User.findById(order.user).lean() : null;

    // ENV'leri trimleyerek al
    const MERCHANT_ID = (process.env.PAYTR_MERCHANT_ID || "").trim();
    const MERCHANT_KEY = (process.env.PAYTR_MERCHANT_KEY || "").trim();
    const MERCHANT_SALT = (process.env.PAYTR_MERCHANT_SALT || "").trim();
    const TEST_MODE = (process.env.PAYTR_TEST_MODE || "1").trim(); // "1"/"0"

    const user_ip = getClientIp(req);

    // PayTR zorunluluğu: sadece alfanümerik, makul uzunluk
    const merchant_oid = String(order.conversationId || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 64);

    // ←←← GÜNCEL KISIM: email / isim / telefon / adres seçimleri
    const email = normalizeEmail(user?.email || order.guest?.email);
    const user_name = user
      ? `${user.firstName || "Müşteri"} ${user.lastName || ""}`.trim()
      : `${order.guest?.firstName || "Müşteri"} ${
          order.guest?.lastName || ""
        }`.trim();
    const user_phone = normalizeTrPhone(user?.phone || order.guest?.phone);
    const user_address = user
      ? `${order.address?.mainaddress || ""} ${
          order.address?.city || ""
        }`.trim()
      : `${
          order.guest?.registrationAddress || order.address?.mainaddress || ""
        } ${order.address?.city || ""}`.trim();

    if (!EMAIL_REGEX.test(email) || email.length > 100 || !user_phone || !user_address) {
      return res.status(422).json({
        message: "Ödeme için gerekli müşteri bilgileri eksik.",
      });
    }

    const payment_amount = tlToKurus(order.totalPrice);

    const basket = buildPaytrBasket(order);
    const user_basket = Buffer.from(JSON.stringify(basket)).toString("base64");

    const no_installment = "0";
    const max_installment = "0";
    const currency = "TL";
    const non_3d = "0"; // Hash’e DAHİL değil

    // Hash (non_3d DAHİL değil)
    const hashStr =
      MERCHANT_ID +
      user_ip +
      merchant_oid +
      email +
      String(payment_amount) +
      user_basket +
      no_installment +
      max_installment +
      currency +
      TEST_MODE +
      MERCHANT_SALT;

    const paytr_token = crypto
      .createHmac("sha256", MERCHANT_KEY)
      .update(hashStr)
      .digest("base64");

    const okUrl = `${FRONTEND_BASE}/payment-result?status=success&conversationId=${merchant_oid}&paymentId=${merchant_oid}`;
    const failUrl = `${FRONTEND_BASE}/payment-result?status=failure&conversationId=${merchant_oid}`;

    // Form body
    const body = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      user_ip,
      merchant_oid,
      email,
      payment_amount: String(payment_amount),
      user_basket,
      no_installment,
      max_installment,
      currency,
      test_mode: TEST_MODE,
      non_3d,
      user_name,
      user_address,
      user_phone,
      merchant_ok_url: okUrl,
      merchant_fail_url: failUrl,
      // Ödeme sayfası stok ayrımı bitmeden kapanır (bkz. services/stockReservation).
      timeout_limit: String(timeoutMinutes),
      debug_on: process.env.NODE_ENV === "production" ? "0" : "1",
      lang: "tr",
      paytr_token,
    });
    const resp = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    const rawText = await resp.text();
    if (process.env.NODE_ENV !== "production") {
      console.log("[PAYTR][get-token] response status:", resp.status);
    }

    let data = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
    if (!data || data.status !== "success" || !data.token) {
      console.error("[PAYTR][get-token] Hata", {
        httpStatus: resp.status,
        providerStatus: data?.status || "invalid_response",
        reason: String(data?.reason || "PayTR yanıtı doğrulanamadı.").slice(0, 240),
      });
      return res.status(500).json({
        message: (data && data.reason) || "Ödeme başlatılamadı (PayTR).",
      });
    }

    // ÖNEMLİ: Artık HTML döndürmüyoruz; sadece token
    return res.json({ mode: "paytr", token: data.token });
  } catch (e) {
    console.error("[PAYTR][inline] Hata:", e);
    res.status(500).json({ message: "Ödeme başlatılamadı (server)." });
  }
};

/** MOCK tamamla (sadece geliştirme) */
exports.mockComplete = async (req, res) => {
  try {
    const isMockProvider =
      String(process.env.PAY_PROVIDER || "").toLowerCase() === "mock";
    if (!isMockProvider) {
      return res.status(403).json({ message: "Mock ödeme aktif değil." });
    }

    const conversationId =
      typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";
    if (!conversationId || conversationId.length > 64) {
      return res.status(400).json({ message: "Eksik parametre." });
    }

    const order = await Order.findOne({ conversationId });

    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı." });
    }

    // PayTR bildirimiyle aynı: incelemedeki veya gönderilmiş sipariş yeniden işlenmez.
    if (["payment_review", "shipped", "completed"].includes(order.status)) {
      return res.json({ ok: true });
    }
    if (!(order.status === "paid" && order.stockUpdated)) {
      const outcome = await completePaidOrder(order, `mock_${conversationId}`, "mock-complete");
      return res.json({ ok: true, state: outcome });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error("[PAYMENT][mock-complete] Hata:", e);
    return res.status(500).json({ message: "Mock tamamlama başarısız." });
  }
};

/** 3) PAYTR postback (panelde ayarlarsın) */
exports.paytrCallback = async (req, res) => {
  try {
    const { merchant_oid, status, total_amount, hash } = req.body || {};
    const KEY = (process.env.PAYTR_MERCHANT_KEY || "").trim();
    const SALT = (process.env.PAYTR_MERCHANT_SALT || "").trim();

    if (!merchant_oid || !status || !total_amount || !hash) {
      return res.status(400).send("BAD REQUEST");
    }
    if (!KEY || !SALT) {
      const isMockProvider =
        String(process.env.PAY_PROVIDER || "").toLowerCase() === "mock";
      if (isMockProvider) return res.send("OK");
      console.error("[PAYTR][callback] Canlı ödeme anahtarları eksik.");
      return res.status(503).send("RETRY");
    }

    const check = crypto
      .createHmac("sha256", KEY)
      .update(merchant_oid + SALT + status + total_amount)
      .digest("base64");

    const expectedHash = Buffer.from(check);
    const receivedHash = Buffer.from(String(hash));
    if (
      expectedHash.length !== receivedHash.length ||
      !crypto.timingSafeEqual(expectedHash, receivedHash)
    ) {
      return res.status(400).send("BAD REQUEST");
    }

    if (status === "success") {
      const order = await Order.findOne({ conversationId: merchant_oid });
      if (!order) return res.send("OK");
      if (["payment_review", "shipped", "completed"].includes(order.status)) {
        return res.send("OK");
      }
      // Sistemin kapattığı oturum (stok ayrımı süresi doldu, müşteri yeni ödeme başlattı)
      // için geç gelen ödeme: stok yeniden düşülmeye çalışılır, yetmezse incelemeye düşer.
      // Yöneticinin iptal ettiği siparişe ödeme geldiyse sessizce yok sayma: para alındı,
      // yönetici bilmeli.
      if (order.status === "cancelled" && !RELEASED_REASONS.includes(order.cancelReason)) {
        await markPaidAfterCancel(order._id, merchant_oid);
        return res.send("OK");
      }

      // total_amount taksit/alternatif yöntem ücretleri nedeniyle gönderdiğimiz
      // payment_amount değerinden yüksek olabilir; düşük olması kabul edilmez.
      const expected = Math.round(Number(order.totalPrice || 0) * 100);
      if (!Number.isSafeInteger(Number(total_amount)) || Number(total_amount) < expected) {
        console.warn("[PAYTR][callback] Amount mismatch", {
          merchant_oid,
          fromPaytr: total_amount,
          expected,
        });
        order.status = "payment_review";
        order.paymentId = merchant_oid;
        order.paymentReceivedAt = new Date();
        order.cancelReason = "amount_mismatch_after_payment";
        order.cancelledAt = null;
        await order.save();
        queuePaymentReviewAlert(order._id);
        return res.send("OK");
      }

      await completePaidOrder(order, merchant_oid, "callback");
    } else {
      // Ödeme başarısız: sipariş kapanır, ayrılan stok geri eklenir.
      const order = await Order.findOne({ conversationId: merchant_oid, status: "pending" })
        .select("_id")
        .lean();
      if (order) await releaseReservation(order._id, "payment_failed");
    }
    return res.send("OK");
  } catch (e) {
    console.error("[PAYTR][callback] Hata:", e);
    // PayTR yalnızca düz "OK" aldığında bildirimi tamamlanmış sayar. Geçici
    // sunucu/veritabanı hatasında farklı yanıt vererek resmi retry mekanizmasını koru.
    return res.status(503).send("RETRY");
  }
};
