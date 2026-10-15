// src/components/auth/Logout.jsx
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import api from "../../../api";
import { AuthContext } from "../../context/AuthContext";
import { clearCheckout } from "../../utils/checkoutSession";

// variant="menu": hesap sayfası kenar menüsündeki tam genişlik düğme;
// variant="row": telefonda profil sekmesindeki liste satırı.
const Logout = ({ variant = "icon" }) => {
  const navigate = useNavigate();
  const { setIsLoggedIn } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      // Backend'de cookie’yi temizleyecek
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout hatası:", err);
    } finally {
      // Access token'ı de temizle
      localStorage.removeItem("accessToken");
      clearCheckout();
      setIsLoggedIn(false);
      // Giriş sayfasına yönlendir
      navigate("/auth");
    }
  };

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-dark1 transition hover:bg-light1/60 sm:px-5"
      >
        <FaSignOutAlt className="text-sm text-dark2" />
        Çıkış Yap
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left font-medium text-red-700 transition hover:bg-red-50"
      >
        <FaSignOutAlt className="text-sm" />
        Çıkış Yap
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      title="Çıkış Yap"
      className="w-10 h-10 flex items-center justify-center border border-light3 rounded-full hover:border-brand transition"
    >
      <FaSignOutAlt className="text-dark2 hover:text-brand text-sm" />
    </button>
  );
};

export default Logout;
