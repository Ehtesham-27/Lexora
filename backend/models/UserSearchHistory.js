import mongoose from "mongoose";

const userSearchHistorySchema = new mongoose.Schema(
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
    searchedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound unique index: re-searching a word updates recency instead of duplicating
userSearchHistorySchema.index({ userId: 1, word: 1 }, { unique: true });
// Index for sorting by recency
userSearchHistorySchema.index({ userId: 1, searchedAt: -1 });

userSearchHistorySchema.methods.toSafeObject = function () {
  return {
    id: this._id ? this._id.toString() : undefined,
    word: this.word,
    searchedAt: this.searchedAt ? this.searchedAt.toISOString() : new Date().toISOString()
  };
};

userSearchHistorySchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const UserSearchHistory = mongoose.model("UserSearchHistory", userSearchHistorySchema);
