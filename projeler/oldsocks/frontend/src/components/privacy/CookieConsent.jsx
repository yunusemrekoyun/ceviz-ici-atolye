import React from "react";
import { Link } from "react-router-dom";
import useConsent from "../../hooks/useConsent";
import { setConsent } from "../../utils/consent";

export default function CookieConsent() {
  const consent = useConsent();
  if (consent) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] pointer-events-none">
      <div className="relative w-full">
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Çerez tercihi"
          className="pointer-events-auto mx-auto mb-6 w-[calc(100%-24px)] max-w-[700px] rounded-2xl border border-gray-200 bg-white/90 shadow-xl backdrop-blur"
        >
          <div className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">Çerez Kullanımı</h3>
            <p className="mt-1 text-xs leading-5 text-gray-700 sm:text-sm">
              Oturum, sepet ve ödeme için <b>zorunlu çerezler</b> kullanırız. İletişim sayfasındaki
              harita (Google) ve blogdaki Instagram gönderileri gibi dış içerikler yalnız izin
              verirseniz yüklenir. Ayrıntılar:{" "}
              <Link to="/cookies" className="text-black underline underline-offset-2">
                Çerez Politikası
              </Link>
              .
            </p>

            <div className="mt-4 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setConsent("necessary")}
                className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-gray-800"
              >
                Yalnız zorunlu
              </button>
              <button
                type="button"
                onClick={() => setConsent("all")}
                className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-gray-800"
              >
                Tümüne izin ver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
