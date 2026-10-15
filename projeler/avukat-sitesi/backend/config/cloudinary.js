// config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

let isReady = false;

export function initCloudinary({ cloud_name, api_key, api_secret }) {
  if (!cloud_name || !api_key || !api_secret) {
    console.log("ℹ️ Cloudinary credentials not provided; skipping init.");
    return null;
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  isReady = true;
  console.log("✅ Cloudinary initialized");
  return cloudinary;
}

export function getCloudinary() {
  if (!isReady) throw new Error("Cloudinary not initialized");
  return cloudinary;
}

export function uploadBuffer(
  buffer,
  { folder = "articles", resource_type = "image" } = {}
) {
  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      { folder, resource_type },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

export async function destroyAsset(publicId) {
  if (!publicId) return;
  try {
    await getCloudinary().uploader.destroy(publicId); // image default
  } catch (e) {
    console.warn("Cloudinary destroy failed:", e.message);
  }
}
