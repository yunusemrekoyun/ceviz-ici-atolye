// routes/decisionRoutes.js
import { Router } from "express";
import { decisionController } from "../controller/decisionController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { upload } from "../middleware/upload.js";
import { cloudinaryUpload } from "../middleware/cloudinaryUpload.js";

const r = Router();

/**
 * PUBLIC
 * - /api/decisions/keywords/suggest  → yazdıkça keyword önerileri (prefix)
 * - /api/decisions                    → liste (q: geniş arama, kw: sadece keywords prefix)
 * - /api/decisions/:slug              → detay
 */

// NOTE: ÖNCE özel route (slug ile çakışmasın)
r.get("/keywords/suggest", decisionController.keywordSuggest);

// Public list & detail
r.get("/", decisionController.list);
r.get("/:slug", decisionController.detail);

/**
 * ADMIN (multipart + Cloudinary)
 */
r.post(
  "/",
  verifyToken("admin"),
  upload.single("image"),
  cloudinaryUpload({ folder: "decisions", field: "image" }),
  decisionController.create
);

r.put(
  "/:slug",
  verifyToken("admin"),
  upload.single("image"),
  cloudinaryUpload({ folder: "decisions", field: "image" }),
  decisionController.update
);

r.delete("/:slug", verifyToken("admin"), decisionController.remove);

export default r;