// routes/articleRoutes.js
import { Router } from "express";
import { articleController } from "../controller/articleController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { upload } from "../middleware/upload.js";
import { cloudinaryUpload } from "../middleware/cloudinaryUpload.js";

const r = Router();

// Public
r.get("/", articleController.list);
r.get("/:slug", articleController.detail);

// Admin (multipart + cloudinary)
r.post(
  "/",
  verifyToken("admin"),
  upload.single("image"),
  cloudinaryUpload({ folder: "articles", field: "image" }),
  articleController.create
);

r.put(
  "/:slug",
  verifyToken("admin"),
  upload.single("image"),
  cloudinaryUpload({ folder: "articles", field: "image" }),
  articleController.update
);

r.delete("/:slug", verifyToken("admin"), articleController.remove);

export default r;
