export const IMAGE_UPLOAD_LIMIT_MB = 20;
export const VIDEO_UPLOAD_LIMIT_MB = 50;
export const ADMIN_SUCCESS_REDIRECT_DELAY_MS = 650;

export const MEDIA_LIMIT_HINT =
  `Görseller için ${IMAGE_UPLOAD_LIMIT_MB}MB, videolar için ${VIDEO_UPLOAD_LIMIT_MB}MB sınırı vardır. ` +
  "Limit aşılırsa sistem kaliteyi düşürmeden optimize etmeyi dener; yeterli olmazsa yükleme durdurulur.";

export const getAdminFeedbackMessage = (
  error,
  fallback = "İşlem tamamlanamadı."
) =>
  error?.friendlyMessage ||
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const getUploadErrorMessage = (error, fallback = "Medya yüklenemedi.") =>
  getAdminFeedbackMessage(error, fallback);
