const ShippingMethod = require("../models/ShippingMethod");
const { timedCache } = require("../services/timedCache");

const shippingCache = timedCache(15 * 1000);

exports.list = async (_req, res) => {
  const rows = await shippingCache.get(() => ShippingMethod.find().sort({ createdAt: -1 }).lean());
  res.set("Cache-Control", "public, max-age=5, s-maxage=5");
  res.json(rows);
};

function parseFee(value, { nullable = false } = {}) {
  if (nullable && (value === null || value === "" || value === undefined)) return { value: null };
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0 || number > 100000) return { error: true };
  return { value: Math.round(number * 100) / 100 };
}

exports.create = async (req, res) => {
  const { name, fee, freeShippingThreshold } = req.body || {};
  if (!name?.trim())
    return res.status(400).json({ message: "Kargo adı zorunlu." });

  const parsedFee = parseFee(fee);
  const parsedThreshold = parseFee(freeShippingThreshold, { nullable: true });
  if (parsedFee.error || parsedThreshold.error) {
    return res.status(400).json({ message: "Kargo ücreti ve ücretsiz kargo sınırı 0 veya daha büyük bir tutar olmalıdır." });
  }
  const doc = await ShippingMethod.create({
    name: name.trim(),
    fee: parsedFee.value,
    freeShippingThreshold: parsedThreshold.value,
  });
  shippingCache.invalidate();
  res.status(201).json(doc);
};

exports.update = async (req, res) => {
  const { name, fee, freeShippingThreshold } = req.body || {};
  const updates = {};
  if (name !== undefined) {
    updates.name = String(name).trim();
    if (!updates.name) return res.status(400).json({ message: "Kargo adı zorunlu." });
  }
  if (fee !== undefined) {
    const parsed = parseFee(fee);
    if (parsed.error) return res.status(400).json({ message: "Kargo ücreti 0 veya daha büyük bir tutar olmalıdır." });
    updates.fee = parsed.value;
  }
  if (freeShippingThreshold !== undefined) {
    const parsed = parseFee(freeShippingThreshold, { nullable: true });
    if (parsed.error) return res.status(400).json({ message: "Ücretsiz kargo sınırı 0 veya daha büyük bir tutar olmalıdır." });
    updates.freeShippingThreshold = parsed.value;
  }
  const doc = await ShippingMethod.findByIdAndUpdate(req.params.id, updates, {
    new: true,
  });
  if (!doc) return res.status(404).json({ message: "Bulunamadı." });
  shippingCache.invalidate();
  res.json(doc);
};

exports.remove = async (req, res) => {
  const r = await ShippingMethod.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ message: "Bulunamadı." });
  shippingCache.invalidate();
  res.json({ ok: true });
};
