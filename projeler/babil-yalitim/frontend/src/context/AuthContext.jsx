/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import api from "../api.js";

const AuthContext = createContext();

/** Küçük yardımcı: cookie’den değer oku (csrfToken httpOnly değildir) */
function getCookie(name) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[1]) : "";
}

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((exp) => {
    if (!exp) return;
    const msUntilExp = exp * 1000 - Date.now();
    const refreshIn = Math.max(msUntilExp - 2 * 60 * 1000, 15 * 1000); // exp - 2dk
    clearRefreshTimer();
    refreshTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        const csrf = data?.csrfToken || getCookie("csrfToken");
        if (csrf) localStorage.setItem("csrfToken", csrf);
        if (data?.exp) scheduleRefresh(data.exp);
      } catch (error) {
        console.error("Auth refresh failed:", error?.response?.data || error);
        clearRefreshTimer();
        setIsAdmin(false);
        window.location.href = "/admin";
      }
    }, refreshIn);
  }, [clearRefreshTimer]);

  /** Login: cookie tabanlı akış; backend { csrfToken } döner */
  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    const csrf = data?.csrfToken || getCookie("csrfToken");
    if (csrf) {
      localStorage.setItem("csrfToken", csrf);
      // Header’ı sürekli set etmeye gerek yok; api.js her istekte localStorage’dan okuyor.
    }
    if (data?.exp) scheduleRefresh(data.exp);
    setIsAdmin(true);
    return data; // Login.jsx gerekirse csrfToken’ı buradan da kullanabilir
  };

  /** Logout: cookie temizliği backend’de; front’ta flag’leri sil */
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error?.response?.data || error);
      // Ignore
    } finally {
      localStorage.removeItem("csrfToken");
      clearRefreshTimer();
      setIsAdmin(false);
      window.location.href = "/admin";
    }
  };

  /** İlk açılışta session kontrolü */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Mevcut cookie ile kimlik doğrulanıyor mu?
        const { data } = await api.get("/auth/me");
        if (!mounted) return;
        setIsAdmin(!!data?.user);
        if (data?.exp) scheduleRefresh(data.exp);
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // CSRF header için cookie/localStorage’ı hazırla (api.js request’te okuyacak)
    const csrf = getCookie("csrfToken") || localStorage.getItem("csrfToken");
    if (csrf) {
      localStorage.setItem("csrfToken", csrf);
    }

    return () => {
      clearRefreshTimer();
      mounted = false;
    };
  }, [clearRefreshTimer, scheduleRefresh]);

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);
