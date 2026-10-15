// backend/models/Order.js
const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: null },
  qty: { type: Number, required: true },
  size: { type: String },
  // Beden satırının kimliği: yönetici bedenin adını değiştirse de iade/ayrım bitişinde
  // stok doğru satıra geri eklenir.
  sizeId: { type: mongoose.Types.ObjectId, default: null },
  color: { type: String },
});

const GuestSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80 },
    email: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 20 },
    identityNumber: { type: String, trim: true },
    registrationAddress: { type: String, trim: true, maxlength: 500 },
    identityFallbackUsed: { type: Boolean, default: false },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },

    // Kayıtlı kullanıcı varsa doldurulur:
    user: { type: mongoose.Types.ObjectId, ref: "User", required: false },

    // Guest checkout bilgileri (opsiyonel — user yoksa guest dolu olmalı)
    guest: { type: GuestSchema, default: null },

    items: { type: [OrderItemSchema], required: true },
    totalPrice: { type: Number, required: true },
    orderMailSentAt: { type: Date, default: null },
    // Arka plan gönderiminin sahiplik işareti (aynı sipariş için çift e-postayı önler).
    mailAttemptAt: { type: Date, default: null },
    // Gönderilemeyen sipariş e-postasının deneme sayısı ve bir sonraki deneme anı.
    mailAttempts: { type: Number, default: 0 },
    mailRetryAt: { type: Date, default: null },
    // payment_review uyarısı yöneticiye gönderildi mi.
    reviewAlertSentAt: { type: Date, default: null },
    customerMailSentAt: { type: Date, default: null },
    adminMailSentAt: { type: Date, default: null },
    address: {
      title: { type: String, required: true, trim: true, maxlength: 80 },
      mainaddress: { type: String, required: true, trim: true, maxlength: 500 },
      street: { type: String, required: true, trim: true, maxlength: 180 },
      district: { type: String, trim: true, maxlength: 120 },
      city: { type: String, required: true, trim: true, maxlength: 100 },
      postalCode: { type: String, trim: true, maxlength: 20 },
    },

    shipping: {
      name: { type: String, default: null },
      fee: { type: Number, default: 0 },
      carrier: { type: String, default: null, trim: true, maxlength: 60 },
      trackingNumber: { type: String, default: null, trim: true, maxlength: 60 },
    },
    // Yönetici "Kargoya verildi" / "Tamamlandı" işaretlediği an. Bu alanlar yalnız
    // yeni akışla dolar; eski siparişlere geriye dönük e-posta gitmez.
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    shippedMailSentAt: { type: Date, default: null },
    deliveredMailSentAt: { type: Date, default: null },
    statusMailAttemptAt: { type: Date, default: null },
    statusMailAttempts: { type: Number, default: 0 },
    statusMailRetryAt: { type: Date, default: null },
    // Yöneticinin iptal / iade kaydı. Para PayTR panelinden iade edilir; burada kaydı tutulur.
    refund: {
      amount: { type: Number, default: null, min: 0 },
      note: { type: String, default: null, trim: true, maxlength: 500 },
      at: { type: Date, default: null },
      by: { type: mongoose.Types.ObjectId, ref: "User", default: null },
      restocked: { type: Boolean, default: false },
      notifyCustomer: { type: Boolean, default: false },
    },
    cancelledMailSentAt: { type: Date, default: null },
    // Mesafeli satış: ödeme adımında alınan onaylar (hangi metin, ne zaman, nereden).
    consent: {
      preInformationAcceptedAt: { type: Date, default: null },
      distanceSalesAcceptedAt: { type: Date, default: null },
      version: { type: String, default: null, maxlength: 200 },
      ip: { type: String, default: null, maxlength: 64 },
      userAgent: { type: String, default: null, maxlength: 300 },
    },

    campaign: {
      campaignId: { type: mongoose.Types.ObjectId, ref: "CartCampaign", default: null },
      name: { type: String, default: null },
      templateType: { type: String, default: null },
      savings: { type: Number, default: 0 },
      details: { type: Object, default: null },
    },

    coupon: {
      couponId: { type: mongoose.Types.ObjectId, ref: "Coupon", default: null },
      code: { type: String, default: null },
      discountType: { type: String, default: null },
      discountValue: { type: Number, default: 0 },
      minimumSubtotal: { type: Number, default: 0 },
      savings: { type: Number, default: 0 },
      details: { type: Object, default: null },
    },

    pricing: {
      subTotal: { type: Number, default: 0 },
      campaignDiscount: { type: Number, default: 0 },
      couponDiscount: { type: Number, default: 0 },
      discountedSubTotal: { type: Number, default: 0 },
      shippingFee: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },

    identityFallbackUsed: { type: Boolean, default: false },

    cancelReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    paymentReceivedAt: { type: Date, default: null },

    paymentId: { type: String },
    conversationId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: [
        "pending",
        "payment_review",
        "paid",
        "shipped",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
    stockUpdated: { type: Boolean, default: false },
    // Ödeme adımında stok bu siparişe ayrıldıysa ayrımın bitiş anı (bekleyen siparişte).
    stockReservedUntil: { type: Date, default: null },
    // Misafir ayrımında bağlantı anahtarı (IPv4 adresi ya da IPv6 /56 ağı); aynı bağlantıdan
    // açık ayrım sayısı bununla sınırlanır.
    stockHoldKey: { type: String, default: null },
    adminSeenAt: { type: Date, default: null },

    paytrInit: { type: Object, default: null },
    iyzInit: { type: Object, default: null },
  },
  { timestamps: true }
);

// En azından user veya guest birinden biri dolu olsun
OrderSchema.pre("validate", function (next) {
  if (!this.user && !this.guest) {
    return next(new Error("Order must have either a user or guest info."));
  }
  next();
});

OrderSchema.index({ status: 1, adminSeenAt: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, stockReservedUntil: 1 });
OrderSchema.index(
  { stockHoldKey: 1, status: 1, stockReservedUntil: 1 },
  { partialFilterExpression: { stockHoldKey: { $type: "string" } } }
);
OrderSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model("Order", OrderSchema);
