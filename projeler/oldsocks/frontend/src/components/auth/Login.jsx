import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../../api";

const Login = ({ onSwitch, onForgotPassword, redirectTo }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setIsLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form, {
        skipAuthRefresh: true,
      });
      // httpOnly refresh cookie backend tarafından set ediliyor
      localStorage.setItem("accessToken", data.accessToken);
      setIsLoggedIn(true);
      setSuccess(true);
      setForm({ email: "", password: "" });
      const destination =
        typeof redirectTo === "string" &&
        redirectTo.startsWith("/") &&
        !redirectTo.startsWith("//")
          ? redirectTo
          : "/profile";
      setTimeout(() => navigate(destination, { replace: true }), 800);
    } catch (err) {
      const status = err?.response?.status;
      const rawMsg = String(err?.response?.data?.message || "").toLowerCase();

      // Çok fazla deneme (hesap kilidi veya IP sınırı)
      if (status === 429) {
        setError(
          /dakika/.test(rawMsg)
            ? err.response.data.message
            : "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin."
        );
      }
      // Yanlış kimlik bilgileri → 401 (backend öyle ayarlı)
      else if (status === 401 || /geçersiz|invalid|credential/.test(rawMsg)) {
        setError("E-posta veya şifre hatalı.");
      }
      // Ağ/CORS hatası (response yok)
      else if (err.request && !err.response) {
        setError("Ağ hatası. Bağlantınızı kontrol edip tekrar deneyin.");
      }
      // Sunucu hataları
      else if (status >= 500) {
        setError("Sunucu hatası. Lütfen biraz sonra tekrar deneyin.");
      }
      // Diğer durumlar (ör. beklenmedik 400)
      else {
        setError("Giriş başarısız. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-enter w-full max-w-md mx-auto bg-white border border-light2 rounded-2xl shadow-lg p-8 text-dark1"
    >
      <h2 className="text-3xl font-bold text-center mb-6">Giriş Yap</h2>

      {success && (
        <div className="text-green-600 text-sm text-center mb-4">
          Başarıyla giriş yaptınız!
        </div>
      )}
      {error && (
        <div className="text-red-600 text-sm text-center mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm mb-1 text-dark2">
            E-posta adresi
          </label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="ornek@mail.com"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg border border-light2 bg-light1 text-dark1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dark1 transition"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm mb-1 text-dark2">
            Şifre
          </label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg border border-light2 bg-light1 text-dark1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dark1 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-dark1 text-white font-semibold hover:bg-dark2 transition disabled:opacity-50"
        >
          {loading ? "Giriş Yapılıyor…" : "Giriş Yap"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-medium text-dark2 hover:text-dark1 hover:underline"
        >
          Şifremi Unuttum
        </button>
      </div>

      <p className="text-sm text-center mt-6 text-dark2">
        Hesabınız yok mu?{" "}
        <button
          onClick={onSwitch}
          className="text-dark1 font-semibold hover:underline"
        >
          Kayıt olun
        </button>
      </p>
    </div>
  );
};

export default Login;
