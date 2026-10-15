const parseMediaOrder = (value) => {
  if (value === undefined || value === null || value === "") return [];

  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const getExistingMediaKey = (item = {}) =>
  String(item?.storageKey || item?.url || "").trim();

const existingToken = (mediaKey) => `existing:${mediaKey}`;
const newToken = (index) => `new:${index}`;

const reorderMediaCollection = async ({
  existing = [],
  uploaded = [],
  order = [],
  destroy = async () => {},
}) => {
  if (!order.length) {
    return [...existing, ...uploaded];
  }

  const existingMap = new Map(
    existing
      .filter((item) => getExistingMediaKey(item))
      .map((item) => [existingToken(getExistingMediaKey(item)), item])
  );
  const uploadedMap = new Map(
    uploaded.map((item, index) => [newToken(index), item])
  );

  const next = [];
  const used = new Set();

  for (const token of order) {
    if (used.has(token)) continue;

    if (existingMap.has(token)) {
      next.push(existingMap.get(token));
      used.add(token);
      continue;
    }

    if (uploadedMap.has(token)) {
      next.push(uploadedMap.get(token));
      used.add(token);
    }
  }

  const removedExisting = existing.filter(
    (item) =>
      getExistingMediaKey(item) &&
      !used.has(existingToken(getExistingMediaKey(item)))
  );
  const droppedUploads = uploaded.filter(
    (_item, index) => !used.has(newToken(index))
  );

  await Promise.all(
    [...removedExisting, ...droppedUploads].map((item) => destroy(item))
  );

  return next;
};

module.exports = {
  parseMediaOrder,
  reorderMediaCollection,
};
