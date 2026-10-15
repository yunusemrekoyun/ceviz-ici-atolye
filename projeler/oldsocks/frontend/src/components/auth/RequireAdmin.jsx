// src/components/auth/RequireAdmin.jsx
import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function RequireAdmin() {
  const { isLoggedIn, role, loading } = useContext(AuthContext);

  if (loading || (isLoggedIn && role === null)) {
    return <div className="min-h-[40vh] p-8 text-center">Yükleniyor…</div>;
  }

  // 2) Giriş yoksa ya da rol admin değilse anasayfaya gönder:
  if (!isLoggedIn || role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // 3) Admin ise, child route’u render et:
  return <Outlet />;
}
