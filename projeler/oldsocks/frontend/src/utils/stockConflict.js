// Ürün kaydı "stok değişti" (409 STOCK_CHANGED) ile döndüğünde form satırlarını günceller.
// Dokunulmamış satır (stock === loadedStock) güncel stoğu gösterir ve dokunulmamış kalır;
// yöneticinin değiştirdiği satırda girilen değer kalır, loadedStock güncel stok olur ve
// bir sonraki kayıt o değere göre yapılır. Sunucunun bilmediği satırlar olduğu gibi kalır.
export function applyStockConflict(rows, freshSizes) {
  const fresh = new Map(
    (Array.isArray(freshSizes) ? freshSizes : []).map((row) => [String(row._id), Number(row.stock)])
  );
  return rows.map((row) => {
    if (!row._id || !fresh.has(String(row._id))) return row;
    const live = fresh.get(String(row._id));
    return row.stock === row.loadedStock
      ? { ...row, stock: live, loadedStock: live }
      : { ...row, loadedStock: live };
  });
}
