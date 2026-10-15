/********************************************************
 * frontend/src/config/api.js
 ********************************************************/
export const API_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);

// Backend görselleri "/api/products/:id/images/:imageId" şeklinde göreli döndürür
export const imageUrl = (img) => {
  const path = typeof img === "string" ? img : img?.url;
  if (!path) return "";
  return /^(https?:|data:|blob:)/.test(path) ? path : `${API_URL}${path}`;
};

// API hata yanıtındaki mesajı okur
export const readError = async (res, fallback = "Bir hata oluştu.") => {
  try {
    const data = await res.json();
    return data.message || data.error || fallback;
  } catch {
    return fallback;
  }
};
