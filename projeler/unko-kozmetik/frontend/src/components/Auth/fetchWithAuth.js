// frontend/src/components/Auth/fetchWithAuth.js
import { API_URL } from "../../config/api";
import { clearSession } from "../../utils/auth";

// Aynı anda 401 alan istekler tek bir yenileme isteğini paylaşır
let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refreshToken,
      oldAccessToken: localStorage.getItem("token"),
    }),
  });
  if (!res.ok) return null;

  const { token, role } = await res.json();
  localStorage.setItem("token", token);
  localStorage.setItem("isAdmin", role === "admin" ? "true" : "false");
  return token;
};

// redirectOnFail: oturum yenilenemezse giriş sayfasına yönlendir
// (sadece "giriş yapmış mı?" kontrolü yapan isteklerde false verilir)
export const fetchWithAuth = async (
  url,
  options = {},
  { redirectOnFail = true } = {}
) => {
  const makeRequest = (accessToken) => {
    const isFormData = options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };
    if (!isFormData && options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(url, { ...options, headers });
  };

  // 1. Önce mevcut token ile dene
  const res = await makeRequest(localStorage.getItem("token"));
  if (res.status !== 401) return res;

  // 2. 401 gelirse refresh token ile yenile
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  const newToken = await refreshPromise;

  if (!newToken) {
    // Yenileme başarısızsa oturumu kapat ve giriş sayfasına yönlendir
    clearSession();
    if (redirectOnFail) window.location.href = "/auth";
    return res;
  }

  // 3. Yeni token ile isteği tekrarla
  return makeRequest(newToken);
};
