// src/components/Modals/Search/Search.jsx
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import "./Search.css";

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = untouched / no search yet
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  // Close dropdown on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Debounced search whenever `query` changes
  useEffect(() => {
    const term = query.trim();

    // wait until 300ms after last keystroke
    const handler = setTimeout(() => {
      if (term === "") {
        // back to untouched state
        setResults(null);
      } else {
        fetch(`${apiUrl}/api/products/search/${encodeURIComponent(term)}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => setResults(data))
          .catch(() => setResults([]));
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, apiUrl]);

  return (
    <div className="search-inline-wrapper" ref={wrapperRef}>
      <input
        className="search-input"
        placeholder="Ürün ara..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
      />

      {focused && (
        <div className="search-results-inline">
          {results === null ? (
            <div className="result-item empty">Ürün ara...</div>
          ) : results.length === 0 ? (
            <div className="result-item empty">
              😔 Aradığınız ürün bulunamadı
            </div>
          ) : (
            results.map((item) => (
              <Link
                key={item._id}
                to={`/product/${item._id}`}
                className="result-item"
              >
                <img
                  src={`${apiUrl}/api/products/${item._id}/image/mainImages/0`}
                  alt={item.name}
                  className="search-thumb"
                  loading="lazy"
                />
                <div className="search-info">
                  <div className="search-name">{item.name}</div>
                  {/* {item.price?.current != null && (
                    <div className="search-price">
                      ₺
                      {item.price.current.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  )} */}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
