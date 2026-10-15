// src/components/products/product-details/AddToCart.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";
import { useCart } from "../../../context/useCart";
import { useNavigate } from "react-router-dom";
import api from "../../../../api";
import { formatTry } from "../../../utils/currency";

export default function AddToCart({
  price = 0,
  sizes = [],
  color = "",
  productId,
  productName,
  image,
  parentProductId,
}) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(color || null);
  const [colorOptions, setColorOptions] = useState([]);
  const [qty, setQty] = useState(1);
  const [warn, setWarn] = useState("");
  const [showAdded, setShowAdded] = useState(false); // sadece yazı için
  const [hasAddedToCart, setHasAddedToCart] = useState(false); // buton için

  const { addToCart } = useCart();
  const navigate = useNavigate();
  const sentWarnRef = useRef(false);
  const sizeRows = Array.isArray(sizes) ? sizes : [];
  const withoutSize = sizeRows.length === 1 && !String(sizeRows[0]?.size || "").trim();
  const effectiveSize = withoutSize ? "" : selectedSize;
  const selectedRow = sizeRows.find((row) => String(row.size || "") === effectiveSize);
  const available = Number(selectedRow?.stock || 0);
  const stockMessage = withoutSize
    ? `Bu üründen en fazla ${available} adet ekleyebilirsiniz.`
    : `Bu bedende en fazla ${available} adet ekleyebilirsiniz.`;

  /* varyant renkleri çek */
  useEffect(() => {
    (async () => {
      try {
        const baseId = parentProductId || productId;
        const { data } = await api.get(`/products?varyantsOf=${baseId}`);
        setColorOptions((data || []).filter((p) => p.color?.trim()));
      } catch (err) {
        console.error("Varyant renkler alınamadı:", err);
      }
    })();
  }, [productId, parentProductId]);

  /* ürün değişince seçili rengi sıfırla */
  useEffect(() => {
    setSelectedColor(color || null);
  }, [productId, color]);

  /* Ürün veya stok değişince miktarı geçerli aralıkta tut. */
  useEffect(() => {
    setQty((current) => Math.min(current, available || 1));
  }, [available]);

  useEffect(() => {
    setSelectedSize(null);
    setQty(1);
    setHasAddedToCart(false);
  }, [productId]);

  /* adet kontrolleri */
  const increment = () => {
    setQty((q) => {
      if (q + 1 > available) {
        showWarn(stockMessage);
        return q;
      }
      return q + 1;
    });
  };
  const decrement = () => setQty((q) => Math.max(1, q - 1));

  const showWarn = (msg) => {
    if (sentWarnRef.current) return;
    setWarn(msg);
    sentWarnRef.current = true;
    setTimeout(() => {
      setWarn("");
      sentWarnRef.current = false;
    }, 2000);
  };

  /* sepete ekle */
  const canAdd =
    available > 0 &&
    (withoutSize || selectedSize !== null) &&
    (colorOptions.length === 0 || selectedColor !== null);

  const handleAddToCart = () => {
    if (!canAdd) return;
    if (qty > available) {
      showWarn(stockMessage);
      return;
    }

    addToCart({
      id: productId,
      name: productName,
      image,
      price,
      size: effectiveSize,
      color: selectedColor,
      qty,
    });

    // geçici yazı
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 2000);
    // kalıcı buton
    setHasAddedToCart(true);

    const cartIcon = document.getElementById("cart-icon");
    if (cartIcon) {
      cartIcon.classList.add("animate-shake");
      setTimeout(() => cartIcon.classList.remove("animate-shake"), 500);
    }
  };

  /* renk değiştir */
  const handleColorChange = (newColor) => {
    const found = colorOptions.find((opt) => opt.color === newColor);
    if (!found) return;
    if (found._id === productId) {
      setSelectedColor(newColor);
    } else {
      navigate(`/product-details/${found._id}`, { replace: true });
    }
  };

  const addLabel = showAdded
    ? "Sepete eklendi ✓"
    : available <= 0 && (withoutSize || selectedSize !== null)
      ? "Tükendi"
      : !withoutSize && selectedSize === null
        ? "Beden seçin"
        : "Sepete Ekle";
  const allSoldOut = sizeRows.length > 0 && sizeRows.every((row) => Number(row.stock) <= 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold leading-snug text-dark1 sm:text-2xl">
          {productName}
        </h1>
        <div className="mt-2 text-2xl font-semibold text-dark1">{formatTry(price)}</div>
      </div>

      {/* renk */}
      {(color || colorOptions.length > 1) && (
        <div>
          <p className="mb-2 text-sm text-dark2">
            Renk: <span className="font-medium text-dark1">{selectedColor || color}</span>
          </p>
          {colorOptions.some((opt) => opt._id !== productId) && (
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((opt) => {
                const current = opt._id === productId;
                return (
                  <button
                    key={opt._id}
                    type="button"
                    onClick={() => handleColorChange(opt.color)}
                    aria-pressed={current}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${
                      current ? "border-dark1 bg-dark1 text-white" : "border-light2 text-dark1 hover:border-dark1"
                    }`}
                  >
                    {opt.color}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* beden */}
      {sizeRows.length > 0 && !withoutSize && (
        <div>
          <p className="mb-2 text-sm text-dark2">
            Beden{selectedSize ? <>: <span className="font-medium text-dark1">{selectedSize}</span></> : ""}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Beden seçin">
            {sizeRows.map((row) => {
              const soldOut = Number(row.stock) <= 0;
              const selected = selectedSize === row.size;
              return (
                <button
                  key={row.size}
                  type="button"
                  disabled={soldOut}
                  aria-pressed={selected}
                  onClick={() => setSelectedSize(row.size)}
                  title={soldOut ? `${row.size} tükendi` : undefined}
                  className={`h-11 min-w-[3rem] rounded-lg border px-3 text-sm font-medium transition ${
                    soldOut
                      ? "cursor-not-allowed border-light2 text-gray-400 line-through"
                      : selected
                        ? "border-dark1 bg-dark1 text-white"
                        : "border-light2 bg-white text-dark1 hover:border-dark1"
                  }`}
                >
                  {row.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* adet ve sepete ekle */}
      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-lg border border-light2">
          <button
            type="button"
            onClick={decrement}
            aria-label="Adeti azalt"
            className="flex h-12 w-10 items-center justify-center text-dark2 transition hover:text-dark1"
          >
            <FaMinus className="text-xs" />
          </button>
          <input
            type="text"
            readOnly
            value={qty}
            aria-label="Adet"
            className="w-8 bg-transparent text-center text-dark1 outline-none"
          />
          <button
            type="button"
            onClick={increment}
            aria-label="Adeti artır"
            className="flex h-12 w-10 items-center justify-center text-dark2 transition hover:text-dark1"
          >
            <FaPlus className="text-xs" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAdd}
          className={`h-12 flex-1 rounded-lg text-sm font-semibold uppercase tracking-wider transition ${
            canAdd ? "bg-dark1 text-white hover:bg-black" : "cursor-not-allowed bg-light2 text-dark2"
          }`}
        >
          {allSoldOut ? "Tükendi" : addLabel}
        </button>
      </div>
      {warn && <p className="text-center text-xs text-red-600">{warn}</p>}

      {/* alışverişi tamamla — sayfadan çıkana kadar görünür */}
      {hasAddedToCart && (
        <button
          type="button"
          onClick={() => navigate("/cart")}
          className="h-12 w-full rounded-lg border border-dark1 text-sm font-semibold uppercase tracking-wider text-dark1 transition hover:bg-dark1 hover:text-white"
        >
          Sepete Git
        </button>
      )}
    </div>
  );
}
