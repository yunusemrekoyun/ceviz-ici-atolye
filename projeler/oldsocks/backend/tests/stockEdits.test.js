const test = require("node:test");
const assert = require("node:assert/strict");
const { planStockEdits } = require("../services/catalogValidation");

const current = [
  { _id: "a", size: "M", stock: 2 },
  { _id: "b", size: "L", stock: 1 },
  { _id: "c", size: "XL", stock: 5 },
];

test("dokunulmayan satır güncel stoğu korur, değişmemiş satıra girilen değer yazılır", () => {
  const parsed = [{ size: "M", stock: 3 }, { size: "L", stock: 4 }, { size: "XL", stock: 9 }, { size: "XXL", stock: 7 }];
  const raw = [
    { _id: "a", loadedStock: 3 }, // dokunulmadı; arada 1 satıldı
    { _id: "b", loadedStock: 1 }, // stok değişmemiş: 4 yazılır
    { _id: "c", loadedStock: 5 },
    {}, // yeni beden
  ];
  const { sizes, conflicts } = planStockEdits(parsed, raw, current);
  assert.deepEqual(conflicts, []);
  assert.deepEqual(sizes, [
    { _id: "a", size: "M", stock: 2 },
    { _id: "b", size: "L", stock: 4 },
    { _id: "c", size: "XL", stock: 9 },
    { size: "XXL", stock: 7 },
  ]);
});

test("form açıkken stoğu değişen satır yazılmaz, çakışma olarak döner", () => {
  const { conflicts } = planStockEdits([{ size: "M", stock: 8 }], [{ _id: "a", loadedStock: 5 }], current);
  assert.deepEqual(conflicts, [{ _id: "a", size: "M", current: 2, entered: 8 }]);
});

test("aynı form yeniden gönderilirse stok ikinci kez değişmez; tesadüfen eşit değer de çakışmadır", () => {
  const after = [{ _id: "a", size: "M", stock: 8 }];
  assert.deepEqual(planStockEdits([{ size: "M", stock: 8 }], [{ _id: "a", loadedStock: 5 }], after).conflicts, [
    { _id: "a", size: "M", current: 8, entered: 8 },
  ]);
  // Form 5 ile açıldı, bir ayrım 4'e indirdi, yönetici de 4 yazdı: sessizce kabul edilmez.
  assert.deepEqual(planStockEdits([{ size: "M", stock: 4 }], [{ _id: "a", loadedStock: 5 }], [{ _id: "a", size: "M", stock: 4 }]).conflicts, [
    { _id: "a", size: "M", current: 4, entered: 4 },
  ]);
});

test("beden adı değişen satır kendi stoğunu korur; etiket takası geri alınmaz", () => {
  const { sizes } = planStockEdits(
    [{ size: "XL", stock: 2 }, { size: "M", stock: 1 }],
    [{ _id: "a", loadedStock: 2 }, { _id: "b", loadedStock: 1 }],
    current
  );
  assert.deepEqual(sizes, [
    { _id: "a", size: "XL", stock: 2 },
    { _id: "b", size: "M", stock: 1 },
  ]);
});

test("güncellemeden önce açılmış eski panel (kimlik var, loadedStock yok) kaydedemez; bozuk girdi yeni satır sayılır", () => {
  assert.equal(planStockEdits([{ size: "M", stock: 3 }], [{ _id: "a" }], current).stale, true);
  assert.deepEqual(planStockEdits([{ size: "M", stock: 3 }], "bozuk", current), {
    sizes: [{ size: "M", stock: 3 }],
    conflicts: [],
    stale: false,
  });
  // Aynı kimlik iki kez eşleşmez: ikinci satır yeni beden sayılır.
  assert.deepEqual(
    planStockEdits([{ size: "M", stock: 3 }, { size: "S", stock: 1 }], [{ _id: "a", loadedStock: 2 }, { _id: "a", loadedStock: 2 }], current).sizes,
    [{ _id: "a", size: "M", stock: 3 }, { size: "S", stock: 1 }]
  );
});
