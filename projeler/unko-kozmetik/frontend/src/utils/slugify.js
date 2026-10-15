/********************************************************
 * frontend/src/utils/slugify.js
 * "Saç Bakım Yağı" → "sac-bakim-yagi"
 ********************************************************/
const TR_MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };

export const slugify = (text = "") =>
  String(text)
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => TR_MAP[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
