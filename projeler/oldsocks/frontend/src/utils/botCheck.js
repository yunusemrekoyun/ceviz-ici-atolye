import publicApi from "../../publicApi";

// Cloudflare Turnstile. Site anahtarı sunucudan gelir; sunucuda kapalıysa null döner ve
// formlar doğrulama olmadan çalışır.
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const BOT_CHECK_WAIT_MESSAGE = "Güvenlik doğrulaması sürüyor, birkaç saniye sonra tekrar deneyin.";

let configPromise = null;
let scriptPromise = null;

export function loadBotCheckSiteKey() {
  if (!configPromise) {
    configPromise = publicApi
      .get("/bot-check")
      .then(({ data }) => (typeof data?.siteKey === "string" && data.siteKey ? data.siteKey : null))
      .catch(() => {
        configPromise = null; // bir sonraki formda tekrar denensin
        return null;
      });
  }
  return configPromise;
}

export function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile yok")));
      script.onerror = () => {
        script.remove();
        scriptPromise = null;
        reject(new Error("turnstile yüklenemedi"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}
