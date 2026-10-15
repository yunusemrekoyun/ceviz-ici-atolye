// src/hooks/useConsent.js
import { useCallback, useEffect, useState } from "react";

const KEY = "analyticsConsent"; // "true" | "false" | null

export default function useConsent() {
  const [consent, setConsent] = useState(null); // null: sorulmadı, "true"/"false": seçim yapıldı

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "true" || v === "false") setConsent(v);
      else setConsent(null);
    } catch {
      setConsent(null);
    }
  }, []);

  const accept = useCallback(() => {
    try {
      localStorage.setItem(KEY, "true");
      setConsent("true");
    } catch {
      console.error("Failed to set analytics consent");
    }
  }, []);

  const decline = useCallback(() => {
    try {
      localStorage.setItem(KEY, "false");
      setConsent("false");
    } catch {
      console.error("Failed to set analytics consent");
    }
  }, []);

  return { consent, accept, decline };
}
