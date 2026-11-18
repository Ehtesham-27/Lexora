import mongoose from "mongoose";

const wordCacheSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: [true, "Word is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Dictionary response data is required"]
    },
    fetchedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// TTL index: MongoDB will automatically delete documents once expiresAt is reached
wordCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const WordCache = mongoose.model("WordCache", wordCacheSchema);
