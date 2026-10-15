// src/components/auth/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireAuth({ children }) {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  // Eğer hâlâ loading ise kısa bir yükleme gösterebilirsin
  if (loading) {
    return <div className="text-center p-4">Yükleniyor…</div>;
  }

  // Girişli değilse uyar ve login’e yönlendir
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // Girişliyse children’ı render et
  return children;
}
