import { Router } from "express";
import {
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
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser,
);


router.route("/login").post(loginUser);

router.route("/logout").post(verifyJwt, logoutUser);

router.route("/refresh-token").post(refreshToken);

router.route("/change-password").post(verifyJwt, changingPassword);

router.route("/current-user").get(verifyJwt, getCurrentUser);

router.route("/update-details").patch(verifyJwt, updatingDetails);

router.route("/avatar").patch(verifyJwt, upload.single("avatar"), updateAvatar);

router
  .route("/cover-image")
  .patch(verifyJwt, upload.single("coverImage"), updateCoverImage);

export default router;
