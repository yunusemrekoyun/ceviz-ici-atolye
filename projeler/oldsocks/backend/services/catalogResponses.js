function compactProductListItem(product) {
  const { imageAssets, videoAsset, ...publicFields } = product;
  return publicFields;
}

module.exports = { compactProductListItem };
