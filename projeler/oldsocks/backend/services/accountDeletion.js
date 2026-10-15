// Hesap silme (KVKK). Siparişler yasal saklama yükümlülüğü nedeniyle silinmez;
// hesaba bağlı siparişlere alıcı bilgisi kopyalanır, hesap ve hesaba ait diğer
// kişisel veriler (profil fotoğrafı, yorumlar, bülten kaydı) kaldırılır.
const User = require("../models/User");
const Order = require("../models/Order");
const UserProfilePicture = require("../models/UserProfilePicture");
const BlogComment = require("../models/BlogComment");
const BlogCommentReply = require("../models/BlogCommentReply");
const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const PasswordResetToken = require("../models/PasswordResetToken");
const { removeOwnerMediaReferences } = require("./media/assets");
const { trashAsset } = require("./media/maintenance");

async function deleteUserAccount(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  // 1) Faturalama ve iade için siparişte alıcı bilgisi kalsın.
  await Order.updateMany(
    { user: user._id, $or: [{ guest: null }, { "guest.email": { $in: [null, ""] } }] },
    {
      $set: {
        guest: {
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phone: user.phone || "",
          registrationAddress: "",
        },
      },
    }
  );

  // 2) Profil fotoğrafı: kayıt ve referans silinir, dosya herkese açık klasörden çöpe taşınır.
  const picture = await UserProfilePicture.findOneAndDelete({ user: user._id });
  await removeOwnerMediaReferences("User", user._id);
  const assetIds = [picture?.mediaAsset, user.avatarAsset].filter(Boolean).map(String);
  for (const assetId of new Set(assetIds)) {
    await trashAsset(assetId).catch((error) =>
      console.warn("[account-delete] profil fotoğrafı çöpe taşınamadı:", error?.message || error)
    );
  }

  // 3) Yorumlar ve yanıtlar (silinen yorumların altındaki yanıtlarla birlikte).
  const comments = await BlogComment.find({ author: user._id }).select("_id").lean();
  const commentIds = comments.map((c) => c._id);
  await BlogCommentReply.deleteMany({ $or: [{ author: user._id }, { comment: { $in: commentIds } }] });
  await BlogComment.deleteMany({ _id: { $in: commentIds } });

  // 4) Bülten kaydı ve bekleyen şifre sıfırlama bağlantıları.
  if (user.email) await NewsletterSubscriber.deleteMany({ email: String(user.email).toLowerCase() });
  await PasswordResetToken.deleteMany({ user: user._id }).catch(() => {});

  // 5) Hesap.
  await User.deleteOne({ _id: user._id });
  return { email: user.email };
}

module.exports = { deleteUserAccount };
