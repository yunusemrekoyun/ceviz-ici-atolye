// src/pages/AuthPage.jsx
import React, { useContext } from "react";
import Auth from "../components/auth/Auth";
import UserAccountLayout from "../components/user/UserAccountLayout";
import { AuthContext } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";

export default function AuthPage() {
  usePageMeta({ title: "Hesabım", noindex: true });
  const { isLoggedIn } = useContext(AuthContext);
  const location = useLocation();
  const redirectTo = location.state?.from;

  // Hesap sayfası kendi kenar boşluklarını ve zeminini verir.
  if (isLoggedIn) return <UserAccountLayout />;

  return (
    <div className="min-h-screen p-10">
      <Auth redirectTo={redirectTo} />
    </div>
  );
}
