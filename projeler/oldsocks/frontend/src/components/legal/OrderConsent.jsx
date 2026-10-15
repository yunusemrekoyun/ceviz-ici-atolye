import React from "react";
import { STORE, legalVersionLabel } from "../../legal/store";
import { formatTry } from "../../utils/currency";
import useLegalDocuments from "../../hooks/useLegalDocuments";
import { LegalBody } from "./LegalDocumentView";

// Ödeme adımı: sipariş bilgileriyle doldurulmuş ön bilgilendirme ve iki ayrı onay.
// Onaylar sunucuya gönderilir ve siparişe kaydedilir.
export default function OrderConsent({ items, totals, address, buyer, value, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.checked });
  // Yönetim panelinden yayınlanan ön bilgilendirme metni varsa sabit paragrafın yerine geçer.
  const { documents } = useLegalDocuments();
  const preInfo = documents?.["pre-information"];
  const textDate = preInfo?.publishedAt
    ? new Date(preInfo.publishedAt).toLocaleDateString("tr-TR")
    : legalVersionLabel();
  const addressText = [address?.mainaddress, address?.street, address?.district, address?.city, address?.postalCode]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mt-6 space-y-3 text-sm">
      <details className="rounded-lg border border-light2 bg-light1/60 p-3">
        <summary className="cursor-pointer font-medium text-dark1">Ön Bilgilendirme Formu</summary>
        <div className="mt-3 space-y-3 text-dark2 leading-6">
          <section>
            <h4 className="font-semibold text-dark1">Satıcı</h4>
            <p>
              {STORE.companyTitle} · {STORE.address} · {STORE.phone} · {STORE.email}
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-dark1">Alıcı ve teslimat</h4>
            <p>
              {[buyer?.name, buyer?.email, buyer?.phone].filter(Boolean).join(" · ") || "-"}
              <br />
              {addressText || "-"}
            </p>
          </section>
          <section>
            <h4 className="font-semibold text-dark1">Ürünler (fiyatlara KDV dahildir)</h4>
            <ul className="list-disc pl-5">
              {(items || []).map((item) => (
                <li key={`${item.id}-${item.size}`}>
                  {item.name}
                  {item.size ? ` · Beden ${item.size}` : ""} · {item.qty} adet × {formatTry(item.price)}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="font-semibold text-dark1">Ödenecek tutar</h4>
            <p>
              Ürünler {formatTry(totals?.subTotal)}
              {Number(totals?.discount) > 0 && <> · İndirim −{formatTry(totals.discount)}</>} · Kargo{" "}
              {Number(totals?.shippingFee) > 0 ? formatTry(totals.shippingFee) : "ücretsiz"} ·{" "}
              <b>Toplam {formatTry(totals?.grandTotal)}</b>
            </p>
            <p>Ödeme kredi veya banka kartıyla, PayTR güvenli ödeme sayfasında alınır.</p>
          </section>
          {preInfo ? (
            <section>
              <h4 className="font-semibold text-dark1">{preInfo.title}</h4>
              <div className="mt-2 max-h-64 overflow-y-auto rounded border border-light2 bg-white p-3">
                <LegalBody body={preInfo.body} />
              </div>
            </section>
          ) : (
            <section>
              <h4 className="font-semibold text-dark1">Teslimat ve cayma hakkı</h4>
              <p>
                Sipariş, yasal azami süre olan 30 gün içinde teslim edilir. Ürünü teslim aldığınız
                günden itibaren 14 gün içinde gerekçe göstermeden cayma hakkınız vardır. Şikâyet ve
                itirazlarınız için Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.
              </p>
            </section>
          )}
          <p className="text-xs">
            Ayrıntılar{" "}
            <a href="/agreement" target="_blank" rel="noopener noreferrer" className="underline">
              Mesafeli Satış Sözleşmesi
            </a>
            ’nde. Metin tarihi: {textDate}.
          </p>
        </div>
      </details>

      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={value.preInformation} onChange={set("preInformation")} />
        <span>Ön Bilgilendirme Formu’nu okudum ve onaylıyorum.</span>
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={value.distanceSales} onChange={set("distanceSales")} />
        <span>
          <a href="/agreement" target="_blank" rel="noopener noreferrer" className="underline">
            Mesafeli Satış Sözleşmesi
          </a>
          ’ni okudum ve kabul ediyorum.
        </span>
      </label>
      <p className="text-xs text-dark2">
        Kişisel verileriniz{" "}
        <a href="/kvkk" target="_blank" rel="noopener noreferrer" className="underline">
          KVKK Aydınlatma Metni
        </a>{" "}
        kapsamında işlenir.
      </p>
    </div>
  );
}
