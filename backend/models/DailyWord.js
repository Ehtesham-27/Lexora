import mongoose from "mongoose";

const dailyWordSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, "Date is required"],
      unique: true,
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"]
    },
    word: {
      type: String,
      required: [true, "Word is required"],
      lowercase: true,
      trim: true
    },
    dictionaryData: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Dictionary data is required"]
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const DailyWord = mongoose.model("DailyWord", dailyWordSchema);
