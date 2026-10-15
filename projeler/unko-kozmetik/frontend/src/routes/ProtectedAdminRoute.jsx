/********************************************************
 * frontend/src/routes/ProtectedAdminRoute.jsx
 * localStorage'daki "isAdmin" bayrağı sadece ön kontroldür;
 * rol her girişte sunucudan doğrulanır.
 ********************************************************/
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import PropTypes from "prop-types";
import { isAdmin } from "../config/isAdmin";
import { isLoggedIn } from "../utils/auth";
import { fetchWithAuth } from "../components/Auth/fetchWithAuth";

const ProtectedAdminRoute = ({ children }) => {
  const [status, setStatus] = useState(() =>
    isLoggedIn() && isAdmin() ? "checking" : "denied"
  );
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (status !== "checking") return;
    let active = true;

    fetchWithAuth(`${apiUrl}/api/auth/me`, {}, { redirectOnFail: false })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (!active) return;
        if (user?.role === "admin") {
          setStatus("allowed");
        } else {
          localStorage.setItem("isAdmin", "false");
          setStatus("denied");
        }
      })
      .catch(() => active && setStatus("denied"));

    return () => {
      active = false;
    };
  }, [apiUrl, status]);

  if (status === "denied") {
    return <Navigate to={isLoggedIn() ? "/" : "/auth"} replace />;
  }

  if (status === "checking") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return children;
};

ProtectedAdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedAdminRoute;
