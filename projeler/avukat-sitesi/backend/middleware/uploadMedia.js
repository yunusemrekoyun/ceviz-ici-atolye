// middleware/uploadMedia.js
import { uploadBuffer } from "../config/cloudinary.js";
import { upload } from "./upload.js";

/**
 * Çoklu dosya yükleme örneği (images).
 * Kullanım: r.post("/...", uploadMedia(), controller.fn)
 */
export function uploadMedia({
  field = "images",
  max = 10,
  folder = "articles",
} = {}) {
  const mw = upload.array(field, max);
  return function (req, res, next) {
    mw(req, res, async (err) => {
      if (err) return next(err);
      if (!req.files || req.files.length === 0) return next();

      try {
        const results = await Promise.all(
          req.files.map((f) => uploadBuffer(f.buffer, { folder }))
        );
        req.cloudinaryFiles = results.map((r) => ({
          url: r.secure_url || r.url,
          publicId: r.public_id,
          width: r.width,
          height: r.height,
          format: r.format,
        }));
        next();
      } catch (e) {
        next(e);
      }
    });
  };
}
