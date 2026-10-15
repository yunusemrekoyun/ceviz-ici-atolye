// backend/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Atlas erişilemezse istekler 30 sn asılı kalmasın; 1 vCPU için küçük havuz yeterli.
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB’ye başarıyla bağlanıldı");
  } catch (err) {
    console.error("❌ MongoDB bağlantı hatası:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
