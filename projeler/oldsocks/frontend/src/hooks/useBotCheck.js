import { useCallback, useEffect, useRef, useState } from "react";
import { loadBotCheckSiteKey, loadTurnstile } from "../utils/botCheck";

// Formun Turnstile durumu. Kullanım:
//   const bot = useBotCheck();
//   <BotCheckField bot={bot} />   (formun içinde)
//   gönderirken: if (bot.waiting) ...; gövdeye turnstileToken: bot.token; sonunda bot.reset()
// Jeton tek kullanımlıktır; her gönderimden sonra (başarılı ya da değil) reset gerekir.
export default function useBotCheck() {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [siteKey, setSiteKey] = useState(undefined); // undefined: soruluyor, null: kapalı
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadBotCheckSiteKey().then((key) => {
      if (alive) setSiteKey(key);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        const el = containerRef.current;
        if (cancelled || !el) return;
        widgetRef.current = turnstile.render(el, {
          sitekey: siteKey,
          language: "tr",
          theme: "light",
          appearance: "interaction-only",
          // Dar kutularda (ör. telefonda kenar çubuğu) 300px'lik normal boy taşar.
          size: el.offsetWidth && el.offsetWidth < 300 ? "compact" : "flexible",
          callback: (value) => {
            setToken(value);
            setFailed(false);
          },
          "expired-callback": () => setToken(""),
          "timeout-callback": () => setToken(""),
          "error-callback": () => {
            setToken("");
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (widgetRef.current != null) {
        window.turnstile?.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    setToken("");
    if (widgetRef.current != null) window.turnstile?.reset(widgetRef.current);
  }, []);

  const required = Boolean(siteKey);
  return {
    containerRef,
    required,
    token,
    failed,
    reset,
    // Ayar henüz gelmediyse ya da doğrulama sürüyorsa gönderim beklemeli.
    waiting: siteKey === undefined || (required && !token),
  };
}
