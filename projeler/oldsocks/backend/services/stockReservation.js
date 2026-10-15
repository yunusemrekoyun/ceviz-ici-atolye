// Stok rezervasyonu: müşteri ödeme ekranına geçtiğinde (sepette değil) sipariş
// oluşturulurken stok aynı işlemde düşülür ve belirli süre bu siparişe ayrılır.
// Ödeme başarısız olursa, süre dolarsa veya müşteri yeni bir ödeme başlatırsa stok
// geri eklenir. Ödeme başarılı olursa stok tekrar düşülmez.
const { ipKeyGenerator } = require("express-rate-limit");
const Order = require("../models/Order");
const ReservationLock = require("../models/ReservationLock");
const { applyStockChanges, restoreStock } = require("../utils/updateStock");
const { invalidateCatalog } = require("./catalogCache");

// En az 10 dakika: ödeme formu ayrımın bitmesine 3 dakika kala kapanır ve en az 2 dakika
// açık kalmalıdır (paymentController: inlineCheckoutHtml).
const HOLD_MINUTES = Math.max(10, Number(process.env.STOCK_HOLD_MINUTES) || 20);
const HOLD_MS = HOLD_MINUTES * 60 * 1000;
// PayTR ödeme sayfası rezervasyondan önce kapansın; aradaki süre geç gelen bildirim içindir.
const PAYTR_TIMEOUT_MINUTES = Math.max(5, HOLD_MINUTES - 5);

async function inTransaction(work) {
  const session = await Order.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

// Aynı bağlantıdan (IP) aynı anda açık tutulabilecek misafir stok ayrımı sayısı; sahte
// e-postalarla stoğun tutulmasını zorlaştırır. Üyeler hesap başına tek ayrımla sınırlıdır.
const HOLDS_PER_IP = Math.max(1, Number(process.env.STOCK_HOLDS_PER_IP) || 3);

class HoldLimitError extends Error {
  constructor() {
    super("Too many open stock holds for this connection.");
    this.name = "HoldLimitError";
  }
}

// IPv6'da tek cihaz birçok adres kullanabilir: hız sınırlayıcıdaki gibi /56 ağı sayılır.
function holdKeyFor(ip) {
  return ip ? ipKeyGenerator(String(ip)) : null;
}

// Stok yetmezse StockUnavailableError, bağlantının açık ayrım sınırı doluysa
// HoldLimitError fırlatır; sipariş oluşmaz.
async function createOrderWithReservation(orderData, { holdKey = null } = {}) {
  const created = await inTransaction(async (session) => {
    if (holdKey) {
      // Kilit kaydına yazmak aynı bağlantıdan eşzamanlı başlatmaları sıraya sokar;
      // sayım diğerinin sonucunu görür.
      await ReservationLock.updateOne({ _id: holdKey }, { $set: { at: new Date() } }, { upsert: true, session });
      const active = await Order.countDocuments({
        // $type: kısmi indeks (models/Order) yalnız bu biçimde kullanılır.
        stockHoldKey: { $eq: holdKey, $type: "string" },
        status: "pending",
        stockUpdated: true,
        stockReservedUntil: { $gt: new Date() },
      }).session(session);
      if (active >= HOLDS_PER_IP) throw new HoldLimitError();
    }
    await applyStockChanges({ items: orderData.items }, { session });
    const [order] = await Order.create(
      [
        {
          ...orderData,
          stockHoldKey: holdKey,
          stockUpdated: true,
          stockReservedUntil: new Date(Date.now() + HOLD_MS),
        },
      ],
      { session }
    );
    return order;
  });
  invalidateCatalog();
  return created;
}

// Bekleyen siparişi kapatır; ayrılmış stok varsa geri ekler. Sipariş artık bekleyen
// değilse (ör. ödendi) hiçbir şey yapmaz.
async function releaseReservation(orderId, reason) {
  const restored = await inTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order || order.status !== "pending") return false;
    let didRestore = false;
    // Yalnız ödeme adımındaki ayrım (bitiş anı kayıtlı) geri verilir. Ayrım sisteminden
    // önceki bekleyen siparişlerde stoğun neden düşülü olduğu bilinmez (ör. ödenmiş
    // siparişin yönetici tarafından bekleyene çekilmesi): stoğa dokunulmaz.
    if (order.stockUpdated && order.stockReservedUntil) {
      const { skipped } = await restoreStock(order, { session });
      // Ürün ya da beden silinmişse adet geri eklenemez; sessizce kaybolmasın.
      if (skipped.length) {
        console.warn("[stock] ayrım bırakılırken geri eklenemeyen kalemler:", { orderId: String(order._id), skipped });
      }
      order.stockUpdated = false;
      didRestore = true;
    }
    order.status = "cancelled";
    order.cancelReason = reason;
    order.cancelledAt = new Date();
    order.stockReservedUntil = null;
    await order.save({ session });
    return didRestore;
  });
  if (restored) invalidateCatalog();
  return restored;
}

