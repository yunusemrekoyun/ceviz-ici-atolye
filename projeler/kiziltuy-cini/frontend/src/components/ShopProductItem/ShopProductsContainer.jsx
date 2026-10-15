import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import ShopProductItem from "./ShopProductItem";
import "./ShopProductsContainer.css";

const ShopProductsContainer = () => {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const limit = 20;

  // URL query param’lerini oku
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const category = params.get("category") || "";
  const subcategory = params.get("subcategory") || "";
  const campaign = params.get("campaign") || "";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Eğer campaign param varsa, kampanya detayını getir ve içindeki ürünleri kullan
      if (campaign) {
        const res = await fetch(`${apiUrl}/api/campaigns/${campaign}`);
        if (!res.ok) throw new Error("Kampanya ürünleri alınamadı");
        const camp = await res.json(); // { _id, title, description, products: [...] }
        setProducts(camp.products || []);
        setHasMore(false);
      } else {
        // Normal kategori/subkategori + pagination
        if (!hasMore) return;
        const qp = new URLSearchParams();
        qp.append("page", page);
        qp.append("limit", limit);
        if (category) qp.append("category", category);
        if (subcategory) qp.append("subcategory", subcategory);

        const res = await fetch(`${apiUrl}/api/products?${qp.toString()}`);
        if (!res.ok) throw new Error("Ürünler alınamadı");
        const result = await res.json();
        const newOnes = Array.isArray(result) ? result : result.products || [];

        setProducts((prev) => [...prev, ...newOnes]);
        if (newOnes.length < limit) setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, page, hasMore, category, subcategory, campaign, limit]);

  // Filtre değişirse listeyi sıfırla
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
  }, [category, subcategory, campaign]);

  // page veya campaign değişince veriyi çek
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Infinite scroll sadece kampanya yokken çalışsın
  useEffect(() => {
    if (campaign) return;
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 100 &&
        !loading &&
        hasMore
      ) {
        setPage((p) => p + 1);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore, campaign]);

  return (
    <div className="shop-products-container">
      <div className="shop-products-grid">
        {products.map((p) => (
          <ShopProductItem key={p._id} product={p} />
        ))}
      </div>
      {loading && <p style={{ textAlign: "center" }}>Yükleniyor...</p>}
      {!hasMore && !campaign && (
        <p style={{ textAlign: "center" }}>Daha fazla ürün yok.</p>
      )}
    </div>
  );
};

export default ShopProductsContainer;
