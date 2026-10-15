import { useAuth } from "./AuthContext.jsx";
import { Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

/** Sadece guest'lerin (giriş yapmamış) görebileceği sayfa: /admin (login) */
const GuestRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  const location = useLocation();

  // Zaten girişli ise önceki sayfaya veya dashboard’a gönder
  if (isAdmin) {
    const from = location.state?.from?.pathname || "/admin/dashboard";
    return <Navigate to={from} replace />;
  }

  return children;
};

GuestRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default GuestRoute;