// Müşterinin önceki bekleyen ödeme oturumunu kapatır; yeniden denediğinde kendi ayırdığı
// son adet ona engel olmasın. Üyelerde hesaba bağlı tüm oturumlar; ayrıca aynı tarayıcının
// bildirdiği oturum (conversationId yalnız o tarayıcıda tutulur), ör. misafirken ödemeye
// geçip sonra giriş yapan üyenin misafir oturumu. Üye başka bir hesabın oturumunu kapatamaz.
// E-posta tek başına yetmez: başkasının e-postasını yazan biri onun oturumunu kapatamasın.
async function releaseCustomerPendingOrders({ userId, previousConversationId, olderThan } = {}) {
  const conditions = [];
  if (userId) conditions.push({ user: userId });
  if (typeof previousConversationId === "string" && previousConversationId) {
    const conversationId = previousConversationId.slice(0, 64);
    conditions.push(userId ? { conversationId, user: { $in: [null, userId] } } : { conversationId });
  }
  if (!conditions.length) return 0;
  const filter = { status: "pending", $or: conditions };
  // Yeni sipariş oluştuktan sonra çağrılırsa yalnız ondan eski oturumlar kapanır
  // (aynı anda iki başlatmada ikisi birden kapanmasın).
  if (olderThan) filter._id = { $lt: olderThan };
  const pending = await Order.find(filter).select("_id").lean();
  for (const { _id } of pending) await releaseReservation(_id, "session_replaced");
  return pending.length;
}

// Bu tarayıcının açık ödeme oturumunun ayırdığı adetler ("ürün|beden" → adet). Müşteri
// ödeme ekranından sepete dönerse ayrım sürer (başka sekmede ödeme formu açık olabilir);
// sepet ve ödeme adımı bu adetleri müşteriye mevcut sayar. Yeni ödeme başlatılınca bu
// oturum kapanır. Süresi dolmuş ama henüz geri verilmemiş ayrım da sayılır: stok hâlâ
// düşülüdür ve yeni ödeme onu da kapatır. Üyede hesabın kendi açık oturumları da sayılır
// (başka cihazda ya da çıkış yapıp yeniden girdiyse; üyenin ödeme başlatması hepsini
// kapatır), başka bir hesabın oturumu sayılmaz.
// Dönüş: { quantities, conversationId } — conversationId yalnız tarayıcının bildirdiği oturum
// gerçekten eşleştiyse döner (kupon sayımında yalnız o oturum hariç tutulur).
async function heldQuantities(conversationId, { userId = null } = {}) {
  const quantities = new Map();
  const conditions = [];
  const validId = typeof conversationId === "string" && conversationId && conversationId.length <= 64;
  if (validId) {
    conditions.push(userId ? { conversationId, user: { $in: [null, userId] } } : { conversationId });
  }
  if (userId) conditions.push({ user: userId });
  if (!conditions.length) return { quantities, conversationId: null };
  const orders = await Order.find({ status: "pending", stockUpdated: true, $or: conditions })
    .select("conversationId user items.productId items.size items.qty")
    .lean();
  let matched = null;
  for (const order of orders) {
    if (validId && order.conversationId === conversationId) matched = conversationId;
    for (const item of order.items || []) {
      const key = `${item.productId}|${item.size || ""}`;
      quantities.set(key, (quantities.get(key) || 0) + (Number(item.qty) || 0));
    }
  }
  return { quantities, conversationId: matched };
}

async function releaseExpiredReservations(limit = 50) {
  const expired = await Order.find({
    status: "pending",
    stockUpdated: true,
    stockReservedUntil: { $ne: null, $lt: new Date() },
  })
    .select("_id")
    .limit(limit)
    .lean();
  for (const { _id } of expired) await releaseReservation(_id, "reservation_expired");
  if (expired.length) console.log(`[stock] süresi dolan ${expired.length} ödeme oturumunun stoğu geri verildi.`);
  return expired.length;
}

module.exports = {
  HOLD_MINUTES,
  HOLDS_PER_IP,
  HoldLimitError,
  holdKeyFor,
  heldQuantities,
  PAYTR_TIMEOUT_MINUTES,
  createOrderWithReservation,
  releaseReservation,
  releaseCustomerPendingOrders,
  releaseExpiredReservations,
};
