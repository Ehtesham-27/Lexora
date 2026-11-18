import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"]
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/**
 * Compare plain candidate password with stored hash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Strips password hash and private fields when converted to JSON
 */
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model("User", userSchema);
