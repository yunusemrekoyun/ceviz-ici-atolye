const rateLimit = require("express-rate-limit");

// Global limiter durumu
let isLimiterEnabled = true;

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 10 dakika
  max: 400,
  message: {
    error: "Çok fazla istek yaptınız. Lütfen daha sonra tekrar deneyin.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Koşullu limiter middleware
const conditionalLimiter = (req, res, next) => {
  if (isLimiterEnabled) {
    return globalLimiter(req, res, next);
  }
  next();
};

// Dışa aktarma
module.exports = {
  conditionalLimiter,
  getLimiterStatus: () => isLimiterEnabled,
  enableLimiter: () => {
    isLimiterEnabled = true;
  },
  disableLimiter: () => {
    isLimiterEnabled = false;
  },
};
