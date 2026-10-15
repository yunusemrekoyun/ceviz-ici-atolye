import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import ProductItem from "./ProductItem";
import "./Products.css";
import "./ProductList.css";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "", label: "Yeni gelenler" },
  { value: "priceAsc", label: "Fiyat: düşükten yükseğe" },
  { value: "priceDesc", label: "Fiyat: yüksekten düşüğe" },
  { value: "nameAsc", label: "İsim: A-Z" },
];

const ProductList = ({
  categoryName,
  groupName = "",
  selectedBrands,
  onlyDiscounted = false,
  sort = "",
  setSort,
}) => {
  const [products, setProducts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const brandKey = selectedBrands.join(",");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (categoryName) params.set("category", categoryName);
    else if (groupName) params.set("group", groupName);
    if (brandKey) params.set("brand", brandKey);
    if (onlyDiscounted) params.set("discounted", "true");
    if (sort) params.set("sort", sort);

    setIsLoading(true);
    fetch(`${apiUrl}/api/products?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Ürünler alınamadı.");
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setVisibleCount(PAGE_SIZE);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Ürün alınamadı:", err);
        setError(err.message);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [apiUrl, categoryName, groupName, brandKey, onlyDiscounted, sort]);

  const displayed = products.slice(0, visibleCount);

  return (
    <section className="products shop-results" aria-live="polite">
      <div className="shop-toolbar">
        <p className="shop-count">
          {isLoading ? "Yükleniyor…" : `${products.length} ürün`}
        </p>
        <label className="shop-sort">
          <span>Sırala</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="product-list">
          {Array.from({ length: 8 }, (_, i) => (
            <div className="product-skeleton" key={i} aria-hidden="true">
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty-state">
          <i className="bi bi-wifi-off" aria-hidden="true" />
          <h3>Ürünler yüklenemedi</h3>
          <p>Bağlantınızı kontrol edip sayfayı yenileyin.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-search" aria-hidden="true" />
          <h3>Bu filtrelere uygun ürün yok</h3>
          <p>Marka seçimini veya indirim filtresini değiştirmeyi deneyin.</p>
        </div>
      ) : (
        <>
          <div className="product-list">
            {displayed.map((p) => (
              <ProductItem key={p._id} productItem={p} />
            ))}
          </div>

          {displayed.length < products.length && (
            <div className="load-more">
              <p>
                {products.length} ürünün {displayed.length} tanesini
                görüntülüyorsunuz
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Daha fazla ürün göster
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

ProductList.propTypes = {
  categoryName: PropTypes.string,
  groupName: PropTypes.string,
  selectedBrands: PropTypes.array.isRequired,
  onlyDiscounted: PropTypes.bool,
  sort: PropTypes.string,
  setSort: PropTypes.func.isRequired,
};

export default ProductList;
