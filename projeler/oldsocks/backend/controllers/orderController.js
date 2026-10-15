// backend/controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const {
  RELEASED_REASONS,
  finalizeOrderPayment,
  restoreStock,
  StockUnavailableError,
  OrderPaymentStateError,
} = require("../utils/updateStock");
const CouponUsage = require("../models/CouponUsage");
const { invalidateCatalog } = require("../services/catalogCache");
const { releaseReservation } = require("../services/stockReservation");
const { queueOrderMails, queueStatusMail } = require("../services/orderMailQueue");
const { recordCouponUsageForOrder } = require("../utils/couponUsageService");
const { normalizeEmailAddress } = require("../utils/email");

// Kargo firması ve takip numarası isteğe bağlı. Firma boşsa siparişin kargo
// yönteminin adı (Kargo ayarlarında girilen) kullanılır.
function parseTracking(body) {
  const carrier = String(body?.carrier ?? "").trim().replace(/\s+/g, " ");
  const trackingNumber = String(body?.trackingNumber ?? "").trim().replace(/\s+/g, "");
  if (carrier.length > 60) {
    return { error: "Kargo firması en fazla 60 karakter olabilir." };
  }
  if (trackingNumber.length > 60 || (trackingNumber && !/^[A-Za-z0-9-]+$/.test(trackingNumber))) {
    return { error: "Takip numarası yalnız harf, rakam ve tire içerebilir (en fazla 60 karakter)." };
  }
  return { carrier: carrier || null, trackingNumber: trackingNumber || null };
}

// Firma girilmezse Kargo ayarlarındaki yöntem adı kullanılır (alan en çok 60 karakter).
function carrierFor(order, tracking) {
  return tracking.carrier || order.shipping?.carrier || String(order.shipping?.name || "").slice(0, 60).trim() || null;
}

async function persistCouponUsage(order) {
  try {
    await recordCouponUsageForOrder(order);
  } catch (err) {
    if (err?.code === 11000) return;
    console.warn("[OrderController] Kupon kullanımı kaydedilemedi:", err?.message || err);
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ORDER_STATUSES = ["pending", "payment_review", "paid", "shipped", "completed", "cancelled"];

// Ödemesi hiç alınmadan kapanan ödeme denemeleri (terk edilen, başarısız, süresi dolan,
// yenisiyle değişen, yöneticinin iptal ettiği bekleyen). Ana listeyi doldurmasınlar diye
// "Tamamlanmayan ödemeler" sekmesinde gösterilir.
const UNPAID_CANCEL_REASONS = [
  "payment_abandoned",
  "payment_failed",
  "reservation_expired",
  "session_replaced",
  "coupon_session_replaced",
  "admin_cancelled_unpaid",
];
const UNPAID_FILTER = { status: "cancelled", cancelReason: { $in: UNPAID_CANCEL_REASONS }, paymentReceivedAt: null };
const ACTIVE_FILTER = { status: { $ne: "pending" }, $nor: [UNPAID_FILTER] };
const LIST_MODES = {
  pending: { status: "pending" },
  unpaid: UNPAID_FILTER,
  active: ACTIVE_FILTER,
};

// Admin listesi: ?page verilirse sunucu tarafında sayfalanır, filtrelenir ve aranır.
// Parametresiz çağrı eski davranışı (tüm siparişler, dizi) korur.
async function getOrdersPage(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(5, Number.parseInt(req.query.pageSize, 10) || 20));
  const mode = LIST_MODES[req.query.mode] ? req.query.mode : "active";
  const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : "";
  const sort = req.query.sort === "asc" ? { createdAt: 1 } : { createdAt: -1 };
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";

  const filter = { ...LIST_MODES[mode] };
  if (status && mode === "active" && status !== "pending") filter.status = status;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    const digits = q.replace(/\D/g, "");
    const users = await User.find({
      $or: [{ email: pattern }, { firstName: pattern }, { lastName: pattern }, ...(digits.length >= 4 ? [{ phone: new RegExp(escapeRegex(digits)) }] : [])],
    })
      .select("_id")
      .limit(200)
      .lean();
    filter.$or = [
      { orderNumber: pattern },
      { "guest.email": pattern },
      { "guest.firstName": pattern },
      { "guest.lastName": pattern },
      ...(digits.length >= 4 ? [{ "guest.phone": new RegExp(escapeRegex(digits)) }] : []),
      ...(users.length ? [{ user: { $in: users.map((u) => u._id) } }] : []),
    ];
  }

  const [items, total, pendingCount, activeCount, unpaidCount] = await Promise.all([
    Order.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("user", "firstName lastName email")
      .populate("items.productId", "images name"),
    Order.countDocuments(filter),
    Order.countDocuments(LIST_MODES.pending),
    Order.countDocuments(ACTIVE_FILTER),
    Order.countDocuments(UNPAID_FILTER),
  ]);
  res.json({ items, total, page, pageSize, pendingCount, activeCount, unpaidCount });
}

