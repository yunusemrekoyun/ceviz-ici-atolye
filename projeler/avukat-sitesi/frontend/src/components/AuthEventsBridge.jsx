// src/components/AuthEventsBridge.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiEvents } from "../lib/api";

export default function AuthEventsBridge() {
  const navigate = useNavigate();
  const routed = useRef(false);

  useEffect(() => {
    function onUnauthorized() {
      // Sonsuz döngüyü engelle: sadece yönlendir, logout endpoint'ini çağırma
      if (!routed.current) {
        routed.current = true;
        navigate("/admin", { replace: true });
        // küçük bir gecikmeden sonra yeniden tetiklemeye izin ver
        setTimeout(() => {
          routed.current = false;
        }, 500);
      }
    }
    apiEvents.addEventListener("auth:unauthorized", onUnauthorized);
    return () =>
      apiEvents.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [navigate]);

  return null;
}
