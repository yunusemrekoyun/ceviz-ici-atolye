// config/db.js
import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) throw new Error("MONGODB_URI missing");
  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  });

  console.log("✅ MongoDB connected:", mongoose.connection.name);
  return mongoose.connection;
}
