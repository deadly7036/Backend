import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new Schema(
  {
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Please enter a email"],
      lowercase: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, "Please enter a Fullname"],
      index: true,
    },
    avatar: {
      type: {
        url:String,
        public_id:String
      },
      required: true,
    },
    coverImage: {
      type: {
        url:String,
        public_id:String
      },
      type: String,
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


  userSchema.methods.matchPassword = async function (password) {
    if (!password && !this.password) {
      throw new Error("Missing data or hash");
    }
    return await bcrypt.compare(password, this.password);
  };


userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.ACCESS,
    { expiresIn: process.env.ACCESS_EXPIRY },
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH,
    { expiresIn: process.env.REFRESH_EXPIRY },
  );
};

export const User = mongoose.model("User", userSchema);
