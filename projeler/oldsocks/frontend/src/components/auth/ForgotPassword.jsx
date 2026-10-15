import React, { useState } from "react";
import api from "../../../api";
import HoneypotField from "../ui/HoneypotField";
import useBotCheck from "../../hooks/useBotCheck";
import BotCheckField from "../../components/ui/BotCheckField";
import { BOT_CHECK_WAIT_MESSAGE } from "../../utils/botCheck";

const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const bot = useBotCheck();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (bot.waiting) {
      setError(BOT_CHECK_WAIT_MESSAGE);
      return;
    }
    setLoading(true);

    try {
      const { data } = await api.post(
        "/auth/forgot-password",
        { email: email.trim(), website, turnstileToken: bot.token || undefined },
        { skipAuthRefresh: true }
      );
      setSuccess(
        data?.message ||
          "Eğer bu e-posta ile kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi."
      );
      setEmail("");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "İstek gönderilemedi. Lütfen tekrar deneyin."
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
      <h2 className="text-3xl font-bold text-center mb-3">Şifremi Unuttum</h2>
      <p className="text-sm text-center text-dark2 mb-6 leading-6">
        E-posta adresinizi girin. Hesabınız varsa şifre yenileme bağlantısı
        gönderilir.
      </p>

      {success && (
        <div className="text-green-700 text-sm text-center mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          {success}
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm text-center mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <HoneypotField id="forgot-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <div>
          <label htmlFor="forgot-email" className="block text-sm mb-1 text-dark2">
            E-posta adresi
          </label>
          <input
            id="forgot-email"
            type="email"
            name="email"
            placeholder="ornek@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-light2 bg-light1 text-dark1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dark1 transition"
          />
        </div>

        <BotCheckField bot={bot} />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-dark1 text-white font-semibold hover:bg-dark2 transition disabled:opacity-50"
        >
          {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
        </button>
      </form>

      <p className="text-sm text-center mt-6 text-dark2">
        Giriş ekranına geri dönmek için{" "}
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-dark1 font-semibold hover:underline"
        >
          tıklayın
        </button>
        .
      </p>
    </div>
  );
};

export default ForgotPassword;
