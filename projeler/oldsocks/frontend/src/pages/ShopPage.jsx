// src/pages/ShopPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import BreadCrumb from "../components/breadCrumb/BreadCrumb";
import CategoryFilter from "../components/categories/CategoryFilter";
import Products from "../components/products/Products";
import useProductsCache from "../hooks/useProductsCache";
import useCategoriesCache from "../hooks/useCategoriesCache";
import { buildVariantColorMap } from "../utils/productVariants";
import { searchProducts } from "../utils/productSearch";
import usePageMeta from "../hooks/usePageMeta";
import PageLoading from "../components/common/PageLoading";

const SORT_OPTIONS = [
  { value: "newest", label: "Tarihe Göre: En Yeni" },
  { value: "oldest", label: "Tarihe Göre: En Eski" },
  { value: "priceDesc", label: "Fiyata Göre: En Yüksek" },
  { value: "priceAsc", label: "Fiyata Göre: En Düşük" },
];
const SORT_VALUES = new Set(SORT_OPTIONS.map((o) => o.value));

// Filtreler adres çubuğunda tutulur: paylaşılabilir, geri tuşuyla korunur.
// ?q=&kategori=&alt=&beden=&renk=&fiyat=min-max&sirala=&indirim=1
function readFilters(params) {
  const [low, high] = String(params.get("fiyat") || "").split("-").map((v) => (v === "" ? NaN : Number(v)));
  return {
    category: params.getAll("kategori"),
    subCategory: params.getAll("alt"),
    sizes: params.getAll("beden"),
    colors: params.getAll("renk"),
    priceRange: [Number.isFinite(low) ? low : 0, Number.isFinite(high) ? high : Infinity],
  };
}

function writeFilters(params, filters) {
  const next = new URLSearchParams(params);
  for (const [key, values] of [
    ["kategori", filters.category],
    ["alt", filters.subCategory],
    ["beden", filters.sizes],
    ["renk", filters.colors],
  ]) {
    next.delete(key);
    for (const value of values || []) next.append(key, String(value));
  }
  const [low, high] = filters.priceRange || [0, Infinity];
  if ((Number.isFinite(low) && low > 0) || Number.isFinite(high)) {
    next.set("fiyat", `${Number.isFinite(low) ? low : 0}-${Number.isFinite(high) ? high : ""}`);
  } else {
    next.delete("fiyat");
  }
  return next;
}

