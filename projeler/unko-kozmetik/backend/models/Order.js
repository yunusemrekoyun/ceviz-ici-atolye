const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "Sipariş Alındı",
  "Sipariş Onaylandı",
  "Kargoya Verildi",
  "Teslim Edildi",
  "İptal Edildi",
];

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // ödenen birim fiyat (indirim + kupon sonrası)
    name: { type: String, required: true },
    brand: { type: String },
    category: { type: String },
    color: { type: String },
    size: { type: String },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String },

    items: [OrderItemSchema],
    subtotal: { type: Number }, // kupon öncesi ürün toplamı
    couponCode: { type: String },
    couponDiscount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },

    // Ödeme tamamlanana kadar sipariş "pending" kalır ve listelerde görünmez.
    // Bu alan eklenmeden önce oluşturulan siparişler ödenmiş kabul edilir.
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentProvider: { type: String, enum: ["stripe", "mock"] },
    stripeSessionId: { type: String, index: true },
    paidAt: { type: Date },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Sipariş Alındı",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);
Order.STATUSES = ORDER_STATUSES;
// Ödemesi tamamlanmış (veya bu alan eklenmeden önce oluşmuş) siparişler
Order.PAID_FILTER = { paymentStatus: { $ne: "pending" } };

module.exports = Order;
