const toPositiveInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
};

const toPlainItem = (item) => {
  if (!item || typeof item !== "object") return item;
  if (typeof item.toObject === "function") return item.toObject();
  if (item._doc && typeof item._doc === "object") return { ...item._doc };
  return { ...item };
};

const getStableTime = (item) => {
  const raw = item?.createdAt || item?.updatedAt || 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
};

const compareOrderedItems = (left, right) => {
  const leftOrder = toPositiveInt(left?.displayOrder);
  const rightOrder = toPositiveInt(right?.displayOrder);

  if (leftOrder !== null && rightOrder !== null && leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  if (leftOrder !== null && rightOrder === null) return -1;
  if (leftOrder === null && rightOrder !== null) return 1;

  const timeDiff = getStableTime(left) - getStableTime(right);
  if (timeDiff !== 0) return timeDiff;

  return String(left?._id || left?.id || "").localeCompare(
    String(right?._id || right?.id || "")
  );
};

const normalizeOrderedItems = (items = []) =>
  [...items]
    .sort(compareOrderedItems)
    .map((item, index) => ({
      ...toPlainItem(item),
      displayOrder: index + 1,
    }));

const reorderOrderedItems = (items = [], targetId, desiredOrder) => {
  const normalized = normalizeOrderedItems(items);
  if (!targetId) return normalized;

  const targetIndex = normalized.findIndex(
    (item) => String(item?._id || item?.id) === String(targetId)
  );

  if (targetIndex === -1) return normalized;

  const [target] = normalized.splice(targetIndex, 1);
  const nextOrder = toPositiveInt(desiredOrder) || normalized.length + 1;
  const insertAt = Math.min(Math.max(nextOrder - 1, 0), normalized.length);
  normalized.splice(insertAt, 0, target);

  return normalized.map((item, index) => ({
    ...toPlainItem(item),
    displayOrder: index + 1,
  }));
};

const syncCollectionDisplayOrder = async (Model, targetId = null, desiredOrder = null) => {
  const docs = await Model.find({}, "_id displayOrder createdAt updatedAt")
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const ordered = targetId
    ? reorderOrderedItems(docs, targetId, desiredOrder)
    : normalizeOrderedItems(docs);

  const currentOrderMap = new Map(
    docs.map((doc) => [String(doc._id), toPositiveInt(doc.displayOrder)])
  );

  const ops = ordered
    .filter(
      (item, index) =>
        currentOrderMap.get(String(item._id)) !== item.displayOrder ||
        item.displayOrder !== index + 1
    )
    .map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { displayOrder: item.displayOrder } },
      },
    }));

  if (ops.length) {
    await Model.bulkWrite(ops);
  }

  return ordered;
};

module.exports = {
  compareOrderedItems,
  normalizeOrderedItems,
  parseDisplayOrder: toPositiveInt,
  reorderOrderedItems,
  syncCollectionDisplayOrder,
};
