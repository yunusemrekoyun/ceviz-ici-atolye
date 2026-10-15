const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const {
  getStorageSummary,
  deleteArchives,
  deleteOrphans,
} = require("../controller/storageController");

const router = express.Router();

// Tamami admin: depolama raporu ve silme islemleri disariya kapali.
router.get("/", verifyToken, getStorageSummary);
router.delete("/archives", verifyToken, deleteArchives);
router.delete("/orphans", verifyToken, deleteOrphans);

module.exports = router;
