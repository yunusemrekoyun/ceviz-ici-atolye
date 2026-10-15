const MEDIA_ERROR_MESSAGES = Object.freeze({
  MEDIA_INVALID_REQUEST: "Medya yükleme bilgileri eksik veya geçersiz.",
  MEDIA_UNSUPPORTED_PURPOSE: "Bu medya kullanım alanı desteklenmiyor.",
  MEDIA_FILE_TOO_LARGE: "Seçilen dosya izin verilen boyut sınırını aşıyor.",
  MEDIA_UNSUPPORTED_FORMAT:
    "Bu dosya biçimini işleyemiyoruz. Lütfen desteklenen bir fotoğraf veya video seçin.",
  MEDIA_PRORES_UNSUPPORTED:
    "Bu video ProRes biçiminde. Lütfen HEVC/H.264 bir MOV veya MP4 seçin.",
  MEDIA_DURATION_EXCEEDED: "Video izin verilen süre sınırını aşıyor.",
  MEDIA_CORRUPT:
    "Dosya okunamadı veya eksik görünüyor. Galeriden yeniden seçip tekrar deneyin.",
  MEDIA_RATE_LIMITED:
    "Kısa sürede çok sayıda yükleme yapıldı. Yüklemeler kısa süre sonra devam edecek.",
  MEDIA_QUOTA_EXCEEDED:
    "Bu hesap için geçici yükleme kotasına ulaşıldı. Lütfen daha sonra devam edin.",
  MEDIA_STORAGE_GUARD:
    "Medya alanı güvenli sınıra ulaştığı için yeni yüklemeler geçici olarak durduruldu. Mevcut içerikler etkilenmedi.",
  MEDIA_SESSION_NOT_FOUND: "Yükleme oturumu bulunamadı veya süresi doldu.",
  MEDIA_SESSION_EXPIRED:
    "Yükleme oturumunun süresi doldu. Dosyayı yeniden seçerek devam edin.",
  MEDIA_OFFSET_MISMATCH:
    "Yükleme kaldığı yerle eşleşmedi. Güvenli noktadan yeniden devam edilecek.",
  MEDIA_UPLOAD_CONFLICT:
    "Bu yüklemenin başka bir parçası işleniyor. Kısa süre sonra tekrar deneyin.",
  MEDIA_PROCESSING_FAILED:
    "Dosya yüklendi ancak hazırlanamadı. Orijinal dosya geçici olarak korunuyor; tekrar deneyebilirsiniz.",
  MEDIA_NOT_READY: "Medya henüz hazırlanıyor. Tamamlandığında kullanılabilir olacak.",
  MEDIA_NOT_PROTECTED:
    "Medya hazır ancak güvenli yedekleme henüz tamamlanmadı.",
  MEDIA_INTERNAL_ERROR:
    "Medya işlemi tamamlanamadı. Dosyanız korunuyor; tekrar deneyebilirsiniz.",
});

class MediaError extends Error {
  constructor(code, options = {}) {
    super(options.message || MEDIA_ERROR_MESSAGES[code] || MEDIA_ERROR_MESSAGES.MEDIA_INTERNAL_ERROR);
    this.name = "MediaError";
    this.code = code;
    this.statusCode = Number(options.statusCode || 500);
    this.details = options.details || undefined;
    this.retryAfter = options.retryAfter || undefined;
    this.expose = options.expose !== false;
  }
}

function mediaError(code, statusCode, options = {}) {
  return new MediaError(code, { ...options, statusCode });
}

function toMediaErrorPayload(error, requestId) {
  const known = error instanceof MediaError;
  const code = known ? error.code : "MEDIA_INTERNAL_ERROR";
  const message = known && error.expose
    ? error.message
    : MEDIA_ERROR_MESSAGES.MEDIA_INTERNAL_ERROR;
  return {
    code,
    message,
    requestId,
    ...(known && error.details ? { details: error.details } : {}),
    ...(known && error.retryAfter ? { retryAfter: error.retryAfter } : {}),
  };
}

module.exports = {
  MEDIA_ERROR_MESSAGES,
  MediaError,
  mediaError,
  toMediaErrorPayload,
};
