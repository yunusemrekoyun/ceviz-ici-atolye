// Kupon kuralları (kullanım sınırı, müşteri başına bir kullanım) hem ödeme başlatılırken
// hem ödeme tamamlanırken aynı müşteri tanımıyla denetlenir.
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");
const ReservationLock = require("../models/ReservationLock");
const User = require("../models/User");

// Kuponu kullanmış sayılan sipariş durumları.
const COUPON_USED_STATUSES = ["payment_review", "paid", "shipped", "completed"];

// Müşteri tanımı: üye hesabı ve e-posta. Misafir, bir üyenin e-postasını yazarsa o üyeyle
// aynı müşteri sayılır (üye olarak kullandığı kuponu misafir olarak tekrar kullanamaz).
async function customerIdentity({ customerUserId, customerEmail } = {}, { session } = {}) {
  const email = String(customerEmail || "").trim().toLowerCase();
  const userIds = customerUserId ? [String(customerUserId)] : [];
  if (email && !userIds.length) {
    const member = await User.findOne({ email }).select("_id").session(session || null).lean();
    if (member) userIds.push(String(member._id));
  }
  return {
    email,
    userIds,
    orderConditions: [
      ...userIds.map((id) => ({ user: id })),
      ...(email ? [{ "guest.email": email }] : []),
    ],
    usageConditions: [
      ...userIds.map((id) => ({ user: id })),
      ...(email ? [{ emailKey: email }] : []),
    ],
  };
}

async function memberEmail(userId, session) {
  if (!userId) return "";
  const user = await User.findById(userId).select("email").session(session || null).lean();
  return user?.email || "";
}

// Ödeme tamamlanırken: bu sipariş kuponu kullanırsa sınır aşılır mı? Aynı müşterinin
// iki ayrı ödeme oturumu ya da aynı anda dolan kullanım sınırı burada yakalanır.
async function couponLimitBreached(order, { session } = {}) {
  const couponId = order?.coupon?.couponId;
  if (!couponId) return false;
  // Kilit kaydına yazmak, aynı kuponla eşzamanlı tamamlanan ödemeleri sıraya sokar:
  // ikincisi birincinin sonucunu görür. Kupon silinmiş olsa da kilit ve müşteri denetimi çalışır.
  await ReservationLock.updateOne(
    { _id: `coupon:${couponId}` },
    { $set: { at: new Date() } },
    { upsert: true, session }
  );
  const coupon = await Coupon.findById(couponId).select("maxUses").session(session || null).lean();

  const others = {
    "coupon.couponId": couponId,
    status: { $in: COUPON_USED_STATUSES },
    _id: { $ne: order._id },
  };
  if (coupon?.maxUses && (await Order.countDocuments(others).session(session || null)) >= coupon.maxUses) {
    return true;
  }

  const identity = await customerIdentity(
    {
      customerUserId: order.user || null,
      customerEmail: order.guest?.email || (await memberEmail(order.user, session)),
    },
    { session }
  );
  if (!identity.orderConditions.length) return false;
  if (await Order.exists({ ...others, $or: identity.orderConditions }).session(session || null)) return true;
  const usage = await CouponUsage.exists({
    couponId,
    orderId: { $ne: order._id },
    $or: identity.usageConditions,
  }).session(session || null);
  return Boolean(usage);
}

module.exports = {
  COUPON_USED_STATUSES,
  couponLimitBreached,
  customerIdentity,
  memberEmail,
};
