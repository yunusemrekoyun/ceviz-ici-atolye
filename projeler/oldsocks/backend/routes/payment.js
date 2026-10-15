const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const paymentCtrl = require("../controllers/paymentController");

/* PayTR CSP (mock’ta da sorun çıkarmaz) */
const allowPayTRCSP = (req, res, next) => {
  const PAYTR = ["https://www.paytr.com", "https://*.paytr.com"].join(" ");
  res.removeHeader("Content-Security-Policy");
  res.setHeader(
    "Content-Security-Policy",
    [
      `default-src 'self' ${PAYTR}`,
      `script-src 'self' 'unsafe-inline' ${PAYTR}`,
      `script-src-elem 'self' 'unsafe-inline' ${PAYTR}`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: ${PAYTR}`,
      `font-src 'self' data:`,
      `connect-src 'self' ${PAYTR}`,
      `frame-src ${PAYTR}`,
      `worker-src 'self' blob:`,
      `frame-ancestors 'self'`,
    ].join("; ")
  );
  res.removeHeader("X-Frame-Options");
  res.removeHeader("Cross-Origin-Opener-Policy");
  res.removeHeader("Cross-Origin-Embedder-Policy");
  next();
};

router.post("/start", verifyToken, paymentCtrl.startPaymentSession);
router.get(
  "/inline/:conversationId",
  allowPayTRCSP,
  paymentCtrl.inlineCheckoutHtml
);

router.post("/start-guest", paymentCtrl.startGuestPaymentSession);

router.post("/callback/paytr", paymentCtrl.paytrCallback);
router.post("/mock-complete", paymentCtrl.mockComplete);

module.exports = router;
