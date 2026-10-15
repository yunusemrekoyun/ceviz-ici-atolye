// backend/routes/contact.js
const router = require("express").Router();
const { sendContactMessage } = require("../controllers/contactController");
const { requireHuman } = require("../services/turnstile");

// herkese açık form post (Turnstile açıksa bot doğrulaması ister)
router.post("/", requireHuman(), sendContactMessage);

module.exports = router;
