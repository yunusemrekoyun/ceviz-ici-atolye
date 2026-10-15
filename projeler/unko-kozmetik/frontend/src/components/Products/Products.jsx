import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import ProductItem from "./ProductItem";
import "./Products.css";

// Ana sayfadaki ürün bölümleri ("Yeni gelenler", "İndirimdekiler")
const Products = ({
  eyebrow,
  title,
  query = "",
  limit = 8,
  moreLink = "/shop",
}) => {
  const [products, setProducts] = useState(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/api/products?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Ürünler alınamadı.");
        return res.json();
      })
      .then((data) => setProducts(data.slice(0, limit)))
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Veri hatası:", error);
          setProducts([]);
        }
      });
    return () => controller.abort();
  }, [apiUrl, query, limit]);

  if (products && products.length === 0) return null;

  return (
    <section className="section products">
      <div className="container">
        <div className="section-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <Link to={moreLink} className="link-arrow">
            Tümünü gör <i className="bi bi-arrow-right" />
          </Link>
        </div>

        <div className="product-grid">
          {products
            ? products.map((product) => (
                <ProductItem productItem={product} key={product._id} />
              ))
            : Array.from({ length: Math.min(limit, 4) }, (_, i) => (
                <div className="product-skeleton" key={i} aria-hidden="true">
                  <div />
                  <span />
                  <span />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
};

Products.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  query: PropTypes.string,
  limit: PropTypes.number,
  moreLink: PropTypes.string,
};

export default Products;
