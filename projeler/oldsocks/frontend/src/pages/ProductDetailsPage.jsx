// src/pages/ProductDetailsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";

import BreadCrumb from "../components/breadCrumb/BreadCrumb";
import ProductDetails from "../components/products/product-details/ProductDetails";
import SimilarProducts from "../components/products/product-details/SimilarProducts";
import AddToCart from "../components/products/product-details/AddToCart";
import ProductInfoSections from "../components/products/product-details/ProductInfoSections";
import Campaigns from "../components/campaigns/Campaigns";
import Services from "../components/services/Services";
import { useStorefrontSettings } from "../context/storefrontSettings";
import PageLoading from "../components/common/PageLoading";
import usePageMeta from "../hooks/usePageMeta";
import { formatTry } from "../utils/currency";

export default function ProductDetailsPage() {
  const { similarProductsVisible } = useStorefrontSettings();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        setProduct(data);
        setError("");
      })
      .catch(() => {
        setError("Ürün yüklenirken hata oluştu.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Telefonda detay kartı parmağı izler: kart yukarı çıktıkça görsel hafifçe küçülüp kararır
  // (--sheet-p: 0 görsel açık, 1 detaylar açık); yarıda bırakılırsa en yakın duruma oturur.
  const galleryRef = useRef(null);
  const sheetRef = useRef(null);
  useEffect(() => {
    const gallery = galleryRef.current;
    const sheet = sheetRef.current;
    if (!gallery || !sheet) return undefined;
    const phone = window.matchMedia("(max-width: 1023.98px)");
    const root = document.documentElement;
    // Tarayıcılar kaydırma olayını kare başına en çok bir kez gönderir; ayrıca kare beklenmez.
    const update = () => {
      if (!phone.matches) {
        gallery.style.removeProperty("--sheet-p");
        return;
      }
      const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom || 0;
      const travel = sheet.getBoundingClientRect().top + window.scrollY - headerBottom;
      const progress = travel > 0 ? Math.min(1, Math.max(0, window.scrollY / travel)) : 0;
      gallery.style.setProperty("--sheet-p", progress.toFixed(3));
    };
    const applySnap = () => root.classList.toggle("product-sheet-snap", phone.matches);
    const onChange = () => {
      applySnap();
      update();
    };
    applySnap();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    phone.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      phone.removeEventListener("change", onChange);
      root.classList.remove("product-sheet-snap");
    };
  }, [product, loading]);

  const firstImage = product?.media?.images?.[0]?.url || product?.images?.[0] || undefined;
  usePageMeta({
    title: product?.name || (error ? "Ürün bulunamadı" : "Ürün"),
    description: product
      ? product.description || `${product.name} — ${formatTry(product.price)}. OLDSOCKS mağazasında.`
      : undefined,
    image: firstImage,
    type: product ? "product" : "website",
    noindex: Boolean(error),
  });

  // Google'da fiyat ve stok gösterilebilsin diye yapılandırılmış veri (schema.org).
  useEffect(() => {
    if (!product) return undefined;
    const url = `${window.location.origin}/product-details/${product._id}`;
    const cat = product.category && typeof product.category === "object" ? product.category : null;
    const inStock = (product.sizes || []).some((s) => Number(s?.stock) > 0);
    const crumbs = [
      { name: "Ana Sayfa", item: `${window.location.origin}/` },
      { name: "Mağaza", item: `${window.location.origin}/shop` },
      ...(cat?._id ? [{ name: cat.name, item: `${window.location.origin}/shop?kategori=${cat._id}` }] : []),
      { name: product.name, item: url },
    ];
    const data = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          name: product.name,
          ...(firstImage ? { image: [firstImage] } : {}),
          ...(product.description ? { description: product.description } : {}),
          sku: String(product._id),
          ...(product.color ? { color: product.color } : {}),
          brand: { "@type": "Brand", name: "OLDSOCKS" },
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "TRY",
            price: Number(product.price || 0).toFixed(2),
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
        },
      ],
    };
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
    return () => el.remove();
  }, [product, firstImage]);

  if (loading) return <PageLoading text="Ürün yükleniyor…" />;
  if (error)
    return <div className="text-center py-10 text-red-600">{error}</div>;
  if (!product)
    return <div className="text-center py-10">Ürün bulunamadı.</div>;

  // product.category bazen nesne, bazen string olabileceği için güvenli alalım
  const cat = product.category;
  const categoryId = cat?._id ?? (typeof cat === "string" ? cat : null);
  // Eğer kategori bir alt kategori ise onu atlayıp parent’ı al, yoksa kendisi
  const rootCategoryId =
    cat && typeof cat === "object" && cat.parent ? cat.parent._id : categoryId;

  return (
    <>
      {/* Telefonda "görsel açık" durumunun oturma noktası */}
      <div aria-hidden="true" className="product-snap-top" />
      {/* Telefonda ilk ekranda yalnız header ve ürün görseli olsun */}
      <div className="hidden lg:block">
        <BreadCrumb category={product.category} name={product.name} />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6 lg:px-8 lg:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-12">
          {/* Görseller. Telefonda yerinde kalır, detay kartı üstüne kayarak gelir. */}
          <section
            ref={galleryRef}
            className="product-gallery sticky top-[65px] lg:static lg:col-span-7"
            aria-label="Ürün görselleri"
          >
            <ProductDetails product={product} />
            <div
              aria-hidden="true"
              className="product-gallery-dim pointer-events-none absolute -inset-x-2 inset-y-0 rounded-[1.75rem] bg-black sm:inset-x-0 lg:hidden"
            />
          </section>

          {/* Satın alma. Telefonda görselin altından taşan kart (tutamaç + ad + fiyat ilk ekranda
              görünür, "aşağıda devamı var" der); masaüstünde kaydırırken sabit kalır. */}
          <aside ref={sheetRef} className="product-sheet relative z-10 -mx-4 -mt-6 rounded-t-[1.75rem] bg-white px-4 pt-3 shadow-[0_-16px_30px_-22px_rgba(0,0,0,0.45)] sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:col-span-5 lg:mx-0 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0 lg:shadow-none">
            <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-dark1/15 lg:hidden" />
            <div className="space-y-6 lg:sticky lg:top-24">
              <AddToCart
                price={product.price}
                sizes={product.sizes}
                color={product.color}
                parentProductId={product.parentProductId}
                productId={product._id}
                productName={product.name}
                image={product.images?.[0]}
              />
              <ProductInfoSections description={product.description} />
            </div>
          </aside>
        </div>

        {similarProductsVisible !== false && (
          <section className="mt-14 lg:mt-20">
            <SimilarProducts categoryId={rootCategoryId} currentProductId={product._id} />
          </section>
        )}
      </div>

      <Campaigns />
      <Services />
    </>
  );
}
