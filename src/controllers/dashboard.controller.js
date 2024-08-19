import mongoose from "mongoose";

import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getChannelStats = asyncHandler(async (req, res) => {

  
  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $group: {
        _id: null,
        subscriberCount: {
          $sum: 1,
        },
      },
    },
  ]);

  const videoCount = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likesCount",
      },
    },
    {
      $project: {
        totalLikes: {
          $size: "$likesCount",
        },
       totalViews: "$views",
        totalVideos:1
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: "$totalLikes",
        },
        totalViews: {
          $sum: "$totalViews",
        },
        totalVideos: {
          $sum: "$totalVideos",
        },
      },
    },
  ]);




  if(!videoCount.length) {
    throw new ApiError(404, "No Video Found");
  }

  const channelStats = {
    totalSubscribers: (totalSubscribers[0] && totalSubscribers[0].subscriberCount) || 0,
    totalLikes: (videoCount[0] && videoCount[0].totalLikes) || 0,
    totalViews: (videoCount[0] && videoCount[0].totalViews) || 0,
    totalVideos: (videoCount[0] && videoCount[0].totalVideos) || 0,
  };

  if(!channelStats) {
    throw new ApiError(404, "No Channel Stats Found");
  }

  return res.status(200).json(new ApiResponse(200, channelStats, "Channel stats fetched successfully"));
});





const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel

  const userId = req.user?._id;

  const channelVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },{
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    }, {
      $addFields: {
         likesCount: {
           $size: "$likes"
         }
      }
    }, {
      $sort: {
        createdAt: -1,
      }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        "thumbnail.url": 1,
        description:1,
        "videoFile.url":1,
        isPublished: 1,
        likesCount: 1,
        createdAt:1,
      }
    }
  ])

  if(!channelVideos.length) {
    throw new ApiError(404, "No Video Found");
  }

  return res.status(200).json(new ApiResponse(200, channelVideos, "Channel videos fetched successfully"));
  
});









export { getChannelStats, getChannelVideos };
