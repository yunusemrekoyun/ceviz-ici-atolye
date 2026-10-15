import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import api from "../../../api";
import { normalizeSectionOrder } from "../../context/storefrontSettings";
import { getResponsiveImageProps } from "../../utils/media";

const sectionNames = ["İlk ürün alanı", "Orta ürün alanı", "Son ürün alanı"];
const sources = [
  ["latest", "Son eklenen ürünler"],
  ["best_selling", "Gerçek satışlara göre çok satanlar"],
  ["category", "Seçilen kategorinin ürünleri"],
  ["manual", "Tek tek seçtiğim ürünler"],
  ["random", "Tüm ürünlerden rastgele"],
];
const fonts = [
  { value: "classic", label: "Klasik", detail: "Mevcut görünüm · Playfair başlık, sade metin", heading: '"Playfair Display", Georgia, serif', body: "Arial, sans-serif" },
  { value: "modern", label: "Modern", detail: "Manrope başlık ve metin", heading: '"Manrope Variable", Arial, sans-serif', body: '"Manrope Variable", Arial, sans-serif' },
  { value: "fashion", label: "Moda", detail: "Bodoni başlık, Manrope metin", heading: '"Bodoni Moda Variable", Georgia, serif', body: '"Manrope Variable", Arial, sans-serif' },
];

