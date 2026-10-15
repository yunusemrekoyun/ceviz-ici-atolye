const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const {
  getSiteSettings,
  updateSiteSettings,
} = require("../controller/siteSettingsController");

const router = express.Router();

router.get("/", getSiteSettings);
router.patch("/", verifyToken, updateSiteSettings);

module.exports = router;
