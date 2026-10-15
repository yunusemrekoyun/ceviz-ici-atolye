const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeOrderedItems,
  parseDisplayOrder,
  reorderOrderedItems,
} = require("../utils/displayOrder");

test("parseDisplayOrder yalnizca pozitif tamsayi kabul eder", () => {
  assert.equal(parseDisplayOrder("3"), 3);
  assert.equal(parseDisplayOrder(1), 1);
  assert.equal(parseDisplayOrder("0"), null);
  assert.equal(parseDisplayOrder("-4"), null);
  assert.equal(parseDisplayOrder("abc"), null);
});

test("normalizeOrderedItems sira alanini 1'den baslayarak normalize eder", () => {
  const ordered = normalizeOrderedItems([
    { _id: "b", displayOrder: 4, createdAt: "2026-01-03" },
    { _id: "a", displayOrder: 2, createdAt: "2026-01-02" },
    { _id: "c", createdAt: "2026-01-01" },
  ]);

  assert.deepEqual(
    ordered.map((item) => [item._id, item.displayOrder]),
    [
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]
  );
});

test("normalizeOrderedItems mongoose benzeri subdocument alanlarini korur", () => {
  const ordered = normalizeOrderedItems([
    {
      toObject() {
        return {
          _id: "sub-a",
          title: "Alt Hizmet A",
          type: "Tip",
          category: "Kategori",
          usageAreas: ["teras"],
          description: "Aciklama",
          displayOrder: 3,
        };
      },
      displayOrder: 3,
      _id: "sub-a",
    },
  ]);

  assert.equal(ordered[0].title, "Alt Hizmet A");
  assert.equal(ordered[0].type, "Tip");
  assert.equal(ordered[0].category, "Kategori");
  assert.deepEqual(ordered[0].usageAreas, ["teras"]);
  assert.equal(ordered[0].description, "Aciklama");
  assert.equal(ordered[0].displayOrder, 1);
});

test("reorderOrderedItems hedef kaydi istenen pozisyona tasir", () => {
  const ordered = reorderOrderedItems(
    [
      { _id: "a", displayOrder: 1, createdAt: "2026-01-01" },
      { _id: "b", displayOrder: 2, createdAt: "2026-01-02" },
      { _id: "c", displayOrder: 3, createdAt: "2026-01-03" },
    ],
    "c",
    1
  );

  assert.deepEqual(
    ordered.map((item) => [item._id, item.displayOrder]),
    [
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ]
  );
});
