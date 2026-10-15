// ✅ CategoryFilter — fixed price slider (global range, doesn’t reset)
import React, { useState, useEffect } from "react";
import { FaChevronDown, FaXmark } from "react-icons/fa6";

export default function CategoryFilter({
  products,
  categories,
  filters,
  onFilterChange,
  campaignTitle,
  onClearCampaign,
}) {
  const [open, setOpen] = useState({
    category: false,
    subCategory: false,
    sizes: false,
    colors: false,
    priceRange: false,
  });
  const [expandedMobile, setExpandedMobile] = useState(false);

  // Slider local state (always numbers)
  const [priceInput, setPriceInput] = useState({ min: 0, max: 0 });

  // 🔒 Global (sabit) fiyat aralığı – filtrelerden bağımsız
  const [baseRange, setBaseRange] = useState({ min: 0, max: 0 });
  useEffect(() => {
    const list = products
      .map((p) => Number(p.price || 0))
      .filter((n) => Number.isFinite(n));
    if (!list.length) return;

    const curMin = Math.min(...list);
    const curMax = Math.max(...list);

    // Sadece genişlet (ilk yükleme veya ürün yelpazesi büyürse)
    setBaseRange((prev) => ({
      min: prev.min === 0 ? curMin : Math.min(prev.min, curMin),
      max: prev.max === 0 ? curMax : Math.max(prev.max, curMax),
    }));
  }, [products]);

  // filters.priceRange → slider’a sayısal senkron
  useEffect(() => {
    if (!baseRange.min && !baseRange.max) return;
    const [low, high] = filters.priceRange || [];
    setPriceInput({
      min: Number.isFinite(low) ? low : baseRange.min,
      max: Number.isFinite(high) ? high : baseRange.max,
    });
  }, [filters.priceRange, baseRange]);

  // Toggle helper
  const toggleFilter = (key, val) => {
    const prev = Array.isArray(filters[key]) ? filters[key] : [];
    const next = prev.includes(val)
      ? prev.filter((x) => x !== val)
      : [...prev, val];
    onFilterChange({ ...filters, [key]: next });
  };

  // Kategoriler
  const parentCats = categories.filter((c) => !c.parent);
  const allSub = parentCats.flatMap((p) =>
    (p.children || []).map((ch) => ({
      value: String(ch._id),
      label: ch.name,
      parent: String(p._id),
    }))
  );
  const subCats = Array.from(new Map(allSub.map((i) => [i.value, i])).values());
  const subOptions = filters.category.length
    ? subCats.filter((s) => filters.category.includes(s.parent))
    : [];

  // Beden & Renk
  // --- Sıralama: S -> M -> L -> XL, diğerleri en sonda (alfabetik) ---
  const priority = { s: 0, m: 1, l: 2, xl: 3 };

  const sizeValues = Array.from(
    new Set(
      products
        .flatMap((p) =>
          Array.isArray(p.sizes)
            ? p.sizes.map((s) => String((s?.size || "").trim()))
            : []
        )
        .filter(Boolean)
    )
  ).sort((a, b) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();

    const pa = Object.prototype.hasOwnProperty.call(priority, al)
      ? priority[al]
      : Number.POSITIVE_INFINITY;

    const pb = Object.prototype.hasOwnProperty.call(priority, bl)
      ? priority[bl] // ✅ düzeltme
      : Number.POSITIVE_INFINITY;

    if (pa !== pb) return pa - pb; // Öncelik grubu (S,M,L,XL önce)
    if (pa === Number.POSITIVE_INFINITY) {
      // Diğerleri kendi aralarında alfabetik
      return a.localeCompare(b, "tr", { sensitivity: "base" });
    }
    return 0; // S/M/L/XL kendi sırasını korur
  });

  const colorValues = Array.from(
    new Set(
      products
        .map((p) => String((p.color || "").trim()))
        .filter((c) => c && c !== "-")
    )
  ).sort((a, b) => a.localeCompare(b, "tr"));

  const sections = [
    {
      label: "Kategori",
      key: "category",
      options: parentCats.map((c) => ({ value: String(c._id), label: c.name })),
    },
    { label: "Alt Kategori", key: "subCategory", options: subOptions },
    {
      label: "Beden",
      key: "sizes",
      options: sizeValues.map((s) => ({ value: s, label: s })),
    },
    {
      label: "Renk",
      key: "colors",
      options: colorValues.map((c) => ({ value: c, label: c })),
    },
  ];

  const fmt = (n) =>
    Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 0 });

  // ------ Render ------
  return (
    <aside
      className={`bg-white border border-light2 rounded-2xl shadow-md overflow-hidden transition-all duration-300 
        ${expandedMobile ? "max-h-[2000px]" : "max-h-[60px] md:max-h-none"}`}
    >
      {/* Mobile header */}
      <button
        onClick={() => setExpandedMobile((p) => !p)}
        className="md:hidden w-full px-6 py-4 flex items-center justify-between bg-dark1 text-white text-lg font-semibold uppercase tracking-wide"
      >
        Filtrele
        <FaChevronDown
          className={`transition-transform ${
            expandedMobile ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Desktop header */}
      <div className="hidden md:block bg-dark1 text-white px-6 py-4 text-lg font-semibold uppercase tracking-wide">
        Filtrele
      </div>

      <div
        className={`divide-y divide-light2 ${
          expandedMobile ? "block" : "hidden md:block"
        }`}
      >
        {sections.map(({ label, key, options }) => (
          <div key={key}>
            <button
              onClick={() =>
                setOpen((prev) => ({ ...prev, [key]: !prev[key] }))
              }
              className="w-full flex items-center justify-between px-6 py-3 text-dark1 hover:bg-light1 transition font-medium"
            >
              <span>{label}</span>
              <FaChevronDown
                className={`transition-transform duration-200 ${
                  open[key] ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {open[key] && (
              <div className="px-6 py-2 flex flex-col gap-2">
                {options.length === 0 ? (
                  <p className="text-sm text-dark2 italic">Seçenek yok</p>
                ) : (
                  options.map(({ value, label }) => {
                    const valueStr = String(value);
                    const checked = (filters[key] || []).includes(valueStr);
                    return (
                      <button
                        key={valueStr}
                        onClick={() => toggleFilter(key, valueStr)}
                        className={`text-sm px-3 py-2 rounded-full border transition-all duration-200 flex items-center justify-center ${
                          checked
                            ? "bg-dark1 text-white border-dark1"
                            : "border-light2 text-dark2 hover:bg-light2"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))}

        {/* Fiyat Aralığı */}
        <div>
          <button
            onClick={() =>
              setOpen((prev) => ({ ...prev, priceRange: !prev.priceRange }))
            }
            className="w-full flex items-center justify-between px-6 py-3 text-dark1 hover:bg-light1 transition font-medium"
          >
            <span>Fiyat Aralığı</span>
            <FaChevronDown
              className={`transition-transform duration-200 ${
                open.priceRange ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          {open.priceRange && baseRange.min !== baseRange.max && (
            <div className="px-6 pb-4 pt-2 space-y-4">
              {(() => {
                const bMin = baseRange.min;
                const bMax = baseRange.max;
                const minVal = Math.max(bMin, Math.min(priceInput.min, bMax));
                const maxVal = Math.max(minVal, Math.min(priceInput.max, bMax));
                const total = Math.max(1, bMax - bMin);

                const leftPct = ((minVal - bMin) / total) * 100;
                const widthPct = ((maxVal - minVal) / total) * 100;

                return (
                  <>
                    {/* Slider */}
                    <div className="relative h-10">
                      {/* Track */}
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-light2 rounded-full" />
                      {/* Selected */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-2 bg-dark1 rounded-full"
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      />
                      {/* Min */}
                      <input
                        type="range"
                        min={bMin}
                        max={bMax}
                        step="1"
                        value={minVal}
                        onChange={(e) => {
                          const v = Math.min(Number(e.target.value), maxVal);
                          setPriceInput((p) => ({ ...p, min: v }));
                        }}
                        className="range-thumb absolute inset-0 w-full h-full appearance-none bg-transparent"
                        style={{ zIndex: 3 }}
                      />

                      {/* Max slider (altta) */}
                      <input
                        type="range"
                        min={bMin}
                        max={bMax}
                        step="1"
                        value={maxVal}
                        onChange={(e) => {
                          const v = Math.max(Number(e.target.value), minVal);
                          setPriceInput((p) => ({ ...p, max: v }));
                        }}
                        className="range-thumb absolute inset-0 w-full h-full appearance-none bg-transparent"
                        style={{ zIndex: 2 }}
                      />
                    </div>

                    {/* Values */}
                    <div className="flex justify-between text-sm font-medium">
                      <span>Min: {fmt(minVal)}</span>
                      <span>Max: {fmt(maxVal)}</span>
                    </div>

                    <button
                      onClick={() =>
                        onFilterChange({
                          ...filters,
                          priceRange: [minVal, maxVal],
                        })
                      }
                      className="w-full bg-dark1 hover:bg-dark2 text-white py-2 rounded-lg font-semibold"
                    >
                      Uygula
                    </button>
                    <p className="text-xs text-dark2">
                      (Aralık: {fmt(bMin)} – {fmt(bMax)})
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Kampanya rozeti */}
        {campaignTitle && (
          <div className="flex items-center justify-between px-6 py-4 bg-light1 border-t border-light2">
            <span className="text-sm font-medium text-dark1 bg-white px-3 py-1 rounded-full">
              {campaignTitle}
            </span>
            <button
              onClick={onClearCampaign}
              className="text-red-500 hover:animate-shake"
              title="Kampanyayı temizle"
            >
              <FaXmark className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
