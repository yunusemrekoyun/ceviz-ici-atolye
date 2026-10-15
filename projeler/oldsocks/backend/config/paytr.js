// backend/config/paytr.js
module.exports = {
  merchantId: process.env.PAYTR_MERCHANT_ID,
  merchantKey: process.env.PAYTR_MERCHANT_KEY,
  merchantSalt: process.env.PAYTR_MERCHANT_SALT,
  baseUrl: "https://www.paytr.com",
};
