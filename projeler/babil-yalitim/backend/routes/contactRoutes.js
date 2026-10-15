const express = require("express");
const rateLimit = require("express-rate-limit");
const { submitContactForm } = require("../controller/contactController");

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Cok fazla mesaj gonderildi. Lutfen daha sonra tekrar deneyin." },
});

router.post("/", contactLimiter, submitContactForm);

module.exports = router;
