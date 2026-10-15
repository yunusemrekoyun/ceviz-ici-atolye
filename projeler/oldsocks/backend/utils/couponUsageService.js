const CouponUsage = require("../models/CouponUsage");
const { memberEmail } = require("../services/couponRules");

function normalizeCouponCode(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeEmailKey(value) {
  return String(value || "").trim().toLowerCase();
}

async function recordCouponUsageForOrder(order) {
  const couponId = order?.coupon?.couponId;
  if (!couponId) return null;

  const existingForOrder = await CouponUsage.findOne({ orderId: order._id })
    .select("_id")
    .lean();
  if (existingForOrder) return existingForOrder;

  const payload = {
    couponId,
    user: order?.user || null,
    // Üyede de e-posta yazılır: aynı e-postayla misafir olarak tekrar kullanılamasın.
    emailKey: normalizeEmailKey(order?.guest?.email || (await memberEmail(order?.user))),
    orderId: order?._id || null,
    orderConversationId: order?.conversationId || null,
    usedAt: new Date(),
  };

  return CouponUsage.create(payload);
}

module.exports = {
  normalizeCouponCode,
  normalizeEmailKey,
  recordCouponUsageForOrder,
};
