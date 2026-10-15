import { getMediaKey, getMediaUrl } from "../../utils/media";

const createClientMediaId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `media-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const toMediaType = (fileOrMedia) => {
  if (!fileOrMedia) return "image";
  if (fileOrMedia.resourceType) return fileOrMedia.resourceType;
  if (fileOrMedia.type) {
    return fileOrMedia.type.startsWith("video/") ? "video" : "image";
  }
  return "image";
};

export const revokeBlobUrl = (value) => {
  if (value?.startsWith?.("blob:")) {
    URL.revokeObjectURL(value);
  }
};

export const createExistingMediaItems = (items = [], altPrefix = "medya") =>
  items
    .filter((item) => item?.url)
    .map((item, index) => ({
      id: `existing:${getMediaKey(item) || index}`,
      source: "existing",
      storageKey: getMediaKey(item),
      src: getMediaUrl(item),
      type: toMediaType(item),
      alt: `${altPrefix}-${index + 1}`,
      badge: "Mevcut",
    }));

export const createNewMediaItems = (
  files = [],
  rememberUrl,
  altPrefix = "medya"
) =>
  files.map((file, index) => ({
    id: `new:${createClientMediaId()}`,
    source: "new",
    storageKey: "",
    src: rememberUrl(file),
    type: toMediaType(file),
    alt: `${altPrefix}-${index + 1}`,
    badge: "Yeni",
    file,
  }));

export const moveMediaItem = (items = [], id, direction) => {
  const currentIndex = items.findIndex((item) => item.id === id);
  if (currentIndex === -1) return items;

  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;

  const nextItems = [...items];
  const [target] = nextItems.splice(currentIndex, 1);
  nextItems.splice(nextIndex, 0, target);
  return nextItems;
};

export const removeMediaItem = (items = [], id) =>
  items.filter((item) => item.id !== id);

export const buildMediaPreviewList = (items = []) =>
  items.map((item) => ({
    src: item.src,
    type: item.type,
    alt: item.alt,
  }));

export const appendOrderedMediaToFormData = (
  formData,
  fieldName,
  items = [],
  orderFieldName
) => {
  let newIndex = 0;
  const orderTokens = [];

  items.forEach((item) => {
    if (item.source === "new" && item.file) {
      formData.append(fieldName, item.file);
      orderTokens.push(`new:${newIndex}`);
      newIndex += 1;
      return;
    }

    if (item.source === "existing" && item.storageKey) {
      orderTokens.push(`existing:${item.storageKey}`);
    }
  });

  if (orderFieldName) {
    formData.append(orderFieldName, JSON.stringify(orderTokens));
  }

  return orderTokens;
};
