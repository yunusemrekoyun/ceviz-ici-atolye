// middleware/cloudinaryUpload.js
import { uploadBuffer } from "../config/cloudinary.js";

export function cloudinaryUpload({
  folder = "articles",
  field = "image",
} = {}) {
  return async function (req, res, next) {
    try {
      if (!req.file) return next();
      const result = await uploadBuffer(req.file.buffer, { folder });
      req.cloudinaryFile = {
        url: result.secure_url || result.url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}
