import mongoose from "mongoose";

/**
 * Sanitizes MongoDB connection string to mask password before logging
 */
const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== "string") return "unknown";
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
};

/**
 * Establishes Mongoose connection to MongoDB Atlas or local instance
 * @param {string} mongoUri
 * @returns {Promise<mongoose.Connection>}
 */
export const connectDatabase = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error("Cannot connect to database: MONGODB_URI is undefined.");
  }

  const maskedUri = sanitizeMongoUri(mongoUri);

  try {
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      autoIndex: process.env.NODE_ENV !== "production"
    });

    console.log(`[Database] MongoDB connected successfully to ${maskedUri}`);

    // Listen for unexpected connection drops
    mongoose.connection.on("error", (err) => {
      console.error("[Database] Runtime connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[Database] MongoDB disconnected.");
    });

    return conn;
  } catch (error) {
    console.error(`[Database] Initial connection failed to ${maskedUri}:`, error.message);
    throw error;
  }
};

/**
 * Closes Mongoose database connection gracefully
 */
export const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log("[Database] MongoDB connection closed cleanly.");
  } catch (err) {
    console.error("[Database] Error during disconnection:", err.message);
  }
};
