import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cloudinaryUpload,deleteOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

async function generateAccessAndRefreshToken(userId) {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    console.error("Error generating tokens:", err); // Log the error
    throw new ApiError(500, "Generating Access and Refresh Token Failed");
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
    throw new ApiError(400, "User already exists");
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

  console.log(req.files);

  const avatar = await cloudinaryUpload(avatarLocalFile);
  // console.log("avatar ", avatar)

  let coverImageUrl;

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
    avatar: {
      url: avatar.secure_url,
      public_id: avatar.public_id,
    },
    coverImage: {
      url: coverImageUrl.secure_url,
      public_id: coverImageUrl.public_id,
    }
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

  console.log("Request Body:", req.body); // Verify data received

  if (!username && !email) {
    throw new ApiError(400, "Please enter username and password");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  console.log("User found:", user);

  if (!user) {
    throw new ApiError(400, "User not Founds");
  }

  // Verify user data

  const passwordValid = await user.matchPassword(password);

  console.log("Password valid:", passwordValid); // Check password validation result

  if (!passwordValid) {
    throw new ApiError(400, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  const loggedUser = await User.findById(user?._id).select(
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
    .json({
      status: 200,
      data: {
        user: loggedUser,
        accessToken,
        refreshToken,
      },
      message: "Login Successful",
    });
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
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
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

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

const changingPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!(oldPassword || newPassword)) {
    return new ApiError(400, "Please enter old password and new password");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(400, "Invalid user");
  }

  const matchedPassword = await user.matchPassword(oldPassword);

  if (!matchedPassword) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        message: "Password changed successfully",
      },
      "Password changed successfully",
    ),
  );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Fetched Successfully"));
});

const updatingDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "Please enter full name and email");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        email,
        fullName,
      },
    },
    {
      new: true,
    },
  ).select(" -password ");

  if (!user) {
    throw new ApiError(400, "User not updated");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalFile = req.file?.path;

  if (!avatarLocalFile) {
    throw new ApiError(400, "Please upload an avatar");
  }

  const oldAvatar = await User.findById(req.user?._id);

  const avatar = await cloudinaryUpload(avatarLocalFile);

  if (!avatar) {
    throw new ApiError(401, "avatar is not uploaded");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    },
  ).select(" -password ");


  if(oldAvatar.avatar.public_id && user.avatar.public_id) {
    await deleteOnCloudinary(oldAvatar.avatar.public_id,"image")
  }

  if (!user) {
    throw new ApiError(400, "File not updated");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, "File updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverLocalFile = req.file?.path;

  if (!coverLocalFile) {
    throw new ApiError(400, "Please upload an avatar");
  }

  const oldCover = await User.findById(req.user?._id);

  const coverImage = await cloudinaryUpload(coverLocalFile);

  if (!coverImage) {
    throw new ApiError(401, "coverImage is not uploaded");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    },
  ).select(" -password ");

  if(oldCover.coverImage.public_id && user.coverImage.public_id) {
    await deleteOnCloudinary(oldCover.coverImage.public_id,"image")
  }

  if (!user) {
    throw new ApiError(400, "File not updated");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, "File updated successfully"));
});

const getAllChannelInfo = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "No User");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if(channel.length === 0) {
    throw new ApiError(404, "No Channel Found");
  }

  return res.status(200).json(new ApiResponse(200, channel[0], "Channel Fetched Successfully"));
});




const getWatchHistory = asyncHandler(async (req,res) => {
  const watchHistory = await User.aggregate({
    $match : {
       _id:new mongoose.Types.ObjectId(req.user?._id)
    }
  },{
    $lookup : {
      from : "videos",
      localField : "watchHistory",
      foreignField : "_id",
      as : "watchHistory",
     pipeline : [
       {
         $lookup: {
           from:"users",
           localField:"owner",
          foreignField:"_id",
           as:"owner",
           pipeline: [
             {
               $project: {
                 avatar:1,
                 username:1,
                 fullName:1,
               }
             }
           ]
         }
       },{
    $addFields: {
      owner : {
        $first: "$owner"
      }
    }
       }
     ]
    }
  },)

  if(!watchHistory) {
    throw new ApiError(404, "No History Found");
  }

  return res.status(201).json(new ApiResponse(201, watchHistory, "Watch History Fetched Successfully"));


})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  changingPassword,
  getCurrentUser,
  updatingDetails,
  updateAvatar,
  updateCoverImage,
  getAllChannelInfo,
  getWatchHistory
};
