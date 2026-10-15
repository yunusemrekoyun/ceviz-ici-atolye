/********************************************************
 * frontend/src/utils/auth.js
 ********************************************************/
import { API_URL } from "../config/api";

const SESSION_KEYS = ["token", "refreshToken", "isAdmin"];

export const getToken = () => localStorage.getItem("token");

export const isLoggedIn = () => Boolean(getToken());

export const saveSession = ({ token, refreshToken, role }) => {
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken || "");
  localStorage.setItem("isAdmin", role === "admin" ? "true" : "false");
};

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

// Token'ları sunucuda da geçersiz kılar, ardından yerel oturumu temizler
export const logout = async () => {
  const token = getToken();
  const refreshToken = localStorage.getItem("refreshToken");
  if (token) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Sunucuya ulaşılamasa da yerel oturum kapatılır
    }
  }
  clearSession();
};

// Giriş sonrası dönülecek adres sadece site içi bir yol olabilir
export const safeRedirectPath = (path) =>
  typeof path === "string" && /^\/(?![/\\])/.test(path) ? path : null;
