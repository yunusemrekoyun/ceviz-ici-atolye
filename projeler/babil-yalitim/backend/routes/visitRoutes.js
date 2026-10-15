// backend/routes/visitRoutes.js
const express = require("express");
const router = express.Router();
const {
  recordVisit,
  getAllVisits,
  getVisitCountByPath,
  getSummary,
  getTopPages,
  getTimeseries,
} = require("../controller/visitController");
const verifyToken = require("../middleware/verifyToken");
const rateLimit = require("express-rate-limit");

const visitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔓 Public (KVKK onayı header’la geldiği sürece kayıt alınıyor) + rate limit
router.post("/", visitLimiter, recordVisit);

// 📊 Raporlar / Listeler (admin erişimi)
router.get("/", verifyToken, getAllVisits);
router.get("/count/:path", verifyToken, getVisitCountByPath);
router.get("/summary", verifyToken, getSummary);
router.get("/top-pages", verifyToken, getTopPages);
router.get("/timeseries", verifyToken, getTimeseries);

module.exports = router;