exports.getAllOrders = async (req, res) => {
  try {
    if (req.query.page !== undefined) return await getOrdersPage(req, res);
    const orders = await Order.find()
      .sort("-createdAt")
      .populate("user", "firstName lastName email")
      .populate("items.productId", "images name");
    res.json(orders);
  } catch (err) {
    console.error("getAllOrders error:", err);
    res.status(500).json({ message: "Siparişler alınırken hata oluştu." });
  }
};

exports.getUnseenPaidCount = async (req, res) => {
  try {
    const count = await Order.countDocuments({
      status: { $in: ["paid", "payment_review"] },
      adminSeenAt: null,
    });
    res.json({ count });
  } catch (err) {
    console.error("getUnseenPaidCount error:", err);
    res.status(500).json({ message: "Görülmemiş sipariş sayısı alınamadı." });
  }
};

exports.markPaidOrdersSeen = async (req, res) => {
  try {
    const now = new Date();
    const result = await Order.updateMany(
      { status: { $in: ["paid", "payment_review"] }, adminSeenAt: null },
      { $set: { adminSeenAt: now } }
    );

    const matched = result.matchedCount ?? result.n ?? 0;
    const modified = result.modifiedCount ?? result.nModified ?? 0;
    res.json({ matched, modified, seenAt: now });
  } catch (err) {
    console.error("markPaidOrdersSeen error:", err);
    res.status(500).json({ message: "Siparişler görüldü işaretlenemedi." });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = [
      "pending",
      "payment_review",
      "paid",
      "shipped",
      "completed",
      "cancelled",
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Geçersiz status değeri." });
    }

    let tracking = null;
    if (status === "shipped") {
      tracking = parseTracking(req.body);
      if (tracking.error) return res.status(400).json({ message: tracking.error });
    }

    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı." });
    }
    const previousStatus = order.status;

    if (status === "payment_review" && order.status !== "payment_review") {
      return res.status(409).json({
        message:
          "Ödeme inceleme durumu yalnızca ödeme sistemi tarafından atanabilir.",
      });
    }
    if (order.status === "payment_review" && status === "pending") {
      return res.status(409).json({
        message:
          "Ödemesi alınmış inceleme kaydı tekrar bekleyen siparişe çevrilemez.",
      });
    }

    // Ödemesi alınmamış (bekleyen) sipariş iptal edilirse ödeme adımında ayrılan stok geri eklenir.
    // Ayrım sisteminden önceki, stoğu düşülmüş bekleyen sipariş eskisi gibi aşağıda reddedilir.
    if (order.status === "pending" && status === "cancelled" && (!order.stockUpdated || order.stockReservedUntil)) {
      await releaseReservation(order._id, "admin_cancelled_unpaid");
      return res.json({ message: "Sipariş durumu güncellendi.", order: await Order.findById(order._id) });
    }

    if (
      order.stockUpdated &&
      ["pending", "cancelled"].includes(status)
    ) {
      return res.status(409).json({
        message:
          "Stoğu düşülmüş bir sipariş doğrudan bekleyen veya iptal durumuna alınamaz.",
      });
    }
    // Bekleyen siparişte stok yalnız ayrılmıştır; ödemesi alınmadan gönderilemez.
    if (
      ["shipped", "completed"].includes(status) &&
      (!order.stockUpdated || !["paid", "shipped", "completed"].includes(order.status))
    ) {
      return res.status(409).json({
        message: "Ödemesi ve stok işlemi tamamlanmamış sipariş gönderilemez.",
      });
    }

    if (status === "paid") {
      try {
        order = await finalizeOrderPayment(order._id);
        // Yönetici ödemenin alındığını onayladı; e-posta gönderilemezse tarama yeniden dener.
        order.paymentReceivedAt ||= new Date();
        console.log("[OrderController] Admin manuel paid → stok güncellendi.");
      } catch (error) {
        if (
          error instanceof StockUnavailableError ||
          error instanceof OrderPaymentStateError
        ) {
          return res.status(409).json({
            message:
              "Sipariş mevcut durumu veya stok yetersizliği nedeniyle ödenmiş durumuna alınamadı.",
          });
        }
        throw error;
      }

      await persistCouponUsage(order);
    } else {
      order.status = status;
      if (status === "shipped") {
        order.shipping.carrier = carrierFor(order, tracking);
        order.shipping.trackingNumber = tracking.trackingNumber;
        if (!order.shippedAt) order.shippedAt = new Date();
      }
      if (status === "completed" && !order.deliveredAt) order.deliveredAt = new Date();
    }

    await order.save();
    if (status === "paid") queueOrderMails(order._id);
    // Her durum e-postası sipariş başına bir kez gider (shippedMailSentAt / deliveredMailSentAt).
    if (status === "shipped" && previousStatus !== "shipped") queueStatusMail(order._id, "shipped");
    if (status === "completed" && previousStatus !== "completed") queueStatusMail(order._id, "delivered");
    res.json({ message: "Sipariş durumu güncellendi.", order });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    res
      .status(500)
      .json({ message: "Sipariş durumu güncellenirken hata oluştu." });
  }
};

