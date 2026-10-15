// src/components/auth/Register.jsx
import React, { useState, useMemo } from "react";
import api from "../../../api";
import { IMaskInput } from "react-imask";
import { getPasswordValidation } from "../../utils/passwordRules";
import HoneypotField from "../ui/HoneypotField";
import useBotCheck from "../../hooks/useBotCheck";
import BotCheckField from "../../components/ui/BotCheckField";
import { BOT_CHECK_WAIT_MESSAGE } from "../../utils/botCheck";

const Register = ({ onSwitch }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "", // maskeli gösterim
    website: "", // bot tuzağı
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const bot = useBotCheck();

  const passwordValidation = useMemo(() => {
    return getPasswordValidation(formData.password || "");
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target; // IMaskInput da target.value verir
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // E.164 normalize: +90 + son 10 hane (5xxxxxxxxx)
  const toE164IfAny = (masked) => {
    const digits = String(masked || "").replace(/\D/g, "");
    const last10 = digits.slice(-10);
    return last10 ? `+90${last10}` : "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      setLoading(false);
      return;
    }
    if (!passwordValidation.allOk) {
      setError("Şifre güvenlik kurallarını sağlamıyor.");
      setLoading(false);
      return;
    }
    if (bot.waiting) {
      setError(BOT_CHECK_WAIT_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      const res = await api.post(
        "/auth/register",
        {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: toE164IfAny(formData.phone) || undefined, // opsiyonel
          website: formData.website,
          turnstileToken: bot.token || undefined,
        },
        { skipAuthRefresh: true }
      );

      if (res.status === 201) {
        setSuccess(true);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Kayıt sırasında bir hata oluştu."
      );
    } finally {
      setLoading(false);
      bot.reset();
    }
  };

  return (
    <div
      className="auth-enter w-full max-w-md mx-auto bg-white border border-light2 rounded-2xl shadow-lg p-8 text-dark1"
    >
      <h2 className="text-3xl font-bold text-center mb-6">Kayıt Ol</h2>

      {error && (
        <div className="text-red-600 text-sm text-center mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <HoneypotField id="register-website" value={formData.website} onChange={handleChange} />
        {/* firstName, lastName, email */}
        {["firstName", "lastName", "email"].map((field) => {
          const labels = {
            firstName: "Adınız",
            lastName: "Soyadınız",
            email: "E-posta",
          };
          const types = { email: "email" };
          return (
            <div key={field}>
              <label htmlFor={field} className="block text-sm mb-1 text-dark2">
                {labels[field]}
              </label>
              <input
                id={field}
                name={field}
                type={types[field] || "text"}
                placeholder={labels[field]}
                value={formData[field]}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border border-light2 bg-light1 text-dark1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dark1 transition"
              />
            </div>
          );
        })}

        {/* Telefon (maskeli) */}
        <div>
          <label htmlFor="phone" className="block text-sm mb-1 text-dark2">
            Telefon
          </label>

          <IMaskInput
            id="phone"
            name="phone"
            /* +90 5xx xxx xx xx — ‘5’ten sonra boşluk YOK */
            mask="+{90} 500 000 00 00"
            definitions={{ 0: /[0-9]/ }}
            value={formData.phone}
            onAccept={(val) => setFormData((p) => ({ ...p, phone: val }))}
            unmask={false}
            inputMode="tel"
            placeholder="+90 5__ ___ __ __"
            className="w-full px-4 py-3 rounded-lg border border-light2 bg-light1 text-dark1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dark1 transition"
          />
        </div>

        {/* Şifre */}
        <div>
          <label htmlFor="password" className="block text-sm mb-1 text-dark2">
            Şifre
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Şifre"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-light2 bg-light1 text-dark1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dark1 transition pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-3 text-sm text-gray-600"
            >
              {showPassword ? "Gizle" : "Göster"}
            </button>
          </div>
          <ul className="mt-2 text-xs space-y-1">
            {passwordValidation.results.map((r) => (
              <li
                key={r.id}
                className={r.ok ? "text-emerald-600" : "text-gray-500"}
              >
                {r.ok ? "✓ " : "• "} {r.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Şifre tekrar */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm mb-1 text-dark2"
          >
            Şifre (Tekrar)
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Şifre (Tekrar)"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg border border-light2 bg-light1 text-dark1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dark1 transition"
          />
        </div>

        <BotCheckField bot={bot} />

        {success ? (
          <div className="w-full text-center text-sm font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg py-3 px-4">
            Kaydınız başarıyla oluşturuldu. Giriş yapabilirsiniz.
          </div>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-dark1 text-white font-semibold hover:bg-dark2 transition disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        )}
      </form>

      <p className="text-sm text-center mt-6 text-dark2">
        Zaten bir hesabınız var mı?{" "}
        <button
          onClick={onSwitch}
          className="text-dark1 font-semibold hover:underline"
        >
          Giriş Yapın
        </button>
      </p>
    </div>
  );
};

export default Register;
