// backend/db.js
const mongoose = require("mongoose");

let cached = null;

async function connectDB() {
  if (cached) return cached;

  const uri =
    process.env.MONGODB_URI ||
    process.env.db_url ||
    process.env.mongoURL_local ||
    "mongodb://127.0.0.1:27017/communitytalk"; // last-resort local

  mongoose.set("strictQuery", true);

  try {
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    const db = conn.connection;
    db.on("connected",    () => console.log("✅ MongoDB connected"));
    db.on("error",        (e) => console.error("❌ MongoDB error:", e.message));
    db.on("disconnected", () => console.log("⚠️  MongoDB disconnected"));

    cached = db;
    return db;
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    throw err; // causes server startup to fail (expected if URI is bad)
  }
}

module.exports = { connectDB };