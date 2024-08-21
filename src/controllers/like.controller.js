import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const likedVideo = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (likedVideo) {
        await Like.deleteOne({
            video: videoId,
            likedBy: req.user?._id,
        });

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: false,
                },
                "Video unliked",
                "Video unliked successfully",
            ),
        );
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    });

    return res.status(201).json(
        new ApiResponse(201, {
            isLiked: true,
        }),
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    //TODO: toggle like on comment

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    let likedComment = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (likedComment) {
        await Like.deleteOne({
            comment: commentId,
            likedBy: req.user?._id,
        });

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: false,
                },
                "Comment unliked",
                "Comment unliked successfully",
            ),
        );
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    });

    return res.status(201).json(
        new ApiResponse(201, {
            isLiked: true,
        }),
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    //TODO: toggle like on tweet

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    let likedTweet = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    if (likedTweet) {
        await Like.deleteOne({
            tweet: tweetId,
            likedBy: req.user?._id,
        });

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    isLiked: false,
                },
                "Tweet unliked",
                "Tweet unliked successfully",
            ),
        );
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    return res.status(201).json(
        new ApiResponse(201, {
            isLiked: true,
        }),
    );
}); 

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideosAgg = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                video: { $exists: true },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$videoDetails",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                videoDetails: {
                    _id: 1,
                    title: 1,
                    "videofile.url": 1,
                    description: 1,
                    "thumbnail.url": 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    owner: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ]);

    return res.status(201).json(new ApiResponse(201, { likedVideosAgg }));
});


export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
