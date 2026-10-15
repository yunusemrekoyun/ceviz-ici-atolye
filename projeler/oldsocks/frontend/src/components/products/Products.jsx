import React from "react";
import ProductItem from "./ProductItem";
import { getVariantColors } from "../../utils/productVariants";

export default function Products({
  products = [],
  variantColorMap = new Map(),
}) {
  const safeProducts = Array.isArray(products) ? products : [];

  if (safeProducts.length === 0) {
    return <div className="text-center py-10">Ürün bulunamadı.</div>;
  }

  // ── Yardımcı: Kart için doğru fiyat alanlarını normalize et ──────────────
  const toCardPricing = (p) => {
    const final = Number(p.price ?? 0); // backend'in final fiyatı
    const original = Number(p.originalPrice ?? 0); // orijinal fiyat

    const hasDiscount = original > 0 && final > 0 && final < original;
    const computedRate = hasDiscount
      ? Math.round(100 - (final / original) * 100)
      : 0;

    return {
      // ProductItem props:
      price: hasDiscount ? original : final, // baş fiyat olarak orijinal (yoksa final)
      discountedPrice: hasDiscount ? final : null, // varsa final fiyatı gönder
      discountRate: hasDiscount ? computedRate : 0, // rozet için yüzde
    };
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-8">
      {safeProducts.map((p) => {
        const { price, discountedPrice, discountRate } = toCardPricing(p);

        const stock = Array.isArray(p.sizes)
          ? p.sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
          : 0;

        return (
          <ProductItem
            key={p._id}
            id={p._id}
            video={p.video}
            poster={p.media?.images?.[0] || p.poster || p.images?.[0] || null}
            name={p.name}
            price={price} // ← orijinal (yoksa final)
            discountedPrice={discountedPrice} // ← final
            discountRate={discountRate} // ← hesaplanan yüzde
            stock={stock}
            variantColors={getVariantColors(p, variantColorMap)}
          />
        );
      })}
    </div>
  );
}
