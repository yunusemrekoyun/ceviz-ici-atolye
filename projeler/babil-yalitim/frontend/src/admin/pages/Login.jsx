// src/admin/pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getAdminFeedbackMessage } from "../utils/mediaFeedback";

// Küçük yardımcı: cookie'den okuma (csrfToken httpOnly DEĞİLDİR)
const getCookie = (name) => {
  if (typeof document === "undefined") return "";
  const m = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.split("=").slice(1).join("=")) : "";
};

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || "/admin/dashboard";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);
    try {
      const result = await login(username, password);

      // 1) Tercihen response’tan al
      let csrf = result?.csrfToken;

      // 2) Fallback: cookie’e yazılan csrfToken’ı oku
      if (!csrf) {
        csrf = getCookie("csrfToken");
      }

      // 3) Sakla (api.js state‑changing isteklerde header’a ekler)
      if (csrf) {
        localStorage.setItem("csrfToken", csrf);
      } else {
        console.warn("CSRF token alınamadı; yazma istekleri 403 verebilir.");
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError(getAdminFeedbackMessage(err, "Giriş başarısız"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 px-4">
      <form
        onSubmit={handleLogin}
        aria-busy={submitting}
        className="bg-white/30 backdrop-blur-md p-8 rounded-2xl shadow-xl w-full max-w-sm border border-white/30"
      >
        <h2 className="text-3xl font-bold mb-6 text-white text-center drop-shadow">
          Admin Girişi
        </h2>

        {error && (
          <p className="text-red-200 text-sm mb-4 text-center">{error}</p>
        )}

        <input
          type="text"
          placeholder="Kullanıcı Adı"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded-lg bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300"
          disabled={submitting}
          autoComplete="username"
          required
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-2 rounded-lg bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300"
          disabled={submitting}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-700 text-white py-2 rounded-lg hover:bg-blue-800 transition shadow-md disabled:cursor-not-allowed disabled:bg-blue-500/80 disabled:shadow-none"
        >
          {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
};

export default Login;
