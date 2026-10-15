// src/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../../api";

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("accessToken"))
  );
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(isLoggedIn);

  useEffect(() => {
    const handleExpiredSession = () => {
      setRole(null);
      setIsLoggedIn(false);
      setLoading(false);
    };

    window.addEventListener("auth:session-expired", handleExpiredSession);
    return () => {
      window.removeEventListener("auth:session-expired", handleExpiredSession);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setRole(null);
      setLoading(false);
      localStorage.removeItem("accessToken");
      return;
    }

    setLoading(true);
    api
      .get("/users/me")
      .then((res) => {
        setRole(res.data.role);
      })
      .catch((err) => {
        const status = err?.response?.status;
        setRole(null);
        // Yalnız 401/403 oturumu kapatır; ağ veya sunucu hatasında kullanıcı çıkış yapmış sayılmaz.
        if (status === 401 || status === 403) {
          setIsLoggedIn(false);
          localStorage.removeItem("accessToken");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
