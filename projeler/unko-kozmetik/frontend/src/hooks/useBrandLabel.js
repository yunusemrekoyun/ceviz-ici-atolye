/********************************************************
 * frontend/src/hooks/useBrandLabel.js
 * Ürünlerde marka küçük harfle saklanır ("kevin.murphy").
 * Görünen yazım kategorilerdeki marka listesinden bulunur ("Kevin.Murphy").
 ********************************************************/
import { useCallback, useMemo } from "react";
import useCategories from "./useCategories";

const titleCase = (text) =>
  text.replace(
    /(^|\s)(\S)/g,
    (_, space, ch) => space + ch.toLocaleUpperCase("tr")
  );

const useBrandLabel = () => {
  const { categories } = useCategories();

  const labels = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) =>
      (cat.brands || []).forEach((b) =>
        map.set(b.trim().toLowerCase(), b.trim())
      )
    );
    return map;
  }, [categories]);

  return useCallback(
    (brand) => {
      if (!brand) return "";
      return labels.get(brand.trim().toLowerCase()) || titleCase(brand);
    },
    [labels]
  );
};

export default useBrandLabel;
