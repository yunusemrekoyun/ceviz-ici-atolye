import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api";
import { getPasswordValidation } from "../utils/passwordRules";
import usePageMeta from "../hooks/usePageMeta";

export default function ResetPasswordPage() {
  usePageMeta({ title: "Şifre Sıfırlama", noindex: true });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Yeni bağlantılar token'ı # kısmında taşır (sunucu loglarına düşmez); eskiler sorgu dizesinde.
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || searchParams.get("token") || ""
  );
  useEffect(() => {
    // Token'ı adres çubuğundan ve tarayıcı geçmişinden kaldır.
    if (window.location.hash || window.location.search) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordValidation = useMemo(
    () => getPasswordValidation(form.password || ""),
    [form.password]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Şifre sıfırlama bağlantısı geçersiz veya eksik.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    if (!passwordValidation.allOk) {
      setError("Şifre güvenlik kurallarını sağlamıyor.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post(
        "/auth/reset-password",
        {
          token,
          password: form.password,
        },
        { skipAuthRefresh: true }
      );

      setSuccess(data?.message || "Şifreniz güncellendi. Giriş yapabilirsiniz.");
      setForm({ password: "", confirmPassword: "" });
      setTimeout(() => navigate("/auth"), 1200);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Şifre güncellenemedi. Lütfen yeniden deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-light2 bg-white p-8 shadow-lg">
        <h1 className="mb-3 text-center text-3xl font-bold text-dark1">
          Yeni Şifre Belirleyin
        </h1>
        <p className="mb-6 text-center text-sm leading-6 text-dark2">
          Kayıt olurken kullandığınız güvenlik kuralları burada da geçerli.
        </p>

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 text-center text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-dark2">
              Yeni şifre
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-light2 bg-light1 px-4 py-3 pr-16 text-dark1 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-dark1"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 text-sm text-gray-600"
              >
                {showPassword ? "Gizle" : "Göster"}
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {passwordValidation.results.map((rule) => (
                <li
                  key={rule.id}
                  className={rule.ok ? "text-emerald-600" : "text-gray-500"}
                >
                  {rule.ok ? "✓ " : "• "} {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm text-dark2"
            >
              Yeni şifre (tekrar)
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-light2 bg-light1 px-4 py-3 text-dark1 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-dark1"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-dark1 py-3 font-semibold text-white transition hover:bg-dark2 disabled:opacity-50"
          >
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-dark2">
          <Link to="/auth" className="font-semibold text-dark1 hover:underline">
            Giriş ekranına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
