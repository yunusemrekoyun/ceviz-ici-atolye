// backend/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI tanımlı değil.");
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB bağlandı: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB bağlantı hatası: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
