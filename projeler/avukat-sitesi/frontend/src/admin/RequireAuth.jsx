// src/admin/RequireAuth.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthAPI } from "../lib/api";

export default function RequireAuth() {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, ok: false });

  useEffect(() => {
    let alive = true;
    AuthAPI.me()
      .then(() => alive && setState({ loading: false, ok: true }))
      .catch(() => alive && setState({ loading: false, ok: false }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-dvh grid place-items-center text-muted">
        Doğrulanıyor…
      </div>
    );
  }

  if (!state.ok) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
