/********************************************************
 * frontend/src/hooks/useCategories.js
 * Kategoriler birçok bileşende kullanıldığı için tek istekle çekilip
 * bellekte tutulur. Admin kategori değiştirdiğinde invalidateCategories()
 * çağrılır.
 ********************************************************/
import { useEffect, useState } from "react";
import { API_URL } from "../config/api";

let cache = null;
let pending = null;

const loadCategories = () => {
  if (!pending) {
    pending = fetch(`${API_URL}/api/categories`)
      .then((res) => {
        if (!res.ok) throw new Error("Kategoriler alınamadı.");
        return res.json();
      })
      .then((data) => {
        cache = data.data || [];
        return cache;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};

export const invalidateCategories = () => {
  cache = null;
};

const useCategories = () => {
  const [state, setState] = useState({
    categories: cache || [],
    isLoading: !cache,
    error: null,
  });

  useEffect(() => {
    if (cache) return;
    let active = true;
    loadCategories()
      .then((categories) => {
        if (active) setState({ categories, isLoading: false, error: null });
      })
      .catch((err) => {
        if (active)
          setState({ categories: [], isLoading: false, error: err.message });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
};

export default useCategories;
