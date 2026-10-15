/********************************************************
 * backend/routes/payment.js
 *
 * Akış:
 *  1) POST /quote     → sepet tutarı sunucuda hesaplanır (giriş gerekmez)
 *  2) POST /checkout  → "pending" sipariş oluşturulur, ödeme sayfası URL'i döner
 *  3) POST /confirm   → başarı sayfası ödemeyi doğrular, sipariş "paid" olur
 *  4) POST /webhook   → (opsiyonel) Stripe ödemeyi doğrudan bildirir
 *
 * STRIPE_SECRET_KEY tanımlı değilse ve production değilse ödeme TEST (mock)
 * modunda çalışır: gerçek tahsilat yapılmadan sipariş tamamlanır.
 ********************************************************/
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const config = require("../config");
const authMiddleware = require("../middlewares/authMiddleware");
const Address = require("../models/Address");
const Order = require("../models/Order");
const { buildQuote, quoteToJSON, toTL } = require("../utils/pricing");
const { HttpError, asyncHandler } = require("../utils/http");

const stripe = config.stripeSecretKey ? Stripe(config.stripeSecretKey) : null;
const paymentMode = stripe
  ? "stripe"
  : config.isProduction
  ? "disabled"
  : "mock";

if (paymentMode === "mock") {
  console.warn(
    "STRIPE_SECRET_KEY tanımlı değil: ödeme TEST (mock) modunda, gerçek tahsilat yapılmaz."
  );
}

// Sadece hâlâ "pending" olan siparişi günceller (tekrar çağrılırsa etkisizdir)
const markOrderPaid = async (orderId) => {
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: "pending" },
    { paymentStatus: "paid", paidAt: new Date() },
    { new: true }
  );
  return updated || Order.findById(orderId);
};

const lineLabel = (line) => {
  const variant = [line.color, line.size].filter(Boolean).join(", ");
  return variant ? `${line.name} (${variant})` : line.name;
};

// Ödeme modu (stripe | mock | disabled)
router.get("/config", (req, res) => {
  res.status(200).json({ success: true, data: { mode: paymentMode } });
});

// Sepet özeti
router.post(
  "/quote",
  asyncHandler(async (req, res) => {
    const quote = await buildQuote(req.body.items, req.body.couponCode);
    res.status(200).json({ success: true, data: quoteToJSON(quote) });
  })
);

// Ödeme başlatma
router.post(
  "/checkout",
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (paymentMode === "disabled") {
      throw new HttpError(503, "Ödeme sistemi şu anda kullanılamıyor.");
    }

    const quote = await buildQuote(req.body.items, req.body.couponCode);
    if (quote.issues.length) throw new HttpError(400, quote.issues[0].message);
    if (quote.couponError) throw new HttpError(400, quote.couponError);

    const address = await Address.findOne({ userId: req.user.id }).sort({
      createdAt: 1,
    });
    if (!address) {
      throw new HttpError(
        400,
        "Ödeme için önce adres bilgilerinizi girmelisiniz."
      );
    }

    const order = await Order.create({
      userId: req.user.id,
      addressId: address._id,
      name: address.name,
      email: address.email,
      phone: address.phone,
      address: address.address,
      city: address.city,
      district: address.district,
      items: quote.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        price: toTL(l.unitKurus),
        name: l.name,
        brand: l.brand,
        category: l.category,
        color: l.color,
        size: l.size,
      })),
      subtotal: toTL(quote.subtotalKurus),
      couponCode: quote.coupon?.code,
      couponDiscount: toTL(quote.couponDiscountKurus),
      shippingFee: toTL(quote.shippingKurus),
      total: toTL(quote.totalKurus),
      paymentProvider: paymentMode,
    });

    if (paymentMode === "mock") {
      return res.status(201).json({
        success: true,
        data: {
          orderId: order._id,
          mode: paymentMode,
          url: `${config.clientDomain}/success?order_id=${order._id}`,
        },
        message: "Test ödemesi başlatıldı.",
      });
    }

    const lineItems = quote.lines.map((l) => ({
      price_data: {
        currency: "try",
        product_data: { name: lineLabel(l) },
        unit_amount: l.unitKurus,
      },
      quantity: l.quantity,
    }));
    if (quote.shippingKurus > 0) {
      lineItems.push({
        price_data: {
          currency: "try",
          product_data: { name: "Kargo Ücreti" },
          unit_amount: quote.shippingKurus,
        },
        quantity: 1,
      });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: address.email,
        line_items: lineItems,
        client_reference_id: String(order._id),
        metadata: { orderId: String(order._id) },
        success_url: `${config.clientDomain}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.clientDomain}/cart`,
      });

      order.stripeSessionId = session.id;
      await order.save();

      res.status(201).json({
        success: true,
        data: { orderId: order._id, mode: paymentMode, url: session.url },
        message: "Ödeme oturumu başarıyla oluşturuldu.",
      });
    } catch (err) {
      await order.deleteOne();
      console.error("Stripe oturumu oluşturulamadı:", err.message);
      throw new HttpError(
        502,
        "Ödeme oturumu oluşturulamadı. Lütfen tekrar deneyin."
      );
    }
  })
);

// Ödeme doğrulama — Body: { sessionId } (Stripe) veya { orderId } (test modu)
router.post(
  "/confirm",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { sessionId, orderId } = req.body;
    let order;

    if (sessionId) {
      if (!stripe) throw new HttpError(400, "Stripe yapılandırılmamış.");
      let session;
      try {
        session = await stripe.checkout.sessions.retrieve(String(sessionId));
      } catch {
        throw new HttpError(404, "Ödeme oturumu bulunamadı.");
      }
      order = await Order.findOne({
        _id: session.metadata?.orderId,
        userId: req.user.id,
      });
      if (!order) throw new HttpError(404, "Sipariş bulunamadı.");
      if (session.payment_status === "paid")
        order = await markOrderPaid(order._id);
    } else if (orderId) {
      order = await Order.findOne({ _id: orderId, userId: req.user.id });
      if (!order) throw new HttpError(404, "Sipariş bulunamadı.");
      if (paymentMode === "mock" && order.paymentProvider === "mock") {
        order = await markOrderPaid(order._id);
      }
    } else {
      throw new HttpError(400, "Ödeme bilgisi eksik.");
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        total: order.total,
        mode: order.paymentProvider,
      },
    });
  })
);

// Stripe webhook (server.js'de raw body ile bağlanır)
const webhookHandler = async (req, res) => {
  if (!stripe || !config.stripeWebhookSecret) return res.status(404).end();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      config.stripeWebhookSecret
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    if (session.payment_status === "paid" && session.metadata?.orderId) {
      await markOrderPaid(session.metadata.orderId);
    }
  }

  res.status(200).json({ received: true });
};

module.exports = router;
module.exports.webhookHandler = asyncHandler(webhookHandler);
