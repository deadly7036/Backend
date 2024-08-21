import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validateObjectId = (id, name) => {
    if (!isValidObjectId(id)) {
        throw new ApiError(400, `Invalid ${name} id`);
    }
};

// Utility function to find a document by ID
const findById = async (model, id, name) => {
    const doc = await model.findById(id);
    if (!doc) {
        throw new ApiError(404, `${name} not found`);
    }
    return doc;
};

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.body;

    validateObjectId(playlistId, "playlist");
    validateObjectId(videoId, "video");

    const playlist = await findById(Playlist, playlistId, "playlist");

    const video = await findById(Video, videoId, "video");

    if (
        playlist.owner.toString() !== req.user?._id.toString() &&
        video.owner.toString() !== req.user?._id.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to add this video to playlist",
        );
    }

    const addVideo = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        {
            new: true,
        },
    );

    if (!addVideo) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                addVideo,
                "Video added to playlist successfully",
            ),
        );
});

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!(name || description)) {
        throw new ApiError(400, "Please provide name and description");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    });

    if (!playlist) {
        throw new ApiError(400, "Playlist not created");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    validateObjectId(playlistId, "playlist");

    const playlistAggregation = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    { $match: { isPublished: true } },
                    {
                        $project: {
                            "videofile.url": 1,
                            "thumbnail.url": 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            createdAt: 1,
                            views: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        {
            $addFields: {
                owner: { $first: "$ownerDetails" },
                totalVideos: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" },
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                "owner.avatar.url": 1,
                "owner.username": 1,
                "owner.fullName": 1,
                totalVideos: 1,
                totalViews: 1,
                videos: 1,
            },
        },
    ]);

    if (!playlistAggregation.length) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistAggregation[0],
                "Playlist fetched successfully",
            ),
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    validateObjectId(playlistId, "playlist");

    const playlist = await findById(Playlist, playlistId, "playlist");

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You are not authorized to delete this playlist",
        );
    }

    await Playlist.findByIdAndDelete(playlist?._id);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    validateObjectId(userId, "user");

    const userPlaylist = await Playlist.aggregate([
        {
            owner: new mongoose.Types.ObjectId(userId),
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foriegnField: "_id",
                as: "videos",
            },
        },
        {
            $addFields: {
                totalViews: {
                    $sum: "$videos.views",
                },
                totalVideos: {
                    $size: "$videos",
                },
            },
        },
        {
            $project: {
                totalViews: 1,
                totalVideos: 1,
                videos: 1,
                createdAt: 1,
                updatedAt: 1,
                name: 1,
                description: 1,
            },
        },
    ]);

    if (!userPlaylist.length) {
        throw new ApiError(404, "User playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userPlaylist,
                "User playlist fetched successfully",
            ),
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    validateObjectId(playlistId, "playlist");
    validateObjectId(videoId, "video");

    const playlist = await findById(Playlist, playlistId, "playlist");

    const video = await findById(Video, videoId, "video");

    if (
        playlist.owner.toString() !== req.user?._id.toString() &&
        video.owner.toString() !== req.user?._id.toString()
    ) {
        throw new ApiError(400, "You are not authorized to delete this video");
    }

    const removeVideo = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $pull: {
                videos: videoId,
            },
        },
        {
            new: true,
        },
    );

    if (!removeVideo) {
        throw new ApiError(400, "Video not removed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, removeVideo, "Video removed successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { playlistId } = req.params;

    if (!name || !description) {
        throw new ApiError(400, "Please provide name and description");
    }

    if (playlistId && !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You are not authorized to update this playlist",
        );
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name,
                description,
            },
        },
        { new: true },
    );

    if (!updatePlaylist) {
        throw new ApiError(400, "Playlist not updated");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatePlaylist,
                "Playlist updated successfully",
            ),
        );
});

export {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
};
