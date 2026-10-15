import { useEffect, useState } from "react";
import { CONSENT_EVENT, CONSENT_KEY, getConsent } from "../utils/consent";

// Tercih değişince (bu sekmede veya başka sekmede) bileşenler güncellenir.
export default function useConsent() {
  const [consent, setConsentState] = useState(getConsent);

  useEffect(() => {
    const onChange = () => setConsentState(getConsent());
    const onStorage = (event) => {
      if (event.key === CONSENT_KEY || event.key === null) onChange();
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return consent;
}
