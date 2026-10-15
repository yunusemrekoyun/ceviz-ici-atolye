const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
// Not: Projede hem diskStorage hem memoryStorage varyantların var.
// Bu controller hem buffer hem path ile çalışır; mevcut “uploadMedia” (image|video izinli) işini görür.
const { upload, compressIfNeeded } = require("../middleware/uploadMedia");
const rateLimit = require("express-rate-limit");

const {
  getJournals,
  getJournalById,
  createJournal,
  updateJournal,
  deleteJournal,
  setJournalOrder,
  deleteAsset,
  likeJournal,
  getLikesCount,
  getJournalTranslations,
  updateJournalTranslations,
} = require("../controller/journalController");

const likeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// public
router.get("/", getJournals);
router.get("/:id", getJournalById);
router.get("/:id/likes", getLikesCount);
router.post("/:id/like", likeLimiter, likeJournal);

// admin (multipart)
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "cover", maxCount: 1 }, // zorunlu (image)
    { name: "assets", maxCount: 20 }, // opsiyonel (image|video çoklu)
  ]),
  compressIfNeeded,
  createJournal
);

router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "cover", maxCount: 1 }, // REPLACE
    { name: "assets", maxCount: 20 }, // APPEND
  ]),
  compressIfNeeded,
  updateJournal
);

router.patch("/:id/order", verifyToken, setJournalOrder);
router.get("/:id/translations", verifyToken, getJournalTranslations);
router.put("/:id/translations", verifyToken, updateJournalTranslations);

router.delete("/:id", verifyToken, deleteJournal);

// opsiyonel: tek asset sil
router.delete("/:id/assets/:mediaKey", verifyToken, deleteAsset);

module.exports = router;
