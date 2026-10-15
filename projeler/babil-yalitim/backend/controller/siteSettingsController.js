const SiteSettings = require("../models/SiteSettings");

const SETTINGS_SINGLETON = "site";

const serializeSettings = (doc) => ({
  homeProjectsVisible: doc?.homeProjectsVisible !== false,
});

const getSettingsDoc = async () =>
  SiteSettings.findOneAndUpdate(
    { singleton: SETTINGS_SINGLETON },
    {
      $setOnInsert: {
        singleton: SETTINGS_SINGLETON,
        homeProjectsVisible: true,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

exports.getSiteSettings = async (_req, res) => {
  try {
    const settings = await getSettingsDoc();
    return res.json(serializeSettings(settings));
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Site ayarlari getirilemedi." });
  }
};

exports.updateSiteSettings = async (req, res) => {
  try {
    const updates = {};

    if (typeof req.body?.homeProjectsVisible === "boolean") {
      updates.homeProjectsVisible = req.body.homeProjectsVisible;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        message: "Guncellenecek gecerli bir site ayari gonderilmedi.",
      });
    }

    const settings = await SiteSettings.findOneAndUpdate(
      { singleton: SETTINGS_SINGLETON },
      {
        $set: updates,
        $setOnInsert: { singleton: SETTINGS_SINGLETON },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    return res.json(serializeSettings(settings));
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Site ayarlari guncellenemedi." });
  }
};
