// src/utils/compressImageSmart.js
// 3 denemeye kadar akıllı sıkıştırma: kalite düşür + gerekirse minik downscale.
// Hedef: ~4.8MB altına inmek (server 5MB ise güvenlik payı).
export async function compressImageSmart(
  file,
  {
    maxW = 1600,
    maxH = 1600,
    initialQuality = 0.82,
    qualityStep = 0.08,
    minQuality = 0.5,
    downscaleStep = 0.92,
    maxAttempts = 3, // toplam deneme
    maxBytes = 4.8 * 1024 * 1024, // 4.8MB hedef
    targetMime = "image/jpeg",
    fillBackground = "#ffffff", // şeffaf PNG/WebP için zemin
  } = {}
) {
  // Zaten küçük ve desteklenen tip ise dokunma
  if (
    file.size <= maxBytes &&
    /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type)
  ) {
    return file;
  }

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let w = img.width;
  let h = img.height;
  const fit = Math.min(maxW / w, maxH / h, 1);
  w = Math.round(w * fit);
  h = Math.round(h * fit);

  let quality = initialQuality;

  async function drawAndEncode() {
    canvas.width = w;
    canvas.height = h;
    if (fillBackground) {
      ctx.fillStyle = fillBackground;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), targetMime, quality)
    );
    return blob;
  }

  let attempt = 0;
  let blob = await drawAndEncode();

  // Denemeler: kalite düşür; yetmezse kısa downscale; toplam 3 deneme.
  while (attempt < maxAttempts - 1 && blob.size > maxBytes) {
    attempt++;

    // 1) Kaliteyi düşür
    if (quality > minQuality) {
      quality = Math.max(minQuality, quality - qualityStep);
      blob = await drawAndEncode();
      if (blob.size <= maxBytes) break;
    }

    // 2) Hâlâ büyükse ufak downscale ile tekrar
    if (blob.size > maxBytes) {
      w = Math.max(600, Math.round(w * downscaleStep));
      h = Math.max(600, Math.round(h * downscaleStep));
      blob = await drawAndEncode();
    }
  }

  URL.revokeObjectURL(img.src);

  if (blob.size > maxBytes) {
    throw new Error(
      "Görsel 5MB altına sıkıştırılamadı. Lütfen farklı bir görsel seçin."
    );
  }

  const safeName = (file.name || "image").replace(
    /\.(png|jpg|jpeg|webp|gif|heic|avif)$/i,
    ".jpg"
  );

  return new File([blob], safeName, { type: blob.type || targetMime });
}