// Ödemesi alınmış siparişin iptali ve iade kaydı. Para PayTR panelinden iade edilir;
// burada tutar, açıklama, stok iadesi ve müşteri bildirimi kaydedilir.
const CANCELLABLE_STATUSES = ["payment_review", "paid", "shipped", "completed"];

exports.cancelOrder = async (req, res) => {
  const note = String(req.body?.note ?? "").trim();
  const restock = req.body?.restock !== false;
  const notifyCustomer = req.body?.notifyCustomer !== false;
  const refundAmount = Math.round(Number(req.body?.refundAmount) * 100) / 100;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Sipariş bulunamadı." });
  }
  if (note.length < 3 || note.length > 500) {
    return res.status(400).json({ message: "İptal / iade açıklaması girin (3-500 karakter)." });
  }
  if (!Number.isFinite(refundAmount) || refundAmount < 0) {
    return res.status(400).json({ message: "İade tutarı 0 veya daha büyük olmalıdır." });
  }

  const session = await Order.startSession();
  let outcome = null;
  try {
    await session.withTransaction(async () => {
      outcome = null;
      const order = await Order.findById(req.params.id).session(session);
      if (!order) {
        outcome = { status: 404, body: { message: "Sipariş bulunamadı." } };
        return;
      }
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        outcome = { status: 409, body: { message: "Bu sipariş iptal / iade için uygun durumda değil." } };
        return;
      }
      if (refundAmount > Number(order.totalPrice || 0)) {
        outcome = { status: 400, body: { message: "İade tutarı sipariş toplamını aşamaz." } };
        return;
      }

      let skipped = [];
      const restocked = restock && order.stockUpdated;
      if (restocked) {
        ({ skipped } = await restoreStock(order, { session }));
        order.stockUpdated = false;
      }
      order.status = "cancelled";
      order.cancelReason = "admin_cancelled";
      order.cancelledAt = new Date();
      order.refund = {
        amount: refundAmount,
        note,
        at: new Date(),
        by: req.user?.userId || null,
        restocked,
        notifyCustomer,
      };
      await order.save({ session });
      // İptal edilen siparişin kupon hakkı müşteriye geri verilir.
      await CouponUsage.deleteMany({ orderId: order._id }, { session });
      outcome = { status: 200, body: { message: "Sipariş iptal edildi.", order, skipped } };
    });
  } catch (err) {
    console.error("cancelOrder error:", err);
    return res.status(500).json({ message: "Sipariş iptal edilemedi." });
  } finally {
    await session.endSession();
  }

  if (outcome.status === 200) {
    if (outcome.body.order.refund.restocked) invalidateCatalog();
    if (notifyCustomer) queueStatusMail(outcome.body.order._id, "cancelled");
  }
  return res.status(outcome.status).json(outcome.body);
};

// Siparişe kargo bilgisini sonradan düzeltmek için; e-posta göndermez.
exports.updateOrderTracking = async (req, res) => {
  try {
    const tracking = parseTracking(req.body);
    if (tracking.error) return res.status(400).json({ message: tracking.error });
    const order = await Order.findOne({ _id: req.params.id, status: { $in: ["shipped", "completed"] } });
    if (!order) {
      return res.status(409).json({ message: "Kargo bilgisi yalnız kargoya verilmiş siparişte düzenlenebilir." });
    }
    order.shipping.carrier = carrierFor(order, tracking);
    order.shipping.trackingNumber = tracking.trackingNumber;
    await order.save();
    res.json({ message: "Kargo bilgisi güncellendi.", order });
  } catch (err) {
    console.error("updateOrderTracking error:", err);
    res.status(500).json({ message: "Kargo bilgisi güncellenemedi." });
  }
};

const CUSTOMER_HIDDEN_FIELDS =
  "-paytrInit -iyzInit -mailAttemptAt -statusMailAttemptAt -reviewAlertSentAt -adminSeenAt -customerMailSentAt -adminMailSentAt -orderMailSentAt -shippedMailSentAt -deliveredMailSentAt -stockHoldKey -mailAttempts -mailRetryAt -statusMailAttempts -statusMailRetryAt";

