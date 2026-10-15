// backend/routes/orders.js
const router = require("express").Router();
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const orderCtrl = require("../controllers/orderController");
const { allowRoles } = require("../middleware/roles");

// Sipariş kimliği tahminini sınırlar: yalnız bulunamayan/geçersiz kimlik (404/400) sayılır.
// Sonuç sayfası onay gecikince sık sorar; bekleyen ya da ödenmiş siparişin sorgusu
// müşteriyi kilitlemesin.
const confirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => ![400, 404].includes(res.statusCode),
});
// Admin hepsi görsün:
router.get("/all", verifyToken, allowRoles("admin"), orderCtrl.getAllOrders);

// Admin sipariş statüsü güncellemesi:
router.put(
  "/:id/status",
  verifyToken,
  allowRoles("admin"),
  orderCtrl.updateOrderStatus
);
router.post(
  "/:id/cancel",
  verifyToken,
  allowRoles("admin"),
  orderCtrl.cancelOrder
);
router.put(
  "/:id/tracking",
  verifyToken,
  allowRoles("admin"),
  orderCtrl.updateOrderTracking
);
router.get(
  "/unseen-count",
  verifyToken,
  allowRoles("admin"),
  orderCtrl.getUnseenPaidCount
);
router.put(
  "/mark-seen",
  verifyToken,
  allowRoles("admin"),
  orderCtrl.markPaidOrdersSeen
);
// Tüm endpoint’ler korumalı

router.post("/confirm", confirmLimiter, orderCtrl.confirmOrderPayment);

// Sipariş takibi: sipariş no + e-posta. Tahmin denemelerine karşı sıkı sınır.
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { message: "Çok fazla deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin." },
});
router.post("/lookup", lookupLimiter, orderCtrl.lookupOrder);

// Tüm kalan endpoint’ler korumalı
router.use(verifyToken);
router.get("/", orderCtrl.getMyOrders);
router.get("/:id", orderCtrl.getOrderById);

module.exports = router;
