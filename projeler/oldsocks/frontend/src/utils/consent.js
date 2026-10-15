// Çerez / dış içerik tercihi. "necessary": yalnız zorunlu çerezler;
// "all": Google Haritalar ve Instagram gibi dış içerikler de yüklenebilir.
// Eski "cookieConsent" anahtarı yalnız bilgilendirmeydi, dış içerik izni sayılmaz.
export const CONSENT_KEY = "cookieConsent.v2";
export const CONSENT_EVENT = "consent-change";

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Depolama kapalıysa tercih yalnız bu sayfa için geçerli olur.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value || null }));
}
