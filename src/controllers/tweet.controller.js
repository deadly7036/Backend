import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;


    if(!content) {
        throw new ApiError(400, "Content is required ")
    }

    const createTweet = await Tweet.create({
        content,
        owner:req.user?._id
    })

    if(!createTweet) {
        throw new ApiError(400, "Tweet not created")
    }


    return res.status(201).json(new ApiResponse(201, createTweet, "Tweet created successfully"))
    
})






const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;

    if(!isValidObjectId(userId)) {
        throw new ApiError(400,"Invalid user id")
    }

    const user = await User.findById(userId);

    if(!user) {
        throw new ApiError(404,"User not found")
    }

    const getUserTweets = await Tweet.aggregate([
        {
   $match: {
      owner:  new mongoose.Types.ObjectId(user?._id)
   }
        },
        {
       $lookup: {
        from: "users",
         localField: "owner",
         foreignField: "_id",
           as:"owner",
       pipleline: [{
           $project: {
               "avatar.url":1,
               username:1,
               fullName:1,
           }
       }]
       }
        },
        {
       $lookup: {
         from: "likes",
        localField: "_id",
        foreignField: "tweet",
         as:"likedDetails",
           pipeline: [{
             $project: {
                 likedBy:1
             }
           }]
       }
        },
        {
         $addFields: {
            likesCount: {
                $size: "$likedDetails"
            },
           ownerDetails: {
               $first: "$owner"
           },
          isLiked: {
              $cond: {
              $if: {
         $in: [req.user?._id,"$likedDetails.likedBy"]
              },
          then:true,
            else: false
              }
          }
         }
        },
        {
        $sort: {
          createdAt:-1
        }
        },
        {
       $project: {
           content:1,
           likesCount:1,
            ownerDetails:1,
           isLiked:1,
           createdAt:1
       }
        }
    ])


    if(!getUserTweets.length) {
        throw new ApiError(404,"No Tweets Found")
    }

    return res.status(200).json(new ApiResponse(200,getUserTweets,"Tweets Fetched Successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet

    const {content} = req.body;

    const {tweetId} = req.params;

   if(!isValidObjectId(tweetId)) {
       throw new ApiError(400,"Invalid tweet id")
   }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(400,"Tweet not found")
    }


    if(tweet?.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(401,"You are not authorised to update this tweet")
    }

    const updatedTweet= await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        },{
            new : true
        }
    )

    if(!updatedTweet) {
        throw new ApiError(400,"Tweet not updated")
    }

    res.status(200).json(new ApiResponse(200,updatedTweet,"Tweet updated successfully"))
   
})

const deleteTweet = asyncHandler(async (req, res) => {

    
const {tweetId} = req.params;

   if(!isValidObjectId(tweetId)) {
       throw new ApiError(400,"Invalid tweet id")
   }


    const tweet = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(400,"Tweet not found")
    }


    if(tweet?.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(401,"You are not authorised to delete this tweet")
    }

    
    
    
await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(new ApiResponse(200,{},"Tweet deleted Successfully"))

    
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
