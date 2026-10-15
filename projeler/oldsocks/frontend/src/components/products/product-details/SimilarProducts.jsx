// src/components/products/product-details/SimilarProducts.jsx
import React, { useState, useEffect, useMemo } from "react";
import useProductsCache from "../../../hooks/useProductsCache";
import SimilarProductsItem from "./SimilarProductsItem";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import {
  buildVariantColorMap,
  getVariantColors,
} from "../../../utils/productVariants";
import "swiper/css";
import "swiper/css/free-mode";

export default function SimilarProducts({ categoryId, currentProductId }) {
  const [items, setItems] = useState([]);
  const { data: allProducts, loading } = useProductsCache();
  const [error, setError] = useState("");
  const all = useMemo(
    () => (Array.isArray(allProducts) ? allProducts : []),
    [allProducts]
  );
  const variantColorMap = useMemo(() => buildVariantColorMap(all), [all]);

  useEffect(() => {
    if (!categoryId || !allProducts) {
      setItems([]);
      return;
    }

    const isInStock = (product) => {
      const totalStock = Array.isArray(product.sizes)
        ? product.sizes.reduce((sum, s) => sum + (s.stock || 0), 0)
        : 0;
      return totalStock > 0;
    };

    const filtered = (Array.isArray(allProducts) ? allProducts : []).filter(
      (p) => p._id !== currentProductId && isInStock(p)
    );

    const sameSub = filtered.filter((p) => {
      const cid = p.category?._id || p.category;
      return cid === categoryId;
    });

    const sameParent = filtered.filter((p) => {
      const pid = p.category?.parent?._id || p.category?.parent;
      return pid === categoryId;
    });

    let result = [];
    if (sameSub.length > 0) result = sameSub;
    else if (sameParent.length > 0) result = sameParent;
    else result = filtered;

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    setItems(result.slice(0, 10));
    setError("");
  }, [allProducts, categoryId, currentProductId]);

  if (!allProducts || (loading && !categoryId))
    return <div className="text-center py-4">Benzer ürünler yükleniyor…</div>;
  if (error)
    return <div className="text-center py-4 text-red-600">{error}</div>;
  if (items.length === 0)
    return (
      <div className="text-center py-4">Stokta benzer ürün bulunamadı.</div>
    );

  // Kart için fiyat normalize edici
  const toCardPricing = (p) => {
    const final = Number(p.price ?? 0); // backend final fiyat
    const original = Number(p.originalPrice ?? 0);
    const hasDiscount = original > 0 && final > 0 && final < original;

    return {
      price: hasDiscount ? original : final, // üstü çizilecek (orijinal) ya da final
      discountedPrice: hasDiscount ? final : null, // indirimli fiyat varsa gönder
      // gerekiyorsa: discountRate: hasDiscount ? Math.round(100 - (final / original) * 100) : 0
    };
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold uppercase tracking-wide text-dark1">Benzer Ürünler</h2>
      {/* Sonsuz döngü: son üründen sonra başa kesintisiz döner. */}
      <Swiper
        modules={[Autoplay, FreeMode]}
        spaceBetween={16}
        slidesPerView={2}
        breakpoints={{ 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }}
        autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        loop={items.length > 4}
        rewind={items.length <= 4}
        grabCursor
        freeMode
      >
        {items.map((p) => {
          const poster =
            p.media?.images?.[0] ||
            p.poster ||
            (Array.isArray(p.images) ? p.images[0] : null);

          const { price, discountedPrice } = toCardPricing(p);

          return (
            <SwiperSlide key={p._id}>
              <SimilarProductsItem
                id={p._id}
                video={p.video}
                poster={poster}
                name={p.name}
                price={price}
                discountedPrice={discountedPrice ?? undefined}
                variantColors={getVariantColors(p, variantColorMap)}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
