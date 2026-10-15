// backend/routes/authRoutes.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const { login, me, logout, refresh } = require("../controller/authController");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
  validate: {
    trustProxy: false,
  },
});

router.post("/login", loginLimiter, login);
router.get("/me", verifyToken, me);
router.post("/logout", verifyToken, logout);
router.post("/refresh", verifyToken, refresh);

module.exports = router;
