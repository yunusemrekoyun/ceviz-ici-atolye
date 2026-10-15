import React, { useState } from "react";
import api from "../../../api";
import useBotCheck from "../../hooks/useBotCheck";
import BotCheckField from "../../components/ui/BotCheckField";
import { BOT_CHECK_WAIT_MESSAGE } from "../../utils/botCheck";

const NewsLetter = () => {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "success" | "error", text: string }
  const bot = useBotCheck();

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      setMsg({ type: "error", text: "Geçerli bir e-posta girin." });
      return;
    }
    if (bot.waiting) {
      setMsg({ type: "error", text: BOT_CHECK_WAIT_MESSAGE });
      return;
    }

    setBusy(true);
    try {
      await api.post("/newsletter/subscribe", { email: clean, website, turnstileToken: bot.token || undefined });
      setMsg({ type: "success", text: "Abonelik kaydedildi. Teşekkürler!" });
      setEmail("");
      setWebsite("");
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Bir hata oluştu.",
      });
    } finally {
      setBusy(false);
      bot.reset();
    }
  };

  return (
    <div className="bg-[#f4f4f4] p-6 rounded-lg shadow-sm text-center">
      <h4 className="text-xl font-[Playfair] tracking-wide text-[#0b0b0d] mb-6 border-b border-[#d9d9d9] pb-3">
        Bültenimize Abone Ol
      </h4>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="absolute left-[-5000px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="newsletter-website">Website</label>
          <input
            id="newsletter-website"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        <input
          type="email"
          placeholder="E-posta adresinizi girin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-5 py-4 border border-[#d9d9d9] bg-white text-[#333] text-base rounded focus:outline-none focus:ring-2 focus:ring-[#125795] placeholder-gray-500"
          disabled={busy}
          required
        />
        <BotCheckField bot={bot} />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-4 bg-dark2 text-white text-sm font-medium uppercase tracking-wider rounded hover:bg-[#0b0b0d] transition disabled:opacity-60"
        >
          {busy ? "Gönderiliyor..." : "Abone Ol"}
        </button>
      </form>

      {msg && (
        <p
          className={`mt-3 text-sm ${
            msg.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
};

export default NewsLetter;
