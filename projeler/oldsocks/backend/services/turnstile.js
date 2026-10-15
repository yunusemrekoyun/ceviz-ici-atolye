// Cloudflare Turnstile bot doğrulaması. TURNSTILE_SITE_KEY ve TURNSTILE_SECRET_KEY
// birlikte tanımlı değilse kapalıdır ve formlar eskisi gibi çalışır.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5000;

function turnstileKeys() {
  const siteKey = String(process.env.TURNSTILE_SITE_KEY || "").trim();
  const secret = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
  return siteKey && secret ? { siteKey, secret } : null;
}

// { ok: true } | { ok: false, codes } | { ok: true, unreachable: true }
async function verifyTurnstile(token, ip, { fetchImpl = globalThis.fetch } = {}) {
  const keys = turnstileKeys();
  if (!keys) return { ok: true };
  try {
    const response = await fetchImpl(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: keys.secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data?.success === true ? { ok: true } : { ok: false, codes: data?.["error-codes"] || [] };
  } catch (error) {
    // Cloudflare'e ulaşılamıyorsa gerçek müşteriyi kapıda bırakmayız; hız sınırları ve
    // bal küpü alanları yine çalışır.
    console.warn("[turnstile] doğrulama servisine ulaşılamadı:", error?.message || error);
    return { ok: true, unreachable: true };
  }
}

const REJECT = {
  code: "BOT_CHECK",
  message: "Güvenlik doğrulaması tamamlanamadı. Lütfen birkaç saniye bekleyip tekrar deneyin.",
};

function requireHuman({ fetchImpl } = {}) {
  return async (req, res, next) => {
    if (!turnstileKeys()) return next();
    const token = typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken.trim() : "";
    if (!token || token.length > 2048) return res.status(400).json(REJECT);
    const result = await verifyTurnstile(token, req.ip, { fetchImpl });
    if (!result.ok) return res.status(400).json(REJECT);
    return next();
  };
}

function sendTurnstileConfig(_req, res) {
  res.set("Cache-Control", "public, max-age=60, s-maxage=60");
  res.json({ siteKey: turnstileKeys()?.siteKey || null });
}

module.exports = { turnstileKeys, verifyTurnstile, requireHuman, sendTurnstileConfig };
