import { createContext, useContext } from "react";

export const defaultSectionOrder = Object.freeze(["new", "featured", "popular"]);

export function normalizeSectionOrder(order) {
  if (!Array.isArray(order) || order.length !== defaultSectionOrder.length
    || new Set(order).size !== defaultSectionOrder.length
    || !defaultSectionOrder.every((key) => order.includes(key))) {
    return [...defaultSectionOrder];
  }
  return order;
}

export const defaultStorefrontSettings = {
  fontPreset: "classic",
  heroButtonOpacity: 30,
  sectionOrder: [...defaultSectionOrder],
  cartRecommendations: { visible: true, heading: "Sepetinize yakışabilecek ürünler", productIds: [] },
  similarProductsVisible: true,
  sections: {
    new: { heading: "Yeni Eklenen Ürünler", source: "latest", categoryId: null, productIds: [], shuffle: true, visible: true },
    featured: { heading: "Öne Çıkan Ürünler", source: "random", categoryId: null, productIds: [], shuffle: true, visible: true },
    popular: { heading: "Çok Satan Ürünler", source: "best_selling", categoryId: null, productIds: [], shuffle: false, visible: true },
  },
  bestSellingProductIds: [],
};

export const StorefrontSettingsContext = createContext(defaultStorefrontSettings);
export const useStorefrontSettings = () => useContext(StorefrontSettingsContext);
