// backend/routes/index.js
const express = require("express");
const router = express.Router();

// ✅ Prod’da crash etmesin: sade ve güvenli mount
router.use("/search", require("./searchRoutes"));
router.use("/blogs", require("./blogRoutes"));
router.use("/journals", require("./journalRoutes"));
router.use("/projects", require("./projectRoutes"));
router.use("/services", require("./serviceRoutes"));
router.use("/site-settings", require("./siteSettingsRoutes"));
router.use("/storage", require("./storageRoutes"));
router.use("/contact", require("./contactRoutes"));
router.use("/auth", require("./authRoutes"));
router.use("/visits", require("./visitRoutes"));

module.exports = router;
