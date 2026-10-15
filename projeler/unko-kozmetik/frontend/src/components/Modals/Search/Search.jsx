/********************************************************
 * frontend/src/components/Modals/Search/Search.jsx
 ********************************************************/
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { message, Spin } from "antd";
import { useState, useEffect, useRef } from "react";
import { imageUrl } from "../../../config/api";
import useBrandLabel from "../../../hooks/useBrandLabel";
import { discountedPrice, formatPrice } from "../../../utils/cart";
import "./Search.css";

const SUGGESTIONS = [
  "Olaplex",
  "Keune",
  "The Ordinary",
  "Serum",
  "Fön makinesi",
];

const Search = ({ isSearchShow, setIsSearchShow }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const brandLabel = useBrandLabel();

  const handleCloseModal = () => {
    setIsSearchShow(false);
    setSearchResults(null);
    setSearchTerm("");
  };

  // Açılınca arama kutusuna odaklan, Esc ile kapat
  useEffect(() => {
    if (!isSearchShow) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e) => e.key === "Escape" && setIsSearchShow(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [isSearchShow, setIsSearchShow]);

  // Canlı (debounce) arama
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiUrl}/api/products/search/${encodeURIComponent(
            searchTerm.trim()
          )}`
        );
        if (!res.ok) {
          message.error("Ürün getirme hatası!");
          setSearchResults([]);
        } else {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error(error);
        message.error("Arama sırasında bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, apiUrl]);

  return (
    <div
      className={`modal-search ${isSearchShow ? "show" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Ürün ara"
      aria-hidden={!isSearchShow}
    >
      <div className="modal-wrapper">
        <form
          className="search-form"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <i className="bi bi-search" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ürün veya marka arayın"
            aria-label="Ürün veya marka arayın"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="button"
            className="search-close"
            onClick={handleCloseModal}
            aria-label="Kapat"
          >
            <i className="bi bi-x-lg" />
          </button>
        </form>

        <div className="search-results">
          {!searchResults && (
            <div className="search-suggestions">
              <p>Popüler aramalar</p>
              <div>
                {SUGGESTIONS.map((term) => (
                  <button
                    type="button"
                    key={term}
                    className="category-link"
                    onClick={() => setSearchTerm(term)}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Spin spinning={loading}>
            {searchResults && searchResults.length === 0 && (
              <p className="search-empty">
                “{searchTerm.trim()}” için sonuç bulunamadı. Farklı bir kelime
                deneyin.
              </p>
            )}
            {searchResults && searchResults.length > 0 && (
              <>
                <p className="search-heading">
                  {searchResults.length} ürün bulundu
                </p>
                <div className="results">
                  {searchResults.map((item) => (
                    <Link
                      to={`/product/${item._id}`}
                      className="result-item"
                      key={item._id}
                      onClick={handleCloseModal}
                    >
                      <img
                        src={imageUrl(item.img?.[0])}
                        className="search-thumb"
                        alt=""
                        loading="lazy"
                      />
                      <div className="search-info">
                        <span className="search-brand">
                          {brandLabel(item.brand)}
                        </span>
                        <h4>{item.name}</h4>
                        <span className="search-price price">
                          {formatPrice(discountedPrice(item.price))}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Spin>
        </div>
      </div>
      <div className="modal-overlay" onClick={handleCloseModal}></div>
    </div>
  );
};

Search.propTypes = {
  isSearchShow: PropTypes.bool,
  setIsSearchShow: PropTypes.func,
};

export default Search;
