// src/context/CartProvider.jsx
import React, { useState, useEffect } from "react";
import { CartContext } from "./CartContextObject";
import { sanitizeCartItems } from "../utils/cartReconcile";

const STORAGE_KEY = "cartItems";
const CAMPAIGN_STORAGE_KEY = "selectedCartCampaignId";
const COUPON_STORAGE_KEY = "selectedCouponCode";

export default function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? sanitizeCartItems(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState(() => {
    try {
      const stored = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
      return stored ? String(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedCouponCode, setSelectedCouponCode] = useState(() => {
    try {
      const stored = localStorage.getItem(COUPON_STORAGE_KEY);
      return stored ? String(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      return;
    }
  }, [items]);

  // Başka sekmede sepet değişince bu sekme de güncellenir; aksi hâlde son yazan
  // sekme diğerinin sepetini ezer.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.storageArea !== localStorage) return;
      if (event.key === STORAGE_KEY) {
        try {
          setItems(event.newValue ? sanitizeCartItems(JSON.parse(event.newValue)) : []);
        } catch {
          setItems([]);
        }
      } else if (event.key === CAMPAIGN_STORAGE_KEY) {
        setSelectedCampaignId(event.newValue || null);
      } else if (event.key === COUPON_STORAGE_KEY) {
        setSelectedCouponCode(event.newValue || null);
      } else if (event.key === null) {
        // localStorage.clear()
        setItems([]);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    try {
      if (selectedCampaignId) {
        localStorage.setItem(CAMPAIGN_STORAGE_KEY, selectedCampaignId);
      } else {
        localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
      }
    } catch {
      return;
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    try {
      if (selectedCouponCode) {
        localStorage.setItem(COUPON_STORAGE_KEY, selectedCouponCode);
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch {
      return;
    }
  }, [selectedCouponCode]);

  const addToCart = (product) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id && item.size === product.size
      );
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.size === product.size
            ? { ...item, qty: item.qty + product.qty }
            : item
        );
      } else {
        return [...prev, product];
      }
    });
  };

  const updateQty = (id, size, qty) => {
    const normalizedQty = Math.max(1, Math.floor(Number(qty || 1)));
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && item.size === size
          ? { ...item, qty: normalizedQty }
          : item
      )
    );
  };

  const removeFromCart = (id, size) => {
    setItems((prev) =>
      prev.filter((item) => !(item.id === id && item.size === size))
    );
  };

  // Sunucuyla eşitleme sonrası sepetin tamamını değiştirir.
  const replaceItems = (next) => setItems(sanitizeCartItems(next));

  const clearCart = () => {
    setItems([]);
    setSelectedCampaignId(null);
    setSelectedCouponCode(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQty,
        removeFromCart,
        replaceItems,
        clearCart,
        selectedCampaignId,
        setSelectedCampaignId,
        selectedCouponCode,
        setSelectedCouponCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
