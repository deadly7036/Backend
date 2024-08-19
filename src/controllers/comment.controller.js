import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    // TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
const pageNumber = parseInt(page,10);

const limitNumber = parseInt(limit,10);
    
    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(402,"video not found")
    }


    const comments = await Comment.aggregate([{
        $match : {
video : new mongoose.Types.ObjectId(videoId)
        }
    },{
        $lookup: {
            from:"users",
            localField: "owner",
            foreignField: "_id",
            as : "ownerDetails"
        }
    },{
        $lookup: {
       from : "likes",
        localField: "_id",
        foreignField: "comment",
         as : "likes"
        }
    },{
      $addFields: {
          likesCount: {
              $size: "$likes"
          },
          owner : {
              $first: "$ownerDetails"
          },
          likedBy: {
     $cond : {
         $if : {
    $in : [req.user?._id, "$likes.likedBy"]
         },
    then:true,
    else : false
     }
          }
      }
    },{
  $sort : {
      createdAt: -1
  }
    },{
  $project: {
   content:1,
 createdAt:1,
likesCount:1,
owner : {
    "avatar.url": 1,
    username:1,
     fullName:1
},
likedBy:1
      
  }
    }]).skip((pageNumber - 1) * limitNumber).limit(limitNumber);


const countComments = await Comment.countDocuments();

    if(!countComments) {
        throw new ApiError(402,"comment not found")
    }

    if(!comments?.length === 0) {
throw new ApiError(404,"No Comments Found")
    }

    return res.status(200).json(new ApiResponse(200,{
        comments,
        totalComments: countComments,
      currentPage: pageNumber,
      totalPages: Math.ceil(countComments / limitNumber),
    },"Comments Fetched Successfully"))


    
});




const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Please provide comment");
    }

    if (!videoId) {
        throw new ApiError(400, "Please provide videoId");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    });

    if (!comment) {
        throw new ApiError(500, "Comment not created");
    }

    res.status(201).json(new ApiResponse(201, comment, "Comment added"));
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId || !content) {
        throw new ApiError(400, "Please provide commentId and content");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        { $set: { content } },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(500, "Comment not updated");
    }

    res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Please provide commentId");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user?._id
    });

    res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};
