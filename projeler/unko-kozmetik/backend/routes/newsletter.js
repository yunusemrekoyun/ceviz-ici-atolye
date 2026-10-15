/********************************************************
 * backend/routes/newsletter.js
 ********************************************************/
const express = require("express");
const router = express.Router();
const Subscriber = require("../models/Subscriber");
const { HttpError, asyncHandler, EMAIL_REGEX } = require("../utils/http");

// Bültene abone olma
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    if (!EMAIL_REGEX.test(email)) {
      throw new HttpError(400, "Geçerli bir e-posta adresi girin.");
    }

    if (await Subscriber.exists({ email })) {
      return res.status(200).json({
        success: true,
        message: "Bu e-posta adresi zaten kayıtlı.",
      });
    }

    await Subscriber.create({ email });
    res.status(201).json({
      success: true,
      message: "Teşekkürler! İndirimlerden ilk siz haberdar olacaksınız.",
    });
  })
);

module.exports = router;