exports.getMyOrders = async (req, res) => {
  const userId = req.user.userId;
  const orders = await Order.find({
    user: userId,
    $or: [
      { status: { $in: ["payment_review", "paid", "shipped", "completed"] } },
      // Ödemesi alınıp iptal edilen siparişler de görünür (iade bilgisiyle).
      { status: "cancelled", paymentReceivedAt: { $ne: null } },
    ],
  })
    .select(`${CUSTOMER_HIDDEN_FIELDS} -refund.note -refund.by -refund.notifyCustomer -cancelledMailSentAt`)
    .sort("-createdAt");

  res.json(orders);
};

// Misafir ve üye için sipariş sorgulama: sipariş no + e-posta. Yanıt adres ve
// telefon içermez; eşleşmeyen her durumda aynı mesaj döner.
exports.lookupOrder = async (req, res) => {
  const notFound = () =>
    res.status(404).json({ message: "Sipariş bulunamadı. Sipariş numarasını ve e-posta adresini kontrol edin." });
  try {
    const orderNumber = String(req.body?.orderNumber || "").replace(/[\s#]/g, "");
    const email = normalizeEmailAddress(req.body?.email);
    if (!/^\d{6,20}$/.test(orderNumber) || !email || email.length > 254) return notFound();

    const order = await Order.findOne({ orderNumber }).populate("user", "email").lean();
    const ownerEmail = normalizeEmailAddress(order?.guest?.email || order?.user?.email || "");
    const visible =
      order &&
      order.status !== "pending" &&
      (order.status !== "cancelled" || order.paymentReceivedAt);
    if (!visible || ownerEmail !== email) return notFound();

    res.set("Cache-Control", "private, no-store");
    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      paymentReceivedAt: order.paymentReceivedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      shipping: {
        name: order.shipping?.name || null,
        carrier: order.shipping?.carrier || null,
        trackingNumber: order.shipping?.trackingNumber || null,
      },
      items: (order.items || []).map((item) => ({
        name: item.name,
        size: item.size || "",
        color: item.color || "",
        qty: item.qty,
        price: item.price,
      })),
      totalPrice: order.totalPrice,
      cancelledAt: order.status === "cancelled" ? order.cancelledAt : null,
      refundAmount: order.status === "cancelled" ? order.refund?.amount ?? null : null,
      city: order.address?.city || "",
    });
  } catch (err) {
    console.error("lookupOrder error:", err);
    res.status(500).json({ message: "Sipariş sorgulanamadı." });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "firstName lastName email phone")
      .populate("items.productId", "images name");
    if (!order) return res.status(404).json({ message: "Sipariş bulunamadı." });

    const isAdmin = req.user?.role === "admin";
    const ownerId =
      order.user && typeof order.user === "object"
        ? order.user._id
        : order.user;
    const isOwner =
      ownerId && String(ownerId) === String(req.user?.userId || "");

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Bu siparişe erişim yetkiniz yok." });
    }

    res.json(order);
  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({ message: "Sipariş alınırken hata oluştu." });
  }
};

exports.confirmOrderPayment = async (req, res) => {
  // Sorgu operatörü taşıyan nesneler başka siparişi eşleyebilir; yalnız metin kabul edilir.
  const conversationId =
    typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";
  if (!conversationId || conversationId.length > 64)
    return res.status(400).json({ message: "Eksik parametre." });

  const order = await Order.findOne({ conversationId });
  if (!order) return res.status(404).json({ message: "Sipariş bulunamadı." });

  // Yanıttaki "state" sonuç sayfasının tek bilgi kaynağıdır. Durum kodları eski
  // arayüzle uyum için korunur: yalnız ödenmiş sipariş 200 döner.
  if (!["paid", "shipped", "completed"].includes(order.status)) {
    if (order.status === "payment_review") {
      return res.status(409).json({
        code: "PAYMENT_REVIEW",
        state: "review",
        orderNumber: order.orderNumber,
        message:
          "Ödemeniz alındı; siparişiniz kontrol için incelemeye alındı. Ekibimiz sizinle iletişime geçecek.",
      });
    }
    // Sistemin kapattığı oturuma geç gelen ödeme hâlâ tamamlanabilir: sonuç sayfası beklesin.
    if (order.status === "cancelled" && RELEASED_REASONS.includes(order.cancelReason)) {
      return res.status(409).json({ state: "pending", message: "Ödeme henüz onaylanmadı." });
    }
    if (order.status === "cancelled") {
      return res.status(409).json({
        code: "PAYMENT_FAILED",
        state: "failed",
        message: "Ödeme onaylanmadı. Kartınızdan çekim yapıldıysa bizimle iletişime geçin.",
      });
    }
    return res.status(409).json({ state: "pending", message: "Ödeme henüz onaylanmadı." });
  }

  // Bildirim yolu henüz göndermediyse (ör. yarıda kaldıysa) arka planda dene;
  // sahiplik işareti çift e-postayı önler.
  if (!order.orderMailSentAt) queueOrderMails(order._id);

  return res.json({ state: "paid", orderNumber: order.orderNumber });
};
