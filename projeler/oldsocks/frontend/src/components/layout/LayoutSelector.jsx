// src/components/layout/LayoutSelector.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import Layout from "./Layout"; // user header/footer layout
import AdminLayout from "./AdminLayout"; // sol menülü layout

export default function LayoutSelector({ children }) {
  const { pathname } = useLocation();

  // "/admin" ile başlayan tüm rotalarda AdminLayout
  if (pathname.startsWith("/admin")) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  // diğer tüm rotalar için standart Layout
  return <Layout>{children}</Layout>;
}
