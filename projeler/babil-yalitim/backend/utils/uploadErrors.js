const multer = require("multer");

const buildMediaLimitSummary = ({ imageLimitMb, videoLimitMb }) =>
  `Görseller için ${imageLimitMb}MB, videolar için ${videoLimitMb}MB sınırı uygulanır.`;

const normalizeUploadError = (
  err,
  { imageLimitMb, videoLimitMb, hardLimitMb } = {}
) => {
  if (!err) return null;

  if (err.status && err.message) {
    return { status: err.status, message: err.message };
  }

  const limitsText = buildMediaLimitSummary({ imageLimitMb, videoLimitMb });
  const isMulterError =
    err instanceof multer.MulterError || err?.name === "MulterError";

  if (isMulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return {
          status: 413,
          message:
            `${limitsText} Sistem yalnızca belli bir noktaya kadar optimize denemesi yapabiliyor.` +
            (hardLimitMb
              ? ` Bu dosya işlenebilir üst sınır olan ${hardLimitMb}MB değerini aşıyor.`
              : "") +
            " Lütfen daha küçük boyutta bir medya yükleyin.",
        };
      case "LIMIT_FILE_COUNT":
        return {
          status: 400,
          message:
            "Seçtiğiniz dosya sayısı izin verilen sınırı aşıyor. Lütfen daha az medya yükleyin.",
        };
      case "LIMIT_UNEXPECTED_FILE":
        return {
          status: 400,
          message:
            "Bu alana izin verilenden fazla medya seçildi veya beklenmeyen bir medya alanı gönderildi.",
        };
      case "LIMIT_PART_COUNT":
      case "LIMIT_FIELD_COUNT":
        return {
          status: 400,
          message:
            "Form verisi izin verilen sınırı aşıyor. Lütfen daha az dosya veya alan gönderin.",
        };
      case "LIMIT_FIELD_KEY":
      case "LIMIT_FIELD_VALUE":
        return {
          status: 400,
          message:
            "Form verilerinden biri geçersiz veya çok uzun. Lütfen alanları kontrol edip tekrar deneyin.",
        };
      default:
        return {
          status: 400,
          message: err.message || "Medya yükleme sırasında bir hata oluştu.",
        };
    }
  }

  return null;
};

module.exports = {
  buildMediaLimitSummary,
  normalizeUploadError,
};
