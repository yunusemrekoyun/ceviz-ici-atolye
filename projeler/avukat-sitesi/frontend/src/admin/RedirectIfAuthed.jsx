// src/admin/RedirectIfAuthed.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthAPI } from "../lib/api";

export default function RedirectIfAuthed({ children }) {
  const [state, setState] = useState({ loading: true, authed: false });

  useEffect(() => {
    let alive = true;
    AuthAPI.me()
      .then(() => alive && setState({ loading: false, authed: true }))
      .catch(() => alive && setState({ loading: false, authed: false }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) return null; // kısa süreli boş ekran
  if (state.authed) return <Navigate to="/admin/home" replace />;
  return children;
}
