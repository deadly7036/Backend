import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

async function generateAccessAndRefreshToken(userId) {
  try {
    const user = await User.findById(userId);

    let accessToken = user.generateAccessToken();
    let refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Genrating Access and Refresh Token Failed");
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;

  if (
    [username, email, password, fullName].some(
      (fields) => fields?.trim() === "",
    )
  ) {
    return new ApiError(400, "Please fill all fields");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    return new ApiError(400, "User already exists");
  }

  const avatarLocalFile = req.files?.avatar[0]?.path;
  let coverImageLocalFile;

  if (req.files && Array.isArray(req.files.coverImage).length > 0) {
    coverImageLocalFile = req.files.coverImage[0].path;
  }

  //console.log(req.files)

  if (!avatarLocalFile) {
    throw new ApiError(400, "Please upload an avatar");
  }

  // console.log(req.files)

  const avatar = await cloudinaryUpload(avatarLocalFile);
  // console.log("avatar ", avatar)

  let coverImageUrl = "";

  if (coverImageLocalFile) {
    coverImageUrl = await cloudinaryUpload(coverImageLocalFile);
  }

  if (!avatar) {
    throw new ApiError(400, "Please upload an avatar on cloudinary");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullName,
    avatar,
    coverImage: coverImageUrl ? coverImageUrl : "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(400, "User not created");
  }

  res.status(201).json(new ApiResponse(201, "User created", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!(username || password)) {
    throw new ApiError(400, "Please enter username and password");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "Invalid credentials");
  }

  const passwordValid = user.matchPassword(password);

  if (!passwordValid) {
    throw new ApiError(400, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedUser,
          accessToken,
          refreshToken,
        },
        "Login Successful",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: "" } },
    { new: true },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(202, {}, "Logged out successfully"));
});

const refreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Please provide refresh token");
  }
    const decodedRT = jwt.verify(incomingRefreshToken, process.env.REFRESH);

    if (!decodedRT) {
      throw new ApiError(400, "Invalid refresh token");
    }

    const user = await User.findById(decodedRT._id);

    if (!user) {
      throw new ApiError(400, "Invalid refresh token");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(400, "Invalid refresh token");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id,
    );

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { accessToken, refreshToken },
          "Refresh token generated",
        ),
      );
  
});

export { registerUser, loginUser, logoutUser, refreshToken };
