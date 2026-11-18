import mongoose from "mongoose";

const userFavoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"]
    },
    word: {
      type: String,
      required: [true, "Word is required"],
      trim: true,
      lowercase: true,
      maxlength: [50, "Word cannot exceed 50 characters"]
    },
    phonetic: {
      type: String,
      trim: true,
      default: ""
    },
    partOfSpeech: {
      type: String,
      trim: true,
      default: "word"
    },
    definition: {
      type: String,
      trim: true,
      default: ""
    },
    audio: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound unique index ensuring no duplicate word per user
userFavoriteSchema.index({ userId: 1, word: 1 }, { unique: true });
// Index for sorting user's favorites by most recently added
userFavoriteSchema.index({ userId: 1, createdAt: -1 });

userFavoriteSchema.methods.toSafeObject = function () {
  return {
    id: this._id ? this._id.toString() : undefined,
    word: this.word,
    phonetic: this.phonetic || "",
    partOfSpeech: this.partOfSpeech || "word",
    definition: this.definition || "",
    audio: this.audio || null,
    savedAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString()
  };
};

userFavoriteSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.savedAt = ret.createdAt;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const UserFavorite = mongoose.model("UserFavorite", userFavoriteSchema);