export default function ShopPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Kampanyalar ürün listesini sayfa durumu (state) ile getirir.
  const campaignItems = state?.campaignItems;
  const campaignTitle = state?.campaignTitle;
  const miniItems = state?.miniCampaignItems;
  const miniTitle = state?.miniCampaignTitle;
  const preset = state?.preset || null;
  const presetTitle = preset?.title || "";
  const presetProductIdSet = useMemo(
    () => (Array.isArray(preset?.productIds) ? new Set(preset.productIds.map(String)) : null),
    [preset]
  );

  const {
    data: cachedProducts,
    loading: productsLoading,
    error: productsError,
    retry: retryProducts,
  } = useProductsCache();
  const {
    data: cachedCategories,
    loading: categoriesLoading,
    error: categoriesError,
    retry: retryCategories,
  } = useCategoriesCache();

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const query = (searchParams.get("q") || "").trim();
  const sortParam = searchParams.get("sirala");
  // Aramada varsayılan sıra "en ilgili", diğer durumlarda "en yeni".
  const defaultSort = query ? "relevance" : "newest";
  const sortBy = SORT_VALUES.has(sortParam) ? sortParam : defaultSort;
  const sortOptions = query
    ? [{ value: "relevance", label: "En İlgili" }, ...SORT_OPTIONS]
    : SORT_OPTIONS;
  const discountOnly = searchParams.get("indirim") === "1" || Boolean(preset?.discountOnly);

  // Adresi güncellerken kampanya listesi (state) korunur.
  const updateParams = (next) => setSearchParams(next, { replace: true, state });

  // lazy-load: filtre değişince baştan başla
  const [visibleCount, setVisibleCount] = useState(20);
  const paramsKey = searchParams.toString();
  useEffect(() => {
    setVisibleCount(20);
  }, [paramsKey]);

  /* Hangi liste? */
  const allProducts = useMemo(
    () => (Array.isArray(cachedProducts) ? cachedProducts : []),
    [cachedProducts]
  );
  const categories = useMemo(
    () => (Array.isArray(cachedCategories) ? cachedCategories : []),
    [cachedCategories]
  );
  const baseList = useMemo(() => {
    const list = miniItems || campaignItems || allProducts;
    return query ? searchProducts(list, query) : list;
  }, [miniItems, campaignItems, allProducts, query]);
  const pageLoading =
    campaignItems || miniItems ? false : productsLoading || categoriesLoading;
  const variantColorMap = useMemo(
    () => buildVariantColorMap(allProducts),
    [allProducts]
  );

  /* Listeyi filtrele (normalize’larla) */
  const filtered = useMemo(
    () =>
      baseList.filter((p) => {
        const cat =
          typeof p.category === "object"
            ? String(p.category._id)
            : String(p.category);
        const parent =
          typeof p.category === "object" && p.category.parent
            ? String(p.category.parent._id || p.category.parent)
            : null;

        if (presetProductIdSet && !presetProductIdSet.has(String(p._id))) {
          return false;
        }

        if (discountOnly) {
          const rate = Number(p.discount || 0);
          if (!(rate > 0)) return false;
        }

        if (filters.subCategory.length) {
          if (!filters.subCategory.map(String).includes(cat)) return false;
        } else if (filters.category.length) {
          const cats = filters.category.map(String);
          if (!cats.includes(cat) && !(parent && cats.includes(parent))) {
            return false;
          }
        }

        if (filters.sizes.length) {
          const sizeStrs = Array.isArray(p.sizes)
            ? p.sizes
                .map((s) => String((s?.size ?? s ?? "").toString().trim()))
                .filter(Boolean)
            : [];
          const ok = sizeStrs.some((s) => filters.sizes.includes(s));
          if (!ok) return false;
        }

        if (filters.colors.length) {
          const color = String((p.color || "").trim());
          if (!filters.colors.includes(color)) return false;
        }

        const [low, high] = filters.priceRange;
        const price = Number(p.price || 0);
        if (price < low || price > high) return false;

        return true;
      }),
    [baseList, discountOnly, filters, presetProductIdSet]
  );

  const sortedProducts = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "relevance") return list;

    const getTimestamp = (product) => {
      const createdAt = product?.createdAt
        ? new Date(product.createdAt).getTime()
        : NaN;
      if (Number.isFinite(createdAt)) return createdAt;

      const objectIdTime = parseInt(String(product?._id || "").slice(0, 8), 16);
      return Number.isFinite(objectIdTime) ? objectIdTime * 1000 : 0;
    };

    list.sort((a, b) => {
      if (sortBy === "priceAsc") return Number(a.price || 0) - Number(b.price || 0);
      if (sortBy === "priceDesc") return Number(b.price || 0) - Number(a.price || 0);

      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);

      return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [filtered, sortBy]);

  // Başlık: kampanya > tek kategori > indirim > arama
  const categoryName = useMemo(() => {
    const ids = filters.subCategory.length === 1 ? filters.subCategory : filters.category.length === 1 ? filters.category : null;
    if (!ids) return "";
    for (const parentCat of categories) {
      if (String(parentCat._id) === ids[0]) return parentCat.name;
      const child = (parentCat.children || []).find((c) => String(c._id) === ids[0]);
      if (child) return child.name;
    }
    return "";
  }, [categories, filters.category, filters.subCategory]);
  const listTitle =
    presetTitle ||
    miniTitle ||
    campaignTitle ||
    (query ? `“${query}” için sonuçlar` : "") ||
    categoryName ||
    (discountOnly ? "İndirimdekiler" : "");

  // Arama sonuçları dizine girmez; tek kategori kendi adresiyle, diğerleri /shop ile.
  const singleCategory =
    filters.subCategory.length === 1 ? `alt=${filters.subCategory[0]}` :
    filters.category.length === 1 && !filters.subCategory.length ? `kategori=${filters.category[0]}` : "";
  usePageMeta({
    title: listTitle || "Mağaza",
    description: categoryName
      ? `${categoryName} ürünleri OLDSOCKS mağazasında.`
      : "OLDSOCKS mağazasındaki tüm ürünler: beden, renk ve fiyata göre filtreleyin.",
    noindex: Boolean(query),
    canonicalPath: singleCategory && !presetTitle && !campaignTitle && !miniTitle ? `/shop?${singleCategory}` : "/shop",
  });

  /* Kampanya/filtre temizleme */
  const clearCampaign = () => {
    navigate("/shop", { replace: true, state: {} });
  };

  if (pageLoading) return <PageLoading />;

  if (productsError && !(campaignItems || miniItems)) {
    return (
      <div className="bg-white text-dark1">
        <BreadCrumb />
        <div className="container mx-auto px-4 py-20 text-center" role="alert">
          <p className="text-lg font-medium">Ürünler şu an yüklenemedi.</p>
          <p className="mt-2 text-sm text-dark2">Bağlantınızı kontrol edip tekrar deneyin.</p>
          <button
            type="button"
            onClick={() => {
              retryProducts();
              if (categoriesError) retryCategories();
            }}
            className="mt-6 rounded-full border border-dark1 px-6 py-2 text-dark1 transition hover:bg-dark1 hover:text-white"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-dark1">
      <BreadCrumb />

      <main className="container mx-auto px-4 py-6 sm:py-14 grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-10">
        {/* SOL: Filtre */}
        <aside className="lg:col-span-1 bg-transparent rounded-xl p-6 shadow-sm">
          <CategoryFilter
            products={filtered}
            categories={categories}
            filters={filters}
            onFilterChange={(next) => updateParams(writeFilters(searchParams, next))}
            campaignTitle={listTitle}
            onClearCampaign={clearCampaign}
          />
        </aside>

        {/* SAĞ: Ürünler */}
        <section className="lg:col-span-3">
          <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="text-4xl font-playfair font-bold text-black">
                {listTitle || "Tüm Ürünler"}
              </h1>
              <p className="mt-2 text-sm text-dark2">
                {sortedProducts.length} ürün listeleniyor
              </p>
            </div>

            <div className="w-full md:w-auto rounded-2xl border border-light2 bg-white px-4 py-3 shadow-sm">
              <label
                htmlFor="shop-sort"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-dark2"
              >
                Sıralama
              </label>
              <div className="relative">
                <select
                  id="shop-sort"
                  value={sortBy}
                  onChange={(e) => {
                    const next = new URLSearchParams(searchParams);
                    if (e.target.value === defaultSort) next.delete("sirala");
                    else next.set("sirala", e.target.value);
                    updateParams(next);
                  }}
                  className="w-full appearance-none rounded-full border border-light2 bg-light1 px-4 py-2.5 pr-10 text-sm font-medium text-dark1 outline-none transition focus:border-dark1 md:min-w-[260px]"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark2" />
              </div>
            </div>
          </header>

          <Products
            products={sortedProducts.slice(0, visibleCount)}
            variantColorMap={variantColorMap}
          />

          {visibleCount < sortedProducts.length && !(campaignItems || miniItems) && (
            <div className="mt-10 text-center">
              <button
                className="px-6 py-2 border border-dark1 text-dark1 rounded-full hover:bg-dark1 hover:text-white transition"
                onClick={() => setVisibleCount((prev) => prev + 20)}
              >
                Daha Fazla Yükle
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
