/********************************************************
 * backend/utils/productSerializer.js
 * Görseller base64 yerine URL olarak döndürülür:
 * GET /api/products/:productId/images/:imageId
 ********************************************************/

// Listeleme sorgularında görsel verisi ve yorumlar çekilmez
const LIST_PROJECTION = "-img.data -img.contentType -reviews";

const imageUrl = (productId, imageId) =>
  `/api/products/${productId}/images/${imageId}`;

const serializeImages = (product) =>
  (product.img || []).map((img) => ({
    _id: img._id,
    url: imageUrl(product._id, img._id),
  }));

const serializeProduct = (product) => ({
  _id: product._id,
  name: product.name,
  img: serializeImages(product),
  colors: product.colors || [],
  sizes: product.sizes || [],
  price: {
    current: product.price?.current ?? 0,
    discount: product.price?.discount ?? 0,
  },
  category: product.category,
  brand: product.brand,
  description: product.description,
  averageRating: product.averageRating ?? 0,
  reviewCount: product.reviewCount ?? 0,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

module.exports = {
  LIST_PROJECTION,
  imageUrl,
  serializeImages,
  serializeProduct,
};
