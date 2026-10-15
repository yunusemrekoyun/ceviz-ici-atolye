const {
  listAssets,
  maintenanceSummary,
  purgeAsset,
  restoreAsset,
  trashAsset,
} = require("../services/media/maintenance");
const { serializeAsset } = require("../services/media/serializers");
const { reconcileMedia } = require("../services/media/reconciliation");

exports.summary = async (_req, res) => {
  res.json(await maintenanceSummary());
};

exports.list = async (req, res) => {
  const result = await listAssets(req.query);
  res.json({
    ...result,
    items: result.items.map(serializeAsset),
  });
};

exports.trash = async (req, res) => {
  const asset = await trashAsset(req.params.id);
  res.json({
    message: "Medya çöp kutusuna taşındı. Kalıcı silmeden önce geri alabilirsiniz.",
    asset: serializeAsset(asset),
  });
};

exports.restore = async (req, res) => {
  const asset = await restoreAsset(req.params.id);
  res.json({ message: "Medya geri alındı.", asset: serializeAsset(asset) });
};

exports.purge = async (req, res) => {
  const asset = await purgeAsset(req.params.id, req.body?.confirmAssetId);
  res.json({ message: "Medya kalıcı olarak silindi.", asset: serializeAsset(asset) });
};

exports.reconcile = async (req, res) => {
  const repair = req.method === "POST" && req.body?.repair === true;
  const report = await reconcileMedia({ repair });
  res.json({
    message: repair
      ? "Dosya ve veritabanı uzlaştırması tamamlandı."
      : "Dosya ve veritabanı kontrolü tamamlandı.",
    report,
  });
};
