// src/hooks/useSessionId.js
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const KEY = "sessionId";

export default function useSessionId(consent) {
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Sadece consent === "true" iken session oluştur/sürdür
    if (consent !== "true") {
      setSessionId(null);
      return;
    }
    try {
      let sid = localStorage.getItem(KEY);
      if (!sid) {
        sid = uuidv4();
        localStorage.setItem(KEY, sid);
      }
      setSessionId(sid);
    } catch {
      setSessionId(null);
    }
  }, [consent]);

  return sessionId;
}
