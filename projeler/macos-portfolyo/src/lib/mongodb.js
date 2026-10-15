/* eslint-env node */
import mongoose from "mongoose";

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not set. DB features will be disabled.");
}

let cached = globalThis.mongoose;
if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) return null;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

export default connectToDatabase;
