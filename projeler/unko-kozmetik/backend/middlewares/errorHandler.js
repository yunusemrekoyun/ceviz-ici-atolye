/********************************************************
 * backend/middlewares/errorHandler.js
 ********************************************************/
const multer = require("multer");

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: "Görsel boyutu en fazla 2 MB olabilir.",
  LIMIT_FILE_COUNT: "En fazla 6 görsel yükleyebilirsiniz.",
  LIMIT_UNEXPECTED_FILE: "En fazla 6 görsel yükleyebilirsiniz.",
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message;

  if (err instanceof multer.MulterError) {
    status = 400;
    message = MULTER_MESSAGES[err.code] || "Dosya yükleme hatası.";
  } else if (err.name === "CastError") {
    status = 400;
    message = "Geçersiz kimlik (ID) değeri.";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
  } else if (err.code === 11000) {
    status = 409;
    message = "Bu kayıt zaten mevcut.";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "İstek gövdesi geçerli bir JSON değil.";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "İstek gövdesi çok büyük.";
  }

  if (status >= 500) {
    console.error(err);
    message = "Sunucuda beklenmeyen bir hata oluştu.";
  }

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
