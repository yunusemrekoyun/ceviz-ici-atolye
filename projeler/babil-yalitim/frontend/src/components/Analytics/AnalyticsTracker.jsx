// src/components/Analytics/AnalyticsTracker.jsx
import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import api, { getApiUrl } from "../../api";
import useConsent from "../../hooks/useConsent";
import useSessionId from "../../hooks/useSessionId";

/**
 * Bu bileşen Router içinde bir kez render edilir.
 * - Admin rotalarını hariç tutar.
 * - Her route değişiminde süre ve scrollDepth toplayıp /visits'e POST eder.
 */
const AnalyticsTracker = () => {
  const { pathname } = useLocation();
  const { consent } = useConsent();
  const sessionId = useSessionId(consent);

  const startTimeRef = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const lastPathRef = useRef(null);

  // Admin rotalarını tamamen ignore et
  const isAdmin = pathname.startsWith("/admin");

  const sendVisit = useCallback((payload, { keepalive = false } = {}) => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-analytics-consent": "true",
      ...(sessionId ? { "x-session-id": sessionId } : {}),
    };

    if (keepalive && typeof window !== "undefined" && window.fetch) {
      return window.fetch(getApiUrl("/visits"), {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers,
        body: JSON.stringify({
          ...payload,
          consent: "true",
          sessionId: sessionId || undefined,
        }),
      });
    }

    return api.post("/visits", payload, { headers });
  }, [sessionId]);

  useEffect(() => {
    if (isAdmin) return;

    // Scroll takibi
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const depth =
        docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      if (depth > maxScrollRef.current) maxScrollRef.current = depth;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isAdmin]);

  // Route değişimlerinde kayıt gönder
  useEffect(() => {
    if (isAdmin) {
      // Admin sayfasında geziyorsa önceki public sayfanın kaydını flush et
      startTimeRef.current = Date.now();
      maxScrollRef.current = 0;
      lastPathRef.current = null;
      return;
    }

    const now = Date.now();
    const prevPath = lastPathRef.current;
    const durationSec = Math.round((now - startTimeRef.current) / 1000);

    // İlk render'da sahte bir "önceki sayfa" kaydı üretme.
    if (prevPath && consent === "true" && prevPath !== pathname) {
      sendVisit({
        path: prevPath,
        duration: durationSec,
        scrollDepth: maxScrollRef.current,
      })
        .catch(() => {});
    }

    // Yeni sayfa için sayaçları sıfırla
    startTimeRef.current = now;
    maxScrollRef.current = 0;
    lastPathRef.current = pathname;
  }, [pathname, consent, isAdmin, sendVisit]);

  // Sayfadan ayrılırken (tab kapatma / reload) son sayfayı gönder
  useEffect(() => {
    if (isAdmin) return;
    const beforeUnload = () => {
      if (consent !== "true") return;
      const now = Date.now();
      const durationSec = Math.round((now - startTimeRef.current) / 1000);
      const path = lastPathRef.current || window.location.pathname;

      sendVisit(
        {
          path,
          duration: durationSec,
          scrollDepth: maxScrollRef.current,
        },
        { keepalive: true }
      ).catch(() => {});
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [consent, isAdmin, sendVisit]);

  return null;
};

export default AnalyticsTracker;
