import React from "react";
import ShippingReturnInfo from "./ShippingReturnInfo";

function Section({ title, open = false, children }) {
  return (
    <details open={open} className="group">
      <summary className="details-summary flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold uppercase tracking-wide text-dark1">
        {title}
        <span aria-hidden="true" className="text-lg font-light leading-none transition-transform duration-200 group-open:rotate-45">+</span>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

// Ürün sayfasında satın alma panelinin altında: açıklama ve kargo/iade.
export default function ProductInfoSections({ description }) {
  return (
    <div className="divide-y divide-light2 border-y border-light2">
      <Section title="Ürün Açıklaması" open>
        {description ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-dark2">{description}</p>
        ) : (
          <p className="text-sm italic text-gray-500">Açıklama bulunamadı.</p>
        )}
      </Section>
      <Section title="Kargo ve İade">
        <ShippingReturnInfo bare />
      </Section>
    </div>
  );
}
