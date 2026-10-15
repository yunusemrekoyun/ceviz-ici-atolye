// // backend/utils/image.js
// const sharp = require("sharp");

// /**
//  * Görseli optimize et, uzun kenarı sınırlayıp (ör: 2560px),
//  * otomatik döndür ve WebP'e çevir (yüksek kalite).
//  * Çıktı: { base64, contentType, width, height, size }
//  */
// async function processToBase64(buffer) {
//   const pipeline = sharp(buffer, { failOn: "none" }).rotate();

//   // Çok büyük görselleri akıllıca küçült (uzun kenar 2560)
//   const meta = await pipeline.metadata();
//   const needsResize = Math.max(meta.width || 0, meta.height || 0) > 2560;

//   const processed = (
//     needsResize
//       ? pipeline.resize({ width: 2560, withoutEnlargement: true })
//       : pipeline
//   )
//     .webp({ quality: 90 }) // kalite/performans dengesi
//     .withMetadata();

//   const out = await processed.toBuffer();
//   const outMeta = await sharp(out).metadata();

//   return {
//     base64: out.toString("base64"),
//     contentType: "image/webp",
//     width: outMeta.width,
//     height: outMeta.height,
//     size: out.length, // byte
//   };
// }

// module.exports = { processToBase64 };