function ProductThumbnail({ product }) {
  const [failed, setFailed] = useState(false);
  const poster = product.media?.images?.[0] || product.images?.[0];
  const image = getResponsiveImageProps(poster, { widths: [96, 160, 240], defaultWidth: 160, sizes: "40px" });

  return <a
    href={`/product-details/${product._id}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`${product.name} ürününü yeni sekmede aç`}
    title="Ürünü yeni sekmede aç"
    className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-100 text-center text-[9px] leading-tight text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
  >
    {image.src && !failed
      ? <img src={image.src} srcSet={image.srcSet} sizes={image.sizes} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      : <span>Görsel yok</span>}
  </a>;
}

export default function StorefrontPage() {
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [recommendationSearch, setRecommendationSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [draggingKey, setDraggingKey] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const draggingKeyRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/storefront/admin"), api.get("/products"), api.get("/categories")])
      .then(([settingsResponse, productsResponse, categoriesResponse]) => {
        if (!active) return;
        setSettings({ ...settingsResponse.data, sectionOrder: normalizeSectionOrder(settingsResponse.data.sectionOrder) });
        setProducts(productsResponse.data || []);
        setCategories((categoriesResponse.data || []).flatMap((root) => [root, ...(root.children || [])]));
      })
      .catch(() => { if (active) setNotice({ type: "error", text: "Ayarlar yüklenemedi. Sayfayı yenileyin." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const matchingProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    return products.filter((product) => product.name.toLocaleLowerCase("tr-TR").includes(query));
  }, [products, search]);
  const matchingRecommendationProducts = useMemo(() => {
    const query = recommendationSearch.trim().toLocaleLowerCase("tr-TR");
    return products.filter((product) => product.name.toLocaleLowerCase("tr-TR").includes(query));
  }, [products, recommendationSearch]);
  const recommendationProductIds = settings?.cartRecommendations?.productIds || [];
  const recommendationSelected = recommendationProductIds.map((id) => products.find((product) => product._id === id)).filter(Boolean);

  const setSection = (key, patch) => setSettings((current) => ({
    ...current,
    sections: { ...current.sections, [key]: { ...current.sections[key], ...patch } },
  }));

  const moveSection = (fromKey, targetKey, after = false) => {
    if (fromKey === targetKey) return;
    setSettings((current) => {
      const order = normalizeSectionOrder(current.sectionOrder).filter((key) => key !== fromKey);
      const targetIndex = order.indexOf(targetKey);
      if (targetIndex < 0) return current;
      order.splice(targetIndex + Number(after), 0, fromKey);
      return { ...current, sectionOrder: order };
    });
    setNotice(null);
  };

  const moveByOne = (key, direction) => {
    setSettings((current) => {
      const order = [...normalizeSectionOrder(current.sectionOrder)];
      const index = order.indexOf(key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return { ...current, sectionOrder: order };
    });
    setNotice(null);
  };

  const finishDrag = () => {
    draggingKeyRef.current = null;
    setDraggingKey(null);
    setDropPosition(null);
  };

  const toggleProduct = (key, id) => {
    const current = settings.sections[key].productIds || [];
    const exists = current.includes(id);
    if (!exists && current.length >= 40) {
      setNotice({ type: "error", text: "Bir alan için en fazla 40 ürün seçilebilir." });
      return;
    }
    setSection(key, { productIds: exists ? current.filter((item) => item !== id) : [...current, id] });
  };
  const setRecommendationIds = (productIds) => setSettings((current) => ({
    ...current,
    cartRecommendations: { ...current.cartRecommendations, productIds },
  }));
  const toggleRecommendation = (id) => {
    if (recommendationProductIds.includes(id)) {
      setRecommendationIds(recommendationProductIds.filter((productId) => productId !== id));
    } else if (recommendationProductIds.length < 12) {
      setRecommendationIds([...recommendationProductIds, id]);
    } else {
      setNotice({ type: "error", text: "Sepet için en fazla 12 öncelikli ürün seçilebilir." });
    }
  };
  const moveRecommendation = (index, direction) => {
    const next = [...recommendationProductIds];
    const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    setRecommendationIds(next);
  };

  const save = async () => {
    if (!settings.cartRecommendations?.heading?.trim()) {
      setNotice({ type: "error", text: "Sepet önerileri için başlık girin." });
      return;
    }
    for (const [index, key] of normalizeSectionOrder(settings.sectionOrder).entries()) {
      const section = settings.sections[key];
      if (!section.heading.trim()) {
        setNotice({ type: "error", text: `${sectionNames[index]} için başlık girin.` });
        return;
      }
      if (section.visible !== false && section.source === "category" && !section.categoryId) {
        setNotice({ type: "error", text: `${sectionNames[index]} için kategori seçin.` });
        return;
      }
      if (section.visible !== false && section.source === "manual" && !section.productIds.length) {
        setNotice({ type: "error", text: `${sectionNames[index]} için ürün seçin.` });
        return;
      }
    }
    setSaving(true);
    setNotice(null);
    try {
      const { data } = await api.put("/storefront/admin", settings);
      setSettings(data);
      setNotice({ type: "success", text: "Ana sayfa ayarları kaydedildi." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Ayarlar kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Ana sayfa ayarları yükleniyor…</div>;
  if (!settings) return <div className="p-6 text-red-700">{notice?.text || "Ayarlar açılamadı."}</div>;
  const sectionOrder = normalizeSectionOrder(settings.sectionOrder);

  return <div className="mx-auto max-w-5xl space-y-8 p-4 pb-24 sm:p-6">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Ana Sayfa Düzeni</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Ürün alanlarını sürükleyerek sıralayın, başlıklarını ve kaynaklarını seçin. Her alanda dört ürün görünür.</p>
    </div>

    <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">Hero butonu</h2>
      <label htmlFor="hero-button-opacity" className="mt-4 flex justify-between gap-4 text-sm font-medium text-gray-800">
        <span>Buton arka planının opaklığı</span>
        <span>%{settings.heroButtonOpacity ?? 30}</span>
      </label>
      <input id="hero-button-opacity" type="range" min="0" max="100" step="5" value={settings.heroButtonOpacity ?? 30} onChange={(event) => setSettings((current) => ({ ...current, heroButtonOpacity: Number(event.target.value) }))} className="mt-3 w-full accent-gray-900" />
      <p className="mt-1 text-xs text-gray-600">%0 tamamen şeffaf, %100 tamamen siyah. Yazı ve kenarlık görünür kalır.</p>
      <div className="mt-4 flex min-h-28 items-center justify-center rounded-lg bg-gradient-to-r from-stone-300 via-stone-500 to-stone-800 p-4">
        <span className="hero-cta rounded-full border border-white px-6 py-3 text-sm font-medium text-white backdrop-blur-sm" style={{ "--button-opacity": (settings.heroButtonOpacity ?? 30) / 100 }}>Alışverişe Başla</span>
      </div>
    </section>

    <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">Mağaza yazı ailesi</h2>
      <p className="mt-1 text-sm text-gray-600">Seçim mağaza, sepet ve ödeme sayfalarındaki başlık ve metinlere uygulanır. Yönetim panelinin okunabilirliği korunur.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {fonts.map((font) => <label key={font.value} className={`cursor-pointer rounded-lg border p-4 transition-colors ${settings.fontPreset === font.value ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-400"}`}>
          <span className="flex items-center gap-2 text-sm font-semibold"><input type="radio" name="fontPreset" checked={settings.fontPreset === font.value} onChange={() => setSettings((current) => ({ ...current, fontPreset: font.value }))} />{font.label}</span>
          <span className="mt-3 block text-2xl text-gray-900" style={{ fontFamily: font.heading }}>Yeni Koleksiyon</span>
          <span className="mt-1 block text-sm text-gray-700" style={{ fontFamily: font.body }}>{font.detail}</span>
        </label>)}
      </div>
    </section>

    <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sepette önerilen ürünler</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">Seçtikleriniz önce gösterilir. Boş kalan yerler sepetteki ürünlerle ilgili, stokta bulunan ürünlerle otomatik tamamlanır. Sepette dört öneri görünür.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
          <input type="checkbox" checked={settings.cartRecommendations?.visible !== false} onChange={(event) => setSettings((current) => ({ ...current, cartRecommendations: { ...current.cartRecommendations, visible: event.target.checked } }))} className="h-4 w-4 accent-gray-900" />
          Sepette göster
        </label>
      </div>
      <label className="mt-5 block text-sm font-medium text-gray-800">Görünen başlık
        <input value={settings.cartRecommendations?.heading || ""} maxLength={80} onChange={(event) => setSettings((current) => ({ ...current, cartRecommendations: { ...current.cartRecommendations, heading: event.target.value } }))} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
      </label>
      {recommendationSelected.length > 0 && <div className="mt-5">
        <h3 className="text-sm font-medium text-gray-800">Öncelik sırası ({recommendationSelected.length}/12)</h3>
        <div className="mt-2 space-y-2">
          {recommendationSelected.map((product, index) => <div key={product._id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <span className="w-5 shrink-0 text-gray-500">{index + 1}.</span>
            <ProductThumbnail product={product} />
            <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
            <button type="button" onClick={() => moveRecommendation(index, -1)} disabled={index === 0} aria-label={`${product.name} ürününü yukarı taşı`} className="rounded p-1 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={16} /></button>
            <button type="button" onClick={() => moveRecommendation(index, 1)} disabled={index === recommendationSelected.length - 1} aria-label={`${product.name} ürününü aşağı taşı`} className="rounded p-1 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={16} /></button>
            <button type="button" onClick={() => toggleRecommendation(product._id)} className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50">Kaldır</button>
          </div>)}
        </div>
      </div>}
      <label className="mt-5 block text-sm font-medium text-gray-800">Öncelikli ürün ekle
        <input type="search" value={recommendationSearch} onChange={(event) => setRecommendationSearch(event.target.value)} placeholder="Ürün ara" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={!matchingRecommendationProducts.some((product) => !recommendationProductIds.includes(product._id)) || recommendationProductIds.length >= 12} onClick={() => setRecommendationIds([...recommendationProductIds, ...matchingRecommendationProducts.filter((product) => !recommendationProductIds.includes(product._id)).slice(0, 12 - recommendationProductIds.length).map((product) => product._id)])} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">Görünenlerden seç</button>
        <button type="button" disabled={!recommendationProductIds.length} onClick={() => setRecommendationIds([])} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">Seçimleri temizle</button>
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-200 p-2">
        {matchingRecommendationProducts.map((product) => <div key={product._id} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-gray-50">
          <input id={`cart-recommend-${product._id}`} type="checkbox" checked={recommendationProductIds.includes(product._id)} onChange={() => toggleRecommendation(product._id)} disabled={!recommendationProductIds.includes(product._id) && recommendationProductIds.length >= 12} />
          <ProductThumbnail product={product} />
          <label htmlFor={`cart-recommend-${product._id}`} className="min-w-0 flex-1 cursor-pointer"><span className="block truncate font-medium">{product.name}</span><span className="block text-xs text-gray-600">{product.color || "Renk belirtilmemiş"} · ₺{Number(product.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></label>
        </div>)}
        {!matchingRecommendationProducts.length && <p className="p-3 text-sm text-gray-600">Ürün bulunamadı.</p>}
      </div>
    </section>

    <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">Ürün detayında benzer ürünler</h2>
      <p className="mt-1 text-sm text-gray-600">Ürün sayfasının sağ tarafındaki “Benzer Ürünler” alanını kontrol eder.</p>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
        <input type="checkbox" checked={settings.similarProductsVisible !== false} onChange={(event) => setSettings((current) => ({ ...current, similarProductsVisible: event.target.checked }))} className="h-4 w-4 accent-gray-900" />
        Ürün sayfasında göster
      </label>
    </section>

    <div>
      <h2 className="text-lg font-semibold text-gray-900">Ürün alanlarının sırası</h2>
      <p className="mt-1 text-sm text-gray-600">Kartları tutamaçtan sürükleyin veya oklarla taşıyın. Kampanya bannerı ikinci ve üçüncü alan arasında kalır. Gizlenen alanların ayarları korunur. Değişiklikleri uygulamak için kaydedin.</p>
    </div>

    {sectionOrder.map((key, index) => {
      const label = sectionNames[index];
      const section = settings.sections[key];
      const selectedVisibleCount = matchingProducts.filter((product) => section.productIds.includes(product._id)).length;
      const visibleIds = matchingProducts.map((product) => product._id);
      const combinedIds = [...new Set([...section.productIds, ...visibleIds])];
      const overLimit = combinedIds.length > 40;
      return <section
        key={key}
        aria-label={`${label}: ${section.heading}`}
        onDragOver={(event) => {
          if (!draggingKeyRef.current || draggingKeyRef.current === key) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          const after = event.clientY >= event.currentTarget.getBoundingClientRect().top + event.currentTarget.offsetHeight / 2;
          setDropPosition((current) => current?.key === key && current.after === after ? current : { key, after });
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggingKeyRef.current) moveSection(draggingKeyRef.current, key, event.clientY >= event.currentTarget.getBoundingClientRect().top + event.currentTarget.offsetHeight / 2);
          finishDrag();
        }}
        className={`relative rounded-xl border p-5 sm:p-6 ${section.visible === false ? "border-dashed border-gray-300 bg-gray-50" : "border-gray-200 bg-white"} ${draggingKey === key ? "opacity-60" : ""}`}
      >
        {dropPosition?.key === key && <span aria-hidden="true" className={`pointer-events-none absolute inset-x-3 h-1 rounded-full bg-blue-600 ${dropPosition.after ? "-bottom-1" : "-top-1"}`} />}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                draggingKeyRef.current = key;
                setDraggingKey(key);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", key);
              }}
              onDragEnd={finishDrag}
              aria-label={`${label} alanını sürükleyerek sırala`}
              title="Sürükleyerek sırala"
              className="cursor-grab rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 active:cursor-grabbing"
            ><GripVertical size={18} aria-hidden="true" /></button>
            <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
            {section.visible === false && <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">Gizli</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <label className="mr-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
              <input type="checkbox" checked={section.visible !== false} onChange={(event) => setSection(key, { visible: event.target.checked })} className="h-4 w-4 accent-gray-900" />
              Ana sayfada göster
            </label>
            <span className="mr-2">{index + 1} / {sectionOrder.length}</span>
            <button type="button" onClick={() => moveByOne(key, -1)} disabled={index === 0} aria-label={`${label} alanını yukarı taşı`} title="Yukarı taşı" className="rounded-md border border-gray-200 p-2 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp size={16} aria-hidden="true" /></button>
            <button type="button" onClick={() => moveByOne(key, 1)} disabled={index === sectionOrder.length - 1} aria-label={`${label} alanını aşağı taşı`} title="Aşağı taşı" className="rounded-md border border-gray-200 p-2 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-40"><ArrowDown size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-800">Görünen başlık
            <input className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" maxLength={80} value={section.heading} onChange={(event) => setSection(key, { heading: event.target.value })} />
          </label>
          <label className="block text-sm font-medium text-gray-800">Ürün kaynağı
            <select className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-gray-900" value={section.source} onChange={(event) => setSection(key, { source: event.target.value })}>
              {sources.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
        </div>

        {section.source === "category" && <label className="mt-5 block text-sm font-medium text-gray-800">Kategori
          <select className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-gray-900" value={section.categoryId || ""} onChange={(event) => setSection(key, { categoryId: event.target.value || null })}>
            <option value="">Kategori seçin</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.parent ? "— " : ""}{category.name}</option>)}
          </select>
        </label>}

        {section.source === "manual" && <div className="mt-5">
          <label className="block text-sm font-medium text-gray-800">Ürün havuzu ({section.productIds.length}/40)
            <input type="search" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" placeholder="Ürün ara" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={!visibleIds.length || selectedVisibleCount === visibleIds.length || overLimit} onClick={() => setSection(key, { productIds: combinedIds })} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">Görünenleri seç</button>
            <button type="button" disabled={!selectedVisibleCount} onClick={() => { const visibleSet = new Set(visibleIds); setSection(key, { productIds: section.productIds.filter((id) => !visibleSet.has(id)) }); }} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">Görünenleri kaldır</button>
            <button type="button" disabled={!section.productIds.length} onClick={() => setSection(key, { productIds: [] })} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">Tümünü temizle</button>
          </div>
          {overLimit && <p className="mt-2 text-xs text-gray-700">Tüm görünenleri seçmek 40 ürün sınırını aşar. Aramayı daraltın.</p>}
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {matchingProducts.map((product) => <div key={product._id} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-gray-50">
              <input id={`storefront-${key}-${product._id}`} type="checkbox" checked={section.productIds.includes(product._id)} onChange={() => toggleProduct(key, product._id)} aria-label={`${product.name} ürününü seç`} />
              <ProductThumbnail product={product} />
              <label htmlFor={`storefront-${key}-${product._id}`} className="min-w-0 flex-1 cursor-pointer"><span className="block truncate font-medium">{product.name}</span><span className="block text-xs text-gray-600">{product.color || "Renk belirtilmemiş"} · ₺{Number(product.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></label>
            </div>)}
            {!matchingProducts.length && <p className="p-3 text-sm text-gray-600">Ürün bulunamadı.</p>}
          </div>
          <p className="mt-2 text-xs text-gray-600">Rastgele gösterim kapalıysa ilk seçilen dört ürün görünür.</p>
        </div>}

        {section.source !== "random" && <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-gray-800">
          <input type="checkbox" checked={Boolean(section.shuffle)} onChange={(event) => setSection(key, { shuffle: event.target.checked })} />
          Bu kaynaktaki ürünleri rastgele döndür
        </label>}
      </section>;
    })}

    {notice && <div role="status" className={`rounded-lg p-3 text-sm ${notice.type === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{notice.text}</div>}
    <div className="flex justify-end"><button type="button" onClick={save} disabled={saving} className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50">{saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</button></div>
  </div>;
}
