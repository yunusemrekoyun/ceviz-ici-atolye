// src/components/products/NewProducts.jsx
import React, { useMemo } from "react";
import useProductsCache from "../../hooks/useProductsCache";
import NewProductItem from "./NewProductItem";
import { buildVariantColorMap, getVariantColors } from "../../utils/productVariants";

// Kart için fiyat normalize edici (tek kaynak)
const toCardPricing = (p) => {
  const final = Number(p.price ?? 0);
  const original = Number(p.originalPrice ?? 0);
  const hasDiscount = original > 0 && final > 0 && final < original;
  const discountRate = hasDiscount
    ? Math.round(100 - (final / original) * 100)
    : 0;

  return {
    price: hasDiscount ? original : final,
    discountedPrice: hasDiscount ? final : null,
    discountRate,
  };
};

const getProductTimestamp = (product) => {
  if (product?.createdAt) {
    const createdAt = new Date(product.createdAt).getTime();
    if (Number.isFinite(createdAt)) return createdAt;
  }

  const objectIdTime = parseInt(String(product?._id || "").slice(0, 8), 16);
  if (Number.isFinite(objectIdTime)) return objectIdTime * 1000;

  return 0;
};

const pickRandomItems = (list, count) => {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, count);
};

export default function NewProducts() {
  const { data: allProducts, loading } = useProductsCache();
  const all = useMemo(
    () => (Array.isArray(allProducts) ? allProducts : []),
    [allProducts]
  );
  const variantColorMap = useMemo(() => buildVariantColorMap(all), [all]);

  // En yeni 10 üründen rastgele 4 ürün seç
  const items = useMemo(() => {
    const latestTen = [...all]
      .sort((a, b) => getProductTimestamp(b) - getProductTimestamp(a))
      .slice(0, 10);

    return pickRandomItems(latestTen, 4);
  }, [all]);

  if (loading || !allProducts) {
    return (
      <section className="bg-light1 py-12 text-center">
        Ürünler yükleniyor…
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="bg-light1 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-center font-playfair text-3xl md:text-4xl text-black uppercase mb-8">
          Yeni Eklenen Ürünler
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {items.map((p) => {
            const posterUrl =
              p.media?.images?.[0] ||
              p.poster ||
              (Array.isArray(p.images) ? p.images[0] : null);

            const { price, discountedPrice, discountRate } = toCardPricing(p);

            const stock = Array.isArray(p.sizes)
              ? p.sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
              : 0;

            return (
              <NewProductItem
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
