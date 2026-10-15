// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { requireHuman } = require("../services/turnstile");
const {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// POST /api/v1/auth/register
router.post("/register", requireHuman(), register);

// POST /api/v1/auth/login
router.post("/login", login);

// POST /api/v1/auth/refresh
router.post("/refresh", refresh);

// POST /api/v1/auth/logout
router.post("/logout", logout);

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, requireHuman(), forgotPassword);

// POST /api/v1/auth/reset-password
router.post("/reset-password", resetPasswordLimiter, resetPassword);

module.exports = router;
