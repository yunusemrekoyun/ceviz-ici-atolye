// utils/softDeletePlugin.js
module.exports = function softDeletePlugin(schema, options = {}) {
  // 1) şemaya alan ekle
  schema.add({
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  });

  // 2) otomatik filtre
  schema.pre(/^find/, function () {
    // explicit `.withDeleted()` yapıldıysa filtre uygulama
    if (this._withDeleted) return;

    // { includeDeleted: true } verilmişse de uygulama
    if (this.getFilter().includeDeleted) return;

    this.where({ deleted: false });
  });

  // 3) query helper — istediğinde silinmişleri de getir
  schema.query.withDeleted = function () {
    this._withDeleted = true;
    return this;
  };
};
