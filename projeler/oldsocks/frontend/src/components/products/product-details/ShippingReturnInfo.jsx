import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import publicApi from "../../../../publicApi";
import { formatTry } from "../../../utils/currency";

// Ürün sayfasında kargo ücreti ve iade hakkı özeti. Kargo bilgisi yönetim
// panelindeki kargo ayarından gelir; iade süresi yasal cayma hakkıdır.
// bare: ürün sayfasındaki açılır başlığın içinde, çerçevesiz ve başlıksız.
export default function ShippingReturnInfo({ bare = false }) {
  const [shipping, setShipping] = useState(null);

  useEffect(() => {
    let alive = true;
    publicApi
      .get("/shipping")
      .then(({ data }) => alive && setShipping(Array.isArray(data) ? data[0] || null : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const fee = Number(shipping?.fee);
  const threshold = shipping?.freeShippingThreshold;

  return (
    <section className={bare ? "space-y-2 text-sm text-dark2" : "rounded-xl border border-light2 bg-white p-4 text-sm text-dark2 space-y-2"}>
      {!bare && <h2 className="text-base font-semibold text-dark1">Kargo ve iade</h2>}
      {shipping && (
        <p>
          Kargo: {fee > 0 ? formatTry(fee) : "ücretsiz"}
          {fee > 0 && threshold != null && <>; {formatTry(threshold, { fractionDigits: 0 })} ve üzeri siparişlerde ücretsiz</>}.
        </p>
      )}
      <p>
        Ürünü teslim aldığınız günden itibaren 14 gün içinde gerekçe göstermeden iade edebilirsiniz.{" "}
        <Link to="/agreement" className="underline underline-offset-2">
          Ayrıntılar
        </Link>
      </p>
    </section>
  );
}
