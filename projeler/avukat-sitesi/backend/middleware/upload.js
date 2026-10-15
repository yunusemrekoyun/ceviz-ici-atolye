// middleware/upload.js
import multer from "multer";
const storage = multer.memoryStorage(); // Cloudinary'e stream için
export const upload = multer({ storage });
