const mongoose = require("mongoose");
const SiteContent = require("../models/SiteContent");
const { DEFAULT_SITE_CONTENT, HEADER_BRAND_OPTIONS } = require("../models/SiteContent");
const { publicAsset, requireReadyAssets, syncOwnerMediaReferences } = require("../services/media/assets");
const { timedCache } = require("../services/timedCache");

const contentCache = timedCache(30_000);

function assetId(value) {
  if (!value) return null;
  return String(value._id || value);
}

function publicContent(doc) {
  const value = doc?.toObject ? doc.toObject() : doc || {};
  const block = (key) => ({
    heading: value[`${key}Heading`] || DEFAULT_SITE_CONTENT[key].heading,
    body: value[`${key}Body`] || DEFAULT_SITE_CONTENT[key].body,
    ...(key !== "history" ? {
      imageAssetId: assetId(value[`${key}ImageAsset`]),
      image: publicAsset(value[`${key}ImageAsset`], "detail"),
    } : {}),
  });
  return {
    logoAssetId: assetId(value.logoAsset),
    logo: publicAsset(value.logoAsset, "detail"),
    header: {
      mode: value.headerBrandMode || DEFAULT_SITE_CONTENT.header.mode,
      text: value.headerBrandText || DEFAULT_SITE_CONTENT.header.text,
      font: value.headerBrandFont || DEFAULT_SITE_CONTENT.header.font,
      style: value.headerBrandStyle || DEFAULT_SITE_CONTENT.header.style,
    },
    about: { vision: block("vision"), mission: block("mission"), history: block("history") },
    footer: {
      description: value.footerDescription ?? DEFAULT_SITE_CONTENT.footer.description,
      address: value.footerAddress ?? DEFAULT_SITE_CONTENT.footer.address,
      facebookUrl: value.facebookUrl ?? DEFAULT_SITE_CONTENT.footer.facebookUrl,
      instagramUrl: value.instagramUrl ?? DEFAULT_SITE_CONTENT.footer.instagramUrl,
    },
    contact: {
      address: value.contactAddress ?? DEFAULT_SITE_CONTENT.contact.address,
      phone: value.contactPhone ?? DEFAULT_SITE_CONTENT.contact.phone,
      email: value.contactEmail ?? DEFAULT_SITE_CONTENT.contact.email,
      hours: value.contactHours ?? DEFAULT_SITE_CONTENT.contact.hours,
    },
  };
}

async function loadContent() {
  return contentCache.get(async () => {
    const doc = await SiteContent.findOne({ key: "main" })
      .populate("logoAsset")
      .populate("visionImageAsset")
      .populate("missionImageAsset");
    return publicContent(doc);
  });
}

exports.getPublic = async (_req, res) => {
  res.set("Cache-Control", "public, max-age=5, s-maxage=5");
  res.json(await loadContent());
};

exports.getAdmin = async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await loadContent());
};

exports.update = async (req, res) => {
  const current = await loadContent();
  const input = req.body || {};
  const updates = {};
  const textFields = [
    ["footerDescription", input.footer?.description, current.footer.description, 1000],
    ["footerAddress", input.footer?.address, current.footer.address, 300],
    ["contactAddress", input.contact?.address, current.contact.address, 300],
    ["contactPhone", input.contact?.phone, current.contact.phone, 50],
    ["contactEmail", input.contact?.email, current.contact.email, 160],
    ["contactHours", input.contact?.hours, current.contact.hours, 160],
  ];
  for (const [field, inputValue, existingValue, maxLength] of textFields) {
    const value = String(inputValue ?? existingValue).trim();
    if (!value || value.length > maxLength) {
      return res.status(400).json({ message: `${field} alanı boş veya çok uzun.` });
    }
    updates[field] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.contactEmail)) {
    return res.status(400).json({ message: "İletişim e-posta adresi geçersiz." });
  }
  for (const [field, inputValue, existingValue] of [
    ["facebookUrl", input.footer?.facebookUrl, current.footer.facebookUrl],
    ["instagramUrl", input.footer?.instagramUrl, current.footer.instagramUrl],
  ]) {
    const value = String(inputValue ?? existingValue).trim();
    if (!value) {
      updates[field] = "";
      continue;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || value.length > 300) throw new Error("invalid URL");
    } catch {
      return res.status(400).json({ message: `${field} bağlantısı geçersiz. HTTPS adresi girin.` });
    }
    updates[field] = value;
  }
  for (const key of ["vision", "mission", "history"]) {
    const block = input.about?.[key] || {};
    const heading = String(block.heading ?? current.about[key].heading).trim();
    const body = String(block.body ?? current.about[key].body).trim();
    if (!heading || heading.length > 100 || !body || body.length > 5000) {
      return res.status(400).json({ message: `${key} başlığı veya metni geçersiz.` });
    }
    updates[`${key}Heading`] = heading;
    updates[`${key}Body`] = body;
  }

  const header = { ...current.header, ...(input.header || {}) };
  for (const key of ["mode", "font", "style"]) {
    if (!HEADER_BRAND_OPTIONS[key].includes(header[key])) {
      return res.status(400).json({ message: "Header marka ayarı geçersiz." });
    }
  }
  header.text = String(header.text || "").trim();
  if (!header.text || header.text.length > 30) {
    return res.status(400).json({ message: "Header yazısı 1–30 karakter olmalı." });
  }
  updates.headerBrandMode = header.mode;
  updates.headerBrandText = header.text;
  updates.headerBrandFont = header.font;
  updates.headerBrandStyle = header.style;

  const logoAssetId = input.logoAssetId === undefined ? current.logoAssetId : input.logoAssetId;
  const visionImageAssetId = input.about?.vision?.imageAssetId === undefined
    ? current.about.vision.imageAssetId : input.about.vision.imageAssetId;
  const missionImageAssetId = input.about?.mission?.imageAssetId === undefined
    ? current.about.mission.imageAssetId : input.about.mission.imageAssetId;
  for (const id of [logoAssetId, visionImageAssetId, missionImageAssetId]) {
    if (id !== null && (!mongoose.isValidObjectId(id) || typeof id !== "string")) {
      return res.status(400).json({ message: "Site görsellerinden biri geçersiz." });
    }
  }
  const [logos, visionImages, missionImages] = await Promise.all([
    requireReadyAssets(logoAssetId, { purpose: "site_logo", kind: "image", max: 1 }),
    requireReadyAssets(visionImageAssetId, { purpose: "about_image", kind: "image", max: 1 }),
    requireReadyAssets(missionImageAssetId, { purpose: "about_image", kind: "image", max: 1 }),
  ]);
  updates.logoAsset = logos[0]?._id || null;
  updates.visionImageAsset = visionImages[0]?._id || null;
  updates.missionImageAsset = missionImages[0]?._id || null;

  const doc = await SiteContent.findOneAndUpdate(
    { key: "main" },
    { $set: updates },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await syncOwnerMediaReferences({
    ownerType: "SiteContent",
    ownerId: doc._id,
    fields: {
      logo: updates.logoAsset ? [updates.logoAsset] : [],
      vision: updates.visionImageAsset ? [updates.visionImageAsset] : [],
      mission: updates.missionImageAsset ? [updates.missionImageAsset] : [],
    },
  });
  contentCache.invalidate();
  res.set("Cache-Control", "no-store");
  res.json(await loadContent());
};

exports.publicContent = publicContent;
