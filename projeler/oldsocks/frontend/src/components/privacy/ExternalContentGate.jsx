import React, { useState } from "react";
import { Link } from "react-router-dom";
import useConsent from "../../hooks/useConsent";
import { setConsent } from "../../utils/consent";

// Dış hizmetten (Google Haritalar, Instagram) gelen içerik yalnız izinle yüklenir.
export default function ExternalContentGate({ service, what, className = "", children }) {
  const consent = useConsent();
  const [once, setOnce] = useState(false);

  if (consent === "all" || once) return children;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-light2 bg-light1 p-6 text-center ${className}`}
    >
      <p className="max-w-md text-sm leading-6 text-dark2">
        {what} {service} üzerinden yüklenir; {service} bu sırada çerez kullanabilir ve IP adresinizi görebilir.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setOnce(true)}
          className="rounded-lg bg-dark1 px-4 py-2 text-sm font-medium text-white hover:bg-dark2"
        >
          Bu seferlik göster
        </button>
        <button
          type="button"
          onClick={() => setConsent("all")}
          className="rounded-lg border border-dark1 px-4 py-2 text-sm font-medium text-dark1 hover:bg-white"
        >
          Dış içeriklere her zaman izin ver
        </button>
      </div>
      <Link to="/cookies" className="text-xs text-dark2 underline underline-offset-2">
        Çerez Politikası
      </Link>
    </div>
  );
}
