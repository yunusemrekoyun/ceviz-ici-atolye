import React, { useState, useMemo } from "react";
import useProductsCache from "../../hooks/useProductsCache";
import ProductGridItem from "./ProductGridItem";
import {
  buildVariantColorMap,
  getVariantColors,
} from "../../utils/productVariants";

/* Seed'li PRNG (mulberry32) */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* Seed'li shuffle (Fisher–Yates) */
function shuffleWithSeed(arr, seed) {
  const a = arr.slice();
  const rand = mulberry32(
    typeof seed === "number"
      ? seed
      : Array.from(String(seed || "default")).reduce(
          (s, c) => s + c.charCodeAt(0),
          0
        )
  );
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ProductGrid({ limit = 4, title = "Ürünler" }) {
  const { data: allProducts, loading } = useProductsCache();
  const all = useMemo(
    () => (Array.isArray(allProducts) ? allProducts : []),
    [allProducts]
  );
  const variantColorMap = useMemo(() => buildVariantColorMap(all), [all]);

  // Her mount’ta tek seferlik rastgele seed üret
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const products = useMemo(() => {
    if (!all.length) return [];
    const shuffled = shuffleWithSeed(all, seed);
    return shuffled.slice(0, Math.max(0, limit));
  }, [all, seed, limit]);

  if (loading || !allProducts) {
    return (
      <section className="bg-light1 py-12 text-center">
        Ürünler yükleniyor…
      </section>
    );
  }

  const toCardPricing = (p) => {
    const final = Number(p.price ?? 0);
    const original = Number(p.originalPrice ?? 0);
    const hasDiscount = original > 0 && final > 0 && final < original;
    const computedRate = hasDiscount
      ? Math.round(100 - (final / original) * 100)
      : 0;

    return {
      price: hasDiscount ? original : final,
      discountedPrice: hasDiscount ? final : null,
      discountRate: hasDiscount ? computedRate : 0,
    };
  };

  return (
    <section className="bg-light1 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-center font-playfair text-3xl md:text-4xl text-black uppercase mb-8">
          {title}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {products.map((p) => {
            const { price, discountedPrice, discountRate } = toCardPricing(p);
            const posterUrl =
              p.media?.images?.[0] ||
              p.poster ||
              (Array.isArray(p.images) ? p.images[0] : null);
            const stock = Array.isArray(p.sizes)
              ? p.sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
              : 0;

            return (
              <ProductGridItem
                key={p._id}
                id={p._id}
                video={p.video}
                poster={posterUrl}
                name={p.name}
                price={price}
                discountedPrice={discountedPrice}
                discountRate={discountRate}
                stock={stock}
                variantColors={getVariantColors(p, variantColorMap)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
