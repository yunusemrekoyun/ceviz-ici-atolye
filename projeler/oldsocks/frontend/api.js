// src/api.js
import axios from "axios";

// Yanıt gelmeyen istek sonsuza kadar beklemesin. Dosya parçası yüklemeleri
// kendi isteklerinde zaman aşımını kapatır (timeout: 0).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 60000,
});

let refreshPromise = null;

function clearExpiredSession() {
  localStorage.removeItem("accessToken");
  delete api.defaults.headers.common.Authorization;
  window.dispatchEvent(new Event("auth:session-expired"));
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && !config.asGuest) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

function requestRefresh() {
  return api
    .post("/auth/refresh", null, { skipAuthRefresh: true })
    .then(({ data }) => {
      const newToken = data.accessToken;
      localStorage.setItem("accessToken", newToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      return newToken;
    });
}

// Sunucu her yenilemede refresh token'ı değiştirir. İki sekme aynı anda yenilerse
// ikincisi eski token'la reddedilir ve oturum kapanır. Web Locks ile yenilemeler
// sekmeler arasında sıraya girer; sıra gelen sekme başka sekmenin aldığı yeni
// token'ı görürse tekrar yenilemez.
function refreshAcrossTabs(failedToken) {
  const run = async () => {
    const current = localStorage.getItem("accessToken");
    if (current && current !== failedToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${current}`;
      return current;
    }
    return requestRefresh();
  };
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("oldsocks-auth-refresh", run);
  }
  return run();
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response } = error;

    // Bu bayrak varsa refresh interceptor’ü atla
    if (config?.skipAuthRefresh) {
      return Promise.reject(error);
    }

    const status = response?.status;
    if ((status === 401 || status === 403) && config && !config._retry) {
      config._retry = true;

      if (!refreshPromise) {
        const failedToken = String(config.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
        refreshPromise = refreshAcrossTabs(failedToken)
          .catch((err) => {
            // Yalnız sunucu oturumu reddederse çıkış yap; ağ veya 5xx hatası geçicidir.
            const refreshStatus = err?.response?.status;
            if (refreshStatus === 401 || refreshStatus === 403) clearExpiredSession();
            throw err;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      return refreshPromise.then(
        (token) => {
          config.headers = config.headers || {};
          config.headers["Authorization"] = `Bearer ${token}`;
          return api(config);
        },
        (err) => {
          // Herkese açık uçlar (sepet stok kontrolü, fiyat önizlemesi): oturum yenilenemezse
          // istek misafir olarak tekrarlanır.
          const refreshStatus = err?.response?.status;
          if (config.guestOnRefreshFail && (refreshStatus === 401 || refreshStatus === 403)) {
            config.asGuest = true;
            if (config.headers) delete config.headers["Authorization"];
            return api(config);
          }
          throw err;
        }
      );
    }

    return Promise.reject(error);
  }
);

export default api;
