import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import useBrandLabel from "../../hooks/useBrandLabel";
import "./ProductFilter.css";

const ProductFilter = ({
  categories,
  selectedBrands,
  setSelectedBrands,
  onlyDiscounted,
  setOnlyDiscounted,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const brandLabel = useBrandLabel();

  // Gösterilen kategorilerin markaları + URL'den gelen (örn. slider'daki) seçili markalar
  const brands = useMemo(() => {
    const all = [
      ...categories
        .flatMap((c) => c.brands || [])
        .map((b) => b.trim().toLowerCase()),
      ...selectedBrands,
    ];
    return [...new Set(all.filter(Boolean))].sort((a, b) =>
      brandLabel(a).localeCompare(brandLabel(b), "tr")
    );
  }, [categories, selectedBrands, brandLabel]);

  const activeCount = selectedBrands.length + (onlyDiscounted ? 1 : 0);

  const toggleBrand = (brand, checked) => {
    setSelectedBrands(
      checked
        ? [...new Set([...selectedBrands, brand])]
        : selectedBrands.filter((b) => b !== brand)
    );
  };

  return (
    <aside className={`product-filter ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="filter-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      >
        <i className="bi bi-sliders" aria-hidden="true" />
        Filtrele
        {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        <i
          className="bi bi-chevron-down filter-toggle-chevron"
          aria-hidden="true"
        />
      </button>

      <div className="filter-panel">
        <div className="filter-section">
          <h2 className="filter-title">Fırsatlar</h2>
          <label className="filter-switch">
            <input
              type="checkbox"
              checked={onlyDiscounted}
              onChange={(e) => setOnlyDiscounted(e.target.checked)}
            />
            <span className="filter-switch-track" aria-hidden="true" />
            Sadece indirimli ürünler
          </label>
        </div>

        {brands.length > 0 && (
          <div className="filter-section">
            <h2 className="filter-title">Markalar</h2>
            <ul className="filter-list">
              {brands.map((b) => (
                <li key={b} className="filter-item">
                  <label>
                    <input
                      type="checkbox"
                      value={b}
                      checked={selectedBrands.includes(b)}
                      onChange={(e) => toggleBrand(b, e.target.checked)}
                    />
                    <span>{brandLabel(b)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeCount > 0 && (
          <button type="button" className="filter-clear" onClick={onClear}>
            Filtreleri temizle
          </button>
        )}
      </div>
    </aside>
  );
};

ProductFilter.propTypes = {
  categories: PropTypes.array.isRequired,
  selectedBrands: PropTypes.array.isRequired,
  setSelectedBrands: PropTypes.func.isRequired,
  onlyDiscounted: PropTypes.bool,
  setOnlyDiscounted: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

export default ProductFilter;
