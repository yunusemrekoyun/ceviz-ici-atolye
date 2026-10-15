// src/components/cart/CartItem.jsx
import React, { useState, useRef } from "react";
import { useCart } from "../../context/useCart";
import { FaTrash, FaPlus, FaMinus } from "react-icons/fa";
import { Link } from "react-router-dom";
import { formatTry } from "../../utils/currency";

export default function CartItem({ item, available }) {
  const { removeFromCart, addToCart, updateQty } = useCart?.() || {};
  // Stok sepetteki tüm satırlar için tek istekte gelir (Cart → /cart-campaigns/check).
  // Henüz gelmediyse sınırsız kabul edilir; ödeme adımı stoğu yine sunucuda doğrular.
  const loadingStock = available === undefined;
  const maxStock = loadingStock ? Infinity : Math.max(0, Number(available) || 0);
  const [warn, setWarn] = useState("");
  const warnRef = useRef(false);

  const showWarn = (msg) => {
    if (warnRef.current) return;
    setWarn(msg);
    warnRef.current = true;
    setTimeout(() => {
      setWarn("");
      warnRef.current = false;
    }, 1800);
  };

  const setQtySafe = (nextQty) => {
    if (typeof updateQty === "function") {
      updateQty(item.id, item.size, nextQty);
    } else {
      removeFromCart(item.id, item.size);
      addToCart({
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        size: item.size,
        color: item.color,
        qty: nextQty,
      });
    }
  };

  const inc = () => {
    if (maxStock !== Infinity && item.qty + 1 > maxStock) {
      showWarn(
        `Bu ürün için en fazla ${maxStock} adet ekleyebilirsiniz${
          item.size ? ` (Beden: ${item.size})` : ""
        }.`
      );
      return;
    }
    setQtySafe(item.qty + 1);
  };

  const dec = () => {
    if (item.qty <= 1) return;
    setQtySafe(item.qty - 1);
  };

  const outOfStock = !loadingStock && maxStock !== Infinity && maxStock === 0;

  const details = [item.size && `Beden: ${item.size}`, item.color && `Renk: ${item.color}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl bg-white p-3 shadow-md transition hover:shadow-lg sm:p-4">
      <div className="flex gap-3 sm:gap-4">
        <Link to={`/product-details/${item.id}`} className="shrink-0">
          <img
            src={item.image}
            alt={item.name}
            className="h-24 w-20 rounded-lg border border-gray-200 object-cover sm:h-28 sm:w-24"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Ad + kaldır */}
          <div className="flex items-start gap-2">
            <Link
              to={`/product-details/${item.id}`}
              className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-snug text-dark1 transition hover:text-primary sm:text-lg"
            >
              {item.name}
            </Link>
            <button
              type="button"
              onClick={() => removeFromCart(item.id, item.size)}
              className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 hover:text-red-700"
              aria-label="Ürünü sepetten kaldır"
              title="Ürünü sepetten kaldır"
            >
              <FaTrash size={15} />
            </button>
          </div>
          {details && <p className="mt-0.5 text-sm text-gray-500">{details}</p>}
          {!loadingStock && outOfStock && (
            <p className="mt-1 text-[12px] text-red-600">Şu an stokta yok</p>
          )}
          {!loadingStock && !outOfStock && item.qty > maxStock && (
            <p className="mt-1 text-[12px] text-red-600">Şu an {maxStock} adet var</p>
          )}

          {/* Adet + tutar */}
          <div className="mt-auto flex items-end justify-between gap-3 pt-2">
            <div className="flex items-center">
              <button
                type="button"
                onClick={dec}
                disabled={item.qty <= 1 || outOfStock}
                className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-light2 transition hover:bg-light1 disabled:opacity-40"
                aria-label="Adeti azalt"
              >
                <FaMinus className="text-xs text-dark2" />
              </button>
              <input
                type="text"
                readOnly
                value={item.qty}
                className="h-9 w-10 border-y border-light2 bg-white text-center text-sm text-dark1"
                aria-label="Adet"
              />
              <button
                type="button"
                onClick={inc}
                disabled={outOfStock}
                className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-light2 transition hover:bg-light1 disabled:opacity-40"
                aria-label="Adeti artır"
              >
                <FaPlus className="text-xs text-dark2" />
              </button>
            </div>
            <div className="text-right">
              <p className="font-semibold text-dark1">{formatTry(Number(item.price) * Number(item.qty))}</p>
              {item.qty > 1 && <p className="text-xs text-gray-500">{formatTry(item.price)} / adet</p>}
            </div>
          </div>

          {/* Stok sınırı uyarısı; boşken yer kaplamaz */}
          <p className="text-[12px] leading-4 text-red-600" aria-live="polite">
            {warn}
          </p>
        </div>
      </div>
    </div>
  );
}
