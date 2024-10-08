import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cloudinaryUpload ,deleteOnCloudinary  } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination
 const  pageNumber = parseInt(page, 10);

    const limitNumber = parseInt(limit, 10);
   const  pipeline = [];


    if(query) {
        pipeline.push({
   $search: {
       index : "search-videos",
             text: {
              query : query,
              path: ["title", "description"]
            },

            }
        })
    }

    if(userId) {
     if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Please login to get the videos");
        }
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        })
    }




     if(sortType && sortBy) {
         pipeline.push({
             $sort: {
          [sortBy] : sortType === "asc" ? 1 : -1,
             }
         })
     } else {
        pipeline.push({
            $sort: {
                createdAt: -1,
            }
        })
     }

   /*if(limitNumber) {
       pipeline.push({
           $limit: limitNumber
       })
   }*/



    
if(limitNumber) {
        pipeline.push({
            $limit: limitNumber
        })
}


     if(pageNumber) {
         pipeline.push({
             $skip: (pageNumber -1) * limitNumber
         })
     }

    pipeline.push({
        $lookup: {
            from: "users",
            localField:"owner",
            foreignField: "_id",
            as: "ownerDetails",
            pipeline: [
                {
          $project: {
              username:1,
              fullName:1,
              "avatar.url":1
          }
                }
            ]
        },

    },{
         $unwind: "$ownerDetails"

    })
   

    const videos = await Video.aggregate(pipeline);


    if (videos?.length === 0) {
        throw new ApiError(404, "No videos found");
    }


    const totalVideos = await Video.countDocuments();

    if(!totalVideos) {
  throw new ApiError(404, "No videos ");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            {
                videos,
                totalVideos,
                totalpages: Math.ceil(totalVideos / limitNumber),
                currentPage: pageNumber,
            },
            "Videos fetched successfully",
        ),
    )

});






/*const getBY = asyncHandler(async (req,res)=>{
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
    }

    if (!isValidObjectId(req.user?._if)) {
        throw new ApiError(400, "Invalid user id");
    }

    const video = await Video.aggregate([{
        $match: {
            _id: new mongoose.Types.ObjectId(videoId),
        },
    },{
        $lookup: {
            from: "likes",
            localField:"_id",
            foreignField:"video",
            as:"likes"
        }
    },{
        $lookup: {
            from:"users",
            localField: "owner",
            foreignField:"_id",
            as: "ownerDetails",
            pipeline: [{
                $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
         as: "subscriptions",
                }
            },{
                $addFields: {
                    subCount: {
                        $sum: "subscriptions",
        isSubed: {
            $cond: {
                $if: {
               $in : [req.user._id,"$subscriptions.subscriber"]
                },
                then: true,
                else: false,
            }
        }
                    }
                }
            },{
     $project : {
         
     }
            }]
        }
    }])
    
})*/
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video
    if ([title, description].some((field) => field?.trim === "")) {
        throw new ApiError(400, "Please fill all fields");
    }

    const videoFile = req.files?.videofile[0]?.path;

    if (!videoFile) {
        throw new ApiError(400, "Please upload a video file");
    }

    const thumbnailFile = req.files?.thumbnail[0]?.path;

    if (!thumbnailFile) {
     throw new ApiError(400, "Please upload a thumbnail file");
    }

    const videoUpload = await cloudinaryUpload(videoFile);

    if (!videoUpload) {
        throw new ApiError(400, "Video upload failed on cloudinary");
    }

    const thumbnailUpload = await cloudinaryUpload(thumbnailFile);

    if (!thumbnailUpload) {
        throw new ApiError(400, "Thumbnail upload failed on cloudinary");
    }

    const video = await Video.create({
        title,
        description,
        duration: videoUpload.duration,
        thumbnail: {
            url: thumbnailUpload.secure_url,
   public_id: thumbnailUpload.public_id,
        },
        videofile: {
        url: videoUpload.secure_url,
      public_id: videoUpload.public_id,
         },
        owner: req.user?._id,
    });

    const videoUploaded = await Video.findById(video._id);

    if (!videoUploaded) {
        throw new ApiError(500, "videoUpload failed please try again !!!");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, videoUploaded, "video uploaded successfully"),
        );
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
    }

    if (!isValidObjectId(req.user?._if)) {
        throw new ApiError(400, "Invalid user id");
    }

    const videoAggregate = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers",
                            },
                            isSubscribed: {
                                $cond: {
                                    $if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $arrayElemAt: ["$ownerDetails", 0],
                },
                isLiked: {
                    $cond: {
                        $if: {
                            $in: [req.user?._id, "$likes.likedBy"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },{
        $lookup: {
            from:"comments",
            localField:"_id",
            foreignField:"video",
            as:"comments"
        }
        },
        {
            $project: {
                comments:1,
                videofile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
            },
        },
    ]);

    if (!videoAggregate) {
        throw new ApiError(404, "Video not found");
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        },
    });

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $addToSet: {
                watchHistory: videoId,
            },
        },
        {
            new: true,
        },
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videoAggregate[0],
                "video fetched successfully",
            ),
        );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const { videoId } = req.params;
    //TODO: delete video

    if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
    }

    if (!(title && description)) {
        throw new ApiError(400, "Please fill all fields");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(
            401,
            "You are not authorized to perform this action",
        );
    }

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Please upload a thumbnail file");
    }

    const uploadOnCloudinary = await cloudinaryUpload(thumbnailLocalPath);

    if (!uploadOnCloudinary) {
        throw new ApiError(400, "Thumbnail upload failed on cloudinary");
    }


        if(video.thumbnail.public_id) {
        await deleteOnCloudinary(video.thumbnail.public_id,"image")
        }

    
    const updateDetails = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
        url: uploadOnCloudinary.secure_url,
      pubic_id: uploadOnCloudinary.public_id,
                },
            },
        },
        {
            new: true,
        },
    );

    if (!updateDetails) {
        throw new ApiError(400, "Video not found");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, updateDetails, "Video updated successfully"),
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    

    if (video.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(
            401,
            "You are not authorized to perform this action",
        );
    }

    const deleteVideo = await Video.findByIdAndDelete(video?._id);

    if(video.videofile.public_id) {
        await deleteOnCloudinary(video.videoFile.public_id,"video")
    }

    if(video.thumbnail.public_id) {
        await deleteOnCloudinary(video.thumbnail.public_id,"image")
    }

    if (!deleteVideo) {
        throw new ApiError(400, "Video not found");
    }

    
     
    await Like.deleteMany({
        video: videoId,
    });
    
    await Comment.deleteMany({
        video:videoId
    })

    return res
        .status(201)
        .json(new ApiResponse(201, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(401, "Video not found");
    }

    if (video.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(
            401,
            "You are not authorized to perform this action",
        );
    }

    const togglePublishStatus = await Video.findByIdAndUpdate(
        video?._id,
        {
            $set: {
                isPublished: !video?.isPublished,
            },
        },
        {
            new: true,
        },
    );

    if (!togglePublishStatus) {
    throw new ApiError(400, "Video not found");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                togglePublishStatus,
                "Video published successfully",
            ),
        );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
