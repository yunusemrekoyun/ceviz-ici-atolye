import React, { useCallback, useEffect, useState, useRef } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getProductsCached } from "../../services/productCache";
import { formatTry } from "../../utils/currency";
import { searchProducts } from "../../utils/productSearch";

const MAX_RESULTS = 30;

export default function SearchModal({ open, onClose }) {
  const [allProducts, setAllProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Veriler çekilsin
  useEffect(() => {
    if (!open) return;
    getProductsCached()
      .then(setAllProducts)
      .catch(console.error);
    setQuery("");
  }, [open]);

  // Arama filtrelemesi
  useEffect(() => {
    const matches = searchProducts(allProducts, query);
    setTotal(matches.length);
    setResults(matches.slice(0, MAX_RESULTS));
  }, [query, allProducts]);

  // Aç/Kapat kontrolü
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      setIsClosing(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        document.body.style.overflow = "";
      }, 200); // animasyon süresi
    }
  }, [open]);

  // Dışa tıklayınca kapansın
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    };
    if (isVisible) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [handleClose, isVisible]);

  useEffect(() => {
    if (!isVisible) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose, isVisible]);

  const handleSelect = (id) => {
    handleClose();
    navigate(`/product-details/${id}`);
  };

  const showAll = (event) => {
    event?.preventDefault();
    const q = query.trim();
    if (!q) return;
    handleClose();
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ürün arama"
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[1100] transition-opacity ${
        isClosing ? "fade-out" : "fade-in"
      }`}
    >
      <div
        ref={containerRef}
        className={`relative bg-white rounded-xl w-full max-w-lg mx-4 p-6 transform transition-transform duration-200 ${
          isClosing ? "scale-out" : "scale-in"
        }`}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Aramayı kapat"
          className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-dark1"
        >
          <FaTimes />
        </button>
        <form role="search" onSubmit={showAll} className="flex items-center mb-4 border-b pb-2 pr-8">
          <FaSearch className="text-gray-500 mr-2" aria-hidden="true" />
          <input
            autoFocus
            type="text"
            enterKeyHint="search"
            aria-label="Ürün ara"
            placeholder="Ne arıyorsunuz?"
            className="w-full outline-none text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="max-h-64 overflow-auto">
          {query ? (
            results.length ? (
              results.map((p) => (
                <button
                  type="button"
                  key={p._id}
                  onClick={() => handleSelect(p._id)}
                  className="w-full py-3 px-4 hover:bg-gray-100 cursor-pointer flex items-center justify-between rounded transition group text-left"
                >
                  <div className="flex items-center space-x-4">
                    {p.images?.[0] && (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="h-12 w-12 object-cover rounded shadow"
                      />
                    )}
                    <div>
                      <div className="text-dark1 font-medium group-hover:underline">
                        {p.name}
                      </div>
                      {p.description && (
                        <div className="text-sm text-gray-500">
                          {p.description.length > 50 ? `${p.description.slice(0, 50)}…` : p.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1 min-w-[80px]">
                    <div className="text-dark1 font-semibold">
                      {formatTry(p.price)}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Sonuç bulunamadı.
              </div>
            )
          ) : (
            <div className="text-gray-500 text-center py-4">
              Aradığınız ürünü, rengi ya da kategoriyi yazın.
            </div>
          )}
        </div>
        {query.trim() && total > 0 && (
          <button
            type="button"
            onClick={showAll}
            className="mt-3 w-full rounded-lg border border-dark1 py-2 text-sm font-medium text-dark1 transition hover:bg-dark1 hover:text-white"
          >
            Tüm sonuçları mağazada gör ({total})
          </button>
        )}
      </div>

      {/* Animasyonlar */}
      <style>{`
        .fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .fade-out {
          animation: fadeOut 0.2s ease-in forwards;
        }
        .scale-in {
          animation: scaleIn 0.2s ease-out forwards;
        }
        .scale-out {
          animation: scaleOut 0.2s ease-in forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes fadeOut {
          from { opacity: 1 }
          to { opacity: 0 }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0 }
          to { transform: scale(1); opacity: 1 }
        }
        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1 }
          to { transform: scale(0.95); opacity: 0 }
        }
      `}</style>
    </div>
  );
}
