/********************************************************
 * frontend/src/utils/cart.js
 ********************************************************/

// Aynı ürünün farklı renk/boyut seçimleri sepette ayrı satırlardır
export const cartItemKey = (item) =>
  [item._id, item.selectedColor || "", item.selectedSize || ""].join("|");

// Sepet tutarı sunucuda bu bilgilerle hesaplanır (fiyat gönderilmez)
export const toQuoteItems = (cartItems) =>
  cartItems.map((item) => ({
    productId: item._id,
    quantity: item.quantity,
    color: item.selectedColor || null,
    size: item.selectedSize || null,
  }));

// Ürün indirimi uygulanmış fiyat (backend ile aynı yuvarlama)
export const discountedPrice = (price) => {
  const current = Number(price?.current) || 0;
  const discount = Number(price?.discount) || 0;
  return Math.round(current * 100 * (1 - discount / 100)) / 100;
};

export const formatPrice = (value) =>
  `₺${(Number(value) || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
