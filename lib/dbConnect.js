// lib/dbConnect.js
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("الرجاء إضافة MONGODB_URI في متغيرات البيئة (.env)");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongooseInstance) => {
        console.log("MongoDB connection status: connected");
        return mongooseInstance;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
