import axios from "axios";

// Vercel için: VITE_API_BASE_URL = https://<railway-backend>/api
// Local fallback: aynı origin + /api
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;
const UPLOAD_TIMEOUT_MS =
  Number(import.meta.env.VITE_UPLOAD_TIMEOUT_MS) || 120000;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // httpOnly cookie’ler için şart
  timeout: 20000,
});

export const getApiUrl = (path = "") => {
  const normalizedBase = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
  return new URL(String(path || "").replace(/^\/+/, ""), normalizedBase).toString();
};

// İSTEK interceptor
api.interceptors.request.use(
  (config) => {
    // (Geri uyum) Header token kalmışsa gönder; cookie akışında gerekmiyor
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // FormData kontrolü
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (isFormData) {
      // Upload’larda daha uzun timeout tanı
      if (!config.timeout || config.timeout < UPLOAD_TIMEOUT_MS) {
        config.timeout = UPLOAD_TIMEOUT_MS;
      }

      // boundary için Content-Type elle set ETME
      if (config.headers?.["Content-Type"]) {
        delete config.headers["Content-Type"];
      }
    } else {
      if (config.headers && !config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    // CSRF: sadece state‑changing isteklerde gönder
    const method = (config.method || "get").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrf = localStorage.getItem("csrfToken");
      if (csrf) config.headers["x-csrf-token"] = csrf;
    }

    // Küçük sağlamlaştırmalar
    config.headers["Accept"] = "application/json";
    // X-Requested-With bilerek gönderilmiyor: sunucuda hiçbir yerde okunmuyor
    // ama CORS-safelisted olmadığı için her çapraz-origin GET isteğini
    // preflight'a zorluyordu. Kaldırılınca GET'ler "basit istek" oluyor ve
    // sayfa başına 5 fazladan tur atmıyoruz.

    return config;
  },
  (error) => Promise.reject(error)
);

// YANIT interceptor
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    const friendlyMessage =
      data?.message ||
      data?.error ||
      error?.message ||
      "Beklenmeyen bir hata oluştu.";

    // 🔒 Yalnızca admin alanındayken redirect yap
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "";
    const onAdminArea = pathname.startsWith("/admin");

    if (status === 401 || status === 403) {
      // Eski header tabanlı akış kalıntılarını temizleyelim
      localStorage.removeItem("token");
      localStorage.removeItem("csrfToken");

      // ❗ Sadece admin tarafındaysak login'e döndür
      if (onAdminArea && pathname !== "/admin") {
        window.location.href = "/admin";
      }
    }

    if (import.meta.env.DEV) {
      console.error("API error:", {
        url: error?.config?.url,
        method: error?.config?.method,
        status,
        data,
      });
    }

    return Promise.reject(Object.assign(error, { friendlyMessage, status }));
  }
);

// (Geri uyum) Dışarıdan token setlemek için helper
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export default api;
