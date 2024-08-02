import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

import jwt from "jsonwebtoken";

const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return next(new ApiError(401, "Please login to continue"));
    }

    const decodeToken = jwt.verify(token, process.env.ACCESS);

    if (!decodeToken) {
      return next(new ApiError(402, "Please login to continue"));
    }

    const user = await User.findById(decodeToken?._id);

    if (!user) {
      return next(new ApiError(403, "Please login to continue"));
    }

    req.user = user;

    next();
  } catch (err) {
    throw new ApiError(401, err?.message || "Invalid Token");
  }
});





  
export { verifyJwt };
