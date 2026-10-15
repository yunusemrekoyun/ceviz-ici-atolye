import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import CartContext from "./CartContext";
import { cartItemKey } from "../utils/cart";

const CART_KEY = "cartItems";
const COUPON_KEY = "cartCoupon";
const MAX_QUANTITY = 99;

const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Depolama kapalı veya dolu olabilir; sepet bellekte çalışmaya devam eder
  }
};

const clampQuantity = (q) =>
  Math.max(1, Math.min(MAX_QUANTITY, parseInt(q, 10) || 1));

// Sepette sadece gerekli alanlar tutulur (eski sürümlerdeki base64 görseller atılır)
const toCartItem = (item) => ({
  _id: item._id,
  name: item.name,
  brand: item.brand || "",
  image: item.image || item.img?.[0]?.url || "",
  price: Number(item.originalPrice ?? item.price) || 0,
  quantity: clampQuantity(item.quantity),
  ...(item.selectedColor ? { selectedColor: item.selectedColor } : {}),
  ...(item.selectedSize ? { selectedSize: item.selectedSize } : {}),
});

const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() =>
    readStorage(CART_KEY, [])
      .filter((item) => item && item._id)
      .map(toCartItem)
  );
  const [coupon, setCoupon] = useState(() => readStorage(COUPON_KEY, null));

  useEffect(() => {
    writeStorage(CART_KEY, cartItems);
  }, [cartItems]);

  useEffect(() => {
    writeStorage(COUPON_KEY, coupon);
  }, [coupon]);

  const addToCart = useCallback((newItem) => {
    const item = toCartItem(newItem);
    const key = cartItemKey(item);
    setCartItems((prevCart) => {
      const existing = prevCart.find((i) => cartItemKey(i) === key);
      if (!existing) return [...prevCart, item];
      return prevCart.map((i) =>
        cartItemKey(i) === key
          ? {
              ...i,
              price: item.price,
              quantity: clampQuantity(i.quantity + item.quantity),
            }
          : i
      );
    });
  }, []);

  const removeFromCart = useCallback((key) => {
    setCartItems((prevCart) => prevCart.filter((i) => cartItemKey(i) !== key));
  }, []);

  const updateCartItemQuantity = useCallback((key, newQuantity) => {
    setCartItems((prevCart) =>
      prevCart.map((i) =>
        cartItemKey(i) === key
          ? { ...i, quantity: clampQuantity(newQuantity) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCoupon(null);
  }, []);

  // Sunucunun hesapladığı güncel fiyat/isimleri sepete yansıtır,
  // satıştan kaldırılmış ürünleri sepetten çıkarır
  const syncWithQuote = useCallback((quote) => {
    const missing = new Set(
      quote.issues
        .filter((issue) => issue.reason === "missing")
        .map((issue) => String(issue.productId))
    );
    setCartItems((prevCart) => {
      let changed = false;
      const next = prevCart
        .filter((item) => {
          if (!missing.has(item._id)) return true;
          changed = true;
          return false;
        })
        .map((item) => {
          const line = quote.items.find(
            (l) =>
              String(l.productId) === item._id &&
              (l.color || "") === (item.selectedColor || "") &&
              (l.size || "") === (item.selectedSize || "")
          );
          if (
            line &&
            (line.unitPrice !== item.price || line.name !== item.name)
          ) {
            changed = true;
            return { ...item, price: line.unitPrice, name: line.name };
          }
          return item;
        });
      return changed ? next : prevCart;
    });
  }, []);

  const value = useMemo(
    () => ({
      cartItems,
      coupon,
      setCoupon,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      clearCart,
      syncWithQuote,
    }),
    [
      cartItems,
      coupon,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      clearCart,
      syncWithQuote,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

CartProvider.propTypes = {
  children: PropTypes.node,
};

export default CartProvider;
