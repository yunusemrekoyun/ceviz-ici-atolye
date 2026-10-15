const UserProfilePicture = require("../models/UserProfilePicture");
const User = require("../models/User");
const { MediaError } = require("../services/media/errors");
const { trashAsset } = require("../services/media/maintenance");

// Kullanılmayan profil fotoğrafı herkese açık klasörde kalmasın (KVKK).
async function trashUnusedAvatar(assetId) {
  if (!assetId) return;
  await trashAsset(assetId).catch((error) => {
    // Başka yerde kullanılıyorsa (409) veya zaten silinmişse dokunulmaz.
    if (error?.statusCode !== 409 && error?.statusCode !== 404) console.warn("[avatar] eski fotoğraf çöpe taşınamadı:", error?.message || error);
  });
}
const {
  legacyAssetUrl,
  publicAsset,
  removeOwnerMediaReferences,
  requireReadyAssets,
  syncOwnerMediaReferences,
} = require("../services/media/assets");

function serializeProfilePicture(picture) {
  const value =
    typeof picture?.toObject === "function"
      ? picture.toObject()
      : { ...picture };
  if (value.mediaAsset && typeof value.mediaAsset === "object") {
    value.url = legacyAssetUrl(value.mediaAsset, "detail");
    value.media = publicAsset(value.mediaAsset, "detail");
    value.mediaAssetId = String(value.mediaAsset._id);
  }
  delete value.publicId;
  return value;
}

exports.getMyProfilePicture = async (req, res) => {
  try {
    const picture = await UserProfilePicture.findOne({ user: req.user.userId }).populate(
      "mediaAsset"
    );
    if (!picture) return res.status(404).json({ message: "Profil fotoğrafı yok." });
    res.json(serializeProfilePicture(picture));
  } catch (error) {
    console.error("getMyProfilePicture:", error);
    res.status(500).json({ message: "Profil fotoğrafı alınamadı." });
  }
};

exports.createOrUpdateProfilePicture = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [asset] = await requireReadyAssets(req.body.mediaAssetId, {
      purpose: "profile_image",
      kind: "image",
      createdBy: userId,
      min: 1,
      max: 1,
    });
    const url = legacyAssetUrl(asset, "detail");
    const existingPicture = await UserProfilePicture.findOne({ user: userId }).select("mediaAsset").lean();
    const existing = Boolean(existingPicture);
    const picture = await UserProfilePicture.findOneAndUpdate(
      { user: userId },
      { user: userId, url, publicId: "", mediaAsset: asset._id },
      { upsert: true, new: true, runValidators: true }
    );
    await User.findByIdAndUpdate(userId, {
      $set: { avatar: url, avatarAsset: asset._id },
    });
    await syncOwnerMediaReferences({
      ownerType: "User",
      ownerId: userId,
      fields: { avatar: [asset._id] },
    });
    if (existingPicture?.mediaAsset && String(existingPicture.mediaAsset) !== String(asset._id)) {
      await trashUnusedAvatar(existingPicture.mediaAsset);
    }
    const populated = await UserProfilePicture.findById(picture._id).populate(
      "mediaAsset"
    );
    res.status(existing ? 200 : 201).json(serializeProfilePicture(populated));
  } catch (error) {
    if (error instanceof MediaError) throw error;
    console.error("createOrUpdateProfilePicture:", error);
    res.status(500).json({ message: "Profil fotoğrafı güncellenemedi." });
  }
};

exports.deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.userId;
    const picture = await UserProfilePicture.findOneAndDelete({ user: userId });
    if (!picture) return res.status(404).json({ message: "Profil fotoğrafı yok." });
    await User.findByIdAndUpdate(userId, {
      $unset: { avatar: "", avatarAsset: "" },
    });
    await removeOwnerMediaReferences("User", userId);
    await trashUnusedAvatar(picture.mediaAsset);
    res.json({ message: "Profil fotoğrafı silindi." });
  } catch (error) {
    console.error("deleteProfilePicture:", error);
    res.status(500).json({ message: "Profil fotoğrafı silinemedi." });
  }
};
